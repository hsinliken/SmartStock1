
/**
 * Service to communicate with the Backend API (Yahoo Finance Proxy)
 */
export interface YahooStockData {
  symbol: string;
  shortName: string;
  longName: string;
  currency: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketPreviousClose: number;
  marketCap: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  trailingPE?: number;
  forwardPE?: number;
  epsTrailingTwelveMonths?: number;
  dividendYield?: number; // 0.03 means 3%
  trailingAnnualDividendRate?: number;
}

export const StockService = {
  
  /**
   * Fetch stock data from our Vercel API
   */
  getStockData: async (ticker: string, minimal: boolean = false): Promise<YahooStockData | null> => {
    try {
      let searchTicker = ticker.trim().toUpperCase();
      if (/^\d{4}$/.test(searchTicker)) {
        searchTicker = `${searchTicker}.TW`;
      }

      const response = await fetch(`/api/stock?ticker=${searchTicker}&minimal=${minimal}`);
      
      if (!response.ok) {
        console.warn(`API Error ${response.status}:`, await response.text());
        return null;
      }
      
      const data = await response.json();
      if (Array.isArray(data)) return data[0] || null;
      return data;
    } catch (error) {
      console.error(`Failed to fetch stock data for ${ticker}:`, error);
      return null;
    }
  },

  /**
   * Batch fetch multiple stocks (Performance optimization)
   */
  getBatchStockData: async (tickers: string[], minimal: boolean = true): Promise<YahooStockData[]> => {
    if (tickers.length === 0) return [];
    
    const uniqueTickers = Array.from(new Set(tickers)).map(t => {
      let clean = t.trim().toUpperCase();
      if (/^\d{4}$/.test(clean)) return `${clean}.TW`;
      return clean;
    });

    try {
      const query = uniqueTickers.join(',');
      const response = await fetch(`/api/stock?ticker=${query}&minimal=${minimal}`);
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      console.error("Batch fetch failed:", error);
      return [];
    }
  }
};
