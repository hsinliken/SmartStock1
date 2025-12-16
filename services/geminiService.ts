
import { GoogleGenAI } from "@google/genai";
import { AI_ANALYSIS_PROMPT, FUTURE_CANDIDATES_PROMPT, MARKET_WATCH_PROMPT, ECONOMIC_STRATEGY_PROMPT, PORTFOLIO_ANALYSIS_PROMPT, GOOGLE_FINANCE_PROMPT } from "../constants";
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
  // We use Yahoo data in Portfolio.tsx to update prices BEFORE calling this.
  // So portfolioData already contains accurate Current Price.
  const promptTemplate = customPrompt || PORTFOLIO_ANALYSIS_PROMPT;
  const dataString = JSON.stringify(portfolioData, null, 2);
  const fullPrompt = processPrompt(`${promptTemplate}\n\n【投資組合數據】:\n${dataString}`);

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: model,
      contents: fullPrompt
      // No tools needed, data is provided in context
    });
    return response.text || "無法產生分析結果。";
  } catch (error: any) {
    return `分析失敗：${error.message}`;
  }
};

// --- STOCK VALUATION (HYBRID: YAHOO + GEMINI) ---
/**
 * 1. Fetch data from Yahoo Proxy (Backend).
 * 2. Send data to Gemini to evaluate (Cheap/Fair/Expensive).
 */
export const fetchStockValuation = async (
  ticker: string, 
  customPromptTemplate?: string, 
  model: string = "gemini-2.5-flash"
): Promise<StockValuation | null> => {
  
  // 1. Get Real Data
  const yahooData = await StockService.getStockData(ticker);
  
  if (!yahooData) {
    console.error("Yahoo Data not found for:", ticker);
    return null;
  }

  // 2. Prepare Data for AI
  // We explicitly calculate some fields to help AI
  const eps = yahooData.epsTrailingTwelveMonths || 0;
  const dividend = yahooData.trailingAnnualDividendRate || 0;
  const currentPrice = yahooData.regularMarketPrice;
  const pe = yahooData.trailingPE || (eps > 0 ? currentPrice / eps : null);
  const yieldPercent = (yahooData.dividendYield || 0) * 100;

  // 3. Construct Prompt with REAL Data
  const aiPrompt = `
    You are a financial analyst. Analyze this REAL-TIME data for ${yahooData.symbol} (${yahooData.longName}):
    
    [DATA]
    - Price: ${currentPrice}
    - PE Ratio: ${pe ? pe.toFixed(2) : 'N/A'}
    - EPS (TTM): ${eps}
    - Dividend Yield: ${yieldPercent.toFixed(2)}%
    - 52W High: ${yahooData.fiftyTwoWeekHigh}
    - 52W Low: ${yahooData.fiftyTwoWeekLow}

    [TASK]
    1. Estimate "Cheap", "Fair", and "Expensive" price levels based on historical PE ranges or Yield bands for this specific stock/industry.
    2. Return a JSON object.

    [OUTPUT JSON format]:
    {
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

    // 4. Merge and Return
    // Use manual formulas for these two
    const dividendFairPrice = dividend > 0 ? dividend * 20 : null;
    // Estimate payout ratio from yield/pe approx if needed, or just null for now as yahoo doesn't give payout ratio directly in quote
    const estimatedYearlyFairPrice = null; 

    return {
      ticker: yahooData.symbol,
      name: yahooData.longName || yahooData.shortName,
      currentPrice: yahooData.regularMarketPrice,
      changePercent: yahooData.regularMarketChangePercent,
      peRatio: pe,
      eps: eps,
      dividendYield: yieldPercent,
      high52Week: yahooData.fiftyTwoWeekHigh,
      low52Week: yahooData.fiftyTwoWeekLow,
      
      lastDividend: dividend,
      latestQuarterlyEps: null, // Hard to get exact Q without more calls
      lastFullYearEps: null,

      cheapPrice: aiEstimates.cheapPrice || (currentPrice * 0.8),
      fairPrice: aiEstimates.fairPrice || currentPrice,
      expensivePrice: aiEstimates.expensivePrice || (currentPrice * 1.2),

      dividendFairPrice,
      estimatedYearlyFairPrice,
      
      lastUpdated: new Date().toLocaleTimeString()
    };

  } catch (error) {
    console.error("Valuation Analysis Error:", error);
    // Fallback: return data without AI analysis
    return {
      ticker: yahooData.symbol,
      name: yahooData.longName,
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
      cheapPrice: 0,
      fairPrice: 0,
      expensivePrice: 0,
      dividendFairPrice: null,
      estimatedYearlyFairPrice: null,
      lastUpdated: new Date().toLocaleTimeString()
    };
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
    
    // Step 1: Get Strategy & Ticker List from Gemini (it searches for Economic Score)
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });

    const aiData = cleanAndParseJson(response.text || "{}");
    
    // Step 2: Hydrate Stock Prices using Yahoo API
    if (aiData.stocks && Array.isArray(aiData.stocks)) {
        const tickersToFetch = aiData.stocks.map((s: any) => s.ticker);
        const stockPrices = await StockService.getBatchStockData(tickersToFetch);
        
        // Map prices back to AI list
        aiData.stocks = aiData.stocks.map((s: any) => {
            // Find matching yahoo data (handle potential .TW diff)
            const yahooInfo = stockPrices.find(y => y.symbol.includes(s.ticker) || s.ticker.includes(y.symbol));
            return {
                ...s,
                price: yahooInfo ? yahooInfo.regularMarketPrice : s.price // Use Yahoo price if found
            };
        });
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
    // Use Google Search to find the *Ranking List*
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    
    // Returns List of Tickers (Prices are 0)
    return cleanAndParseJson(response.text || "{}");
  } catch (error) {
    console.error("Future Candidates Error:", error);
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
