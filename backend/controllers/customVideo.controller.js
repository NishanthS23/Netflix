import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import CustomVideo from '../models/customVideo.model.js';
import {
  getVideoBucket,
  getThumbnailBucket,
  deleteFileFromGridFS,
} from '../services/gridfs.service.js';

/**
 * Uploads a custom video and optional thumbnail to disk volume and saves file path in MongoDB
 */
export const uploadCustomVideo = async (req, res) => {
  const videoFile = req.files?.['video']?.[0];
  const thumbnailFile = req.files?.['thumbnail']?.[0];

  if (!videoFile) {
    return res.status(400).json({ success: false, message: 'Video file is required' });
  }

  const { title, description, category } = req.body;
  if (!title || title.trim() === '') {
    // Clean up uploaded files if validation fails
    if (fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
    if (thumbnailFile && fs.existsSync(thumbnailFile.path)) fs.unlinkSync(thumbnailFile.path);
    return res.status(400).json({ success: false, message: 'Title is required' });
  }

  try {
    // Relative paths with forward slashes for cross-platform and Docker portability
    const videoPath = path.relative(process.cwd(), videoFile.path).replace(/\\/g, '/');
    const thumbnailPath = thumbnailFile
      ? path.relative(process.cwd(), thumbnailFile.path).replace(/\\/g, '/')
      : null;

    // Save video metadata and file locations to MongoDB
    const newVideo = new CustomVideo({
      title: title.trim(),
      description: (description || '').trim(),
      category: (category || 'General').trim(),
      videoPath,
      videoFilename: videoFile.originalname,
      videoContentType: videoFile.mimetype || 'video/mp4',
      videoSize: videoFile.size,
      thumbnailPath,
      // Provide a valid ObjectId for thumbnailFileId if thumbnail exists to maintain frontend compatibility
      thumbnailFileId: thumbnailPath ? new mongoose.Types.ObjectId() : null,
      userId: req.user._id,
      username: req.user.username,
    });

    await newVideo.save();

    res.status(201).json({
      success: true,
      message: 'Video uploaded to folder and file location saved in database successfully',
      video: newVideo,
    });
  } catch (error) {
    console.error('Error saving custom video:', error);

    // Rollback: delete disk files if saving to database fails
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
      const obj = v.toObject();
      if (obj.thumbnailPath && !obj.thumbnailFileId) {
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

    video.views += 1;
    await video.save();

    const obj = video.toObject();
    if (obj.thumbnailPath && !obj.thumbnailFileId) {
      obj.thumbnailFileId = obj._id;
    }

    res.status(200).json({ success: true, video: obj });
  } catch (error) {
    console.error('Error fetching custom video details:', error);
    res.status(500).json({ success: false, message: 'Internal server error: ' + error.message });
  }
};

/**
 * Streams video directly from disk folder with HTTP 206 Partial Content (Range requests)
 * Falls back to legacy GridFS if videoPath is absent.
 */
export const streamCustomVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await CustomVideo.findById(id);

    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    // 1. Primary storage: Video file on disk volume
    if (video.videoPath) {
      const fullPath = path.resolve(video.videoPath);
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ success: false, message: 'Video file not found on disk' });
      }

      const stat = fs.statSync(fullPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        // Parse Range header (e.g. "bytes=0-1048575")
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize) {
          res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
          return;
        }

        const chunkSize = end - start + 1;
        const headers = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': video.videoContentType || 'video/mp4',
        };

        res.writeHead(206, headers);

        const fileStream = fs.createReadStream(fullPath, { start, end });
        fileStream.on('error', (err) => {
          console.error('File stream error:', err);
          if (!res.headersSent) res.status(500).end();
        });
        fileStream.pipe(res);
      } else {
        // Stream the full file
        const headers = {
          'Content-Length': fileSize,
          'Content-Type': video.videoContentType || 'video/mp4',
          'Accept-Ranges': 'bytes',
        };

        res.writeHead(200, headers);

        const fileStream = fs.createReadStream(fullPath);
        fileStream.on('error', (err) => {
          console.error('File stream error:', err);
          if (!res.headersSent) res.status(500).end();
        });
        fileStream.pipe(res);
      }
      return;
    }

    // 2. Legacy fallback: Stream from MongoDB GridFS if videoFileId exists
    if (video.videoFileId) {
      const videoBucket = getVideoBucket();
      const files = await videoBucket.find({ _id: new mongoose.Types.ObjectId(video.videoFileId) }).toArray();

      if (!files || files.length === 0) {
        return res.status(404).json({ success: false, message: 'Video data not found in database' });
      }

      const file = files[0];
      const fileSize = file.length;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': file.contentType || video.videoContentType || 'video/mp4',
        });

        const downloadStream = videoBucket.openDownloadStream(file._id, {
          start,
          end: end + 1,
        });

        downloadStream.on('error', (err) => {
          console.error('Download stream error:', err);
          if (!res.headersSent) res.status(500).end();
        });

        downloadStream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': file.contentType || video.videoContentType || 'video/mp4',
          'Accept-Ranges': 'bytes',
        });

        const downloadStream = videoBucket.openDownloadStream(file._id);
        downloadStream.on('error', (err) => {
          console.error('Download stream error:', err);
          if (!res.headersSent) res.status(500).end();
        });

        downloadStream.pipe(res);
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
 * Serves thumbnail image directly from disk volume or falls back to GridFS
 */
export const getCustomVideoThumbnail = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await CustomVideo.findById(id);

    if (!video) {
      return res.status(404).json({ success: false, message: 'Custom video not found' });
    }

    // 1. Primary: Serve directly from disk volume
    if (video.thumbnailPath) {
      const fullPath = path.resolve(video.thumbnailPath);
      if (fs.existsSync(fullPath)) {
        return res.sendFile(fullPath);
      }
    }

    // 2. Legacy fallback: Stream from MongoDB GridFS
    if (video.thumbnailFileId) {
      try {
        const thumbnailBucket = getThumbnailBucket();
        const files = await thumbnailBucket.find({ _id: new mongoose.Types.ObjectId(video.thumbnailFileId) }).toArray();

        if (files && files.length > 0) {
          const file = files[0];
          res.setHeader('Content-Type', file.contentType || 'image/jpeg');
          res.setHeader('Content-Length', file.length);
          res.setHeader('Cache-Control', 'public, max-age=86400');

          const downloadStream = thumbnailBucket.openDownloadStream(file._id);
          return downloadStream.pipe(res);
        }
      } catch (e) {
        // ignore legacy error
      }
    }

    return res.status(404).json({ success: false, message: 'Thumbnail not found' });
  } catch (error) {
    console.error('Error retrieving thumbnail:', error);
    res.status(500).json({ success: false, message: 'Error retrieving thumbnail' });
  }
};

/**
 * Deletes a custom video: removes files from disk volume and deletes document from MongoDB
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

    // 1. Remove physical files from disk volume
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

    // 2. Legacy cleanup: Remove from GridFS if legacy IDs exist
    if (video.videoFileId) {
      try {
        await deleteFileFromGridFS(getVideoBucket(), video.videoFileId);
      } catch (e) {
        // ignore
      }
    }
    if (video.thumbnailFileId) {
      try {
        await deleteFileFromGridFS(getThumbnailBucket(), video.thumbnailFileId);
      } catch (e) {
        // ignore
      }
    }

    // 3. Delete metadata document from MongoDB
    await CustomVideo.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Video deleted from disk and database successfully' });
  } catch (error) {
    console.error('Error deleting custom video:', error);
    res.status(500).json({ success: false, message: 'Failed to delete video: ' + error.message });
  }
};
