// src/services/dailyMusicData.ts
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

// -------------------- Helper: Groq Fetch --------------------
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
            content:
              'You are an expert music data analyst. Always return clean JSON array, no extra text, no markdown.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) throw new Error('Groq API error');

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const jsonMatch = content?.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Groq API error:', error);
    return null;
  }
}

// -------------------- Helper: Gemini Fallback --------------------
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

    if (!response.ok) throw new Error('Gemini API error');

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const jsonMatch = text?.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Gemini API error:', error);
    return null;
  }
}

// -------------------- Helper: Google/YouTube Thumbnails --------------------
async function getThumbnail(title: string, artist: string): Promise<{ thumbnail: string; id: string; duration?: number }> {
  let id = `${title}-${artist}`.replace(/\s+/g, '-').toLowerCase();
  let thumbnail = '';
  let duration: number | undefined;

  try {
    const results = await searchYouTube(`${title} ${artist}`, 1);
    if (results?.length > 0) {
      thumbnail = results[0].thumbnail;
      id = results[0].id;
      duration = results[0].duration;
    }
  } catch (error) {
    console.error('YouTube fetch error:', error);
  }

  if (!thumbnail) {
    thumbnail = await getGoogleImage(`${title} ${artist} music song`);
  }

  return { thumbnail, id, duration };
}

// Unsplash fallback for any missing images
async function getGoogleImage(query: string): Promise<string> {
  const safeQuery = encodeURIComponent(query);
  return `https://source.unsplash.com/400x400/?${safeQuery},music`;
}

// -------------------- Data Fetchers --------------------

// 1️⃣ Trending Songs
export async function fetchTopTrending(): Promise<Song[]> {
  const prompt = `
  Provide a JSON array of top 15 currently trending songs globally on Spotify.
  Each item: {"rank": 1, "title": "Song Name", "artist": "Artist Name"}.
  Exclude remixes, ads, and duplicates.
  Only return the JSON array, no text.
  `;

  let data = await fetchFromGroq(prompt);
  if (!data) data = await fetchFromGemini(prompt);
  if (!data) return [];

  const songs: Song[] = [];
  const seen = new Set();

  for (let i = 0; i < data.length && songs.length < 15; i++) {
    const item = data[i];
    const key = `${item.title}-${item.artist}`.toLowerCase();
    if (item.title && item.artist && !seen.has(key)) {
      seen.add(key);
      const { thumbnail, id, duration } = await getThumbnail(item.title, item.artist);
      if (thumbnail) {
        songs.push({ id, title: item.title, artist: item.artist, thumbnail, duration, rank: songs.length + 1 });
      }
    }
  }

  return songs;
}

// 2️⃣ Global Hits
export async function fetchGlobalHits(): Promise<Song[]> {
  const prompt = `
  Provide a JSON array of top 15 all-time most-streamed songs on Spotify.
  Include artists like Ed Sheeran, The Weeknd, and Billie Eilish.
  Each item: {"title":"Song Name","artist":"Artist Name"}.
  Only JSON output.
  `;

  let data = await fetchFromGroq(prompt);
  if (!data) data = await fetchFromGemini(prompt);
  if (!data) return [];

  const seen = new Set();
  const songs: Song[] = [];

  for (let i = 0; i < data.length && songs.length < 15; i++) {
    const item = data[i];
    const key = `${item.title}-${item.artist}`.toLowerCase();
    if (item.title && item.artist && !seen.has(key)) {
      seen.add(key);
      const { thumbnail, id, duration } = await getThumbnail(item.title, item.artist);
      if (thumbnail) {
        songs.push({ id, title: item.title, artist: item.artist, thumbnail, duration });
      }
    }
  }

  return songs;
}

// 3️⃣ Regional Hits (India + Tamil Nadu)
export async function fetchRegionalHits(): Promise<Song[]> {
  const prompt = `
  Provide a JSON array of top 15 trending songs in India and Tamil Nadu this week.
  Include both Tamil and Hindi film songs.
  Each item: {"title":"Song Name","artist":"Artist Name"}.
  Only JSON output.
  `;

  let data = await fetchFromGroq(prompt);
  if (!data) data = await fetchFromGemini(prompt);
  if (!data) return [];

  const songs: Song[] = [];
  const seen = new Set();

  for (let i = 0; i < data.length && songs.length < 15; i++) {
    const item = data[i];
    const key = `${item.title}-${item.artist}`.toLowerCase();
    if (item.title && item.artist && !seen.has(key)) {
      seen.add(key);
      const { thumbnail, id, duration } = await getThumbnail(item.title, item.artist);
      if (thumbnail) songs.push({ id, title: item.title, artist: item.artist, thumbnail, duration });
    }
  }

  return songs;
}

// 4️⃣ Famous Artists
export async function fetchFamousArtists(): Promise<Artist[]> {
  const artistsList = [
    "The Weeknd",
    "Bruno Mars",
    "Taylor Swift",
    "Lana Del Rey",
    "Lady Gaga",
    "Justin Bieber",
    "Billie Eilish",
    "Ed Sheeran",
    "Coldplay",
    "Ariana Grande",
    "Bad Bunny",
    "Drake",
    "David Guetta",
    "Sabrina Carpenter",
    "Kendrick Lamar"
];

  const artists: Artist[] = [];

  for (const name of artistsList) {
    try {
      const results = await searchYouTube(`${name} artist official`, 1);
      const image = results[0]?.thumbnail || (await getGoogleImage(`${name} artist portrait`));
      artists.push({ id: name.toLowerCase().replace(/\s+/g, '-'), name, image });
    } catch {
      const image = await getGoogleImage(`${name} artist portrait`);
      artists.push({ id: name.toLowerCase().replace(/\s+/g, '-'), name, image });
    }
  }

  return artists;
}

// 5️⃣ Recommended For User
export async function fetchRecommendedForUser(userId: string): Promise<Song[]> {
  try {
    const userRef = doc(db, 'Users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return [];

    const favoriteArtists: string[] = userSnap.data().favoriteArtists || [];
    if (favoriteArtists.length === 0) return [];

    const prompt = `
    Based on favorite artists: ${favoriteArtists.join(', ')}.
    Suggest 10 songs that align with their musical style and taste.
    Exclude duplicates and low-quality remixes.
    Only return JSON array like [{"title":"Song Name","artist":"Artist Name"}].
    `;

    let data = await fetchFromGroq(prompt);
    if (!data) data = await fetchFromGemini(prompt);
    if (!data) return [];

    const seen = new Set();
    const songs: Song[] = [];

    for (let i = 0; i < data.length && songs.length < 10; i++) {
      const item = data[i];
      const key = `${item.title}-${item.artist}`.toLowerCase();
      if (item.title && item.artist && !seen.has(key)) {
        seen.add(key);
        const { thumbnail, id, duration } = await getThumbnail(item.title, item.artist);
        if (thumbnail) songs.push({ id, title: item.title, artist: item.artist, thumbnail, duration });
      }
    }

    return songs;
  } catch (error) {
    console.error('Error in personalized recommendations:', error);
    return [];
  }
}

// -------------------- Firestore Caching --------------------
function isToday(timestamp: number): boolean {
  const today = new Date().toDateString();
  const date = new Date(timestamp).toDateString();
  return today === date;
}

export async function getCachedMusicData(type: 'trending' | 'globalHits' | 'regionalHits' | 'famousArtists') {
  const ref = doc(db, 'DailyMusicData', type);
  const snap = await getDoc(ref);
  if (snap.exists() && isToday(snap.data().timestamp)) {
    return snap.data().data;
  }
  return null;
}

export async function storeMusicData(
  type: 'trending' | 'globalHits' | 'regionalHits' | 'famousArtists',
  data: any
) {
  await setDoc(doc(db, 'DailyMusicData', type), { data, timestamp: Date.now() });
}

// -------------------- Daily Refresh --------------------
export async function refreshDailyMusicData() {
  console.log('🔄 Refreshing daily music data...');

  const snapshot = await getDocs(collection(db, 'DailyMusicData'));
  for (const docu of snapshot.docs) await deleteDoc(docu.ref);

  const trending = await fetchTopTrending();
  await storeMusicData('trending', trending);

  const globalHits = await fetchGlobalHits();
  await storeMusicData('globalHits', globalHits);

  const regionalHits = await fetchRegionalHits();
  await storeMusicData('regionalHits', regionalHits);

  const famousArtists = await fetchFamousArtists();
  await storeMusicData('famousArtists', famousArtists);

  console.log('✅ Daily music data refreshed successfully');
}
