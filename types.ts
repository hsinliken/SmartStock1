
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
  strength_score: number; // 1-100
}

export interface HotSector {
  name: string;
  narrative: string; // 敘事
  flow: string;      // 資金流向
  sentiment: string; // 市場情緒
  representative_stocks: HotSectorStock[];
  risk_warning: string;
  hot_score: number; // 1-100
}

export interface HotSectorsAnalysisResult {
  update_date: string;
  top_sectors: HotSector[];
  overall_market_sentiment: string;
  conclusion: string;
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
  correlation: string;
  description: string;
  recommendation: string;
}

export interface FutureCandidate {
  rank: number;
  ticker: string;
  name: string;
  currentMarketCap: number;
  projectedMarketCap: number;
  currentPrice: number;
  targetPrice: number;
  epsGrowthRate: number;
  revenueMomentum: number;
  pegRatio: number;
  industry: string;
  reason: string;
  winRate: number;
  winRateBreakdown: {
    rankProximity: number;
    marketCapGap: number;
    growthMomentum: number;
  };
}

export interface PotentialStock {
  ticker: string;
  name: string;
  capital: number; 
  revenueGrowth: number; 
  peRatio: number;
  pegRatio: number;
  dividendYield: number;
  institutionalBuyDays: number; 
  rsi: number;
  ma200Price: number;
  atr: number;
  bbUpper: number;
  bbLower: number;
  currentPrice: number;
  winRate: number; 
  winRateBreakdown: {
    fundamentals: number;
    moneyFlow: number;
    technicals: number;
  };
  signal: 'BUY' | 'SELL' | 'HOLD' | 'WAIT';
  strategy: 'SWING' | 'GRID';
  stopLoss: number;
  takeProfit: number;
  trailingStop: number;
  reason: string;
}

export interface GoogleFinanceResponse {
  stock_request: string;
  symbol: string;
  attribute: string;
  google_finance_formula: string;
  explanation: string;
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

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type ViewMode = 'PORTFOLIO' | 'MARKET_WATCH' | 'AI_ANALYSIS' | 'ECONOMIC_INDICATOR' | 'FUTURE_CANDIDATES' | 'POTENTIAL_STOCKS' | 'HOT_SECTORS' | 'MANUAL';
