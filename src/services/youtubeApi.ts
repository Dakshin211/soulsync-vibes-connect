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
];

let currentKeyIndex = 0;
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

function getNextApiKey(): string {
  const key = YOUTUBE_API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % YOUTUBE_API_KEYS.length;
  return key;
}

function getCachedData(cacheKey: string) {
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setCachedData(cacheKey: string, data: any) {
  cache.set(cacheKey, { data, timestamp: Date.now() });
}

export async function searchYouTube(query: string, maxResults: number = 10) {
  const cacheKey = `search:${query}:${maxResults}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  for (let attempt = 0; attempt < YOUTUBE_API_KEYS.length; attempt++) {
    try {
      const apiKey = getNextApiKey();
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=${maxResults}&key=${apiKey}`
      );

      if (!response.ok) {
        if (response.status === 403) continue; // Try next key
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Get video details to filter by duration
      const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
      const detailsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${apiKey}`
      );
      
      const detailsData = await detailsResponse.json();
      
      // Filter songs (1-15 minutes duration)
      const songs = detailsData.items
        .filter((video: any) => {
          const duration = parseDuration(video.contentDetails.duration);
          return duration >= 60 && duration <= 900;
        })
        .map((video: any) => ({
          id: video.id,
          title: video.snippet.title,
          artist: video.snippet.channelTitle,
          thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
          duration: parseDuration(video.contentDetails.duration),
        }));

      setCachedData(cacheKey, songs);
      return songs;
    } catch (error) {
      console.error(`Error with API key ${attempt + 1}:`, error);
    }
  }

  return [];
}

export async function getTrendingSongs(maxResults: number = 20) {
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
        .filter((video: any) => {
          const duration = parseDuration(video.contentDetails.duration);
          return duration >= 60 && duration <= 900;
        })
        .map((video: any) => ({
          id: video.id,
          title: video.snippet.title,
          artist: video.snippet.channelTitle,
          thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default.url,
          duration: parseDuration(video.contentDetails.duration),
        }));

      setCachedData(cacheKey, songs);
      return songs;
    } catch (error) {
      console.error(`Error with API key ${attempt + 1}:`, error);
    }
  }

  return [];
}

export async function getArtistSongs(artistName: string, maxResults: number = 10) {
  const cacheKey = `artist:${artistName}:${maxResults}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const songs = await searchYouTube(`${artistName} official audio`, maxResults);
  setCachedData(cacheKey, songs);
  return songs;
}

export async function searchArtists(query: string) {
  const cacheKey = `artists:${query}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  for (let attempt = 0; attempt < YOUTUBE_API_KEYS.length; attempt++) {
    try {
      const apiKey = getNextApiKey();
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=10&key=${apiKey}`
      );

      if (!response.ok) {
        if (response.status === 403) continue;
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      const artists = data.items.map((item: any) => ({
        id: item.id.channelId,
        name: item.snippet.title,
        image: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
      }));

      setCachedData(cacheKey, artists);
      return artists;
    } catch (error) {
      console.error(`Error with API key ${attempt + 1}:`, error);
    }
  }

  return [];
}

function parseDuration(duration: string): number {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;

  return hours * 3600 + minutes * 60 + seconds;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
