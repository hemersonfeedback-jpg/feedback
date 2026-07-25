const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function findFeedbacks() {
  try {
    // Conectar ao cluster
    const client = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    
    const adminDb = client.connection.getClient().db('admin');
    const { databases } = await adminDb.admin().listDatabases();
    
    console.log('🔍 Procurando por dados em todos os bancos...\n');
    
    for (const dbInfo of databases) {
      const dbName = dbInfo.name;
      if (['admin', 'local', 'config'].includes(dbName)) continue;
      
      const db = client.connection.getClient().db(dbName);
      const collections = await db.listCollections().toArray();
      
      for (const col of collections) {
        const colName = col.name;
        const collection = db.collection(colName);
        const count = await collection.countDocuments();
        
        if (count > 0) {
          console.log(`✅ Encontrados ${count} documentos em: ${dbName}.${colName}`);
          
          const docs = await collection.find({}).limit(2).toArray();
          docs.forEach((doc, i) => {
            console.log(`\n   Documento ${i + 1}:`);
            console.log(`   ${JSON.stringify(doc, null, 2).split('\n').join('\n   ')}`);
          });
          console.log('---');
        }
      }
    }
    
    await mongoose.connection.close();
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

findFeedbacks();
