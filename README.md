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

### Exemplo de configuração do MongoDB Atlas
1. Crie um cluster no MongoDB Atlas.
2. Obtenha a string de conexão do cluster.
3. Defina a variável de ambiente MONGODB_URI no ambiente do projeto, por exemplo:
   `MONGODB_URI=mongodb+srv://<usuario>:<senha>@<cluster>/<dbname>?retryWrites=true&w=majority`
4. Reinicie a aplicação para que ela passe a usar o banco em nuvem.

## Deploy
- GitHub: conecte o repositório ao GitHub
- Render: crie um Web Service apontando para este repositório
- MongoDB Atlas: configure a string de conexão em variáveis de ambiente
