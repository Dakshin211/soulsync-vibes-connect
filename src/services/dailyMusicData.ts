// Daily music data fetching using Groq (primary) and Gemini (fallback)
import { collection, doc, setDoc, getDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { searchYouTube } from './youtubeApi';

const GROQ_API_KEY = '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';
const GEMINI_API_KEY = 'AIzaSyA_ApTLLoVhY23vmcAJavGbAjbviXI6YHk';

// ---- Interfaces ----
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

// ---- Utility: Safer Date Check ----
function isToday(timestamp: number): boolean {
  const now = new Date();
  const date = new Date(timestamp);
  return (
    now.getDate() === date.getDate() &&
    now.getMonth() === date.getMonth() &&
    now.getFullYear() === date.getFullYear()
  );
}

// ---- Utility: Generate Stable ID ----
function makeId(title: string, artist: string): string {
  return `${title.trim().toLowerCase()}-${artist.trim().toLowerCase()}`.replace(/\s+/g, '-');
}

// ---- Utility: Get Stable Fallback Image ----
async function getGoogleImage(query: string): Promise<string> {
  try {
    const encoded = encodeURIComponent(query);
    // Stable Unsplash link using a consistent seed
    return `https://source.unsplash.com/400x400/?music,${encoded}&sig=${encoded.length}`;
  } catch {
    return 'https://via.placeholder.com/400x400?text=No+Image';
  }
}

// ---- Fetchers ----
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
          { role: 'system', content: 'You are a music data expert. Return ONLY JSON array.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch (err) {
    console.error('Groq API error:', err);
    return null;
  }
}

async function fetchFromGemini(prompt: string): Promise<any> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch (err) {
    console.error('Gemini API error:', err);
    return null;
  }
}

// ---- Thumbnail Fetcher ----
async function getThumbnail(title: string, artist: string): Promise<{ thumbnail: string; id: string; duration?: number }> {
  let id = makeId(title, artist);
  let thumbnail = '';
  let duration: number | undefined;

  try {
    const results = await searchYouTube(`${title} ${artist} official audio`, 1);
    if (results?.length > 0) {
      thumbnail = results[0].thumbnail;
      id = results[0].id || id;
      duration = results[0].duration;
    }
  } catch (err) {
    console.error('YouTube fetch failed:', err);
  }

  if (!thumbnail) thumbnail = await getGoogleImage(`${title} ${artist} song`);
  return { thumbnail, id, duration };
}

// ---- Fetch: Top Trending ----
export async function fetchTopTrending(): Promise<Song[]> {
  const prompt = `Provide a JSON array of top 15 trending songs globally on Spotify right now.
  Each object: {"rank":1,"title":"Song Name","artist":"Artist Name"}.`;

  let data = await fetchFromGroq(prompt);
  if (!data) data = await fetchFromGemini(prompt);
  if (!data) return [];

  const valid = data.filter((s: any) => s.title && s.artist);
  const songs = await Promise.all(
    valid.slice(0, 15).map(async (item: any, i: number) => {
      const { thumbnail, id, duration } = await getThumbnail(item.title, item.artist);
      return { id, title: item.title, artist: item.artist, thumbnail, duration, rank: i + 1 };
    })
  );
  return songs;
}

// ---- Fetch: Global Hits ----
export async function fetchGlobalHits(): Promise<Song[]> {
  const prompt = `Provide JSON array of top 15 all-time most-streamed songs on Spotify.
  Each object: {"title":"Song Name","artist":"Artist Name"}.`;

  let data = await fetchFromGroq(prompt);
  if (!data) data = await fetchFromGemini(prompt);
  if (!data) return [];

  const valid = data.filter((s: any) => s.title && s.artist);
  return Promise.all(
    valid.slice(0, 15).map(async (item: any) => {
      const { thumbnail, id, duration } = await getThumbnail(item.title, item.artist);
      return { id, title: item.title, artist: item.artist, thumbnail, duration };
    })
  );
}

// ---- Fetch: Regional Hits ----
export async function fetchRegionalHits(): Promise<Song[]> {
  const prompt = `Provide JSON array of top 15 trending songs in India and Tamil Nadu right now.
  Include both Hindi and Tamil songs.
  Format: {"title":"Song Name","artist":"Artist Name"}.`;

  let data = await fetchFromGroq(prompt);
  if (!data) data = await fetchFromGemini(prompt);
  if (!data) return [];

  const valid = data.filter((s: any) => s.title && s.artist);
  return Promise.all(
    valid.slice(0, 15).map(async (item: any) => {
      const { thumbnail, id, duration } = await getThumbnail(item.title, item.artist);
      return { id, title: item.title, artist: item.artist, thumbnail, duration };
    })
  );
}

// ---- Fetch: Famous Artists ----
export async function fetchFamousArtists(): Promise<Artist[]> {
  const prompt = `Provide JSON array of top 15 most popular Spotify artists right now.
  Each entry: {"rank":1,"name":"Artist Name"}. Include diverse genres.`;

  let data = await fetchFromGroq(prompt);
  if (!data) data = await fetchFromGemini(prompt);
  if (!data) return [];

  const valid = data.filter((a: any) => a.name);
  return Promise.all(
    valid.slice(0, 15).map(async (item: any) => {
      let image = '';
      try {
        const results = await searchYouTube(`${item.name} artist official`, 1);
        image = results?.[0]?.thumbnail || '';
      } catch {
        image = '';
      }
      if (!image) image = await getGoogleImage(`${item.name} artist`);
      return { id: makeId(item.name, 'artist'), name: item.name, image };
    })
  );
}

// ---- Firebase Caching ----
export async function getCachedMusicData(type: 'trending' | 'globalHits' | 'regionalHits' | 'famousArtists') {
  try {
    const ref = doc(db, 'DailyMusicData', type);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      if (isToday(data.timestamp)) return data.data;
    }
  } catch (err) {
    console.error('Cache read error:', err);
  }
  return null;
}

export async function storeMusicData(type: 'trending' | 'globalHits' | 'regionalHits' | 'famousArtists', data: any) {
  try {
    await setDoc(doc(db, 'DailyMusicData', type), { data, timestamp: Date.now() });
  } catch (err) {
    console.error('Cache store error:', err);
  }
}

// ---- Daily Refresh ----
export async function refreshDailyMusicData() {
  console.log('Refreshing daily music data...');
  const trending = await fetchTopTrending();
  await storeMusicData('trending', trending);

  const globalHits = await fetchGlobalHits();
  await storeMusicData('globalHits', globalHits);

  const regionalHits = await fetchRegionalHits();
  await storeMusicData('regionalHits', regionalHits);

  const famousArtists = await fetchFamousArtists();
  await storeMusicData('famousArtists', famousArtists);

  console.log('✅ Daily music data updated successfully');
}
