'use strict';

// Endpoint isolado da consulta MEI: apenas um teste privado de pagamento real.
// A chave da PushinPay nunca deve aparecer no frontend ou no repositório.
const crypto = require('node:crypto');

const API_BASE = 'https://api.pushinpay.com.br/api';
const AMOUNT_CENTS = 100; // R$ 1,00

function sameSecret(attempt, expected) {
  const a = crypto.createHash('sha256').update(attempt).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function qrDataUri(value) {
  if (typeof value !== 'string' || !value) return null;
  const raw = value.replace(/^data:image\/png;base64,/i, '');
  if (raw.length < 100 || raw.length > 200000 || !/^[a-zA-Z0-9+/]+={0,2}$/.test(raw)) return null;
  return 'data:image/png;base64,' + raw;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, 'Método não permitido.');
  }

  // Esta rota só aceita JSON, o que também impede forms cross-site simples.
  if (!/^application\/json(?:;|$)/i.test(String(req.headers?.['content-type'] || ''))) {
    return sendError(res, 415, 'Envie Content-Type: application/json.');
  }

  const token = process.env.PUSHINPAY_PRODUCTION_TOKEN;
  const secret = process.env.PIX_LAB_ACCESS_CODE;
  const merchant = process.env.PIX_LAB_MERCHANT_NAME;

  if (!token || !secret || secret.length < 20 || !merchant) {
    return sendError(res, 503, 'Laboratório não configurado no servidor.');
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return sendError(res, 400, 'JSON inválido.'); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return sendError(res, 400, 'Requisição inválida.');
  }

  const accessCode = typeof body.access_code === 'string' ? body.access_code : '';
  if (accessCode.length > 256 || !sameSecret(accessCode, secret)) {
    return sendError(res, 401, 'Código de acesso inválido.');
  }

  const creating = body.action === 'create';
  const checking = body.action === 'status';
  if (!creating && !checking) {
    return sendError(res, 400, 'Ação inválida.');
  }

  const id = typeof body.id === 'string' ? body.id : '';
  if (checking && !/^[a-zA-Z0-9-]{16,64}$/.test(id)) {
    return sendError(res, 400, 'Identificador de cobrança inválido.');
  }

  try {
    const url = API_BASE + (creating ? '/pix/cashIn' : '/transactions/' + encodeURIComponent(id));
    const response = await fetch(url, {
      method: creating ? 'POST' : 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      ...(creating ? { body: JSON.stringify({ value: AMOUNT_CENTS }) } : {}),
      signal: AbortSignal.timeout(9000)
    });

    let data;
    try { data = await response.json(); } catch {
      return sendError(res, 502, 'Resposta inesperada do provedor PIX.');
    }

    if (!response.ok || !data || Array.isArray(data) || typeof data !== 'object') {
      // Nunca devolva a resposta inteira do provedor nem o token.
      return sendError(res, 502, 'PushinPay não processou a solicitação (HTTP ' + response.status + ').');
    }

    if (creating) {
      if (typeof data.id !== 'string' || !/^[a-zA-Z0-9-]{16,64}$/.test(data.id) ||
          typeof data.qr_code !== 'string' || data.qr_code.length < 20 ||
          Number(data.value) !== AMOUNT_CENTS) {
        return sendError(res, 502, 'Dados de cobrança não correspondem ao teste de R$ 1,00.');
      }
      return res.status(200).json({
        id: data.id,
        merchant,
        amount_cents: AMOUNT_CENTS,
        status: String(data.status || 'created'),
        code: data.qr_code,
        image: qrDataUri(data.qr_code_base64)
      });
    }

    if (String(data.id || '').toLowerCase() !== id.toLowerCase() ||
        Number(data.value) !== AMOUNT_CENTS) {
      return sendError(res, 502, 'A cobrança consultada não corresponde ao teste de R$ 1,00.');
    }

    const status = String(data.status || 'unknown').toLowerCase();
    return res.status(200).json({
      id,
      status,
      paid: status === 'paid'
    });
  } catch {
    return sendError(res, 502, 'Não foi possível conectar à PushinPay. Tente novamente.');
  }
};
