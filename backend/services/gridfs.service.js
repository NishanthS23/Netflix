import mongoose from 'mongoose';
import { Readable } from 'stream';

let videoBucket;
let thumbnailBucket;

export const getVideoBucket = () => {
  if (!videoBucket && mongoose.connection.db) {
    videoBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'videos',
    });
  }
  return videoBucket;
};

export const getThumbnailBucket = () => {
  if (!thumbnailBucket && mongoose.connection.db) {
    thumbnailBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'thumbnails',
    });
  }
  return thumbnailBucket;
};

/**
 * Uploads a readable stream to GridFS bucket.
 *
 * @param {GridFSBucket} bucket
 * @param {Readable} readStream
 * @param {string} filename
 * @param {string} contentType
 * @returns {Promise<ObjectId>}
 */
export const uploadStreamToGridFS = (bucket, readStream, filename, contentType) => {
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: contentType,
      metadata: { uploadedAt: new Date() },
    });

    readStream
      .pipe(uploadStream)
      .on('error', (err) => reject(err))
      .on('finish', () => resolve(uploadStream.id));
  });
};

/**
 * Uploads an in-memory buffer to GridFS bucket.
 *
 * @param {GridFSBucket} bucket
 * @param {Buffer} buffer
 * @param {string} filename
 * @param {string} contentType
 * @returns {Promise<ObjectId>}
 */
export const uploadBufferToGridFS = (bucket, buffer, filename, contentType) => {
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: contentType,
      metadata: { uploadedAt: new Date() },
    });

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);

    readable
      .pipe(uploadStream)
      .on('error', (err) => reject(err))
      .on('finish', () => resolve(uploadStream.id));
  });
};

/**
 * Deletes a file by ObjectId from GridFS bucket.
 *
 * @param {GridFSBucket} bucket
 * @param {string|ObjectId} id
 */
export const deleteFileFromGridFS = async (bucket, id) => {
  if (!id) return;
  try {
    const objectId = typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
    await bucket.delete(objectId);
  } catch (error) {
    console.warn(`[GridFS Warning] Failed to delete file ${id}: ${error.message}`);
  }
};
