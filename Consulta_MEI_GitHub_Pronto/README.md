# Consulta MEI — teste de interface e Pix simulado

Projeto independente e não governamental para consultar dados públicos de CNPJ e validar um fluxo **demonstrativo** de interface.

## Funcionamento

- Consulta CNPJ: `api/cnpj.js` usa provedores públicos de dados cadastrais.
- O modal apresenta saldo de teste **R$ 0,00**; não indica aprovação de crédito.
- O botão **Entendi** abre uma tela Pix demonstrativa.
- `POST /api/pix` responde com `simulation: true`, `payable: false` e `amount_cents: 0`.
- O QR Code e o código de teste **não são pagáveis**. Não existe integração com PushinPay neste protótipo.

## Deploy na Vercel

O projeto usa HTML/CSS/JS e funções serverless em `api/`. Publique diretamente na Vercel como projeto sem framework. O arquivo `vercel.json` configura as APIs.

## Segurança

O arquivo `.env.example` serve apenas de modelo: **nunca publique o token real**. Defina variáveis secretas somente nas configurações de ambiente da Vercel. `.env` está ignorado pelo Git.

## Teste local de sintaxe

```bash
node --check api/cnpj.js
node --check api/pix.js
```

## Aviso

Este projeto é independente do Governo Federal. A consulta de CNPJ não confirma crédito nem recebíveis disponíveis. Não realize pagamentos antecipados para liberar suposto crédito.
