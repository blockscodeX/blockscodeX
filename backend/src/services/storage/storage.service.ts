import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private cdnUrl: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('S3_REGION') || 'sgp1';
    const endpoint = this.configService.get<string>('S3_ENDPOINT') || '';
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY') || '';
    const secretAccessKey = this.configService.get<string>('S3_SECRET_KEY') || '';
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME') || '';
    // Public CDN/origin URL for the bucket: https://<bucket>.<region>.digitaloceanspaces.com
    this.cdnUrl =
      this.configService.get<string>('S3_CDN_URL') ||
      `https://${this.bucketName}.${region}.digitaloceanspaces.com`;

    if (!endpoint || !accessKeyId || !secretAccessKey || !this.bucketName) {
      this.logger.warn('Storage (DigitalOcean Spaces) configuration is missing. File uploads will fail.');
    }

    this.s3Client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // DigitalOcean Spaces uses virtual-hosted-style URLs
      forcePathStyle: false,
    });
  }

  /**
   * Upload a file to DigitalOcean Spaces.
   * @param fileData - The file content (Buffer, Stream, or Blob)
   * @param filename - Original filename to extract extension
   * @param mimetype - Content type of the file
   * @param folder   - Logical sub-folder inside the bucket
   * @returns Public URL of the uploaded file
   */
  async uploadFile(
    fileData: any,
    filename: string,
    mimetype: string,
    folder: string = 'uploads'
  ): Promise<string> {
    if (!fileData) {
      throw new Error('File data is required');
    }

    const fileExtension = filename.split('.').pop();
    const key = `${folder}/${uuidv4()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: fileData,
      ContentType: mimetype,
      ACL: 'public-read',
    });

    try {
      this.logger.log(`Uploading file ${filename} to DigitalOcean Spaces: ${this.bucketName}/${key}`);
      await this.s3Client.send(command);
      this.logger.log(`File uploaded successfully: ${key}`);

      return `${this.cdnUrl}/${key}`;
    } catch (error) {
      this.logger.error(`Failed to upload file ${filename}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Delete a file from DigitalOcean Spaces by its public URL.
   * Non-throwing: logs errors but doesn't break the caller.
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl) return;

    try {
      const key = this.extractKeyFromUrl(fileUrl);

      if (!key) {
        this.logger.warn(`Could not extract S3 key from URL: ${fileUrl}`);
        return;
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      this.logger.log(`Deleting file from DigitalOcean Spaces: ${this.bucketName}/${key}`);
      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
      // Non-throwing: don't block the caller if cleanup fails
    }
  }

  /**
   * Extract the object key from a DigitalOcean Spaces public URL.
   * Supports:
   *  - https://<bucket>.<region>.digitaloceanspaces.com/<key>
   *  - https://<bucket>.<region>.cdn.digitaloceanspaces.com/<key>
   *  - Legacy Supabase URLs (graceful fallback for existing stored URLs)
   */
  private extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);

      // DigitalOcean Spaces: hostname starts with <bucket>.<region>.digitaloceanspaces.com
      if (urlObj.hostname.includes('digitaloceanspaces.com')) {
        // pathname is /<key>, strip leading slash
        return urlObj.pathname.replace(/^\//, '');
      }

      // Legacy Supabase fallback: /storage/v1/object/public/<bucket>/<key>
      const supabaseMatch = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
      if (supabaseMatch) return supabaseMatch[1];

      // Generic fallback: skip first path segment (assumed to be bucket)
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) return parts.slice(1).join('/');

      return null;
    } catch {
      return null;
    }
  }
}
