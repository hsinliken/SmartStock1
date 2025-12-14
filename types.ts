
export interface StockTransaction {
  id: string;
  ticker: string;
  name: string;
  buyDate: string;
  buyPrice: number;
  buyQty: number;
  reason: string;
  
  // Sales (optional, can be partial)
  sellDate?: string;
  sellPrice?: number;
  sellQty?: number;

  // Derived/Fetched Data
  currentPrice?: number;
}

export interface StockValuation {
  ticker: string;
  name: string;
  currentPrice: number;
  changePercent: number; // Daily change %
  peRatio: number | null; // P/E
  eps: number | null; // TTM EPS
  dividendYield: number | null; // Yield %
  high52Week: number | null;
  low52Week: number | null;

  // Raw data for custom formulas
  lastDividend: number | null; // Recent Dividend Amount
  latestQuarterlyEps: number | null; // Latest Q EPS
  lastFullYearEps: number | null; // EPS corresponding to the dividend year
  
  // Valuation Logic (AI Estimated)
  cheapPrice: number;
  fairPrice: number;
  expensivePrice: number;

  // Custom Formula Valuation
  dividendFairPrice: number | null; // Dividend * 20
  estimatedYearlyFairPrice: number | null; // Q_EPS * 20 * PayoutRatio
  
  lastUpdated: string;
}

export interface EconomicData {
  currentDate: string;
  currentScore: number;
  currentLight: 'RED' | 'YELLOW_RED' | 'GREEN' | 'YELLOW_BLUE' | 'BLUE';
  history: { date: string; score: number; light: string }[];
  description: string;
  strategyAdvice: string;
}

export interface CorrelatedStock {
  ticker: string;
  name: string;
  price: number;
  correlation: string; // High, Medium, etc.
  description: string; // Why it's correlated
  recommendation: string; // Action based on light
}

export interface FutureCandidate {
  rank: number;
  ticker: string;
  name: string;
  currentMarketCap: number; // In Yi (100 Million TWD) e.g. 1904
  projectedMarketCap: number; // In Yi (100 Million TWD)
  currentPrice: number;
  targetPrice: number;
  epsGrowthRate: number; // YoY %
  revenueMomentum: number; // QoQ or YoY %
  pegRatio: number;
  industry: string;
  reason: string; // AI Reasoning
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface ChartAnalysisResult {
  markdown: string;
  timestamp: string;
}

export type ViewMode = 'PORTFOLIO' | 'MARKET_WATCH' | 'AI_ANALYSIS' | 'ECONOMIC_INDICATOR' | 'FUTURE_CANDIDATES';
