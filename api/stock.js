
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

  const { ticker } = req.query;

  if (!ticker) {
    return res.status(400).json({ error: 'Ticker symbol is required' });
  }

  try {
    // Suppress notices to keep logs clean
    yahooFinance.suppressNotices(['yahooSurvey']);

    // Handle comma-separated tickers for batch requests (basic implementation loop for now to ensure detail)
    const symbols = ticker.split(',').map(s => s.trim());
    
    // Fetch data in parallel
    const results = await Promise.all(symbols.map(async (symbol) => {
        try {
            // Get Quote (Price, Change, etc.)
            let quote = null;
            try {
                quote = await yahooFinance.quote(symbol);
            } catch (err) {
                // Fallback: If .TW fails, try .TWO (Taiwan OTC)
                // Many users type 4523.TW but it is actually 4523.TWO
                if (symbol.endsWith('.TW')) {
                    try {
                        const altSymbol = symbol.replace('.TW', '.TWO');
                        quote = await yahooFinance.quote(altSymbol);
                    } catch (err2) {
                        throw err; // Throw original error if both fail
                    }
                } else {
                    throw err;
                }
            }
            
            // Get Summary Profile (Industry, Sector) - Optional, can fail gracefully
            // Get Quote Summary (Financial data for PE, EPS)
            // Note: Use the symbol from the successful quote (e.g. 4523.TWO)
            const quoteSummary = await yahooFinance.quoteSummary(quote.symbol, { 
                modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData'] 
            }).catch(() => null);

            if (!quote) return null;

            return {
                symbol: quote.symbol,
                shortName: quote.shortName,
                longName: quote.longName,
                currency: quote.currency,
                regularMarketPrice: quote.regularMarketPrice,
                regularMarketChange: quote.regularMarketChange,
                regularMarketChangePercent: quote.regularMarketChangePercent,
                regularMarketPreviousClose: quote.regularMarketPreviousClose,
                marketCap: quote.marketCap, // In raw units
                fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
                fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
                
                // Detailed Data from quoteSummary
                trailingPE: quoteSummary?.summaryDetail?.trailingPE || quote.trailingPE,
                forwardPE: quoteSummary?.summaryDetail?.forwardPE || quote.forwardPE,
                epsTrailingTwelveMonths: quote.epsTrailingTwelveMonths || quoteSummary?.defaultKeyStatistics?.trailingEps,
                dividendYield: quoteSummary?.summaryDetail?.dividendYield || quote.trailingAnnualDividendYield,
                trailingAnnualDividendRate: quoteSummary?.summaryDetail?.trailingAnnualDividendRate || quote.trailingAnnualDividendRate,
            };
        } catch (err) {
            console.error(`Error fetching ${symbol}:`, err.message);
            return null;
        }
    }));

    // Filter out failed requests
    const cleanResults = results.filter(r => r !== null);

    // If single request, return object, else array
    if (symbols.length === 1 && cleanResults.length > 0) {
        return res.status(200).json(cleanResults[0]);
    }

    return res.status(200).json(cleanResults);

  } catch (error) {
    console.error('Yahoo Finance API Error:', error);
    return res.status(500).json({ error: 'Failed to fetch stock data' });
  }
}
