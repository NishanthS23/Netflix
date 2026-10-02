import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, User, Eye, Calendar, Trash2, Film, Share2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuthStore } from '../store/auth.store';
import { formatReleaseDate } from '../utils/formatDate';

const WatchCustomVideoPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [video, setVideo] = useState(null);
  const [otherVideos, setOtherVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideoAndRelated = async () => {
      try {
        setLoading(true);
        const [videoRes, listRes] = await axios.all([
          axios.get(`/api/v1/custom-videos/${id}`),
          axios.get('/api/v1/custom-videos'),
        ]);

        setVideo(videoRes.data.video);
        setOtherVideos((listRes.data.videos || []).filter((v) => v._id !== id));
      } catch (error) {
        console.error('Error fetching video:', error);
        toast.error('Could not load custom video');
      } finally {
        setLoading(false);
      }
    };

    fetchVideoAndRelated();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this video from the database?')) {
      return;
    }

    try {
      await axios.delete(`/api/v1/custom-videos/${id}`);
      toast.success('Video deleted successfully');
      navigate('/custom-videos');
    } catch (error) {
      console.error('Failed to delete video:', error);
      toast.error('Failed to delete video');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: video?.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Video link copied to clipboard!');
    }
  };

  const streamUrl = `/api/v1/custom-videos/stream/${id}`;

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="flex items-center justify-between mb-4">
          <Link
            to="/custom-videos"
            className="flex items-center text-sm text-gray-400 hover:text-white transition"
          >
            <ArrowLeft className="size-4 mr-2" /> All Custom Videos
          </Link>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 text-xs bg-zinc-900 hover:bg-zinc-800 text-gray-300 px-3 py-2 rounded-lg border border-zinc-800 transition"
          >
            <Share2 className="size-3.5" /> Share
          </button>
        </div>

        {loading ? (
          <div className="space-y-6 animate-pulse">
            <div className="aspect-video bg-zinc-900 rounded-2xl w-full" />
            <div className="h-8 bg-zinc-900 rounded w-1/3" />
            <div className="h-4 bg-zinc-900 rounded w-1/2" />
          </div>
        ) : !video ? (
          <div className="text-center py-24 bg-zinc-900/40 rounded-2xl border border-zinc-800 my-8">
            <Film className="size-16 text-zinc-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold">Video Not Found</h2>
            <p className="text-gray-400 text-sm mt-2">This video may have been deleted or moved.</p>
            <Link
              to="/custom-videos"
              className="inline-block mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-medium transition"
            >
              Back to Custom Videos
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* HTML5 Video Player streaming directly from MongoDB GridFS */}
            <div className="relative aspect-video w-full bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800">
              <video
                controls
                autoPlay
                playsInline
                preload="metadata"
                className="w-full h-full object-contain"
                poster={video.thumbnailFileId ? `/api/v1/custom-videos/thumbnail/${video._id}` : undefined}
              >
                <source src={streamUrl} type={video.videoContentType || 'video/mp4'} />
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Video Details */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{video.title}</h1>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-red-600/20 text-red-400 border border-red-500/30 rounded-full">
                      {video.category || 'General'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mt-3 text-xs sm:text-sm text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <User className="size-4 text-red-500" />
                      <span className="text-gray-300 font-medium">{video.username}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <Eye className="size-4" />
                      <span>{video.views || 0} views</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-4" />
                      <span>{formatReleaseDate(video.createdAt)}</span>
                    </span>
                  </div>
                </div>

                {/* Delete button (owner only) */}
                {user && user._id === video.userId && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-red-600 text-gray-300 hover:text-white px-4 py-2.5 rounded-xl text-sm font-medium transition"
                  >
                    <Trash2 className="size-4" /> Delete Video
                  </button>
                )}
              </div>

              {/* Description */}
              {video.description && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-2">Description</h3>
                  <p className="text-sm sm:text-base text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {video.description}
                  </p>
                </div>
              )}
            </div>

            {/* More Custom Videos */}
            {otherVideos.length > 0 && (
              <div className="mt-12 space-y-4">
                <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                  <Film className="size-6 text-red-500" /> More Custom Videos from Database
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {otherVideos.slice(0, 8).map((other) => (
                    <Link
                      key={other._id}
                      to={`/watch-custom/${other._id}`}
                      className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition flex flex-col"
                    >
                      <div className="aspect-video relative bg-zinc-950 overflow-hidden">
                        {other.thumbnailFileId ? (
                          <img
                            src={`/api/v1/custom-videos/thumbnail/${other._id}`}
                            alt={other.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-900 group-hover:scale-105 transition">
                            <Film className="size-10 text-zinc-700 group-hover:text-red-500 transition" />
                          </div>
                        )}
                        <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded bg-black/70 text-gray-200">
                          {other.category || 'Video'}
                        </span>
                      </div>

                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <h4 className="font-semibold text-sm line-clamp-1 group-hover:text-red-400 transition">
                          {other.title}
                        </h4>
                        <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2">
                          <span>{other.username}</span>
                          <span>{other.views || 0} views</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default WatchCustomVideoPage;
