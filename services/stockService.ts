
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
    if (!price || isNaN(price) || price <= 0) return false;
    
    const tickerBase = ticker.split('.')[0];
    const priceStr = price.toString();
    
    // 1. 如果價格過大 (台股目前沒有 10 萬元的股票)
    if (price > 100000) return false;

    // 2. 如果價格包含 8 位整數且無小數點 (極大可能是 YYYYMMDD)
    if (priceStr.length >= 8 && !priceStr.includes('.')) return false;
    
    // 3. 檢查拼接特徵：如果價格的前幾位數剛好是代號且後面跟著一長串數字
    if (priceStr.startsWith(tickerBase) && priceStr.length > tickerBase.length + 2 && price > 5000) return false;
    
    // 4. 年份拼接檢查 (2024, 2025)
    if ((priceStr.includes('2024') || priceStr.includes('2025')) && priceStr.length > 5) return false;

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
