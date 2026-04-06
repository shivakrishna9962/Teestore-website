import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a Buffer to Cloudinary and returns the secure URL.
 */
export async function uploadToCloudinary(
    buffer: Buffer,
    folder = 'products'
): Promise<string> {
    return new Promise((resolve, reject) => {
        cloudinary.uploader
            .upload_stream({ folder, resource_type: 'image' }, (err, result) => {
                if (err || !result) return reject(err ?? new Error('Cloudinary upload failed'));
                resolve(result.secure_url);
            })
            .end(buffer);
    });
}

/**
 * Uploads a base64 data URI to Cloudinary and returns the secure URL.
 */
export async function uploadBase64ToCloudinary(
    base64DataUri: string,
    folder = 'products'
): Promise<string> {
    const result = await cloudinary.uploader.upload(base64DataUri, {
        folder,
        resource_type: 'image',
    });
    return result.secure_url;
}
