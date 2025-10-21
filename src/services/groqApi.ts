// Groq AI API for song recommendations fallback
const GROQ_API_KEY = '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';

interface Song {
  title: string;
  artist: string;
}

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
            content: 'You are a music recommendation expert. Return only valid JSON array with exactly 5 songs similar to the given track. Format: [{"title":"Song Name","artist":"Artist Name"}]'
          },
          {
            role: 'user',
            content: `Suggest 5 songs similar to "${track}" by "${artist}". Return only JSON array.`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('Groq API error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) return [];

    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const songs = JSON.parse(jsonMatch[0]);
    return songs.filter((s: any) => s.title && s.artist);
  } catch (error) {
    console.error('Error fetching Groq recommendations:', error);
    return [];
  }
}
