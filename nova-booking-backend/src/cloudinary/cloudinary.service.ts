import { Injectable } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  uploadFile(
    file: Express.Multer.File,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream((error, result) => {
        if (error) {
          console.error('Cloudinary Upload Error Details:', error);
          return reject(new Error(JSON.stringify(error)));
        }
        if (!result)
          return reject(new Error('Upload failed: result is undefined'));
        resolve(result);
      });

      streamifier.createReadStream(file.buffer).pipe(upload);
    });
  }

  async uploadFiles(files: Express.Multer.File[]): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file));
    const results = await Promise.all(uploadPromises);
    return results.map((result) => (result as UploadApiResponse).secure_url);
  }
}
