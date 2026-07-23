require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

async function checkMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('MongoDB: MONGODB_URI not set');
    return false;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
    console.log('MongoDB: connected');
    await mongoose.disconnect();
    return true;
  } catch (err) {
    console.error('MongoDB: connection error:', err.message);
    return false;
  }
}

async function checkCloudinary() {
  try {
    // cloudinary picks config from env or we set explicitly
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || undefined,
      api_key: process.env.CLOUDINARY_API_KEY || undefined,
      api_secret: process.env.CLOUDINARY_API_SECRET || undefined,
      secure: true
    });

    if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.log('Cloudinary: credentials not set');
      return false;
    }

    // Try a small unsigned upload by uploading a tiny buffer
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
    const buffer = Buffer.from(pngBase64, 'base64');
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: 'test-connection', resource_type: 'image' }, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
      stream.end(buffer);
    });
    console.log('Cloudinary: upload succeeded, url=', result.secure_url);
    // Optionally delete the resource
    try { await cloudinary.uploader.destroy(result.public_id, { resource_type: 'image' }); } catch(_){}
    return true;
  } catch (err) {
    console.error('Cloudinary: error:', err.message);
    return false;
  }
}

(async () => {
  console.log('Starting service checks...');
  const mongoOk = await checkMongo();
  const cloudOk = await checkCloudinary();
  console.log('Summary:', { mongoOk, cloudOk });
  process.exit(mongoOk && cloudOk ? 0 : 2);
})();
