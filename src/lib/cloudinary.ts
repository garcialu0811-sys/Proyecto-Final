import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(file: Buffer, folder: string = 'qrshop'): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result?.secure_url || '');
      }
    );
    uploadStream.end(file);
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export function getPublicIdFromUrl(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.(jpg|jpeg|png|gif|webp)$/);
  return match ? match[1] : null;
}

export default cloudinary;
