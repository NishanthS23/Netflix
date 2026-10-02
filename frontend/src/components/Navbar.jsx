import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Menu, Search, Upload, Film } from 'lucide-react';

import Logo from './SiteLogo';
import { useAuthStore } from '../store/auth.store.js';
import { useContentStore } from '../store/content.store.js';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const { user, logout } = useAuthStore();
  const { setContentType } = useContentStore();

  return (
    <header className="max-w-6xl mx-auto flex flex-wrap items-center justify-between p-4 h-20">
      <div className="flex item-center gap-6 md:gap-10 z-50">
        <Logo />
        {/* Desktop nav items */}
        <div className="hidden sm:flex gap-4 items-center text-lg md:text-xl">
          <Link to="/" className="text-white hover:text-gray-400" onClick={() => setContentType('movie')}>
            Movies
          </Link>
          <Link to="/" className="text-white hover:text-gray-400" onClick={() => setContentType('tv')}>
            TV Series
          </Link>
          <Link to="/custom-videos" className="text-white hover:text-gray-400 flex items-center gap-1.5">
            <Film className="size-4 text-red-500" />
            <span>Custom Videos</span>
          </Link>
          <Link to="/history" className="text-white hover:text-gray-400">
            Search History
          </Link>
        </div>
      </div>

      {/* common nav links */}
      <div className="flex gap-3 sm:gap-4 items-center z-50">
        <Link
          to="/upload"
          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold py-1.5 px-3 rounded-lg transition active:scale-95 shadow-md shadow-red-900/30"
          title="Upload video to database"
        >
          <Upload className="size-3.5 sm:size-4" />
          <span className="hidden sm:inline">Upload</span>
        </Link>
        <Link to="/search">
          <Search className="size-6 cursor-pointer hover:text-gray-400" />
        </Link>
        <img src={user?.profilePic || '/avatar2.png'} alt="Profile pic" className="h-8 rounded cursor-pointer hover:opacity-80" />
        <LogOut className="size-6 cursor-pointer hover:text-gray-400" onClick={logout} />
        <div className="sm:hidden">
          <Menu className="size-6 cursor-pointer hover:text-gray-400" onClick={toggleMenu} />
        </div>
      </div>

      {/* Mobile menu items */}
      {isMenuOpen && (
        <div className="w-full mt-4 z-50 text-base bg-black border border-gray-800 rounded sm:hidden p-3 space-y-2">
          <Link to="/" className="block text-white hover:text-gray-400" onClick={() => setContentType('movie')}>
            Movies
          </Link>
          <Link to="/" className="block text-white hover:text-gray-400" onClick={() => setContentType('tv')}>
            TV Series
          </Link>
          <Link to="/custom-videos" className="block text-white hover:text-gray-400">
            Custom Videos
          </Link>
          <Link to="/upload" className="block text-red-400 hover:text-red-300 font-semibold">
            + Upload Custom Video
          </Link>
          <Link to="/history" className="block text-white hover:text-gray-400">
            Search History
          </Link>
        </div>
      )}
    </header>
  );
};

export default Navbar;
