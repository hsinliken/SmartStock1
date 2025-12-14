
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { StockTransaction, StockValuation } from '../types';
import { MOCK_PORTFOLIO_DATA, AI_ANALYSIS_PROMPT } from '../constants';

const USER_ID_KEY = 'smartstock_uid';

// Helper: Get or Create a unique User ID for this device
const getUserId = () => {
  let uid = localStorage.getItem(USER_ID_KEY);
  if (!uid) {
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
  portfolio: MOCK_PORTFOLIO_DATA,
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
  
  // Load all user data at once (Portfolio, Watchlist, Settings)
  loadUserData: async (): Promise<UserData> => {
    const userId = getUserId();
    
    // 1. Try Loading from Firebase
    if (db) {
      try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const cloudData = docSnap.data() as UserData;
          // Sync cloud data to local storage for backup
          localStorage.setItem('smartstock_portfolio', JSON.stringify(cloudData.portfolio));
          localStorage.setItem('smartstock_watchlist', JSON.stringify(cloudData.watchlist));
          localStorage.setItem('smartstock_analysis_prompt', cloudData.aiPrompt);
          return cloudData;
        }
      } catch (e) {
        console.warn("Cloud load failed, falling back to local:", e);
      }
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
