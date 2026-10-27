# Consulta MEI — teste de interface e PIX simulado

Projeto independente e **não governamental** para consultar dados públicos de CNPJ e validar um fluxo demonstrativo de interface.

## Funcionamento

- Consulta de CNPJ: `api/cnpj.js` consulta dados cadastrais em provedores públicos.
- O modal de consulta apresenta saldo de teste de **R$ 0,00**. Não representa crédito aprovado nem valores a receber.
- O botão **Entendi** abre apenas uma interface PIX demonstrativa.
- `POST /api/pix` retorna `simulation: true`, `payable: false` e `amount_cents: 0`.
- O código de teste não é pagável: não gera cobrança, não conecta à PushinPay e não recebe dinheiro.

## Deploy na Vercel

O projeto usa HTML/CSS/JavaScript e funções Node.js em `api/`.

1. Importe o repositório `LilNomad01/consulta-mei-pix-teste` na Vercel.
2. Configure **Root Directory**: `Consulta_MEI_GitHub_Pronto`.
3. Selecione o framework **Other**.
4. Publique o projeto. Nenhuma credencial de pagamento é necessária.

## Validação

No diretório do projeto, execute:

```sh
npm test
```

Esse comando verifica a sintaxe de `api/cnpj.js` e `api/pix.js`.

## Segurança

Credenciais e arquivos `.env` não devem ser publicados no GitHub. O projeto não dispõe mais de integração bancária real.

## Aviso

Este site não possui vínculo com o Governo Federal. Dados cadastrais de CNPJ não comprovam liberação de empréstimos, créditos ou saldos disponíveis. Não há cobrança para liberação de supostos créditos nesta demonstração.
