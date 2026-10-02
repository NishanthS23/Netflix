import axios from 'axios';
import { ENV_VARS } from '../config/env.config.js';

// Curated high quality mock data with real public TMDB CDN images
const MOCK_MOVIES = [
  {
    id: 533535,
    title: 'Deadpool & Wolverine',
    overview:
      'A listless Wade Wilson toils away in civilian life with his days as the morally flexible mercenary, Deadpool, behind him. But when his homeworld faces an existential threat, Wade must reluctantly suit-up again with an even more reluctant Wolverine.',
    backdrop_path: '/yDHYTjA3R0neIXvuistDit4qA0m.jpg',
    poster_path: '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    release_date: '2024-07-24',
    adult: false,
    genres: [{ id: 28, name: 'Action' }, { id: 35, name: 'Comedy' }, { id: 878, name: 'Science Fiction' }],
    vote_average: 7.7,
    runtime: 128,
  },
  {
    id: 27205,
    title: 'Inception',
    overview:
      'Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets, is offered a chance to regain his old life as payment for a task considered to be impossible: "inception", the implantation of another person\'s idea into a target\'s subconscious.',
    backdrop_path: '/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
    poster_path: '/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg',
    release_date: '2010-07-15',
    adult: false,
    genres: [{ id: 28, name: 'Action' }, { id: 878, name: 'Science Fiction' }, { id: 12, name: 'Adventure' }],
    vote_average: 8.4,
    runtime: 148,
  },
  {
    id: 414906,
    title: 'The Batman',
    overview:
      'In his second year of fighting crime, Batman uncovers corruption in Gotham City that connects to his own family while facing a serial killer known as the Riddler.',
    backdrop_path: '/74xTEgt7R36Fpooo50r9T25onhq.jpg',
    poster_path: '/74xTEgt7R36Fpooo50r9T25onhq.jpg',
    release_date: '2022-03-01',
    adult: false,
    genres: [{ id: 80, name: 'Crime' }, { id: 9648, name: 'Mystery' }, { id: 53, name: 'Thriller' }],
    vote_average: 7.7,
    runtime: 176,
  },
  {
    id: 157336,
    title: 'Interstellar',
    overview:
      'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.',
    backdrop_path: '/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
    poster_path: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    release_date: '2014-11-05',
    adult: false,
    genres: [{ id: 12, name: 'Adventure' }, { id: 18, name: 'Drama' }, { id: 878, name: 'Science Fiction' }],
    vote_average: 8.4,
    runtime: 169,
  },
  {
    id: 155,
    title: 'The Dark Knight',
    overview:
      'Batman raises the stakes in his war on crime. With the help of allies Lt. Jim Gordon and DA Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets.',
    backdrop_path: '/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg',
    poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    release_date: '2008-07-16',
    adult: false,
    genres: [{ id: 18, name: 'Drama' }, { id: 28, name: 'Action' }, { id: 80, name: 'Crime' }],
    vote_average: 8.5,
    runtime: 152,
  },
];

const MOCK_TV_SHOWS = [
  {
    id: 66732,
    name: 'Stranger Things',
    overview:
      'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.',
    backdrop_path: '/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
    poster_path: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    first_air_date: '2016-07-15',
    adult: false,
    genres: [{ id: 18, name: 'Drama' }, { id: 9648, name: 'Mystery' }, { id: 10765, name: 'Sci-Fi & Fantasy' }],
    vote_average: 8.6,
  },
  {
    id: 1396,
    name: 'Breaking Bad',
    overview:
      'Walter White, a New Mexico chemistry teacher, is diagnosed with Stage III cancer and given a prognosis of two years to live. He decides he has nothing to lose and turns to a life of crime.',
    backdrop_path: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
    poster_path: '/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
    first_air_date: '2008-01-20',
    adult: false,
    genres: [{ id: 18, name: 'Drama' }, { id: 80, name: 'Crime' }],
    vote_average: 8.9,
  },
  {
    id: 94605,
    name: 'Arcane',
    overview:
      'Amid the stark discord of twin cities Piltover and Zaun, two sisters fight on rival sides of a war between magic technologies and incompatible convictions.',
    backdrop_path: '/rkB4LyZHo1NHXFEDHl9vSD9r1lC.jpg',
    poster_path: '/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg',
    first_air_date: '2021-11-06',
    adult: false,
    genres: [{ id: 16, name: 'Animation' }, { id: 10765, name: 'Sci-Fi & Fantasy' }, { id: 18, name: 'Drama' }],
    vote_average: 8.7,
  },
];

const MOCK_TRAILERS = [
  {
    id: 'trailer_1',
    key: '73_1biulkYk',
    name: 'Official Trailer',
    site: 'YouTube',
    type: 'Trailer',
  },
  {
    id: 'trailer_2',
    key: 'Idh8n5XuYIA',
    name: 'Teaser Trailer',
    site: 'YouTube',
    type: 'Teaser',
  },
];

const getMockDataForUrl = (url) => {
  // Trailers / Videos
  if (url.includes('/videos')) {
    return { results: MOCK_TRAILERS };
  }

  // TV Trending or TV Category
  if (url.includes('/tv') || url.includes('trending/tv')) {
    if (url.match(/\/tv\/\d+$/)) {
      const match = url.match(/\/tv\/(\d+)/);
      const id = match ? parseInt(match[1]) : null;
      return MOCK_TV_SHOWS.find((s) => s.id === id) || MOCK_TV_SHOWS[0];
    }
    return { results: MOCK_TV_SHOWS };
  }

  // Movie Details
  if (url.match(/\/movie\/\d+$/)) {
    const match = url.match(/\/movie\/(\d+)/);
    const id = match ? parseInt(match[1]) : null;
    return MOCK_MOVIES.find((m) => m.id === id) || MOCK_MOVIES[0];
  }

  // Default to Movies (Trending, Popular, Top Rated, Now Playing, Search, Similar)
  return { results: MOCK_MOVIES };
};

/**
 * Fetches data from The Movie Database (TMDB) using the provided URL and API key.
 * If TMDB_API_KEY is not configured or if TMDB request fails, returns curated fallback data.
 */
export const fetchFromTMDB = async (url) => {
  if (!ENV_VARS.TMDB_API_KEY) {
    return getMockDataForUrl(url);
  }

  try {
    const options = {
      headers: {
        accept: 'application/json',
        Authorization: 'Bearer ' + ENV_VARS.TMDB_API_KEY,
      },
      timeout: 6000,
    };

    const response = await axios.get(url, options);

    if (response.status !== 200) {
      throw new Error('Failed to fetch data from TMDB' + response.statusText);
    }

    return response.data;
  } catch (error) {
    console.warn(`[TMDB Warning] API request failed (${error.message}). Falling back to built-in content.`);
    return getMockDataForUrl(url);
  }
};
