'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/pix-lab');

const saved = {
  token: process.env.PUSHINPAY_PRODUCTION_TOKEN,
  secret: process.env.PIX_LAB_ACCESS_CODE,
  merchant: process.env.PIX_LAB_MERCHANT_NAME,
  fetch: global.fetch
};

const SECRET = 'senha-super-forte-para-o-laboratorio';
const ID = '9e6e0b19-cc80-4a63-86b4-024c6f45e1ab';

function setup() {
  process.env.PUSHINPAY_PRODUCTION_TOKEN = 'token-ficticio-para-testes';
  process.env.PIX_LAB_ACCESS_CODE = SECRET;
  process.env.PIX_LAB_MERCHANT_NAME = 'Loja de teste (recebedor)';
}

function request(body, method = 'POST') {
  return { method, headers: { 'content-type': 'application/json' }, body };
}

async function run(req) {
  const res = {
    headers: {},
    statusCode: 200,
    setHeader(k, v) { this.headers[k] = v; return this; },
    status(v) { this.statusCode = v; return this; },
    json(v) { this.body = v; return this; }
  };
  await handler(req, res);
  return res;
}

after(() => {
  for (const [key, value] of [
    ['PUSHINPAY_PRODUCTION_TOKEN', saved.token],
    ['PIX_LAB_ACCESS_CODE', saved.secret],
    ['PIX_LAB_MERCHANT_NAME', saved.merchant]
  ]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  global.fetch = saved.fetch;
});

test('bloqueia cobrança sem credenciais configuradas', async () => {
  delete process.env.PUSHINPAY_PRODUCTION_TOKEN;
  const res = await run(request({ action: 'create', access_code: SECRET }));
  assert.equal(res.statusCode, 503);
});

test('bloqueia senha incorreta sem chamar provedor', async () => {
  setup();
  global.fetch = () => { throw new Error('Não deveria ser chamado'); };
  const res = await run(request({ action: 'create', access_code: 'errada' }));
  assert.equal(res.statusCode, 401);
});

test('cria PIX estritamente de R$ 1,00, retornando campos públicos', async () => {
  setup();
  global.fetch = async (url, opts) => {
    assert.equal(url, 'https://api.pushinpay.com.br/api/pix/cashIn');
    assert.equal(opts.method, 'POST');
    assert.deepEqual(JSON.parse(opts.body), { value: 100 });
    assert.equal(opts.headers.Authorization, 'Bearer token-ficticio-para-testes');
    return {
      ok: true, status: 200, json: async () => ({
        id: ID, status: 'created', value: '100',
        qr_code: '00020101021226820014br.gov.bcb.pix-testeficticio',
        qr_code_base64: 'data:image/png;base64,' + 'A'.repeat(144)
      })
    };
  };
  const res = await run(request({ action: 'create', access_code: SECRET }));
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.amount_cents, 100);
  assert.equal(res.body.merchant, 'Loja de teste (recebedor)');
  assert.ok(res.body.image.startsWith('data:image/png;base64,'));
  assert.equal(res.body.id, ID);
  assert.equal(JSON.stringify(res.body).includes('token-ficticio'), false);
});

test('recusa cobrança de valor diferente de R$ 1,00', async () => {
  setup();
  global.fetch = async () => ({
    ok: true, status: 200, json: async () => ({ id: ID, value: 999, qr_code: '00020112345678901234567' })
  });
  const res = await run(request({ action: 'create', access_code: SECRET }));
  assert.equal(res.statusCode, 502);
});

test('consulta cobrança paga e valida ID e valor', async () => {
  setup();
  global.fetch = async (url, opts) => {
    assert.equal(url, 'https://api.pushinpay.com.br/api/transactions/' + ID);
    assert.equal(opts.method, 'GET');
    return { ok: true, status: 200, json: async () => ({ id: ID, value: '100', status: 'paid' }) };
  };
  const res = await run(request({ action: 'status', access_code: SECRET, id: ID }));
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.paid, true);
});

test('nunca confirma como pago um ID divergente', async () => {
  setup();
  global.fetch = async () => ({
    ok: true, status: 200, json: async () => ({ id: 'some-other-transaction-id', value: 100, status: 'paid' })
  });
  const res = await run(request({ action: 'status', access_code: SECRET, id: ID }));
  assert.equal(res.statusCode, 502);
});
