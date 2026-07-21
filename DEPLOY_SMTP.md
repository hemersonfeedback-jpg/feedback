# Configurar SMTP no Render (SendGrid, Gmail, Mailgun)

Este guia mostra como configurar um provedor SMTP para que o app envie notificações por e-mail quando chegar um novo feedback. O servidor usa as variáveis de ambiente abaixo e o `nodemailer` (já integrado em `server.js`).

## Variáveis de ambiente usadas
- `SMTP_HOST` - servidor SMTP (ex.: `smtp.sendgrid.net`)
- `SMTP_PORT` - porta (ex.: `587`)
- `SMTP_USER` - usuário SMTP (ex.: `apikey` para SendGrid, ou `postmaster@your-domain` para Mailgun)
- `SMTP_PASS` - senha ou API key
- `SMTP_SECURE` - `true` se usar TLS/SSL direto (porta 465); `false` para STARTTLS (porta 587)
- `EMAIL_TO` - endereço que receberá as notificações (ex.: `notificacoes@seudominio.com`)
- `EMAIL_FROM` - remetente dos e-mails (ex.: `no-reply@seudominio.com`)
- `BASE_URL` - URL pública do seu serviço (usado para montar links nos e-mails)

## Passos gerais (Render)
1. Entre no painel do Render e abra o serviço web criado para este repositório.
2. Vá em `Environment` (Environment Variables) e adicione as variáveis listadas acima com os valores do seu provedor SMTP.
3. Em `Deploys`, selecione `Manual Deploy` → `Clear cache and deploy latest commit` para forçar um rebuild usando as novas variáveis.
4. Teste enviando um feedback pelo formulário público (`/`) e verifique se o e-mail chega ao `EMAIL_TO` configurado.

## Configuração por provedor

### 1) SendGrid (recomendado para produção simples)
- Crie conta em https://sendgrid.com e verifique seu e-mail.
- No painel do SendGrid: `Settings` → `API Keys` → `Create API Key` → escolha `Full Access` ou `Restricted` com permissão de envio. Copie a chave.
- SMTP settings:
  - `SMTP_HOST = smtp.sendgrid.net`
  - `SMTP_PORT = 587`
  - `SMTP_USER = apikey` (literalmente `apikey`)
  - `SMTP_PASS = <SUA_SENDGRID_API_KEY>`
  - `SMTP_SECURE = false`
- No Render, preencha `EMAIL_FROM` (ex.: `no-reply@seu-dominio.com`) e `EMAIL_TO`.

### 2) Gmail (apenas para teste; não recomendado em produção)
- Requisitos: a conta deve ter 2FA habilitada e usar `App Passwords`, ou usar um SMTP relay do Google Workspace.
- Para App Passwords (contas Google pessoais):
  - Ative 2-Step Verification na conta Google.
  - Em `Security` → `App passwords`, gere uma senha para `Mail`/`Other` e copie.
- SMTP settings:
  - `SMTP_HOST = smtp.gmail.com`
  - `SMTP_PORT = 587`
  - `SMTP_USER = seu.email@gmail.com`
  - `SMTP_PASS = <APP_PASSWORD>`
  - `SMTP_SECURE = false`

### 3) Mailgun
- Crie conta em https://www.mailgun.com e configure um domínio (ou use sandbox para testes).
- No painel `Domains`, copie as credenciais SMTP (normalmente `postmaster@<domain>` e a senha API).
- SMTP settings:
  - `SMTP_HOST = smtp.mailgun.org`
  - `SMTP_PORT = 587`
  - `SMTP_USER = postmaster@seu-dominio` (conforme painel)
  - `SMTP_PASS = <SUA_SENHA_SMTP>`
  - `SMTP_SECURE = false`

## Testes e validação
- Logs do Render: em caso de erro, abra `Logs` → `Build` e `Server` para ver mensagens do `nodemailer` ou do processo Node.
- Verificar envio manual (curl): após deploy, envie um feedback via `curl` (substitua `BASE_URL`):

```bash
curl -X POST "${BASE_URL:-http://localhost:3000}/api/feedback" \
  -F "clientName=Teste" \
  -F "city=MinhaCidade" \
  -F "serviceDate=2026-07-21" \
  -F "serviceRating=5" \
  -F "layoutExpectation=Sim" \
  -F "teamRating=5" \
  -F "message=Mensagem de teste"
```

- Local: crie um arquivo `.env` com as variáveis e rode `node server.js` (ou `npm install` antes). O servidor fará o envio quando receber o POST acima.

## Depuração de problemas comuns
- Erro de autenticação SMTP: verifique `SMTP_USER`/`SMTP_PASS` e se o provedor exige configurações especiais (App Passwords, username `apikey`, etc.).
- Conexão recusada: verifique `SMTP_PORT` e `SMTP_HOST` e se o provedor requer TLS (`SMTP_SECURE=true` e porta 465).
- E-mails caindo em SPAM: configure SPF/DKIM no DNS do seu domínio (provedores como SendGrid e Mailgun fornecem instruções).

## Segurança
- Nunca comite chaves ou senhas no repositório. Use apenas as variáveis de ambiente do Render.
- Rotacione chaves se vazarem.

## Melhorias sugeridas
- Use provedores especializados (SendGrid/Mailgun/Postmark) para melhor entregabilidade.
- Configure templates HTML e logs de envio para histórico e troubleshooting.

Se quiser, posso gerar exemplos prontos de valores para colar no painel do Render para SendGrid / Mailgun. Diga qual provedor prefere e eu gero o bloco de variáveis pronto para copiar.
