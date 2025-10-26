// dailyMusicData.ts — Handles fetching and caching all music data for the day

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  getGroqTrendingSongs,
  getGroqTopArtists,
} from "./groqApi";
import { getRecommendations } from "./recommendationApi";
import { getYouTubeTrendingSongs } from "./youtubeApi";

// --------------------------------------------------
// 🔹 Helper: check if data is from today
// --------------------------------------------------
function isToday(timestamp: number): boolean {
  const today = new Date().toDateString();
  const dataDate = new Date(timestamp).toDateString();
  return today === dataDate;
}

// --------------------------------------------------
// 🔹 Fetch cached data from Firestore
// --------------------------------------------------
export async function getCachedDailyMusicData() {
  try {
    const ref = doc(db, "DailyMusicData", "latest");
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const { data, timestamp } = snap.data();
      if (isToday(timestamp)) {
        console.log("✅ Loaded music data from Firestore cache");
        return data;
      }
    }
  } catch (error) {
    console.error("❌ Error loading cached music data:", error);
  }

  return null;
}

// --------------------------------------------------
// 🔹 Save fresh data to Firestore
// --------------------------------------------------
export async function saveDailyMusicData(data: any) {
  try {
    await setDoc(doc(db, "DailyMusicData", "latest"), {
      data,
      timestamp: Date.now(),
    });
    console.log("✅ Music data saved to Firestore");
  } catch (error) {
    console.error("❌ Error saving music data:", error);
  }
}

// --------------------------------------------------
// 🔹 Fetch full daily data (Trending + Artists + Recommended)
// --------------------------------------------------
export async function fetchDailyMusicData(forceRefresh: boolean = false) {
  try {
    if (!forceRefresh) {
      const cached = await getCachedDailyMusicData();
      if (cached) return cached;
    }

    console.log("🔄 Fetching fresh music data from Groq & YouTube...");

    // Fetch from Groq AI first
    const [trendingSongs, topArtists, recommendations] = await Promise.all([
      getGroqTrendingSongs(),
      getGroqTopArtists(),
      getRecommendations(),
    ]);

    // If any Groq section fails, use YouTube fallback
    const trendingFinal =
      trendingSongs && trendingSongs.length > 0
        ? trendingSongs
        : await getYouTubeTrendingSongs();

    const fullData = {
      trending: trendingFinal,
      artists: topArtists || [],
      recommendations: recommendations || [],
    };

    await saveDailyMusicData(fullData);
    return fullData;
  } catch (error) {
    console.error("❌ Error fetching daily music data:", error);
    return null;
  }
}
