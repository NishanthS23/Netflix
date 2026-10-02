import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Film, Play, Upload, Trash2, Eye, Calendar, User, Clock } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuthStore } from '../store/auth.store';
import { formatReleaseDate } from '../utils/formatDate';

const CATEGORIES = ['All', 'General', 'Action', 'Comedy', 'Drama', 'Documentary', 'Trailer', 'Animation', 'Sci-Fi'];

const CustomVideosPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/v1/custom-videos');
      setVideos(res.data.videos || []);
    } catch (error) {
      console.error('Error fetching custom videos:', error);
      toast.error('Failed to load custom videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleDelete = async (e, videoId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this video from the database?')) {
      return;
    }

    try {
      await axios.delete(`/api/v1/custom-videos/${videoId}`);
      toast.success('Video deleted successfully');
      setVideos((prev) => prev.filter((v) => v._id !== videoId));
    } catch (error) {
      console.error('Failed to delete video:', error);
      toast.error(error.response?.data?.message || 'Failed to delete video');
    }
  };

  const filteredVideos =
    selectedCategory === 'All' ? videos : videos.filter((v) => v.category === selectedCategory);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-3">
              <Film className="size-8 text-red-600" /> Custom Videos
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Custom videos uploaded by users, stored and streamed directly from MongoDB GridFS
            </p>
          </div>

          <Link
            to="/upload"
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl font-medium transition shadow-lg shadow-red-900/20 active:scale-95 w-full sm:w-auto"
          >
            <Upload className="size-4" /> Upload Video
          </Link>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto py-6 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-zinc-900 text-gray-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Video Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-zinc-900/60 rounded-xl overflow-hidden animate-pulse border border-zinc-800">
                <div className="aspect-video bg-zinc-800" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-zinc-800 rounded w-3/4" />
                  <div className="h-3 bg-zinc-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-24 bg-zinc-900/30 rounded-2xl border border-zinc-800/80 my-8 px-4">
            <Film className="size-16 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-200">No Custom Videos Yet</h2>
            <p className="text-gray-400 text-sm max-w-md mx-auto mt-2">
              {selectedCategory === 'All'
                ? 'Upload your first video to store and stream it directly from the MongoDB database!'
                : `No videos found in "${selectedCategory}". Try choosing another category or upload one!`}
            </p>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition"
            >
              <Upload className="size-4" /> Upload Now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredVideos.map((video) => (
              <div
                key={video._id}
                onClick={() => navigate(`/watch-custom/${video._id}`)}
                className="group relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden cursor-pointer hover:border-zinc-700 hover:shadow-xl hover:shadow-black/50 transition-all duration-300 flex flex-col"
              >
                {/* Thumbnail / Video Preview Area */}
                <div className="aspect-video relative bg-zinc-950 overflow-hidden">
                  <img
                    src={video.thumbnailFileId ? `/api/v1/custom-videos/thumbnail/${video._id}` : '/extraction.jpg'}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />

                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-300">
                    <div className="size-12 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg transform group-hover:scale-110 transition">
                      <Play className="size-5 fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Category Badge */}
                  <span className="absolute top-2 left-2 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-gray-200 border border-white/10">
                    {video.category || 'Video'}
                  </span>

                  {/* Delete Button (Owner Only) */}
                  {user && user._id === video.userId && (
                    <button
                      onClick={(e) => handleDelete(e, video._id)}
                      title="Delete video"
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-red-600 text-gray-300 hover:text-white backdrop-blur-md transition"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Video Info */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-base line-clamp-1 group-hover:text-red-400 transition">
                      {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-xs text-gray-400 line-clamp-2 mt-1">{video.description}</p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <User className="size-3 text-red-500" />
                      <span className="truncate max-w-[90px]">{video.username}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="size-3" />
                      <span>{video.views || 0} views</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomVideosPage;
