
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export const uploadToCloudinary = (
    buffer: Buffer,
    folder: string,
    resource_type: 'raw' | 'image' | 'video' | 'auto' = 'auto', 
    public_id?: string
): Promise<import('cloudinary').UploadApiResponse> => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: resource_type,
                public_id: public_id, 
            },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary Upload Error:', error);
                    return reject(error);
                }
                if (!result) {
                     console.error('Cloudinary Upload Error: No result returned.');
                     return reject(new Error('Cloudinary upload failed: No result.'));
                }
                resolve(result);
            }
        );

        const readableStream = new Readable();
        readableStream._read = () => {}; 
        readableStream.push(buffer);
        readableStream.push(null); 

        readableStream.pipe(stream);
    });
};

export default cloudinary;