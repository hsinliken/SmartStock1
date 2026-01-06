
export interface StockTransaction {
  id: string;
  ticker: string;
  name: string;
  buyDate: string;
  buyPrice: number;
  buyQty: number;
  reason: string;
  sellDate?: string;
  sellPrice?: number;
  sellQty?: number;
  currentPrice?: number;
}

export interface StockValuation {
  ticker: string;
  name: string;
  currentPrice: number;
  changePercent: number;
  peRatio: number | null;
  eps: number | null;
  dividendYield: number | null;
  high52Week: number | null;
  low52Week: number | null;
  lastDividend: number | null;
  latestQuarterlyEps: number | null;
  lastFullYearEps: number | null;
  cheapPrice: number;
  fairPrice: number;
  expensivePrice: number;
  dividendFairPrice: number | null;
  estimatedYearlyFairPrice: number | null;
  lastUpdated: string;
}

export interface HotSectorStock {
  ticker: string;
  name: string;
  reason: string;
  strength_score: number;
}

export interface HotSector {
  name: string;
  narrative: string; 
  flow: string;      
  sentiment: string; 
  representative_stocks: HotSectorStock[];
  risk_warning: string;
  hot_score: number;
}

export interface HotSectorsAnalysisResult {
  update_date: string;
  top_sectors: HotSector[];
  overall_market_sentiment: string;
  conclusion: string;
}

export interface SectorDetailAnalysis {
  sectorName: string;
  content: string; // Markdown 格式的深度分析
  timestamp: string;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type ViewMode = 'PORTFOLIO' | 'MARKET_WATCH' | 'AI_ANALYSIS' | 'ECONOMIC_INDICATOR' | 'FUTURE_CANDIDATES' | 'POTENTIAL_STOCKS' | 'HOT_SECTORS' | 'MANUAL';

// Added missing types for feature-specific components
export interface PotentialStock {
  ticker: string;
  name: string;
  currentPrice: number;
  winRate: number;
  winRateBreakdown: {
    fundamentals: number;
    moneyFlow: number;
    technicals: number;
  };
  reason: string;
  signal: 'BUY' | 'SELL' | 'HOLD' | 'WAIT';
  strategy: 'SWING' | 'GRID';
  takeProfit: number;
  stopLoss: number;
  revenueGrowth: number;
  peRatio: number;
  pegRatio: number;
  dividendYield: number; // 新增此欄位以修正編譯錯誤
  rsi: number;
  institutionalBuyDays: number;
}

export interface FutureCandidate {
  rank: number;
  ticker: string;
  name: string;
  industry: string;
  reason: string;
  currentMarketCap: number;
  currentPrice: number;
  targetPrice: number;
  winRate: number;
  winRateBreakdown: {
    rankProximity: number;
    marketCapGap: number;
    growthMomentum: number;
  };
  epsGrowthRate: number;
  revenueMomentum: number;
  pegRatio: number;
}

export interface EconomicData {
  currentLight: 'RED' | 'YELLOW_RED' | 'GREEN' | 'YELLOW_BLUE' | 'BLUE';
  currentScore: number;
  lastUpdated: string;
}

export interface CorrelatedStock {
  ticker: string;
  name: string;
  correlation: string;
}

export interface GoogleFinanceResponse {
  stock_request: string;
  symbol: string;
  attribute: string;
  google_finance_formula: string;
  explanation: string;
}
