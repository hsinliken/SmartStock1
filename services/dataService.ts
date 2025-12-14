import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { StockTransaction, StockValuation } from '../types';
import { AI_ANALYSIS_PROMPT } from '../constants';

/**
 * Get the current Authenticated User ID from Firebase Auth.
 * Falls back to null if not logged in.
 */
export const getUserId = () => {
  return auth?.currentUser?.uid || null;
};

// Define the full user data shape
interface UserData {
  portfolio: StockTransaction[];
  watchlist: StockValuation[];
  aiPrompt: string;
  lastSynced: string;
}

// Initial default state
const DEFAULT_DATA: UserData = {
  portfolio: [], 
  watchlist: [],
  aiPrompt: AI_ANALYSIS_PROMPT,
  lastSynced: new Date().toISOString()
};

/**
 * Main Data Service
 * - Syncs with Firebase Firestore based on Auth UID
 * - Uses LocalStorage as cache (scoped by UID)
 */
export const DataService = {
  
  // Load all user data at once (Portfolio, Watchlist, Settings)
  loadUserData: async (): Promise<UserData> => {
    const userId = getUserId();
    
    if (!userId) {
      console.warn("No user logged in. Returning default empty data.");
      return DEFAULT_DATA;
    }

    // Keys scoped by User ID to allow multiple users on same device
    const STORAGE_KEY_PORTFOLIO = `smartstock_${userId}_portfolio`;
    const STORAGE_KEY_WATCHLIST = `smartstock_${userId}_watchlist`;
    const STORAGE_KEY_PROMPT = `smartstock_${userId}_analysis_prompt`;
    
    // 1. Try Loading from Firebase
    if (db) {
      try {
        console.log("Attempting to load from Firebase for user:", userId);
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          console.log("Firebase data found.");
          const cloudData = docSnap.data() as UserData;
          
          // Sync cloud data to local storage for backup/cache
          localStorage.setItem(STORAGE_KEY_PORTFOLIO, JSON.stringify(cloudData.portfolio || []));
          localStorage.setItem(STORAGE_KEY_WATCHLIST, JSON.stringify(cloudData.watchlist || []));
          localStorage.setItem(STORAGE_KEY_PROMPT, cloudData.aiPrompt || AI_ANALYSIS_PROMPT);
          
          return {
            ...DEFAULT_DATA,
            ...cloudData
          };
        } else {
            console.log("No Firebase data found for this user (New user).");
        }
      } catch (e) {
        console.warn("Cloud load failed, falling back to local cache:", e);
      }
    }

    // 2. Fallback: Load from LocalStorage (Cache)
    const localPortfolio = localStorage.getItem(STORAGE_KEY_PORTFOLIO);
    const localWatchlist = localStorage.getItem(STORAGE_KEY_WATCHLIST);
    const localPrompt = localStorage.getItem(STORAGE_KEY_PROMPT);

    return {
      portfolio: localPortfolio ? JSON.parse(localPortfolio) : DEFAULT_DATA.portfolio,
      watchlist: localWatchlist ? JSON.parse(localWatchlist) : DEFAULT_DATA.watchlist,
      aiPrompt: localPrompt || DEFAULT_DATA.aiPrompt,
      lastSynced: new Date().toISOString()
    };
  },

  // Save specific parts of data
  savePortfolio: async (portfolio: StockTransaction[]) => {
    const userId = getUserId();
    if (!userId) return;
    localStorage.setItem(`smartstock_${userId}_portfolio`, JSON.stringify(portfolio));
    await DataService.syncToCloud({ portfolio });
  },

  saveWatchlist: async (watchlist: StockValuation[]) => {
    const userId = getUserId();
    if (!userId) return;
    localStorage.setItem(`smartstock_${userId}_watchlist`, JSON.stringify(watchlist));
    await DataService.syncToCloud({ watchlist });
  },

  saveAiPrompt: async (prompt: string) => {
    const userId = getUserId();
    if (!userId) return;
    localStorage.setItem(`smartstock_${userId}_analysis_prompt`, prompt);
    await DataService.syncToCloud({ aiPrompt: prompt });
  },

  // Internal: Sync partial updates to Firebase
  syncToCloud: async (partialData: Partial<UserData>) => {
    if (!db) return; // Cloud not enabled
    const userId = getUserId();
    if (!userId) return; // Not logged in

    try {
      const docRef = doc(db, "users", userId);
      await setDoc(docRef, {
        ...partialData,
        lastSynced: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.error("Failed to sync to cloud:", e);
    }
  }
};