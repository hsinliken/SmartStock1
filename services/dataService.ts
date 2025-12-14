
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { StockTransaction, StockValuation } from '../types';
import { AI_ANALYSIS_PROMPT } from '../constants';

const USER_ID_KEY = 'smartstock_uid';

/**
 * Get the current User ID.
 * Priority:
 * 1. URL Parameter (?uid=...) - Allows bookmarking a specific account
 * 2. LocalStorage - Standard persistence
 * 3. Generate New - Fallback for new users
 */
export const getUserId = () => {
  // 1. Check URL Params (Allow bookmarking identity)
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const urlUid = params.get('uid');
    
    if (urlUid) {
      // If URL has UID, enforce it in local storage
      localStorage.setItem(USER_ID_KEY, urlUid);
      return urlUid;
    }
  }

  // 2. Check Local Storage
  let uid = localStorage.getItem(USER_ID_KEY);
  if (!uid) {
    // 3. Generate New
    uid = 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem(USER_ID_KEY, uid);
  }
  return uid;
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
 * - Tries to sync with Firebase Firestore
 * - Falls back to LocalStorage if Firebase is not configured or offline
 */
export const DataService = {
  
  getCurrentUserId: () => getUserId(),

  // Switch user manually (e.g. recovering an old account)
  switchUser: (newUid: string) => {
    if (!newUid) return;
    localStorage.setItem(USER_ID_KEY, newUid);
    // Ideally, the app should reload after this
    window.location.href = window.location.pathname + `?uid=${newUid}`;
  },

  // Load all user data at once (Portfolio, Watchlist, Settings)
  loadUserData: async (): Promise<UserData> => {
    const userId = getUserId();
    
    // 1. Try Loading from Firebase
    if (db) {
      try {
        console.log("Attempting to load from Firebase for user:", userId);
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          console.log("Firebase data found.");
          const cloudData = docSnap.data() as UserData;
          // Sync cloud data to local storage for backup
          localStorage.setItem('smartstock_portfolio', JSON.stringify(cloudData.portfolio || []));
          localStorage.setItem('smartstock_watchlist', JSON.stringify(cloudData.watchlist || []));
          localStorage.setItem('smartstock_analysis_prompt', cloudData.aiPrompt || AI_ANALYSIS_PROMPT);
          return {
            ...DEFAULT_DATA,
            ...cloudData
          };
        } else {
            console.log("No Firebase data found for this user (New user or empty).");
        }
      } catch (e) {
        console.warn("Cloud load failed, falling back to local:", e);
      }
    } else {
        console.log("Firebase DB not initialized.");
    }

    // 2. Fallback: Load from LocalStorage
    const localPortfolio = localStorage.getItem('smartstock_portfolio');
    const localWatchlist = localStorage.getItem('smartstock_watchlist');
    const localPrompt = localStorage.getItem('smartstock_analysis_prompt');

    return {
      portfolio: localPortfolio ? JSON.parse(localPortfolio) : DEFAULT_DATA.portfolio,
      watchlist: localWatchlist ? JSON.parse(localWatchlist) : DEFAULT_DATA.watchlist,
      aiPrompt: localPrompt || DEFAULT_DATA.aiPrompt,
      lastSynced: new Date().toISOString()
    };
  },

  // Save specific parts of data
  savePortfolio: async (portfolio: StockTransaction[]) => {
    localStorage.setItem('smartstock_portfolio', JSON.stringify(portfolio));
    await DataService.syncToCloud({ portfolio });
  },

  saveWatchlist: async (watchlist: StockValuation[]) => {
    localStorage.setItem('smartstock_watchlist', JSON.stringify(watchlist));
    await DataService.syncToCloud({ watchlist });
  },

  saveAiPrompt: async (prompt: string) => {
    localStorage.setItem('smartstock_analysis_prompt', prompt);
    await DataService.syncToCloud({ aiPrompt: prompt });
  },

  // Internal: Sync partial updates to Firebase
  syncToCloud: async (partialData: Partial<UserData>) => {
    if (!db) return; // Cloud not enabled

    const userId = getUserId();
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
