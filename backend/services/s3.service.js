import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';
import { ENV_VARS } from '../config/env.config.js';

let s3ClientInstance = null;

/**
 * Returns a singleton instance of the AWS S3 client.
 * Supports standard AWS credentials, environment credentials, and custom endpoints (MinIO/LocalStack).
 */
export const getS3Client = () => {
  if (!s3ClientInstance) {
    const config = {
      region: ENV_VARS.AWS_REGION || 'us-east-1',
    };

    if (ENV_VARS.AWS_ACCESS_KEY_ID && ENV_VARS.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: ENV_VARS.AWS_ACCESS_KEY_ID,
        secretAccessKey: ENV_VARS.AWS_SECRET_ACCESS_KEY,
      };
    }

    if (ENV_VARS.AWS_S3_ENDPOINT) {
      config.endpoint = ENV_VARS.AWS_S3_ENDPOINT;
      config.forcePathStyle = true;
    }

    s3ClientInstance = new S3Client(config);
  }
  return s3ClientInstance;
};

/**
 * Retrieves the configured S3 bucket name.
 */
export const getS3BucketName = () => {
  return ENV_VARS.AWS_S3_BUCKET_NAME || ENV_VARS.S3_BUCKET_NAME || '';
};

/**
 * Checks whether S3 bucket storage is configured and enabled.
 */
export const isS3Enabled = () => {
  return Boolean(getS3BucketName());
};

/**
 * Uploads a file from local disk to AWS S3 using multipart upload for reliable handling of large videos.
 *
 * @param {Object} options
 * @param {string} options.filePath - Local filesystem path of the file to upload
 * @param {string} options.key - Target S3 object key (path inside bucket)
 * @param {string} [options.contentType] - MIME type of the file
 * @param {string} [options.bucketName] - S3 bucket name override
 * @returns {Promise<{ key: string, bucket: string, location: string }>}
 */
export const uploadFileToS3 = async ({ filePath, key, contentType, bucketName = getS3BucketName() }) => {
  if (!bucketName) {
    throw new Error('S3 bucket name is not configured.');
  }

  const fileStream = fs.createReadStream(filePath);
  const parallelUpload = new Upload({
    client: getS3Client(),
    params: {
      Bucket: bucketName,
      Key: key,
      Body: fileStream,
      ContentType: contentType || 'application/octet-stream',
    },
    partSize: 5 * 1024 * 1024, // 5MB chunk size for multipart upload
    queueSize: 4,
  });

  const result = await parallelUpload.done();
  return {
    key,
    bucket: bucketName,
    location: result.Location || `https://${bucketName}.s3.${ENV_VARS.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`,
  };
};

/**
 * Retrieves an object stream from S3 with optional HTTP Range header support for video seeking.
 *
 * @param {Object} options
 * @param {string} options.key - S3 object key
 * @param {string} [options.range] - HTTP Range header string (e.g. "bytes=0-1048575")
 * @param {string} [options.bucketName] - S3 bucket name override
 * @returns {Promise<{ stream: any, contentLength: number, contentRange?: string, contentType?: string, acceptRanges: string, statusCode: number }>}
 */
export const getS3ObjectStream = async ({ key, range, bucketName = getS3BucketName() }) => {
  const client = getS3Client();
  const params = {
    Bucket: bucketName,
    Key: key,
  };

  if (range) {
    params.Range = range;
  }

  const command = new GetObjectCommand(params);
  const response = await client.send(command);

  return {
    stream: response.Body,
    contentLength: response.ContentLength,
    contentRange: response.ContentRange,
    contentType: response.ContentType,
    acceptRanges: response.AcceptRanges || 'bytes',
    statusCode: range ? 206 : 200,
  };
};

/**
 * Deletes an object from AWS S3.
 *
 * @param {Object} options
 * @param {string} options.key - S3 object key to delete
 * @param {string} [options.bucketName] - S3 bucket name override
 */
export const deleteFromS3 = async ({ key, bucketName = getS3BucketName() }) => {
  if (!key || !bucketName) return;
  try {
    const client = getS3Client();
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    await client.send(command);
  } catch (error) {
    console.error(`Failed to delete S3 object ${key} from ${bucketName}:`, error.message);
  }
};
