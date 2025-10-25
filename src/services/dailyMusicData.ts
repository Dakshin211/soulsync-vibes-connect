// Daily music data fetching using Groq (primary) and Gemini (fallback)
import { collection, doc, setDoc, getDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { searchYouTube } from './youtubeApi';

const GROQ_API_KEY = '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';
const GEMINI_API_KEY = 'AIzaSyA_ApTLLoVhY23vmcAJavGbAjbviXI6YHk';

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: number;
  rank?: number;
}

interface Artist {
  id: string;
  name: string;
  image: string;
}

// Fetch from Groq API
async function fetchFromGroq(prompt: string): Promise<any> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a music data expert. Return only valid JSON array. No additional text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) throw new Error('Groq API error');

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) return null;

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Groq API error:', error);
    return null;
  }
}

// Fetch from Gemini API (fallback)
async function fetchFromGemini(prompt: string): Promise<any> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      }),
    });

    if (!response.ok) throw new Error('Gemini API error');

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) return null;

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Gemini API error:', error);
    return null;
  }
}

// Get thumbnail from YouTube with Google fallback
async function getThumbnail(title: string, artist: string): Promise<{ thumbnail: string; id: string; duration?: number }> {
  let thumbnail = '';
  let id = `${title}-${artist}`.replace(/\s+/g, '-').toLowerCase();
  let duration: number | undefined;
  
  try {
    const results = await searchYouTube(`${title} ${artist}`, 1);
    if (results.length > 0) {
      thumbnail = results[0].thumbnail;
      id = results[0].id;
      duration = results[0].duration;
    }
  } catch (error) {
    console.error('Error fetching thumbnail from YouTube:', error);
  }
  
  // Fallback to Google/Unsplash if YouTube fails
  if (!thumbnail) {
    thumbnail = await getGoogleImage(`${title} ${artist} song music`);
  }
  
  return { thumbnail, id, duration };
}

// Fetch Top Trending
export async function fetchTopTrending(): Promise<Song[]> {
  const prompt = 'Provide JSON array of top 15 trending songs globally on Spotify right now. Each entry must have: {"rank": 1, "title": "song name", "artist": "artist name"}. Exclude ads, remixes, duplicates. Only popular music tracks. Respond ONLY with JSON array.';
  
  let data = await fetchFromGroq(prompt);
  if (!data) data = await fetchFromGemini(prompt);
  if (!data) return [];

  const songs: Song[] = [];
  for (let i = 0; i < Math.min(data.length, 15); i++) {
    const item = data[i];
    if (item.title && item.artist) {
      const { thumbnail, id, duration } = await getThumbnail(item.title, item.artist);
      songs.push({
        id,
        title: item.title,
        artist: item.artist,
        thumbnail,
        duration,
        rank: i + 1
      });
    }
  }
  
  return songs;
}

// Fetch Global Hits (all-time most-streamed)
export async function fetchGlobalHits(): Promise<Song[]> {
  const prompt = 'Provide JSON array of top 15 all-time most-streamed songs on Spotify (like Shape of You, Blinding Lights, Someone You Loved). Each entry: {"title": "song name", "artist": "artist name"}. Respond ONLY with JSON array.';
  
  let data = await fetchFromGroq(prompt);
  if (!data) data = await fetchFromGemini(prompt);
  if (!data) return [];

  const songs: Song[] = [];
  for (let i = 0; i < Math.min(data.length, 15); i++) {
    const item = data[i];
    if (item.title && item.artist) {
      const { thumbnail, id, duration } = await getThumbnail(item.title, item.artist);
      songs.push({
        id,
        title: item.title,
        artist: item.artist,
        thumbnail,
        duration
      });
    }
  }
  
  return songs;
}

// Fetch Regional Hits (India/Tamil Nadu)
export async function fetchRegionalHits(): Promise<Song[]> {
  const prompt = 'Provide JSON array of top 15 trending songs in India and Tamil Nadu right now. Include both Hindi and Tamil songs. Each entry: {"title": "song name", "artist": "artist name"}. Respond ONLY with JSON array.';
  
  let data = await fetchFromGroq(prompt);
  if (!data) data = await fetchFromGemini(prompt);
  if (!data) return [];

  const songs: Song[] = [];
  for (let i = 0; i < Math.min(data.length, 15); i++) {
    const item = data[i];
    if (item.title && item.artist) {
      const { thumbnail, id, duration } = await getThumbnail(item.title, item.artist);
      songs.push({
        id,
        title: item.title,
        artist: item.artist,
        thumbnail,
        duration
      });
    }
  }
  
  return songs;
}

// Get image from Google as fallback
async function getGoogleImage(query: string): Promise<string> {
  try {
    // Use a simple approach - construct Google Images search URL
    const searchQuery = encodeURIComponent(query);
    return `https://source.unsplash.com/400x400/?${searchQuery}`;
  } catch (error) {
    console.error('Error fetching Google image:', error);
    return 'https://via.placeholder.com/400x400?text=No+Image';
  }
}

// Fetch Famous Artists (Top 15 Spotify Artists by Ranking)
export async function fetchFamousArtists(): Promise<Artist[]> {
  const prompt = 'Provide JSON array of top 15 most popular artists on Spotify right now, ranked by streams and popularity (rank 1 to 15). Each entry: {"rank": 1, "name": "artist name"}. Include diverse genres like pop, hip-hop, rock, indie, etc. Respond ONLY with JSON array.';
  
  let data = await fetchFromGroq(prompt);
  if (!data) data = await fetchFromGemini(prompt);
  if (!data) return [];

  const artists: Artist[] = [];
  for (const item of data.slice(0, 15)) {
    if (item.name) {
      let image = '';
      try {
        const results = await searchYouTube(`${item.name} artist official`, 1);
        image = results[0]?.thumbnail || '';
      } catch (error) {
        console.error('YouTube fetch failed for artist:', item.name);
      }
      
      // Fallback to Google/Unsplash if YouTube fails
      if (!image) {
        image = await getGoogleImage(`${item.name} artist music`);
      }
      
      artists.push({
        id: item.name.replace(/\s+/g, '-').toLowerCase(),
        name: item.name,
        image
      });
    }
  }
  
  return artists;
}

// Check if data is from today
function isToday(timestamp: number): boolean {
  const today = new Date();
  const date = new Date(timestamp);
  return today.toDateString() === date.toDateString();
}

// Get cached data from Firebase
export async function getCachedMusicData(type: 'trending' | 'globalHits' | 'regionalHits' | 'famousArtists') {
  try {
    const docRef = doc(db, 'DailyMusicData', type);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.timestamp && isToday(data.timestamp)) {
        return data.data;
      }
    }
  } catch (error) {
    console.error('Error getting cached data:', error);
  }
  return null;
}

// Store data in Firebase
export async function storeMusicData(type: 'trending' | 'globalHits' | 'regionalHits' | 'famousArtists', data: any) {
  try {
    const docRef = doc(db, 'DailyMusicData', type);
    await setDoc(docRef, {
      data,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error storing data:', error);
  }
}

// Fetch and cache all daily data
export async function refreshDailyMusicData() {
  console.log('Refreshing daily music data...');
  
  // Delete old data
  try {
    const snapshot = await getDocs(collection(db, 'DailyMusicData'));
    for (const doc of snapshot.docs) {
      await deleteDoc(doc.ref);
    }
  } catch (error) {
    console.error('Error deleting old data:', error);
  }
  
  // Fetch and store new data
  const trending = await fetchTopTrending();
  await storeMusicData('trending', trending);
  
  const globalHits = await fetchGlobalHits();
  await storeMusicData('globalHits', globalHits);
  
  const regionalHits = await fetchRegionalHits();
  await storeMusicData('regionalHits', regionalHits);
  
  const famousArtists = await fetchFamousArtists();
  await storeMusicData('famousArtists', famousArtists);
  
  console.log('Daily music data refreshed successfully');
}
