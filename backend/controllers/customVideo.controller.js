import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import CustomVideo from '../models/customVideo.model.js';
import {
  isS3Enabled,
  uploadFileToS3,
  getS3ObjectStream,
  deleteFromS3,
  getS3BucketName,
} from '../services/s3.service.js';

/**
 * Uploads a custom video and optional thumbnail to AWS S3 bucket (or local disk fallback)
 * and saves metadata in PostgreSQL database.
 */
export const uploadCustomVideo = async (req, res) => {
  const videoFile = req.files?.['video']?.[0];
  const thumbnailFile = req.files?.['thumbnail']?.[0];

  if (!videoFile) {
    return res.status(400).json({ success: false, message: 'Video file is required' });
  }

  const { title, description, category } = req.body;
  if (!title || title.trim() === '') {
    // Clean up uploaded temp files if validation fails
    if (fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
    if (thumbnailFile && fs.existsSync(thumbnailFile.path)) fs.unlinkSync(thumbnailFile.path);
    return res.status(400).json({ success: false, message: 'Title is required' });
  }

  let s3VideoKey = null;
  let s3ThumbKey = null;
  let s3Bucket = null;

  try {
    let videoPath = null;
    let thumbnailPath = null;

    if (isS3Enabled()) {
      // 1. Primary: Upload directly to AWS S3 Bucket
      s3Bucket = getS3BucketName();
      const videoExt = path.extname(videoFile.originalname) || '.mp4';
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      s3VideoKey = `videos/video-${uniqueSuffix}${videoExt}`;

      await uploadFileToS3({
        filePath: videoFile.path,
        key: s3VideoKey,
        contentType: videoFile.mimetype || 'video/mp4',
        bucketName: s3Bucket,
      });

      if (thumbnailFile) {
        const thumbExt = path.extname(thumbnailFile.originalname) || '.jpg';
        s3ThumbKey = `thumbnails/thumbnail-${uniqueSuffix}${thumbExt}`;
        await uploadFileToS3({
          filePath: thumbnailFile.path,
          key: s3ThumbKey,
          contentType: thumbnailFile.mimetype || 'image/jpeg',
          bucketName: s3Bucket,
        });
      }

      // Clean up temporary files from staging disk after S3 upload completes
      if (fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
      if (thumbnailFile && fs.existsSync(thumbnailFile.path)) fs.unlinkSync(thumbnailFile.path);
    } else {
      // 2. Secondary fallback: Save to local disk directory if S3 is not configured
      const uploadsDir = path.resolve('uploads');
      const videosDir = path.join(uploadsDir, 'videos');
      const thumbsDir = path.join(uploadsDir, 'thumbnails');
      if (!fs.existsSync(videosDir)) fs.mkdirSync(videosDir, { recursive: true });
      if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });

      const destVideoPath = path.join(videosDir, path.basename(videoFile.path));
      fs.copyFileSync(videoFile.path, destVideoPath);
      if (fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
      videoPath = path.relative(process.cwd(), destVideoPath).replace(/\\/g, '/');

      if (thumbnailFile) {
        const destThumbPath = path.join(thumbsDir, path.basename(thumbnailFile.path));
        fs.copyFileSync(thumbnailFile.path, destThumbPath);
        if (fs.existsSync(thumbnailFile.path)) fs.unlinkSync(thumbnailFile.path);
        thumbnailPath = path.relative(process.cwd(), destThumbPath).replace(/\\/g, '/');
      }
    }

    // Save video metadata to PostgreSQL database
    const newVideo = new CustomVideo({
      title: title.trim(),
      description: (description || '').trim(),
      category: (category || 'General').trim(),
      videoPath,
      videoFilename: videoFile.originalname,
      videoContentType: videoFile.mimetype || 'video/mp4',
      videoSize: videoFile.size,
      thumbnailPath,
      s3Key: s3VideoKey,
      s3ThumbnailKey: s3ThumbKey,
      s3Bucket: s3Bucket,
      thumbnailFileId: (s3ThumbKey || thumbnailPath) ? crypto.randomBytes(12).toString('hex') : null,
      userId: req.user._id,
      username: req.user.username,
    });

    await newVideo.save();

    res.status(201).json({
      success: true,
      message: s3VideoKey
        ? 'Video uploaded to AWS S3 bucket and saved to database successfully'
        : 'Video saved locally and in database successfully',
      video: newVideo,
    });
  } catch (error) {
    console.error('Error saving custom video:', error);

    // Rollback: delete S3 objects if database insertion fails
    if (s3VideoKey) {
      await deleteFromS3({ key: s3VideoKey, bucketName: s3Bucket }).catch(() => {});
    }
    if (s3ThumbKey) {
      await deleteFromS3({ key: s3ThumbKey, bucketName: s3Bucket }).catch(() => {});
    }

    // Rollback: delete temp disk files if still present
    if (videoFile && fs.existsSync(videoFile.path)) {
      try {
        fs.unlinkSync(videoFile.path);
      } catch (e) {
        // ignore
      }
    }
    if (thumbnailFile && fs.existsSync(thumbnailFile.path)) {
      try {
        fs.unlinkSync(thumbnailFile.path);
      } catch (e) {
        // ignore
      }
    }

    res.status(500).json({ success: false, message: 'Failed to upload video: ' + error.message });
  }
};

/**
 * Retrieves all uploaded custom videos
 */
export const getAllCustomVideos = async (req, res) => {
  try {
    const videos = await CustomVideo.find().sort({ createdAt: -1 });

    const formattedVideos = videos.map((v) => {
      const obj = typeof v.toObject === 'function' ? v.toObject() : { ...v };
      if ((obj.thumbnailPath || obj.s3ThumbnailKey) && !obj.thumbnailFileId) {
        obj.thumbnailFileId = obj._id;
      }
      return obj;
    });

    res.status(200).json({ success: true, count: formattedVideos.length, videos: formattedVideos });
  } catch (error) {
    console.error('Error fetching custom videos:', error);
    res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
  }
};

/**
 * Retrieves a single custom video by ID and increments view count
 */
export const getCustomVideoById = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await CustomVideo.findById(id);

    if (!video) {
      return res.status(404).json({ success: false, message: 'Custom video not found' });
    }

    video.views = Number(video.views || 0) + 1;
    await video.save();

    const obj = typeof video.toObject === 'function' ? video.toObject() : { ...video };
    if ((obj.thumbnailPath || obj.s3ThumbnailKey) && !obj.thumbnailFileId) {
      obj.thumbnailFileId = obj._id;
    }

    res.status(200).json({ success: true, video: obj });
  } catch (error) {
    console.error('Error fetching custom video details:', error);
    res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
  }
};

/**
 * Streams video directly from AWS S3 Bucket or disk with HTTP 206 Partial Content (Range requests)
 */
export const streamCustomVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await CustomVideo.findById(id);

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    // 1. Primary: Stream directly from AWS S3 Bucket with byte-range support
    if (video.s3Key) {
      try {
        const range = req.headers.range;
        const { stream, contentLength, contentRange, contentType, statusCode } = await getS3ObjectStream({
          key: video.s3Key,
          range,
          bucketName: video.s3Bucket,
        });

        const headers = {
          'Content-Type': contentType || video.videoContentType || 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Content-Length': contentLength,
        };
        if (contentRange) {
          headers['Content-Range'] = contentRange;
        }

        res.writeHead(statusCode, headers);
        stream.on('error', (err) => {
          console.error('S3 stream error:', err);
          if (!res.headersSent) res.status(500).end();
        });
        return stream.pipe(res);
      } catch (s3Error) {
        console.error('Error streaming custom video from S3:', s3Error);
        if (s3Error.name === 'InvalidRange' || s3Error.$metadata?.httpStatusCode === 416) {
          return res.status(416).setHeader('Content-Range', `bytes */${video.videoSize}`).end();
        }
        return res.status(500).json({ success: false, message: 'Failed to stream video from S3: ' + s3Error.message });
      }
    }

    // 2. Secondary fallback: Stream from local disk
    if (video.videoPath) {
      const fullPath = path.resolve(video.videoPath);
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ success: false, message: 'Video file not found on disk' });
      }

      const stat = fs.statSync(fullPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize) {
          res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
          return;
        }

        const chunkSize = end - start + 1;
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': video.videoContentType || 'video/mp4',
        });

        const fileStream = fs.createReadStream(fullPath, { start, end });
        fileStream.on('error', (err) => {
          console.error('File stream error:', err);
          if (!res.headersSent) res.status(500).end();
        });
        fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': video.videoContentType || 'video/mp4',
          'Accept-Ranges': 'bytes',
        });

        const fileStream = fs.createReadStream(fullPath);
        fileStream.on('error', (err) => {
          console.error('File stream error:', err);
          if (!res.headersSent) res.status(500).end();
        });
        fileStream.pipe(res);
      }
      return;
    }

    return res.status(404).json({ success: false, message: 'No video source found for this entry' });
  } catch (error) {
    console.error('Error streaming custom video:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error streaming video: ' + error.message });
    }
  }
};

/**
 * Serves thumbnail image directly from AWS S3 Bucket or local disk
 */
export const getCustomVideoThumbnail = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await CustomVideo.findById(id);

    if (!video) {
      return res.status(404).json({ success: false, message: 'Custom video not found' });
    }

    // 1. Primary: Stream directly from AWS S3 Bucket
    if (video.s3ThumbnailKey) {
      try {
        const { stream, contentLength, contentType } = await getS3ObjectStream({
          key: video.s3ThumbnailKey,
          bucketName: video.s3Bucket,
        });

        res.setHeader('Content-Type', contentType || 'image/jpeg');
        if (contentLength) res.setHeader('Content-Length', contentLength);
        res.setHeader('Cache-Control', 'public, max-age=86400');

        stream.on('error', (err) => {
          console.error('S3 thumbnail stream error:', err);
          if (!res.headersSent) res.status(500).end();
        });
        return stream.pipe(res);
      } catch (s3Error) {
        console.error('Error retrieving thumbnail from S3:', s3Error);
        return res.status(404).json({ success: false, message: 'Thumbnail not found in S3' });
      }
    }

    // 2. Secondary fallback: Serve from local disk
    if (video.thumbnailPath) {
      const fullPath = path.resolve(video.thumbnailPath);
      if (fs.existsSync(fullPath)) {
        return res.sendFile(fullPath);
      }
    }

    return res.status(404).json({ success: false, message: 'Thumbnail not found' });
  } catch (error) {
    console.error('Error retrieving thumbnail:', error);
    res.status(500).json({ success: false, message: 'Error retrieving thumbnail' });
  }
};

/**
 * Deletes a custom video: removes files from AWS S3 Bucket (or disk) and deletes record from PostgreSQL
 */
export const deleteCustomVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await CustomVideo.findById(id);

    if (!video) {
      return res.status(404).json({ success: false, message: 'Custom video not found' });
    }

    // Only uploader can delete their video
    if (video.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this video' });
    }

    // 1. Delete from AWS S3 Bucket
    if (video.s3Key) {
      await deleteFromS3({ key: video.s3Key, bucketName: video.s3Bucket });
    }
    if (video.s3ThumbnailKey) {
      await deleteFromS3({ key: video.s3ThumbnailKey, bucketName: video.s3Bucket });
    }

    // 2. Delete physical files from disk (if local fallback was used)
    if (video.videoPath) {
      const fullVideoPath = path.resolve(video.videoPath);
      if (fs.existsSync(fullVideoPath)) {
        try {
          fs.unlinkSync(fullVideoPath);
        } catch (e) {
          console.error('Error deleting video file from disk:', e);
        }
      }
    }

    if (video.thumbnailPath) {
      const fullThumbPath = path.resolve(video.thumbnailPath);
      if (fs.existsSync(fullThumbPath)) {
        try {
          fs.unlinkSync(fullThumbPath);
        } catch (e) {
          console.error('Error deleting thumbnail file from disk:', e);
        }
      }
    }

    // 3. Delete metadata document from PostgreSQL
    await CustomVideo.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting custom video:', error);
    res.status(500).json({ success: false, message: 'Failed to delete video: ' + error.message });
  }
};
