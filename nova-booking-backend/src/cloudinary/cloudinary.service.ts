import { Injectable } from '@nestjs/common';
import {
  UploadApiErrorResponse,
  UploadApiResponse,
  v2 as cloudinary,
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

  extractPublicId(url: string): string | null {
    try {
      const parts = url.split('/upload/');
      if (parts.length < 2) return null;
      const pathWithExtension = parts[1].split('/').slice(1).join('/');
      const publicId = pathWithExtension.substring(
        0,
        pathWithExtension.lastIndexOf('.'),
      );
      return publicId || pathWithExtension; // fallback if no extension
    } catch {
      return null;
    }
  }

  async deleteFile(publicId: string): Promise<any> {
    try {
      return await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Cloudinary Delete Error:', error);
      return null;
    }
  }

  async deleteFiles(urls: string[]): Promise<any[]> {
    const promises = urls.map((url) => {
      const publicId = this.extractPublicId(url);
      if (publicId) {
        return this.deleteFile(publicId);
      }
      return Promise.resolve(null);
    });
    return Promise.all(promises);
  }
}
