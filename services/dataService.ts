
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { StockTransaction, StockValuation, HotSectorsAnalysisResult } from '../types';
import { AI_ANALYSIS_PROMPT, FUTURE_CANDIDATES_PROMPT, MARKET_WATCH_PROMPT, ECONOMIC_STRATEGY_PROMPT, PORTFOLIO_ANALYSIS_PROMPT, POTENTIAL_STOCKS_PROMPT } from '../constants';

export const getUserId = () => {
  return auth?.currentUser?.uid || null;
};

interface UserData {
  portfolio: StockTransaction[];
  watchlist: StockValuation[];
  hotSectors?: HotSectorsAnalysisResult; 
  
  aiPrompt: string; aiModel: string;
  futureCandidatesPrompt: string; futureCandidatesModel: string;
  marketWatchPrompt: string; marketWatchModel: string; 
  economicPrompt: string; economicModel: string;
  portfolioPrompt: string; portfolioModel: string;
  potentialStocksPrompt: string; potentialStocksModel: string;

  lastSynced: string;
}

const DEFAULT_DATA: UserData = {
  portfolio: [], watchlist: [],
  aiPrompt: AI_ANALYSIS_PROMPT, aiModel: 'gemini-3-flash-preview',
  futureCandidatesPrompt: FUTURE_CANDIDATES_PROMPT, futureCandidatesModel: 'gemini-3-pro-preview',
  marketWatchPrompt: MARKET_WATCH_PROMPT, marketWatchModel: 'gemini-3-flash-preview',
  economicPrompt: ECONOMIC_STRATEGY_PROMPT, economicModel: 'gemini-3-pro-preview',
  portfolioPrompt: PORTFOLIO_ANALYSIS_PROMPT, portfolioModel: 'gemini-3-pro-preview',
  potentialStocksPrompt: POTENTIAL_STOCKS_PROMPT, potentialStocksModel: 'gemini-3-pro-preview',
  lastSynced: new Date().toISOString()
};

export const DataService = {
  loadUserData: async (): Promise<UserData> => {
    const userId = getUserId();
    if (!userId) return DEFAULT_DATA;

    if (db) {
      try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return { ...DEFAULT_DATA, ...docSnap.data() } as UserData;
        }
      } catch (e) { console.warn("Firebase load failed", e); }
    }
    return DEFAULT_DATA;
  },

  saveHotSectors: async (data: HotSectorsAnalysisResult) => {
    const userId = getUserId();
    if (!userId) return;
    await DataService.syncToCloud({ hotSectors: data });
  },

  // Missing save methods for specific component settings
  saveAiSettings: async (prompt: string, model: string) => {
    await DataService.syncToCloud({ aiPrompt: prompt, aiModel: model });
  },

  savePortfolioSettings: async (prompt: string, model: string) => {
    await DataService.syncToCloud({ portfolioPrompt: prompt, portfolioModel: model });
  },

  saveMarketWatchSettings: async (prompt: string, model: string) => {
    await DataService.syncToCloud({ marketWatchPrompt: prompt, marketWatchModel: model });
  },

  savePortfolio: async (portfolio: StockTransaction[]) => {
    await DataService.syncToCloud({ portfolio });
  },

  saveWatchlist: async (watchlist: StockValuation[]) => {
    await DataService.syncToCloud({ watchlist });
  },

  saveFutureCandidatesSettings: async (prompt: string, model: string) => {
    await DataService.syncToCloud({ futureCandidatesPrompt: prompt, futureCandidatesModel: model });
  },

  savePotentialStocksSettings: async (prompt: string, model: string) => {
    await DataService.syncToCloud({ potentialStocksPrompt: prompt, potentialStocksModel: model });
  },

  syncToCloud: async (partialData: Partial<UserData>) => {
    if (!db) return;
    const userId = getUserId();
    if (!userId) return;
    try {
      const docRef = doc(db, "users", userId);
      await setDoc(docRef, { ...partialData, lastSynced: new Date().toISOString() }, { merge: true });
    } catch (e) { console.error("Cloud sync failed", e); }
  }
};
