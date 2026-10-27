# Consulta MEI — protótipo + laboratório PIX independente

Projeto independente, **não governamental**, para consultar dados públicos de CNPJ e testar uma interface demonstrativa. Foi incluído um laboratório privado de integração da PushinPay, separado da consulta MEI.

## 1. Consulta MEI — apenas demonstração

- `index.html`: experiência de consulta e modais ilustrativos.
- `api/cnpj.js`: dados cadastrais públicos.
- `api/pix.js`: PIX **fictício e não pagável**; o botão **Entendi** continua abrindo apenas esta demonstração.
- O saldo de teste de R$ 0,00 não representa valores a receber nem créditos aprovados.

**Não há qualquer pagamento necessário para consultar ou liberar crédito MEI neste projeto.**

## 2. Laboratório de PIX real (rota isolada)

- `pix-lab.html`: página de laboratório separada, sem links na consulta MEI.
- `api/pix-lab.js`: cria uma cobrança de **R$ 1,00** na PushinPay de produção e consulta seu status sob demanda.
- O laboratório só cria a cobrança após clicar em **Criar cobrança PIX** e informar a senha.
- Exibe o nome do recebedor configurado, QR Code retornado pelo provedor e código copia e cola.
- Consulta de status apenas quando o operador clicar em **Já paguei**. Respeite o intervalo mínimo de 60 segundos recomendado pela PushinPay.
- A rota possui `noindex`, mas **isso não substitui autenticação**: recomenda-se proteger o deploy com Vercel Authentication/Deployment Protection, quando disponível.

### Variáveis secretas

Cadastre em **Vercel → Project Settings → Environment Variables**:

```env
PUSHINPAY_PRODUCTION_TOKEN=TOKEN_DE_PRODUCAO_GERADO_NO_PAINEL
PIX_LAB_ACCESS_CODE=UMA_SENHA_UNICA_DE_PELO_MENOS_20_CARACTERES
PIX_LAB_MERCHANT_NAME=NOME_VERDADEIRO_DO_RECEBEDOR
```

**Nunca** coloque valores reais em `index.html`, `pix-lab.html`, no README ou nos commits do GitHub. Se alguma chave foi divulgada anteriormente, revogue-a no painel e gere outra.

Acesse `https://SEU-DOMINIO/pix-lab.html` para realizar o teste. O valor é fixo no backend: **100 centavos = R$ 1,00**. O código só funciona depois que as variáveis estiverem salvas no ambiente do deploy e houver um token válido. A interface exibirá erro de configuração caso não existam.

### Limitações e cuidados

- A API real usa `https://api.pushinpay.com.br/api`; não é uma simulação.
- Os testes automatizados usam `fetch` substituído por respostas fictícias: **não comprovam crédito bancário real**.
- Sem banco de dados, o ID da cobrança fica apenas na página aberta; recarregá-la perde o histórico local.
- A página não calcula taxas do provedor nem garante valor líquido. Confira a cobrança e o recebedor no app do banco antes de pagar.
- Não redirecione usuários da consulta MEI para o laboratório de pagamento.
- O código privado é um controle adicional; para manter o teste realmente privado, habilite também proteção de acesso na Vercel.

## Deploy na Vercel

1. Importe o repositório `LilNomad01/consulta-mei-pix-teste`.
2. Defina o **Root Directory** como `Consulta_MEI_GitHub_Pronto`.
3. Selecione framework **Other** e utilize funções Node.js (Node 20+).
4. Cadastre as três variáveis de ambiente acima e faça um novo deploy.
5. Acesse a rota de laboratório diretamente, sem linká-la à consulta.

## Testes locais

```sh
npm test
node --check api/cnpj.js
node --check api/pix.js
node --check api/pix-lab.js
```

Os testes não fazem chamadas bancárias e não criam cobranças.

## Documentação do provedor

- [Criar PIX](https://app.theneo.io/pushinpay/pix/criar-pix)
- [Consultar PIX](https://app.theneo.io/pushinpay/pix/pix/consultar-pix)
