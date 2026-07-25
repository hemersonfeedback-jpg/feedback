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

async function checkTestimonials() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('\n📋 VERIFICANDO DEPOIMENTOS:\n');
    
    const feedbacks = await Feedback.find({});
    feedbacks.forEach((f, i) => {
      console.log(`${i + 1}. ${f.clientName}`);
      console.log(`   testimonialAllowed: ${f.testimonialAllowed}`);
      console.log(`   recommend: ${f.recommend}`);
      console.log('');
    });
    
    const authorized = feedbacks.filter(f => f.testimonialAllowed === true);
    console.log(`✅ Total autorizado: ${authorized.length}/${feedbacks.length}\n`);
    
    if (authorized.length === 0) {
      console.log('❌ Nenhum depoimento autorizado!');
      console.log('💡 Precisamos atualizar os registros para testimonialAllowed: true');
    }
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

checkTestimonials();
