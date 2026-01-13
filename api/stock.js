
import yahooFinance from 'yahoo-finance2';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { ticker, minimal } = req.query;
  const isMinimal = minimal === 'true';

  if (!ticker) {
    return res.status(400).json({ error: 'Ticker symbol is required' });
  }

  try {
    yahooFinance.suppressNotices(['yahooSurvey']);

    const symbols = ticker.split(',').map(s => s.trim().toUpperCase());
    
    // 使用 yahooFinance.quote 的批量查詢功能 (傳入陣列)
    // 這是最快獲取多檔股票現價的方式
    const quotes = await yahooFinance.quote(symbols);
    
    // 如果是單一查詢且需要詳細資料 (非 minimal)
    if (symbols.length === 1 && !isMinimal) {
        const quote = quotes[0] || quotes;
        const quoteSummary = await yahooFinance.quoteSummary(quote.symbol, { 
            modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData'] 
        }).catch(() => null);

        return res.status(200).json({
            symbol: quote.symbol,
            shortName: quote.shortName,
            longName: quote.longName,
            currency: quote.currency,
            regularMarketPrice: quote.regularMarketPrice,
            regularMarketChange: quote.regularMarketChange,
            regularMarketChangePercent: quote.regularMarketChangePercent,
            regularMarketPreviousClose: quote.regularMarketPreviousClose,
            marketCap: quote.marketCap,
            fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
            trailingPE: quoteSummary?.summaryDetail?.trailingPE || quote.trailingPE,
            forwardPE: quoteSummary?.summaryDetail?.forwardPE || quote.forwardPE,
            epsTrailingTwelveMonths: quote.epsTrailingTwelveMonths || quoteSummary?.defaultKeyStatistics?.trailingEps,
            dividendYield: quoteSummary?.summaryDetail?.dividendYield || quote.trailingAnnualDividendYield,
            trailingAnnualDividendRate: quoteSummary?.summaryDetail?.trailingAnnualDividendRate || quote.trailingAnnualDividendRate,
        });
    }

    // 批量模式：僅回傳核心價格數據
    const results = (Array.isArray(quotes) ? quotes : [quotes]).map(quote => ({
        symbol: quote.symbol,
        shortName: quote.shortName,
        regularMarketPrice: quote.regularMarketPrice,
        regularMarketChangePercent: quote.regularMarketChangePercent,
        marketCap: quote.marketCap
    }));

    return res.status(200).json(results);

  } catch (error) {
    console.error('Yahoo Finance API Error:', error);
    // 錯誤處理：如果某些代碼失敗，嘗試過濾並回傳成功的部分
    return res.status(500).json({ error: 'Failed to fetch stock data', message: error.message });
  }
}
