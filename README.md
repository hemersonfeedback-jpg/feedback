# Atual Layout - Pós-Venda Inteligente

Aplicação web para coleta de feedback de clientes, com formulário moderno e painel administrativo.

## Funcionalidades
- Formulário de experiência do cliente
- Upload de áudio e fotos
- Armazenamento em MongoDB
- Painel de visualização de respostas

## Variáveis de ambiente
- MONGODB_URI: conexão com MongoDB Atlas
- PORT: porta do servidor
- BASE_URL: URL pública do deploy
- CLOUDINARY_CLOUD_NAME: nome do Cloudinary
- CLOUDINARY_API_KEY: chave de API do Cloudinary
- CLOUDINARY_API_SECRET: secret da API do Cloudinary
- ADMIN_USER: usuário administrador inicial
- ADMIN_PASS: senha do administrador inicial
- SESSION_SECRET: segredo da sessão

### Exemplo de configuração do MongoDB Atlas
1. Crie um cluster no MongoDB Atlas.
2. Obtenha a string de conexão do cluster.
3. Defina a variável de ambiente MONGODB_URI no ambiente do projeto, por exemplo:
   `MONGODB_URI=mongodb+srv://<usuario>:<senha>@<cluster>/<dbname>?retryWrites=true&w=majority`
4. Reinicie a aplicação para que ela passe a usar o banco em nuvem.

### Configuração do Cloudinary
1. Crie uma conta no Cloudinary.
2. No painel, copie o Cloud Name, API Key e API Secret.
3. Defina essas variáveis no Render ou no ambiente local.
4. Com isso, uploads de fotos e áudios serão enviados para a Cloudinary em vez de armazenar localmente.

## Deploy no Render
1. Conecte este repositório ao Render.
2. Crie um Web Service apontando para a pasta do projeto.
3. Defina as variáveis de ambiente acima no painel do Render.
4. Use a URL pública do serviço em BASE_URL, por exemplo: `https://seu-app.onrender.com`.
5. Faça o deploy e acesse a URL gerada.
