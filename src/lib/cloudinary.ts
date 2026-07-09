import { v2 as cloudinary } from 'cloudinary';

let configured = false;

function ensureConfig() {
  if (configured) return;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  console.log('[Cloudinary] ensureConfig:', {
    hasCloudName: !!cloudName,
    hasApiKey: !!apiKey,
    hasApiSecret: !!apiSecret,
    cloudNameValue: cloudName ? cloudName.substring(0, 3) + '...' : 'MISSING',
  });
  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    configured = true;
    console.log('[Cloudinary] Configured successfully');
  } else {
    console.log('[Cloudinary] Configuration FAILED - missing env vars');
  }
}

export async function uploadImage(file: Buffer, folder: string = 'variedades-coatan'): Promise<string> {
  ensureConfig();
  if (!configured) {
    throw new Error('Cloudinary no está configurado. Falta CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET.');
  }
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary] Upload error:', error.message);
          return reject(error);
        }
        console.log('[Cloudinary] Upload success:', result?.secure_url);
        resolve(result?.secure_url || '');
      }
    );
    uploadStream.end(file);
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  ensureConfig();
  if (!configured) return;
  await cloudinary.uploader.destroy(publicId);
}

export function getPublicIdFromUrl(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.(jpg|jpeg|png|gif|webp)$/);
  return match ? match[1] : null;
}

export default cloudinary;
