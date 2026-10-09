import express from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { protectedRoute } from '../middlewares/protectedRoute.js';
import {
  uploadCustomVideo,
  getAllCustomVideos,
  getCustomVideoById,
  streamCustomVideo,
  getCustomVideoThumbnail,
  deleteCustomVideo,
} from '../controllers/customVideo.controller.js';

import fs from 'fs';

const router = express.Router();

// Define temporary uploads staging directory (eliminates external volume requirement)
const UPLOADS_DIR = path.resolve('uploads');
const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, 'thumbnails');
const TEMP_DIR = path.join(os.tmpdir(), 'netflix-uploads');

// Ensure staging and upload directories exist
[TEMP_DIR, VIDEOS_DIR, THUMBNAILS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer disk storage configuration saving to temporary upload folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || (file.fieldname === 'video' ? '.mp4' : '.jpg');
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video') {
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed for video upload'), false);
      }
    } else if (file.fieldname === 'thumbnail') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for thumbnail upload'), false);
      }
    } else {
      cb(null, true);
    }
  },
});

// Upload video with optional thumbnail
router.post(
  '/upload',
  protectedRoute,
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  uploadCustomVideo
);

// Get list of all custom videos
router.get('/', getAllCustomVideos);

// Get single custom video details
router.get('/:id', getCustomVideoById);

// Stream video from MongoDB
router.get('/stream/:id', streamCustomVideo);

// Get thumbnail image from MongoDB
router.get('/thumbnail/:id', getCustomVideoThumbnail);

// Delete custom video (must be owner)
router.delete('/:id', protectedRoute, deleteCustomVideo);

export default router;
