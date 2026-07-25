const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

async function resetAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const username = 'hemerson';
    const password = 'admin2307';
    
    const adminSchema = new mongoose.Schema({
      username: { type: String, unique: true },
      passwordHash: String,
    });
    
    const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
    
    // Deletar admin existente
    await Admin.deleteMany({ username });
    
    // Criar novo admin
    const hash = await bcrypt.hash(password, 10);
    await Admin.create({ username, passwordHash: hash });
    
    console.log('✅ Admin criado/resetado com sucesso!');
    console.log(`   Usuário: ${username}`);
    console.log(`   Senha: ${password}`);
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

resetAdmin();
