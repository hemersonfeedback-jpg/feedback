const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function migrateData() {
  try {
    const client = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('🔄 Iniciando migração de dados...\n');
    
    // Conectar ao banco "test"
    const testDb = client.connection.getClient().db('test');
    
    // Conectar ao banco "feedback"
    const feedbackDb = client.connection.getClient().db('feedback');
    
    // Migrar coleção "feedbacks"
    const feedbacksTest = testDb.collection('feedbacks');
    const feedbacksCount = await feedbacksTest.countDocuments();
    
    if (feedbacksCount > 0) {
      const feedbackDocs = await feedbacksTest.find({}).toArray();
      await feedbackDb.collection('feedbacks').insertMany(feedbackDocs);
      console.log(`✅ Migrados ${feedbacksCount} feedbacks de test → feedback`);
    } else {
      console.log('ℹ️  Nenhum feedback em test.feedbacks');
    }
    
    // Migrar coleção "admins"
    const adminsTest = testDb.collection('admins');
    const adminsCount = await adminsTest.countDocuments();
    
    if (adminsCount > 0) {
      const adminDocs = await adminsTest.find({}).toArray();
      await feedbackDb.collection('admins').insertMany(adminDocs);
      console.log(`✅ Migrados ${adminsCount} admins de test → feedback`);
    } else {
      console.log('ℹ️  Nenhum admin em test.admins');
    }
    
    console.log('\n📋 Verificando dados no banco "feedback" após migração:\n');
    
    // Verificar feedbacks
    const feedbacks = await feedbackDb.collection('feedbacks').find({}).toArray();
    console.log(`📊 Total de feedbacks: ${feedbacks.length}`);
    feedbacks.forEach((f, i) => {
      console.log(`\n   ${i + 1}. ${f.name} (${f.email})`);
      console.log(`      Data: ${f.createdAt}`);
      console.log(`      Mensagem: ${f.message.substring(0, 50)}...`);
    });
    
    // Verificar admins
    const admins = await feedbackDb.collection('admins').find({}).toArray();
    console.log(`\n👤 Total de admins: ${admins.length}`);
    admins.forEach((a) => {
      console.log(`   • ${a.username}`);
    });
    
    console.log('\n✅ Migração concluída!');
    await mongoose.connection.close();
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

migrateData();
