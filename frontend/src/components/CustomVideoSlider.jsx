import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Play } from 'lucide-react';
import Slider from './Slider';

const CustomVideoSlider = () => {
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await axios.get('/api/v1/custom-videos');
        setVideos(res.data.videos || []);
      } catch (e) {
        // ignore
      }
    };
    fetchVideos();
  }, []);

  if (videos.length === 0) return null;

  return (
    <Slider title="Custom Videos">
      {videos.map((item) => (
        <Link
          key={item._id}
          to={`/watch-custom/${item._id}`}
          className="w-[140px] sm:w-[200px] md:w-[250px] min-w-[140px] sm:min-w-[200px] md:min-w-[250px] max-w-[140px] sm:max-w-[200px] md:max-w-[250px] flex-shrink-0 relative group"
        >
          <div className="w-full h-[80px] sm:h-[112px] md:h-[140px] rounded-lg overflow-hidden bg-zinc-900 relative">
            <img
              className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-125"
              src={item.thumbnailFileId ? `/api/v1/custom-videos/thumbnail/${item._id}` : '/extraction.jpg'}
              alt={item.title}
            />
            {/* Play badge overlay */}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center transition">
              <div className="size-8 rounded-full bg-red-600/90 group-hover:bg-red-600 flex items-center justify-center text-white shadow-lg transform group-hover:scale-110 transition duration-300">
                <Play className="size-4 fill-white ml-0.5" />
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs leading-4 md:leading-5 truncate">{item.title}</p>
        </Link>
      ))}
    </Slider>
  );
};

export default CustomVideoSlider;
