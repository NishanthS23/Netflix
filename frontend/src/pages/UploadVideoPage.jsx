import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { UploadCloud, Video, Image as ImageIcon, Loader2, ArrowLeft, Film, CheckCircle2 } from 'lucide-react';
import Navbar from '../components/Navbar';

const CATEGORIES = ['General', 'Action', 'Comedy', 'Drama', 'Documentary', 'Trailer', 'Animation', 'Sci-Fi'];

const UploadVideoPage = () => {
  const navigate = useNavigate();
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const videoInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  const handleVideoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast.error('Please select a valid video file (.mp4, .webm, etc.)');
        return;
      }
      setVideoFile(file);
      // Auto-populate title if empty
      if (!title) {
        const defaultTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(defaultTitle);
      }
    }
  };

  const handleThumbnailSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!videoFile) {
      toast.error('Please choose a video file to upload');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a title for your video');
      return;
    }

    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('category', category);

    if (thumbnailFile) {
      formData.append('thumbnail', thumbnailFile);
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const res = await axios.post('/api/v1/custom-videos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        },
      });

      toast.success('Video uploaded and saved to database successfully!');
      navigate(`/watch-custom/${res.data.video._id}`);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error.response?.data?.message || 'Failed to upload video');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-16">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 mt-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-sm text-gray-400 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="size-4 mr-2" /> Back
        </button>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-10 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-red-600/20 text-red-500 rounded-xl">
              <Film className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Upload Custom Video</h1>
              <p className="text-sm text-gray-400">Store and stream your video directly from the MongoDB database</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {/* Video File Dropzone */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Video File *</label>
              <div
                onClick={() => videoInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                  videoFile
                    ? 'border-green-500/50 bg-green-500/5'
                    : 'border-zinc-700 hover:border-red-500 bg-zinc-950/40 hover:bg-zinc-950/80'
                }`}
              >
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                  disabled={isUploading}
                />

                {videoFile ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle2 className="size-12 text-green-400 mb-3" />
                    <p className="text-base font-semibold text-white">{videoFile.name}</p>
                    <p className="text-xs text-gray-400 mt-1">Size: {formatFileSize(videoFile.size)}</p>
                    <span className="mt-3 text-xs bg-zinc-800 text-gray-300 py-1 px-3 rounded-full hover:bg-zinc-700">
                      Click to change video
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <UploadCloud className="size-12 text-gray-400 mb-3" />
                    <p className="text-base font-semibold text-white">Click or drag & drop video here</p>
                    <p className="text-xs text-gray-400 mt-1">Supports MP4, WebM, MKV, MOV (up to 500MB)</p>
                  </div>
                )}
              </div>
            </div>

            {/* Video Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                Title *
              </label>
              <input
                id="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. My Awesome Travel Reel or Movie Trailer"
                disabled={isUploading}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-500 transition"
              />
            </div>

            {/* Category & Thumbnail Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-2">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isUploading}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-500 transition"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Thumbnail */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Custom Thumbnail (Optional)</label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => thumbnailInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 px-4 py-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-lg text-sm text-gray-300 transition"
                  >
                    <ImageIcon className="size-4" />
                    {thumbnailFile ? 'Change Poster' : 'Select Poster'}
                  </button>
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailSelect}
                    className="hidden"
                    disabled={isUploading}
                  />
                  {thumbnailPreview && (
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail Preview"
                      className="size-12 object-cover rounded-lg border border-zinc-700"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Give viewers context about what this video is about..."
                disabled={isUploading}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-red-500 transition resize-none"
              />
            </div>

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-2 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Uploading to MongoDB database...</span>
                  <span className="font-semibold text-red-400">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-red-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isUploading || !videoFile}
              className={`w-full py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 text-white transition shadow-lg ${
                isUploading || !videoFile
                  ? 'bg-zinc-800 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 active:scale-[0.99] shadow-red-900/30'
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="size-5 animate-spin" /> Uploading ({uploadProgress}%)
                </>
              ) : (
                <>
                  <Video className="size-5" /> Upload Video to Database
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default UploadVideoPage;
