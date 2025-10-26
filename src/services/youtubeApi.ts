// YouTube API service with key rotation and caching

const YOUTUBE_API_KEYS = [
  'AIzaSyBr_W9YzP9i9BS3zQmrn--ApqLegBnJWdw',
  'AIzaSyC3yIDJp63mkC-65Hnx90bCR15nNmfNE5g',
  'AIzaSyCJIO_9Eqv7I-Mlb3j5wFJiaFjyXnoVEcM',
  'AIzaSyC1m1k-BY2hzAEZdQM_Vkxyy-kVTlF0iO4',
  'AIzaSyDg97qWu96H6d-sxjN3noRxX2HEGm3So74',
  'AIzaSyBZEvxg2Zw6DFgmUB57HqlM8gcziuH_psY',
  'AIzaSyCQLQSH25KFtCFwCFA_TATX3D1bT3-2hbU',
  'AIzaSyBIU7KkVJadyH3vJmwFc4uhMsB685g0CUM',
  'AIzaSyAAG1rN-8alYqcHa_lUl67IoPgrzfKrsmE',
  'AIzaSyDynHrtwrFH62uC3HsVEDATWlHbrbK-734',
  'AIzaSyCzcoEBtwakPJRK1rnFOR8tY4cIeqXBQsA',
  'AIzaSyCpli7OpNnq1lcsdgRUEk3pjZfnZDxL3uk',
  'AIzaSyAy8WaN4fLJdv4sxotTqcC8imMX_sHRSfY',
  'AIzaSyB86CwSiNl3dU1GuCD3056pq3eoDkuJF2I',
  'AIzaSyDaVKVk5t5FXbyVu1RhFJGJ_k6qxNCN6Lo',
  'AIzaSyBK1VA5ZsUZkUiFULaIqYrXh4VS1XWGKOM',
  'AIzaSyBUy99VdJ4IvU0A6ZQQq4ntfIudeO5rYZI',
  'AIzaSyAz6nPuURv5XRQBYbBUZ_3k6LCOwADU7ZA',
  'AIzaSyC9LOTgx6-UpLscG9XJW4-6uGYNYJxrrPc',
  'AIzaSyB_QmUK8j5prrltJ1TuxuLgWN295KA5JIg',
  'AIzaSyBvCugpO8QtXKBN9H3Ase-VukIR10AuhAE',
];


let currentKeyIndex = 0;
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/** Rotate through API keys safely */
function getNextApiKey(): string {
  const key = YOUTUBE_API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % YOUTUBE_API_KEYS.length;
  return key;
}

/** Caching logic */
function getCachedData(cacheKey: string) {
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) return cached.data;
  return null;
}

function setCachedData(cacheKey: string, data: any) {
  cache.set(cacheKey, { data, timestamp: Date.now() });
}

/** Convert ISO8601 duration (e.g. PT3M42S) → seconds */
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [_, h, m, s] = match;
  return (parseInt(h || '0') * 3600) + (parseInt(m || '0') * 60) + parseInt(s || '0');
}

/** Duration formatting helper */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** 🔍 Core YouTube search (used by all other functions) */
export async function searchYouTube(query: string, maxResults = 10) {
  const cacheKey = `search:${query}:${maxResults}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  for (let attempt = 0; attempt < YOUTUBE_API_KEYS.length; attempt++) {
    try {
      const apiKey = getNextApiKey();

      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        query
      )}&type=video&videoCategoryId=10&maxResults=${maxResults}&key=${apiKey}`;

      const response = await fetch(searchUrl);
      if (!response.ok) {
        if (response.status === 403) continue;
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      const videoIds = data.items.map((item: any) => item.id.videoId).join(',');

      if (!videoIds) continue;

      // Fetch video details (duration, etc.)
      const detailsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${apiKey}`
      );
      const detailsData = await detailsResponse.json();

      // Filter & map results
      const songs = detailsData.items
        .filter((video: any) => {
          const dur = parseDuration(video.contentDetails.duration);
          return dur >= 60 && dur <= 900; // 1–15 min
        })
        .map((video: any) => ({
          id: video.id,
          title: video.snippet.title,
          artist: video.snippet.channelTitle,
          thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
          duration: parseDuration(video.contentDetails.duration),
        }));

      if (songs.length) {
        setCachedData(cacheKey, songs);
        return songs;
      }
    } catch (err) {
      console.error(`YouTube search error (attempt ${attempt + 1}):`, err);
    }
  }

  console.warn('All YouTube API keys failed or returned no results.');
  return [];
}

/** 📈 Fetch trending songs (US region) */
export async function getTrendingSongs(maxResults = 20) {
  const cacheKey = `trending:${maxResults}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  for (let attempt = 0; attempt < YOUTUBE_API_KEYS.length; attempt++) {
    try {
      const apiKey = getNextApiKey();
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&chart=mostPopular&videoCategoryId=10&maxResults=${maxResults}&regionCode=US&key=${apiKey}`
      );

      if (!response.ok) {
        if (response.status === 403) continue;
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      const songs = data.items
        .filter((v: any) => {
          const dur = parseDuration(v.contentDetails.duration);
          return dur >= 60 && dur <= 900;
        })
        .map((v: any) => ({
          id: v.id,
          title: v.snippet.title,
          artist: v.snippet.channelTitle,
          thumbnail: v.snippet.thumbnails.high?.url || v.snippet.thumbnails.default?.url,
          duration: parseDuration(v.contentDetails.duration),
        }));

      if (songs.length) {
        setCachedData(cacheKey, songs);
        return songs;
      }
    } catch (err) {
      console.error(`Trending fetch error (attempt ${attempt + 1}):`, err);
    }
  }

  return [];
}

/** 🎤 Fetch songs by artist name */
export async function getArtistSongs(artistName: string, maxResults = 10) {
  const cacheKey = `artist:${artistName}:${maxResults}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const results = await searchYouTube(`${artistName} official audio`, maxResults);
  setCachedData(cacheKey, results);
  return results;
}

/** 🧑‍🎤 Fetch artist profiles */
export async function searchArtists(query: string) {
  const cacheKey = `artistSearch:${query}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  for (let attempt = 0; attempt < YOUTUBE_API_KEYS.length; attempt++) {
    try {
      const apiKey = getNextApiKey();
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          query
        )}&type=channel&maxResults=10&key=${apiKey}`
      );

      if (!response.ok) {
        if (response.status === 403) continue;
        throw new Error(`YouTube artist search error: ${response.status}`);
      }

      const data = await response.json();
      const artists = data.items.map((ch: any) => ({
        id: ch.id.channelId,
        name: ch.snippet.title,
        image: ch.snippet.thumbnails.high?.url || ch.snippet.thumbnails.default?.url,
      }));

      setCachedData(cacheKey, artists);
      return artists;
    } catch (err) {
      console.error(`Artist search error (attempt ${attempt + 1}):`, err);
    }
  }

  return [];
}
