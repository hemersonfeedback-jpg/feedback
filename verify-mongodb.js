const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function verifyMongoDB() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ MONGODB_URI não configurada no .env');
    return;
  }
  
  console.log('🔍 Verificando conexão com MongoDB...');
  console.log(`📍 Conectando em: ${mongoUri.split('@')[1]}`);
  
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    
    console.log('✅ Conexão com MongoDB estabelecida!');
    
    // Listar bancos de dados
    const adminDb = mongoose.connection.getClient().db('admin');
    const { databases } = await adminDb.admin().listDatabases();
    console.log('\n📚 Bancos de dados disponíveis:');
    databases.forEach(db => console.log(`  • ${db.name}`));
    
    // Listar coleções no banco "feedback"
    const feedbackDb = mongoose.connection.db;
    const collections = await feedbackDb.listCollections().toArray();
    console.log('\n📋 Coleções no banco "feedback":');
    collections.forEach(col => console.log(`  • ${col.name}`));
    
    // Verificar registros na coleção "feedbacks"
    const feedbacksCollection = feedbackDb.collection('feedbacks');
    const count = await feedbacksCollection.countDocuments();
    console.log(`\n📊 Total de documentos em "feedbacks": ${count}`);
    
    if (count > 0) {
      console.log('\n📄 Primeiros registros:');
      const docs = await feedbacksCollection.find({}).limit(3).toArray();
      docs.forEach((doc, i) => {
        console.log(`\n  ${i + 1}. ID: ${doc._id}`);
        console.log(`     Nome: ${doc.name}`);
        console.log(`     Email: ${doc.email}`);
        console.log(`     Data: ${doc.createdAt}`);
        if (doc.photo) console.log(`     Foto: ${doc.photo.substring(0, 50)}...`);
      });
    } else {
      console.log('⚠️  Nenhum documento encontrado. Envie um feedback primeiro!');
    }
    
    await mongoose.connection.close();
    
  } catch (err) {
    console.error('❌ Erro ao conectar:', err.message);
    process.exit(1);
  }
}

verifyMongoDB();
