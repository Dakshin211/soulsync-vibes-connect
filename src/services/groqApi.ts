// services/groqApi.ts
// Groq AI API – refined for stable and accurate music data

const GROQ_API_KEY = 'YOUR_GROQ_API_KEY_HERE'; // <-- Replace with your valid key

export interface Song {
  title: string;
  artist: string;
  thumbnail?: string;
  id?: string;
}

/**
 * Helper: safely extract a JSON array from Groq’s response
 */
function extractJsonArray(text: string): any[] | null {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/**
 * 1️⃣ Get globally famous artists (used for “Famous Artists” section)
 */
export async function getFamousArtists(): Promise<{ name: string; image: string }[]> {
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
              'You are a global music analyst. Return only valid JSON array of the 15 most popular mainstream artists right now worldwide. Include a small image link (Spotify/YouTube photo). Format: [{"name":"Artist Name","image":"https://..."}].',
          },
          {
            role: 'user',
            content: 'List 15 famous music artists trending globally in 2025. JSON only.',
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) throw new Error(`Groq API error: ${response.status}`);

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    const artists = extractJsonArray(content);

    if (!artists) return [];

    // Clean and validate
    return artists
      .filter((a) => a.name && a.image)
      .slice(0, 15);
  } catch (error) {
    console.error('Error fetching famous artists from Groq:', error);
    // Fallback list
    return [
      { name: 'The Weeknd', image: '/artists/theweeknd.jpg' },
      { name: 'Drake', image: '/artists/drake.jpg' },
      { name: 'Taylor Swift', image: '/artists/taylor.jpg' },
      { name: 'Billie Eilish', image: '/artists/billie.jpg' },
      { name: 'Ariana Grande', image: '/artists/ariana.jpg' },
      { name: 'Justin Bieber', image: '/artists/justin.jpg' },
      { name: 'Post Malone', image: '/artists/postmalone.jpg' },
      { name: 'Olivia Rodrigo', image: '/artists/olivia.jpg' },
      { name: 'Dua Lipa', image: '/artists/dua.jpg' },
      { name: 'Ed Sheeran', image: '/artists/ed.jpg' },
      { name: 'Harry Styles', image: '/artists/harry.jpg' },
      { name: 'Doja Cat', image: '/artists/doja.jpg' },
      { name: 'Bad Bunny', image: '/artists/bad.jpg' },
      { name: 'Travis Scott', image: '/artists/travis.jpg' },
      { name: 'Kendrick Lamar', image: '/artists/kendrick.jpg' },
    ];
  }
}

/**
 * 2️⃣ Get song recommendations based on a track (AI-based)
 */
export async function getGroqRecommendations(artist: string, track: string): Promise<Song[]> {
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
              'You are a professional music curator. Return only valid JSON array with 5 songs similar in genre, mood, or style to the given one. Format: [{"title":"Song Name","artist":"Artist Name"}].',
          },
          {
            role: 'user',
            content: `Suggest 5 songs similar to "${track}" by "${artist}". Return JSON only.`,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) throw new Error(`Groq API error: ${response.status}`);

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    const songs = extractJsonArray(content);

    if (!songs) return [];

    return songs.filter((s) => s.title && s.artist);
  } catch (error) {
    console.error('Error fetching Groq recommendations:', error);
    return [];
  }
}
