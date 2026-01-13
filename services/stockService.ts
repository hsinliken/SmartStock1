
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
   * 驗證價格是否合理 (抗幻覺機制)
   */
  isValidPrice: (price: number, ticker: string): boolean => {
    if (!price || isNaN(price)) return false;
    
    const tickerBase = ticker.split('.')[0];
    const priceStr = price.toString();
    
    // 1. 如果價格完全等於代號 (例如 2330 -> 2330.0)，通常是 AI 幻覺
    if (priceStr.startsWith(tickerBase) && priceStr.length >= tickerBase.length + 4) return false;
    
    // 2. 檢查位階是否離譜 (台股目前沒有萬元的股票，大立光最高也才 6000)
    if (price > 100000) return false; 
    
    // 3. 檢查是否包含日期特徵 (例如 202411...)
    if (priceStr.includes('2024') || priceStr.includes('2025')) return false;

    return true;
  },
  
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
      const result = Array.isArray(data) ? data[0] : data;
      
      // 驗證回傳數據
      if (result && !StockService.isValidPrice(result.regularMarketPrice, ticker)) {
        console.error(`Invalid price detected for ${ticker}: ${result.regularMarketPrice}`);
        return null;
      }

      return result;
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
      const results = Array.isArray(data) ? data : [data];
      
      // 過濾掉驗證失敗的非法數據
      return results.filter(item => StockService.isValidPrice(item.regularMarketPrice, item.symbol));
    } catch (error) {
      console.error("Batch fetch failed:", error);
      return [];
    }
  }
};
