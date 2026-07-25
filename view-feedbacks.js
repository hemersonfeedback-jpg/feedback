const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const feedbackSchema = new mongoose.Schema({
  clientName: String,
  city: String,
  serviceDate: String,
  serviceRating: Number,
  layoutExpectation: String,
  improvements: [String],
  teamRating: Number,
  message: String,
  testimonialAllowed: Boolean,
  recommend: Boolean,
  photoUrls: [String],
  photoPublicIds: [String],
  createdAt: Date
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

async function viewFeedbacks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('\n📊 FEEDBACKS NO MONGODB\n');
    console.log('=' .repeat(60));
    
    const feedbacks = await Feedback.find({}).sort({ createdAt: -1 });
    
    if (feedbacks.length === 0) {
      console.log('ℹ️  Nenhum feedback encontrado ainda.\n');
      console.log('💡 Envie um feedback em http://localhost:3000\n');
    } else {
      console.log(`✅ Total: ${feedbacks.length} feedback(s)\n`);
      
      feedbacks.forEach((f, i) => {
        console.log(`${i + 1}. ${(f.clientName || 'Sem nome').toUpperCase()}`);
        console.log(`   📍 Cidade: ${f.city || '-'}`);
        console.log(`   ⭐ Nota: ${f.serviceRating || '-'}`);
        console.log(`   📝 Mensagem: ${(f.message || '').substring(0, 80)}${(f.message || '').length > 80 ? '...' : ''}`);
        console.log(`   📷 Fotos: ${f.photoUrls ? f.photoUrls.length : 0}`);
        console.log(`   📅 Data: ${new Date(f.createdAt).toLocaleString('pt-BR')}`);
        console.log(`   ID: ${f._id}`);
        console.log('');
      });
    }
    
    console.log('=' .repeat(60));
    console.log('\n💡 Para visualizar interativamente, use MongoDB Compass:');
    console.log('   URI: ' + process.env.MONGODB_URI.split('?')[0]);
    console.log('   Banco: feedback');
    console.log('   Coleção: feedbacks\n');
    
    await mongoose.connection.close();
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

viewFeedbacks();
