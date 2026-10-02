import mongoose from 'mongoose';

const customVideoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
    // File path location on disk/volume (e.g. "uploads/videos/video-123.mp4")
    videoPath: {
      type: String,
      default: null,
    },
    // Legacy GridFS file ID for backward compatibility
    videoFileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    videoFilename: {
      type: String,
      required: true,
    },
    videoContentType: {
      type: String,
      default: 'video/mp4',
    },
    videoSize: {
      type: Number,
      required: true,
    },
    // Thumbnail file path on disk/volume (e.g. "uploads/thumbnails/thumbnail-123.jpg")
    thumbnailPath: {
      type: String,
      default: null,
    },
    // Legacy GridFS thumbnail ID for backward compatibility
    thumbnailFileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const CustomVideo = mongoose.model('CustomVideo', customVideoSchema);
export default CustomVideo;
