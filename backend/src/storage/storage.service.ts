import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { MulterFile } from '../common/interfaces/multer.interface';

export interface UploadOptions {
  bucket: 'images' | 'models';
  path: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  url: string;
  key: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: AWS.S3;
  private readonly buckets = {
    images: 'box-images',
    models: 'ml-models',
  };

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT');
    const port = this.configService.get<number>('MINIO_PORT');
    const useSSL = this.configService.get<boolean>('MINIO_USE_SSL', false);
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY');

    this.s3 = new AWS.S3({
      endpoint: `http${useSSL ? 's' : ''}://${endpoint}:${port}`,
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      s3ForcePathStyle: true,
      signatureVersion: 'v4',
    });

    void this.ensureBucketsExist();
  }

  private async ensureBucketsExist(): Promise<void> {
    for (const [bucketType, bucketName] of Object.entries(this.buckets)) {
      try {
        await this.s3.headBucket({ Bucket: bucketName }).promise();
        this.logger.log(`Bucket '${bucketName}' exists`);

        // Ensure bucket policy is set even if bucket exists
        await this.setBucketPolicy(
          bucketType as keyof typeof this.buckets,
          bucketName,
        );
      } catch (error: unknown) {
        const awsError = error as AWS.AWSError;
        if (awsError.statusCode === 404) {
          try {
            // Create bucket with public-read ACL for images bucket
            const params: AWS.S3.CreateBucketRequest = {
              Bucket: bucketName,
              ACL: bucketType === 'images' ? 'public-read' : 'private',
            };

            await this.s3.createBucket(params).promise();
            this.logger.log(`Created bucket '${bucketName}'`);

            // Set bucket policy based on bucket type
            await this.setBucketPolicy(
              bucketType as keyof typeof this.buckets,
              bucketName,
            );
          } catch (createError: unknown) {
            this.logger.error(
              `Failed to create bucket '${bucketName}':`,
              createError,
            );
          }
        } else {
          this.logger.error(`Error checking bucket '${bucketName}':`, error);
        }
      }
    }
  }

  private async setBucketPolicy(
    bucketType: keyof typeof this.buckets,
    bucketName: string,
  ): Promise<void> {
    try {
      if (bucketType === 'images') {
        // Make images bucket public for read access
        const publicPolicy = {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'PublicReadGetObject',
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${bucketName}/*`],
            },
            {
              Sid: 'PublicReadListBucket',
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:ListBucket'],
              Resource: [`arn:aws:s3:::${bucketName}`],
            },
          ],
        };

        await this.s3
          .putBucketPolicy({
            Bucket: bucketName,
            Policy: JSON.stringify(publicPolicy),
          })
          .promise();

        // Also set bucket ACL to public-read
        await this.s3
          .putBucketAcl({
            Bucket: bucketName,
            ACL: 'public-read',
          })
          .promise();

        this.logger.log(`Set public read policy for bucket '${bucketName}'`);
      } else {
        // Keep other buckets (like models) private
        const privatePolicy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Deny',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${bucketName}/*`],
            },
          ],
        };

        await this.s3
          .putBucketPolicy({
            Bucket: bucketName,
            Policy: JSON.stringify(privatePolicy),
          })
          .promise();

        this.logger.log(`Bucket '${bucketName}' kept private`);
      }
    } catch (error: unknown) {
      this.logger.error(
        `Failed to set policy for bucket '${bucketName}':`,
        error,
      );
    }
  }

  async uploadFile(
    file: MulterFile,
    options: UploadOptions,
  ): Promise<UploadResult> {
    const { bucket, path, contentType, metadata } = options;
    const timestamp = Date.now();
    const fileExtension = file.originalname.split('.').pop() || '';
    const key = `${path}/${timestamp}.${fileExtension}`;

    try {
      await this.s3
        .upload({
          Bucket: this.buckets[bucket],
          Key: key,
          Body: file.buffer,
          ContentType: contentType || file.mimetype,
          Metadata: metadata || {},
          ACL: 'public-read',
        })
        .promise();

      this.logger.log(`File uploaded successfully: ${key}`);

      // Generate public URL using MINIO_PUBLIC_ENDPOINT
      const publicUrl = this.getFileUrl(bucket, key);

      return {
        key,
        url: publicUrl,
      };
    } catch (error: unknown) {
      const errorMessage = (error as Error)?.message || 'Unknown error';
      this.logger.error(`Failed to upload file: ${errorMessage}`);
      throw new Error(`Failed to upload file: ${errorMessage}`);
    }
  }

  async deleteFile(
    bucket: keyof typeof this.buckets,
    key: string,
  ): Promise<void> {
    try {
      await this.s3
        .deleteObject({
          Bucket: this.buckets[bucket],
          Key: key,
        })
        .promise();

      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error: unknown) {
      const errorMessage = (error as Error)?.message || 'Unknown error';
      this.logger.error(`Failed to delete file: ${errorMessage}`);
      throw new Error(`Failed to delete file: ${errorMessage}`);
    }
  }

  getFileUrl(bucket: keyof typeof this.buckets, key: string): string {
    const publicEndpoint = this.configService.get<string>(
      'MINIO_PUBLIC_ENDPOINT',
    );
    const port = this.configService.get<number>('MINIO_PORT');
    const useSSL = this.configService.get<boolean>('MINIO_USE_SSL', false);

    return `http${useSSL ? 's' : ''}://${publicEndpoint}:${port}/${this.buckets[bucket]}/${key}`;
  }

  async getSignedUrl(
    bucket: keyof typeof this.buckets,
    key: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const signedUrl = await this.s3.getSignedUrlPromise('getObject', {
        Bucket: this.buckets[bucket],
        Key: key,
        Expires: expiresIn,
      });

      return signedUrl;
    } catch (error: unknown) {
      const errorMessage = (error as Error)?.message || 'Unknown error';
      this.logger.error(`Failed to generate signed URL: ${errorMessage}`);
      throw new Error(`Failed to generate signed URL: ${errorMessage}`);
    }
  }

  // Convenience methods for specific file types
  async uploadBoxImage(file: MulterFile, boxId: string): Promise<UploadResult> {
    return this.uploadFile(file, {
      bucket: 'images',
      path: `boxes/${boxId}`,
      metadata: {
        type: 'box-image',
        boxId: boxId,
      },
    });
  }

  async uploadModel(
    file: MulterFile,
    modelName: string,
  ): Promise<UploadResult> {
    const result = await this.uploadFile(file, {
      bucket: 'models',
      path: `models/${modelName}`,
      contentType: 'application/octet-stream',
      metadata: {
        type: 'ml-model',
        modelName: modelName,
      },
    });

    // For models bucket (private), return a signed URL instead of public URL
    const signedUrl = await this.getSignedUrl('models', result.key);

    return {
      ...result,
      url: signedUrl,
    };
  }

  // Get signed URL for private model files
  async getModelUrl(key: string, expiresIn: number = 3600): Promise<string> {
    return this.getSignedUrl('models', key, expiresIn);
  }
}
