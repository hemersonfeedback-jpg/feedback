const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function viewAdmins() {
  try {
    const client = await mongoose.connect(process.env.MONGODB_URI);
    const db = client.connection.db;
    
    console.log('👤 Admins no MongoDB:');
    const admins = await db.collection('admins').find({}).toArray();
    
    if (admins.length === 0) {
      console.log('❌ Nenhum admin encontrado');
    } else {
      admins.forEach((a, i) => {
        console.log(`\n${i + 1}. Usuario: ${a.username}`);
        console.log(`   Hash: ${a.passwordHash.substring(0, 30)}...`);
      });
    }
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

viewAdmins();
