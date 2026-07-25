const dotenv = require('dotenv');
dotenv.config();
const cloudinary = require('cloudinary').v2;

const hasConfig = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);
console.log('hasCloudinaryConfig=', hasConfig);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

(async () => {
  try {
    const ping = await cloudinary.api.ping();
    console.log('ping_result=', ping);
  } catch (err) {
    console.error('ping_failed=', err.message || err);
    process.exitCode = 1;
    return;
  }

  try {
    const data = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
      'base64'
    );

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'atual-layout-feedback/verification', resource_type: 'image' },
        (error, res) => {
          if (error) return reject(error);
          resolve(res);
        }
      );
      stream.end(data);
    });

    console.log('upload_success=', { secure_url: result.secure_url, public_id: result.public_id });

    const destroy = await cloudinary.uploader.destroy(result.public_id, { resource_type: 'image' });
    console.log('delete_result=', destroy);
  } catch (err) {
    console.error('upload_failed=', err.message || err);
    process.exitCode = 1;
  }
})();
