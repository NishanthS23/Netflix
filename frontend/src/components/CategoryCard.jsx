import { Link } from 'react-router-dom';
import { SMALL_IMG_BASE_URL } from '../utils/constants.js';

const CategoryCard = ({ item }) => {
  return (
    <Link
      to={`/watch/${item.id}`}
      className="w-[140px] sm:w-[200px] md:w-[250px] min-w-[140px] sm:min-w-[200px] md:min-w-[250px] max-w-[140px] sm:max-w-[200px] md:max-w-[250px] flex-shrink-0 relative group"
    >
      <div className="w-full h-[80px] sm:h-[112px] md:h-[140px] rounded-lg overflow-hidden bg-zinc-900">
        <img
          className="w-full h-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-125"
          src={SMALL_IMG_BASE_URL + item.backdrop_path}
          alt={item.title}
        />
      </div>
      <p className="mt-2 text-xs leading-4 md:leading-5 truncate">{item.title || item.name}</p>
    </Link>
  );
};

export default CategoryCard;
