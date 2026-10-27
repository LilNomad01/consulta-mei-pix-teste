/**
 * Endpoint de simulação de interface, sem integração a qualquer PSP.
 * Não lê PUSHINPAY_API_TOKEN. Não cria cobrança e não retorna EMV Pix.
 */
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if(req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({error:'method_not_allowed'});
  }
  return res.status(200).json({
    simulation:true,
    payable:false,
    amount_cents:0,
    currency:'BRL',
    code:'PIX_TESTE_NAO_PAGAVEL_NENHUMA_COBRANCA',
    provider:'mock-local',
    message:'Somente demonstração: nenhum Pix foi criado.'
  });
};
