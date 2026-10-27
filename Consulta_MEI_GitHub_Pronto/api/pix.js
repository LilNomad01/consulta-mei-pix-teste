'use strict';

// Checkout privado, voluntário e separado da consulta MEI.
// GET /api/pix: retorna somente metadados públicos do recebedor.
// POST /api/pix: cria e consulta UMA cobrança de valor fixo de R$ 1,00.
// Nunca incorporar o token da PushinPay ao HTML.
const crypto = require('node:crypto');
const BASE_URL = 'https://api.pushinpay.com.br/api';
const AMOUNT = 100;

function safeEqual(input, secret) {
  const left = crypto.createHash('sha256').update(input).digest();
  const right = crypto.createHash('sha256').update(secret).digest();
  return crypto.timingSafeEqual(left, right);
}
function fail(res, status, error) {
  return res.status(status).json({ error });
}
function imageDataUri(value) {
  if (typeof value !== 'string') return null;
  const base64 = value.replace(/^data:image\/png;base64,/i, '');
  if (base64.length < 100 || base64.length > 200000 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return null;
  return 'data:image/png;base64,' + base64;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const token = process.env.PUSHINPAY_PRODUCTION_TOKEN;
  const secret = process.env.PIX_PRIVATE_ACCESS_CODE;
  const merchant = String(process.env.PIX_RECEIVER_NAME || '').trim();
  const enabled = Boolean(token && secret && secret.length >= 20 && merchant);

  if (req.method === 'GET') {
    return res.status(200).json({
      enabled,
      amount_cents: AMOUNT,
      merchant: enabled ? merchant : null,
      independent_payment: true
    });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return fail(res, 405, 'Método não permitido.');
  }
  if (!/^application\/json(?:;|$)/i.test(String(req.headers?.['content-type'] || ''))) {
    return fail(res, 415, 'Envie Content-Type: application/json.');
  }
  if (!enabled) {
    return fail(res, 503, 'Integração indisponível. Confira a configuração do servidor.');
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch { return fail(res, 400, 'JSON inválido.'); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return fail(res, 400, 'Requisição inválida.');
  }
  const supplied = typeof body.access_code === 'string' ? body.access_code : '';
  if (!supplied || supplied.length > 256 || !safeEqual(supplied, secret)) {
    return fail(res, 401, 'Código privado inválido.');
  }
  const creating = body.action === 'create';
  const checking = body.action === 'status';
  if (!creating && !checking) {
    return fail(res, 400, 'Ação inválida.');
  }

  const id = typeof body.id === 'string' ? body.id : '';
  if (checking && !/^[a-z0-9-]{16,64}$/i.test(id)) {
    return fail(res, 400, 'Identificador inválido.');
  }

  try {
    const response = await fetch(
      BASE_URL + (creating ? '/pix/cashIn' : '/transactions/' + encodeURIComponent(id)),
      {
        method: creating ? 'POST' : 'GET',
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        ...(creating ? { body: JSON.stringify({ value: AMOUNT }) } : {}),
        signal: AbortSignal.timeout(9000)
      }
    );
    let data;
    try { data = await response.json(); }
    catch { return fail(res, 502, 'Resposta inesperada do provedor de pagamento.'); }
    if (!response.ok || !data || Array.isArray(data) || typeof data !== 'object') {
      return fail(res, 502, 'A PushinPay não processou a solicitação (HTTP ' + response.status + ').');
    }

    if (creating) {
      if (typeof data.id !== 'string' || !/^[a-z0-9-]{16,64}$/i.test(data.id) ||
          typeof data.qr_code !== 'string' || data.qr_code.length < 20 ||
          Number(data.value) !== AMOUNT) {
        return fail(res, 502, 'Cobrança não corresponde ao teste privado de R$ 1,00.');
      }
      return res.status(200).json({
        id: data.id,
        amount_cents: AMOUNT,
        merchant,
        status: String(data.status || 'created').toLowerCase(),
        code: data.qr_code,
        image: imageDataUri(data.qr_code_base64)
      });
    }

    if (String(data.id || '').toLowerCase() !== id.toLowerCase() ||
        Number(data.value) !== AMOUNT) {
      return fail(res, 502, 'A cobrança consultada não corresponde a este teste.');
    }
    const status = String(data.status || 'unknown').toLowerCase();
    return res.status(200).json({ id, status, paid: status === 'paid' });
  } catch {
    return fail(res, 502, 'Falha temporária na comunicação com a PushinPay.');
  }
};
