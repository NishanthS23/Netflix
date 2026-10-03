import axios from 'axios';
import { useEffect, useState } from 'react';

import { useContentStore } from '../store/content.store';

const useGetTrendingContent = () => {
  const [trendingContent, setTrendingContent] = useState(null);
  const { contentType } = useContentStore();

  useEffect(() => {
    // Fetch trending content based on the current content type
    const getTrendingContent = async () => {
      try {
        const res = await axios.get(`/api/v1/${contentType}/trending`);
        setTrendingContent(res.data.content || {
          id: 533535,
          title: 'Deadpool & Wolverine',
          overview:
            'A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary, Deadpool, behind him.',
          backdrop_path: '/yDHYTjA3R0neIXvuistDit4qA0m.jpg',
          release_date: '2024-07-24',
          adult: false,
        });
      } catch (error) {
        console.error('Error fetching trending content:', error);
        setTrendingContent({
          id: 533535,
          title: 'Deadpool & Wolverine',
          overview:
            'A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary, Deadpool, behind him.',
          backdrop_path: '/yDHYTjA3R0neIXvuistDit4qA0m.jpg',
          release_date: '2024-07-24',
          adult: false,
        });
      }
    };

    getTrendingContent();
  }, [contentType]);

  return { trendingContent };
};

export default useGetTrendingContent;
