const WA=[5,4,3,2,9,8,7,6,5,4,3,2];
const WB=[6,5,4,3,2,9,8,7,6,5,4,3,2];
function cnpjValid(raw){
  const c=String(raw||'').toUpperCase().replace(/[^0-9A-Z]/g,'');
  if(!/^[0-9A-Z]{12}[0-9]{2}$/.test(c)||/^(.)\1{13}$/.test(c))return false;
  const num=[...c.slice(0,12)].map(s=>s.charCodeAt(0)-48);
  const calc=(arr,weights)=>{const r=arr.reduce((sum,n,i)=>sum+n*weights[i],0)%11;return r<2?0:11-r;};
  const a=calc(num,WA),b=calc([...num,a],WB);
  return c.endsWith(String(a)+String(b));
}
function normalizeWs(d){
  const e=d.estabelecimento||{}, s=d.simples||{};
  const status=String(e.situacao_cadastral||'').toLowerCase();
  const mei=typeof s.mei==='boolean'?s.mei:typeof s.mei==='string'?s.mei.toLowerCase()==='sim':null;
  return {
    cnpj:e.cnpj||null,razao_social:d.razao_social||null,nome_fantasia:e.nome_fantasia||null,
    municipio:e.cidade?.nome||null,uf:e.estado?.sigla||null,
    data_inicio_atividade:e.data_inicio_atividade||null,
    cnae_fiscal_descricao:e.atividade_principal?.descricao||null,
    situacao_cadastral:status.includes('ativa')?2:status.includes('baixada')?8:status.includes('suspensa')?3:status.includes('inapta')?4:null,
    opcao_pelo_mei:mei,data_exclusao_do_mei:s.data_exclusao_mei||null
  };
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'});}
  const c=String(req.query?.numero||'').toUpperCase().replace(/[^0-9A-Z]/g,'');
  if(!cnpjValid(c))return res.status(400).json({error:'invalid_cnpj',message:'CNPJ inválido'});
  const providers=[
    ['https://brasilapi.com.br/api/cnpj/v1/'+encodeURIComponent(c),false],
    ['https://publica.cnpj.ws/cnpj/'+encodeURIComponent(c),true]
  ];
  let notFound=0;
  for(const [url,normalize] of providers){
    try{
      const response=await fetch(url,{signal:AbortSignal.timeout(4200),headers:{Accept:'application/json'}});
      if(response.status===404){notFound++;continue;}
      if(!response.ok)continue;
      const json=await response.json();
      const obj=normalize?normalizeWs(json):json;
      if(!obj?.cnpj)continue;
      const keys=['cnpj','razao_social','nome_fantasia','municipio','uf','data_inicio_atividade','cnae_fiscal_descricao','situacao_cadastral','opcao_pelo_mei','data_exclusao_do_mei'];
      return res.status(200).json(Object.fromEntries(keys.map(k=>[k,obj[k]??null])));
    }catch(e){ /* fallback */ }
  }
  return res.status(notFound===2?404:503).json({error:notFound===2?'not_found':'upstream_unavailable'});
};
