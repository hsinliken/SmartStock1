
import { GoogleGenAI } from "@google/genai";
import { AI_ANALYSIS_PROMPT, FUTURE_CANDIDATES_PROMPT, POTENTIAL_STOCKS_PROMPT, MARKET_WATCH_PROMPT, ECONOMIC_STRATEGY_PROMPT, PORTFOLIO_ANALYSIS_PROMPT, GOOGLE_FINANCE_PROMPT } from "../constants";
import { ChatMessage, StockValuation } from "../types";
import { StockService, YahooStockData } from "./stockService";

// Helper to get client
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "" || apiKey === '""') {
    throw new Error("API Key 未設定 (Missing API Key)");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to clean and extract JSON
const cleanAndParseJson = (text: string) => {
  if (!text) throw new Error("Empty response text");
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
  const startIndex = cleaned.indexOf('{');
  const endIndex = cleaned.lastIndexOf('}');
  if (startIndex !== -1 && endIndex !== -1) {
    cleaned = cleaned.substring(startIndex, endIndex + 1);
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error:", text);
    throw new Error("AI 回傳格式錯誤 (Invalid JSON)");
  }
};

const processPrompt = (template: string, ticker?: string) => {
  const now = new Date();
  const currentMonthYear = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  let processed = template;
  if (ticker) processed = processed.replace(/{{ticker}}/g, ticker);
  processed = processed.replace(/{{current_date}}/g, currentMonthYear);
  return processed;
};

// --- CHART ANALYSIS (Image) ---
export const analyzeChartImage = async (
  base64Image: string, 
  customPrompt?: string,
  model: string = "gemini-2.5-flash"
): Promise<string> => {
  const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
  const promptText = processPrompt(customPrompt || AI_ANALYSIS_PROMPT);

  try {
    const ai = getAiClient();
    const selectedModel = (model === 'gemini-3-pro-preview' || model === 'gemini-2.5-flash') ? model : 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: cleanBase64 } },
          { text: promptText }
        ]
      }
    });
    return response.text || "無法產生分析結果。";
  } catch (error: any) {
    console.error("Analysis Error:", error);
    return `分析失敗：${error.message}`;
  }
};

export const fetchChartChatResponse = async (
  base64Image: string,
  initialAnalysis: string,
  history: ChatMessage[],
  newQuestion: string,
  model: string = "gemini-2.5-flash"
): Promise<string> => {
  const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
  
  let contextText = `Context: Previous Analysis: """${initialAnalysis}"""\nHistory:`;
  history.forEach(msg => { contextText += `\n${msg.role}: ${msg.text}`; });
  contextText += `\nUser Question: ${newQuestion}`;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: cleanBase64 } },
          { text: contextText }
        ]
      }
    });
    return response.text || "無法產生回應。";
  } catch (error: any) {
    return `回應失敗：${error.message}`;
  }
};

// --- PORTFOLIO ANALYSIS ---
export const analyzePortfolio = async (
  portfolioData: any[],
  customPrompt?: string,
  model: string = "gemini-3-pro-preview"
) => {
  const promptTemplate = customPrompt || PORTFOLIO_ANALYSIS_PROMPT;
  const dataString = JSON.stringify(portfolioData, null, 2);
  const fullPrompt = processPrompt(`${promptTemplate}\n\n【投資組合數據】:\n${dataString}`);

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: model,
      contents: fullPrompt
    });
    return response.text || "無法產生分析結果。";
  } catch (error: any) {
    return `分析失敗：${error.message}`;
  }
};

// --- FALLBACK: FETCH PRICE VIA GOOGLE SEARCH ---
// Used when Backend API is unavailable
export const fetchPriceViaSearch = async (ticker: string): Promise<number | null> => {
  const prompt = `Find the latest closing price for ${ticker} (Taiwan Stock or US Stock). Return ONLY the numeric price. Do not include currency symbols.`;
  
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    
    const text = response.text || "";
    // Extract first number found
    const match = text.match(/[\d,]+\.?\d*/);
    if (match) {
        return parseFloat(match[0].replace(/,/g, ''));
    }
    return null;
  } catch (error) {
    console.error("Search Fallback Error:", error);
    return null;
  }
};

// --- STOCK VALUATION (HYBRID: YAHOO + GEMINI) ---
export const fetchStockValuation = async (
  ticker: string, 
  customPromptTemplate?: string, 
  model: string = "gemini-2.5-flash"
): Promise<StockValuation | null> => {
  
  // 1. Try Get Real Data from Backend
  let yahooData = await StockService.getStockData(ticker);
  
  // 2. Fallback: If Backend fails, try Search for at least the price
  if (!yahooData) {
      console.warn(`Yahoo Data failed for ${ticker}, trying fallback search...`);
      const fallbackPrice = await fetchPriceViaSearch(ticker);
      if (fallbackPrice) {
          // Construct minimal data object
          yahooData = {
              symbol: ticker,
              shortName: ticker,
              longName: ticker,
              currency: 'TWD',
              regularMarketPrice: fallbackPrice,
              regularMarketChange: 0,
              regularMarketChangePercent: 0,
              regularMarketPreviousClose: fallbackPrice,
              marketCap: 0,
              fiftyTwoWeekHigh: 0,
              fiftyTwoWeekLow: 0
          };
      } else {
          return null;
      }
  }

  // 2. Prepare Data for AI
  const eps = yahooData.epsTrailingTwelveMonths || 0;
  const dividend = yahooData.trailingAnnualDividendRate || 0;
  const currentPrice = yahooData.regularMarketPrice;
  const pe = yahooData.trailingPE || (eps > 0 ? currentPrice / eps : null);
  const yieldPercent = (yahooData.dividendYield || 0) * 100;

  // STRICT PROMPT FOR CHINESE NAME
  const aiPrompt = `
    You are a financial analyst. Analyze this REAL-TIME data for stock ticker "${yahooData.symbol}".
    Yahoo Finance Name: "${yahooData.longName || yahooData.shortName}".
    
    [DATA]
    - Price: ${currentPrice}
    - PE Ratio: ${pe ? pe.toFixed(2) : 'N/A'}
    - EPS (TTM): ${eps}
    - Dividend Yield: ${yieldPercent.toFixed(2)}%
    
    [TASK]
    1. **IDENTIFY NAME**: Provide the common **Traditional Chinese (繁體中文)** name for this stock.
       - If it is a Taiwan stock (e.g. 2330.TW), you MUST return "台積電".
       - If it is a US stock (e.g. NVDA), return "輝達".
       - Do NOT return English unless it has no Chinese name.
    2. **VALUATION**: Estimate "Cheap", "Fair", and "Expensive" price levels based on PE and Yield history.
    
    Return STRICT JSON: 
    { 
      "chineseName": "string",
      "cheapPrice": number, 
      "fairPrice": number, 
      "expensivePrice": number 
    }
  `;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: model,
      contents: aiPrompt
    });

    const aiEstimates = cleanAndParseJson(response.text || "{}");
    const dividendFairPrice = dividend > 0 ? dividend * 20 : null;

    // Prioritize AI's Chinese Name
    const finalName = aiEstimates.chineseName || yahooData.longName || yahooData.shortName;

    return {
      ticker: yahooData.symbol,
      name: finalName,
      currentPrice: yahooData.regularMarketPrice,
      changePercent: yahooData.regularMarketChangePercent,
      peRatio: pe,
      eps: eps,
      dividendYield: yieldPercent,
      high52Week: yahooData.fiftyTwoWeekHigh,
      low52Week: yahooData.fiftyTwoWeekLow,
      lastDividend: dividend,
      latestQuarterlyEps: null,
      lastFullYearEps: null,
      cheapPrice: aiEstimates.cheapPrice || (currentPrice * 0.8),
      fairPrice: aiEstimates.fairPrice || currentPrice,
      expensivePrice: aiEstimates.expensivePrice || (currentPrice * 1.2),
      dividendFairPrice,
      estimatedYearlyFairPrice: null,
      lastUpdated: new Date().toLocaleTimeString()
    };

  } catch (error) {
    console.error("Valuation Analysis Error:", error);
    return null;
  }
};

// --- ECONOMIC STRATEGY ---
export const fetchEconomicStrategyData = async (
  customPrompt?: string,
  model: string = "gemini-3-pro-preview"
) => {
  const prompt = processPrompt(customPrompt || ECONOMIC_STRATEGY_PROMPT);

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });

    const aiData = cleanAndParseJson(response.text || "{}");
    
    if (aiData.stocks && Array.isArray(aiData.stocks)) {
        const tickersToFetch = aiData.stocks.map((s: any) => s.ticker);
        // Try batch fetch
        const stockPrices = await StockService.getBatchStockData(tickersToFetch);
        
        // Hydrate
        aiData.stocks = await Promise.all(aiData.stocks.map(async (s: any) => {
            const yahooInfo = stockPrices.find(y => y.symbol.includes(s.ticker) || s.ticker.includes(y.symbol));
            let price = yahooInfo ? yahooInfo.regularMarketPrice : s.price;
            
            // If still no price (and batch failed), try fallback search
            if (!price || price === 0) {
                 price = await fetchPriceViaSearch(s.ticker) || 0;
            }
            return { ...s, price };
        }));
    }

    return aiData;
  } catch (error: any) {
    console.error("Strategy Error:", error);
    throw new Error(error.message || "Fetch failed");
  }
};

// --- FUTURE CANDIDATES ---
export const fetchFutureCandidates = async (
  customPrompt?: string,
  model: string = "gemini-3-pro-preview"
) => {
  const prompt = processPrompt(customPrompt || FUTURE_CANDIDATES_PROMPT);

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    
    return cleanAndParseJson(response.text || "{}");
  } catch (error) {
    console.error("Future Candidates Error:", error);
    return null;
  }
};

// --- POTENTIAL STOCKS ---
export const fetchPotentialStocks = async (
  customPrompt?: string,
  model: string = "gemini-3-pro-preview"
) => {
  const prompt = processPrompt(customPrompt || POTENTIAL_STOCKS_PROMPT);

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    
    return cleanAndParseJson(response.text || "{}");
  } catch (error) {
    console.error("Potential Stocks Error:", error);
    return null;
  }
};

export const fetchGoogleFinanceFormula = async (
  userRequest: string,
  model: string = "gemini-2.5-flash"
) => {
  const prompt = `${GOOGLE_FINANCE_PROMPT}\n\n[USER REQUEST]: ${userRequest}`;
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });
    return cleanAndParseJson(response.text || "{}");
  } catch (error: any) {
    throw new Error(error.message);
  }
};
