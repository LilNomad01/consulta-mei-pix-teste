'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { Script } = require('node:vm');
const path = require('node:path');
const handler = require('../api/pix');

const saved = {
  fetch: global.fetch,
  token: process.env.PUSHINPAY_PRODUCTION_TOKEN,
  code: process.env.PIX_PRIVATE_ACCESS_CODE,
  merchant: process.env.PIX_RECEIVER_NAME
};
const SECRET = 'senha-privada-longa-para-validacao';
const ID = '9e6e0b19-cc80-4a63-86b4-024c6f45e1ab';

function env() {
  process.env.PUSHINPAY_PRODUCTION_TOKEN = 'token-falso-para-testes';
  process.env.PIX_PRIVATE_ACCESS_CODE = SECRET;
  process.env.PIX_RECEIVER_NAME = 'Empresa de demonstração';
}
function request(body = {}, method = 'POST') {
  return { method, headers: { 'content-type': 'application/json' }, body };
}
async function run(req) {
  const res = {
    headers: {},
    statusCode: 200,
    setHeader(key, val) { this.headers[key] = val; return this; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; }
  };
  await handler(req, res);
  return res;
}
after(() => {
  global.fetch = saved.fetch;
  for(const [key, val] of [
    ['PUSHINPAY_PRODUCTION_TOKEN', saved.token],
    ['PIX_PRIVATE_ACCESS_CODE', saved.code],
    ['PIX_RECEIVER_NAME', saved.merchant]
  ]) {
    if (val === undefined) delete process.env[key];
    else process.env[key] = val;
  }
});

test('não revela configurações quando não ativado', async () => {
  delete process.env.PUSHINPAY_PRODUCTION_TOKEN;
  const res = await run(request(null, 'GET'));
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.enabled, false);
  assert.equal(res.body.merchant, null);
});

test('GET informa somente recebedor e valor após configuração', async () => {
  env();
  const res = await run(request(null, 'GET'));
  assert.deepEqual(res.body, {
    enabled: true, amount_cents: 100,
    merchant: 'Empresa de demonstração', independent_payment: true
  });
  assert.doesNotMatch(JSON.stringify(res.body), /token-falso/);
});

test('nenhuma cobrança é criada sem senha', async () => {
  env();
  global.fetch = () => { throw new Error('fetch não deve ser chamado'); };
  const res = await run(request({ action: 'create', access_code: 'incorreto' }));
  assert.equal(res.statusCode, 401);
});

test('gera exatamente R$ 1,00 na PushinPay em produção', async () => {
  env();
  global.fetch = async (url, opts) => {
    assert.equal(url, 'https://api.pushinpay.com.br/api/pix/cashIn');
    assert.equal(opts.method, 'POST');
    assert.equal(opts.headers.Authorization, 'Bearer token-falso-para-testes');
    assert.deepEqual(JSON.parse(opts.body), { value: 100 });
    return { ok: true, status: 200, json: async () => ({
      id: ID, value: 100, status: 'created',
      qr_code: '00020101021226820014br.gov.bcb.pix-exemplo-nao-pagavel',
      qr_code_base64: 'data:image/png;base64,' + 'A'.repeat(120)
    }) };
  };
  const res = await run(request({ action: 'create', access_code: SECRET }));
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.amount_cents, 100);
  assert.equal(res.body.id, ID);
  assert.equal(res.body.merchant, 'Empresa de demonstração');
  assert.ok(res.body.image.startsWith('data:image/png;base64,'));
  assert.doesNotMatch(JSON.stringify(res.body), /token-falso/);
});

test('rejeita retorno de cobrança com valor errado', async () => {
  env();
  global.fetch = async () => ({
    ok: true, status: 200, json: async () => ({
      id: ID, value: 500, qr_code: '00020101021226820014br.gov.bcb.pix-exemplo-nao-pagavel'
    })
  });
  const res = await run(request({ action: 'create', access_code: SECRET }));
  assert.equal(res.statusCode, 502);
});

test('confirma status pago quando ID e valor correspondem', async () => {
  env();
  global.fetch = async (url, opts) => {
    assert.equal(url, 'https://api.pushinpay.com.br/api/transactions/' + ID);
    assert.equal(opts.method, 'GET');
    return { ok: true, status: 200, json: async () => ({
      id: ID, status: 'paid', value: '100'
    }) };
  };
  const res = await run(request({ action: 'status', access_code: SECRET, id: ID }));
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.paid, true);
});

test('rejeita status pago de transação diferente', async () => {
  env();
  global.fetch = async () => ({
    ok: true, status: 200, json: async () => ({
      id: '93e4136d-b1f6-49b9-a85f-cd0899f79f03', status: 'paid', value: 100
    })
  });
  const res = await run(request({ action: 'status', access_code: SECRET, id: ID }));
  assert.equal(res.statusCode, 502);
});

test('index contém área de pagamento independente e Entendi não chama criação', () => {
  const html = readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /id="pixRealOpen"/);
  assert.match(html, /id="pixRealConsent"/);
  assert.match(html, /Não é taxa governamental/);
  assert.match(html, /\$\('#exampleAmountOk'\)\.addEventListener\('click', \(\) => exampleAmountDialog\.close\(\)\)/);
  assert.doesNotMatch(html, /pixDemoDialog|pixDemoCopy|INERT_PIX_CODE/);
});

test('JavaScript embutido em index.html possui sintaxe válida', () => {
  const html = readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const js = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  assert.ok(js.length > 0);
  for (const match of js) new Script(match[1]);
});
