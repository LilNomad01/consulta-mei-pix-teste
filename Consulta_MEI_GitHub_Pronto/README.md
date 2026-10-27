# Consulta MEI + teste técnico privado de PIX (na mesma página)

Este é um projeto independente, não governamental, que consulta informações cadastrais públicas de CNPJ. A consulta é gratuita e não verifica ou aprova créditos ou recebíveis.

## Separação obrigatória dos fluxos

- **Consulta MEI:** `index.html` e `api/cnpj.js` continuam gratuitos. O botão **Entendi** apenas fecha o aviso sobre saldo demonstrativo de R$ 0,00; não chama a API de pagamento.
- **Teste técnico voluntário:** no final do **mesmo `index.html`**, existe a seção **Área técnica: integração PIX**, com botão independente **Abrir teste de PIX (R$ 1,00)**.
- A cobrança é criada somente se o operador informar o código privado, aceitar que a transferência é real e clicar expressamente em **Gerar cobrança PIX real de R$ 1,00**.
- A tela informa o recebedor antes da criação do PIX. Ao pagar, confira o recebedor novamente no banco.
- Esse pagamento **não compra um serviço**, **não é taxa oficial**, **não concede crédito** e **não é necessário para fazer consultas**. É apenas uma transferência voluntária de teste.
- O processamento é realizado pela PushinPay; o recebedor é o titular da conta configurada.

Não associe a cobrança a aprovação de crédito, consulta CNPJ ou benefício governamental.

## Configuração da integração

Configure as variáveis secretas na Vercel, em **Project Settings → Environment Variables**:

```env
PUSHINPAY_PRODUCTION_TOKEN=SEU_TOKEN_DE_PRODUCAO
PIX_PRIVATE_ACCESS_CODE=UMA_SENHA_UNICA_DE_20_OU_MAIS_CARACTERES
PIX_RECEIVER_NAME=NOME_REAL_DO_RECEBEDOR
```

O token não vai para o browser. Nunca coloque a chave real em arquivos ou commits do GitHub. Se uma chave foi publicada anteriormente, revogue-a antes de usar o ambiente de produção.

O backend `api/pix.js` usa o endereço de produção `https://api.pushinpay.com.br/api`. O valor fica fixado no servidor em **100 centavos = R$ 1,00**.

### Funcionalidades

- `GET /api/pix`: informa se a integração está configurada, o valor e o nome do recebedor; não retorna segredos.
- `POST /api/pix` com `action: "create"`: cria uma cobrança autorizada pelo código privado; devolve QR Code e PIX copia e cola.
- `POST /api/pix` com `action: "status"`: consulta manualmente o pagamento, conferindo ID e valor no retorno do provedor. O frontend restringe consultas a intervalos de 60 segundos para evitar bloqueios.

**Proteja também o acesso ao deploy pela Vercel**, quando disponível, para evitar exposição da área de teste. A senha do checkout é somente uma proteção adicional.

## Deploy

1. Importe o repositório `LilNomad01/consulta-mei-pix-teste` na Vercel.
2. Escolha **Root Directory**: `Consulta_MEI_GitHub_Pronto`.
3. Framework: **Other**; Node.js 20 ou superior.
4. Cadastre as variáveis secretas, publique e acesse a página inicial (`/`).
5. Role até **Área técnica: integração PIX** para usar o checkout privado.

## Validação

Execute na raiz do projeto:

```sh
npm test
```

Os testes automatizados usam respostas simuladas de `fetch`. Eles validam a sintaxe e as verificações de segurança, mas **não comprovam que uma transação bancária real foi concluída**. Esse último teste exige token ativo e pagamento voluntário no aplicativo bancário.

## Aviso

A plataforma não tem vínculo com o Governo Federal. Consultas cadastrais de CNPJ não comprovam crédito ou recebíveis disponíveis. Não pague taxas antecipadas para liberar supostos créditos.
