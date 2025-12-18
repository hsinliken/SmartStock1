
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { StockTransaction, StockValuation } from '../types';
import { AI_ANALYSIS_PROMPT, FUTURE_CANDIDATES_PROMPT, MARKET_WATCH_PROMPT, ECONOMIC_STRATEGY_PROMPT, PORTFOLIO_ANALYSIS_PROMPT, POTENTIAL_STOCKS_PROMPT } from '../constants';

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
  
  // Settings
  aiPrompt: string;
  aiModel: string; // 'gemini-3-flash-preview' | 'gemini-3-pro-preview'
  
  futureCandidatesPrompt: string;
  futureCandidatesModel: string;
  
  marketWatchPrompt: string;
  marketWatchModel: string; 
  
  economicPrompt: string;
  economicModel: string;

  portfolioPrompt: string;
  portfolioModel: string;

  // Added potentialStocks settings
  potentialStocksPrompt: string;
  potentialStocksModel: string;

  lastSynced: string;
}

// Initial default state
const DEFAULT_DATA: UserData = {
  portfolio: [], 
  watchlist: [],
  aiPrompt: AI_ANALYSIS_PROMPT,
  aiModel: 'gemini-3-flash-preview',
  futureCandidatesPrompt: FUTURE_CANDIDATES_PROMPT,
  futureCandidatesModel: 'gemini-3-pro-preview',
  marketWatchPrompt: MARKET_WATCH_PROMPT,
  marketWatchModel: 'gemini-3-flash-preview',
  economicPrompt: ECONOMIC_STRATEGY_PROMPT,
  economicModel: 'gemini-3-pro-preview',
  portfolioPrompt: PORTFOLIO_ANALYSIS_PROMPT,
  portfolioModel: 'gemini-3-pro-preview',
  potentialStocksPrompt: POTENTIAL_STOCKS_PROMPT,
  potentialStocksModel: 'gemini-3-pro-preview',
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
    
    const STORAGE_KEY_AI_PROMPT = `smartstock_${userId}_analysis_prompt`;
    const STORAGE_KEY_AI_MODEL = `smartstock_${userId}_analysis_model`;
    
    const STORAGE_KEY_FUTURE_PROMPT = `smartstock_${userId}_future_prompt`;
    const STORAGE_KEY_FUTURE_MODEL = `smartstock_${userId}_future_model`;
    
    const STORAGE_KEY_MARKET_PROMPT = `smartstock_${userId}_market_prompt`;
    const STORAGE_KEY_MARKET_MODEL = `smartstock_${userId}_market_model`;

    const STORAGE_KEY_ECONOMIC_PROMPT = `smartstock_${userId}_economic_prompt`;
    const STORAGE_KEY_ECONOMIC_MODEL = `smartstock_${userId}_economic_model`;

    const STORAGE_KEY_PORTFOLIO_PROMPT = `smartstock_${userId}_portfolio_prompt`;
    const STORAGE_KEY_PORTFOLIO_MODEL = `smartstock_${userId}_portfolio_model`;

    const STORAGE_KEY_POTENTIAL_PROMPT = `smartstock_${userId}_potential_prompt`;
    const STORAGE_KEY_POTENTIAL_MODEL = `smartstock_${userId}_potential_model`;
    
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
          
          localStorage.setItem(STORAGE_KEY_AI_PROMPT, cloudData.aiPrompt || AI_ANALYSIS_PROMPT);
          localStorage.setItem(STORAGE_KEY_AI_MODEL, cloudData.aiModel || 'gemini-3-flash-preview');
          
          localStorage.setItem(STORAGE_KEY_FUTURE_PROMPT, cloudData.futureCandidatesPrompt || FUTURE_CANDIDATES_PROMPT);
          localStorage.setItem(STORAGE_KEY_FUTURE_MODEL, cloudData.futureCandidatesModel || 'gemini-3-pro-preview');
          
          localStorage.setItem(STORAGE_KEY_MARKET_PROMPT, cloudData.marketWatchPrompt || MARKET_WATCH_PROMPT);
          localStorage.setItem(STORAGE_KEY_MARKET_MODEL, cloudData.marketWatchModel || 'gemini-3-flash-preview');

          localStorage.setItem(STORAGE_KEY_ECONOMIC_PROMPT, cloudData.economicPrompt || ECONOMIC_STRATEGY_PROMPT);
          localStorage.setItem(STORAGE_KEY_ECONOMIC_MODEL, cloudData.economicModel || 'gemini-3-pro-preview');
          
          localStorage.setItem(STORAGE_KEY_PORTFOLIO_PROMPT, cloudData.portfolioPrompt || PORTFOLIO_ANALYSIS_PROMPT);
          localStorage.setItem(STORAGE_KEY_PORTFOLIO_MODEL, cloudData.portfolioModel || 'gemini-3-pro-preview');

          localStorage.setItem(STORAGE_KEY_POTENTIAL_PROMPT, cloudData.potentialStocksPrompt || POTENTIAL_STOCKS_PROMPT);
          localStorage.setItem(STORAGE_KEY_POTENTIAL_MODEL, cloudData.potentialStocksModel || 'gemini-3-pro-preview');

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
    
    const localAiPrompt = localStorage.getItem(STORAGE_KEY_AI_PROMPT);
    const localAiModel = localStorage.getItem(STORAGE_KEY_AI_MODEL);

    const localFuturePrompt = localStorage.getItem(STORAGE_KEY_FUTURE_PROMPT);
    const localFutureModel = localStorage.getItem(STORAGE_KEY_FUTURE_MODEL);

    const localMarketPrompt = localStorage.getItem(STORAGE_KEY_MARKET_PROMPT);
    const localMarketModel = localStorage.getItem(STORAGE_KEY_MARKET_MODEL);

    const localEconomicPrompt = localStorage.getItem(STORAGE_KEY_ECONOMIC_PROMPT);
    const localEconomicModel = localStorage.getItem(STORAGE_KEY_ECONOMIC_MODEL);

    const localPortfolioPrompt = localStorage.getItem(STORAGE_KEY_PORTFOLIO_PROMPT);
    const localPortfolioModel = localStorage.getItem(STORAGE_KEY_PORTFOLIO_MODEL);

    const localPotentialPrompt = localStorage.getItem(STORAGE_KEY_POTENTIAL_PROMPT);
    const localPotentialModel = localStorage.getItem(STORAGE_KEY_POTENTIAL_MODEL);

    return {
      portfolio: localPortfolio ? JSON.parse(localPortfolio) : DEFAULT_DATA.portfolio,
      watchlist: localWatchlist ? JSON.parse(localWatchlist) : DEFAULT_DATA.watchlist,
      
      aiPrompt: localAiPrompt || DEFAULT_DATA.aiPrompt,
      aiModel: localAiModel || DEFAULT_DATA.aiModel,
      
      futureCandidatesPrompt: localFuturePrompt || DEFAULT_DATA.futureCandidatesPrompt,
      futureCandidatesModel: localFutureModel || DEFAULT_DATA.futureCandidatesModel,
      
      marketWatchPrompt: localMarketPrompt || DEFAULT_DATA.marketWatchPrompt,
      marketWatchModel: localMarketModel || DEFAULT_DATA.marketWatchModel,

      economicPrompt: localEconomicPrompt || DEFAULT_DATA.economicPrompt,
      economicModel: localEconomicModel || DEFAULT_DATA.economicModel,
      
      portfolioPrompt: localPortfolioPrompt || DEFAULT_DATA.portfolioPrompt,
      portfolioModel: localPortfolioModel || DEFAULT_DATA.portfolioModel,

      potentialStocksPrompt: localPotentialPrompt || DEFAULT_DATA.potentialStocksPrompt,
      potentialStocksModel: localPotentialModel || DEFAULT_DATA.potentialStocksModel,

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

  saveAiSettings: async (prompt: string, model: string) => {
    const userId = getUserId();
    if (!userId) return;
    localStorage.setItem(`smartstock_${userId}_analysis_prompt`, prompt);
    localStorage.setItem(`smartstock_${userId}_analysis_model`, model);
    await DataService.syncToCloud({ aiPrompt: prompt, aiModel: model });
  },

  saveFutureCandidatesSettings: async (prompt: string, model: string) => {
    const userId = getUserId();
    if (!userId) return;
    localStorage.setItem(`smartstock_${userId}_future_prompt`, prompt);
    localStorage.setItem(`smartstock_${userId}_future_model`, model);
    await DataService.syncToCloud({ futureCandidatesPrompt: prompt, futureCandidatesModel: model });
  },

  saveMarketWatchSettings: async (prompt: string, model: string) => {
    const userId = getUserId();
    if (!userId) return;
    localStorage.setItem(`smartstock_${userId}_market_prompt`, prompt);
    localStorage.setItem(`smartstock_${userId}_market_model`, model);
    await DataService.syncToCloud({ marketWatchPrompt: prompt, marketWatchModel: model });
  },

  saveEconomicSettings: async (prompt: string, model: string) => {
    const userId = getUserId();
    if (!userId) return;
    localStorage.setItem(`smartstock_${userId}_economic_prompt`, prompt);
    localStorage.setItem(`smartstock_${userId}_economic_model`, model);
    await DataService.syncToCloud({ economicPrompt: prompt, economicModel: model });
  },

  savePortfolioSettings: async (prompt: string, model: string) => {
    const userId = getUserId();
    if (!userId) return;
    localStorage.setItem(`smartstock_${userId}_portfolio_prompt`, prompt);
    localStorage.setItem(`smartstock_${userId}_portfolio_model`, model);
    await DataService.syncToCloud({ portfolioPrompt: prompt, portfolioModel: model });
  },

  // Added potentialStocks settings save method
  savePotentialStocksSettings: async (prompt: string, model: string) => {
    const userId = getUserId();
    if (!userId) return;
    localStorage.setItem(`smartstock_${userId}_potential_prompt`, prompt);
    localStorage.setItem(`smartstock_${userId}_potential_model`, model);
    await DataService.syncToCloud({ potentialStocksPrompt: prompt, potentialStocksModel: model });
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
