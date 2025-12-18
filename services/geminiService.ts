
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
  model: string = "gemini-3-flash-preview"
): Promise<string> => {
  const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
  const promptText = processPrompt(customPrompt || AI_ANALYSIS_PROMPT);

  try {
    const ai = getAiClient();
    const selectedModel = (model === 'gemini-3-pro-preview' || model === 'gemini-3-flash-preview') ? model : 'gemini-3-flash-preview';

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: cleanBase64 } },
          { text: promptText }
        ]
      },
      config: {
        temperature: 0.2 
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
  model: string = "gemini-3-flash-preview"
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
      contents: fullPrompt,
      config: { temperature: 0 } 
    });
    return response.text || "無法產生分析結果。";
  } catch (error: any) {
    return `分析失敗：${error.message}`;
  }
};

// --- FALLBACK: FETCH PRICE VIA GOOGLE SEARCH ---
export const fetchPriceViaSearch = async (ticker: string): Promise<number | null> => {
  const tickerNum = ticker.replace(/\D/g, '');
  const prompt = `Find the LATEST actual trading price for stock "${ticker}". 
  [CRITICAL WARNING]: The stock ticker number is "${tickerNum}". 
  [STRICT RULE]: If your search says the price is exactly "${tickerNum}", IT IS A HALLUCINATION. 
  Check multiple sources to find the REAL market price. 
  Return ONLY a JSON: {"price": number, "verified": boolean}. 
  If you cannot find a price DIFFERENT from the ticker number, return {"price": 0, "verified": false}.`;
  
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], temperature: 0 }
    });
    
    const data = cleanAndParseJson(response.text || "{}");
    const price = parseFloat(data.price);
    
    // Safety check: if price is exactly the ticker, or verified is false, it's garbage
    if (!isNaN(price) && price > 0 && price !== parseFloat(tickerNum) && data.verified !== false) {
        return price;
    }
    
    // Second layer regex fallback - ensure we don't pick the ticker number
    const text = response.text || "";
    const matches = text.match(/\b\d+\.\d+\b/g) || text.match(/\b\d{2,}\b/g);
    if (matches) {
        for (const m of matches) {
            const val = parseFloat(m);
            if (val !== parseFloat(tickerNum) && val > 0 && val < 10000) return val;
        }
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
  initialNameHint?: string, 
  model: string = "gemini-3-flash-preview"
): Promise<StockValuation | null> => {
  let yahooData = await StockService.getStockData(ticker);
  
  if (!yahooData) {
      const fallbackPrice = await fetchPriceViaSearch(ticker);
      if (fallbackPrice) {
          yahooData = {
              symbol: ticker, shortName: initialNameHint || ticker, longName: initialNameHint || ticker, currency: 'TWD',
              regularMarketPrice: fallbackPrice, regularMarketChange: 0, regularMarketChangePercent: 0,
              regularMarketPreviousClose: fallbackPrice, marketCap: 0, fiftyTwoWeekHigh: 0, fiftyTwoWeekLow: 0
          };
      } else return null;
  }

  const eps = yahooData.epsTrailingTwelveMonths || 0;
  const dividend = yahooData.trailingAnnualDividendRate || 0;
  const currentPrice = yahooData.regularMarketPrice;
  const pe = yahooData.trailingPE || (eps > 0 ? currentPrice / eps : null);
  const yieldPercent = (yahooData.dividendYield || 0) * 100;

  const aiPrompt = `
    You are a professional financial data analyst.
    Verify info for ticker: "${yahooData.symbol}"
    Known Hint: "${initialNameHint || 'Unknown'}"

    [TASKS]
    1. Confirm the EXACT Traditional Chinese company name. 
       - If ticker is "2439.TW", it is "美律", NOT "中華電".
       - If ticker is "3217.TW", it is "優群".
    2. Estimate Cheap/Fair/Expensive valuation prices based on P/E ranges.
    
    Return ONLY a strict JSON object:
    {
      "chineseName": "正確繁體名稱",
      "cheapPrice": number,
      "fairPrice": number,
      "expensivePrice": number
    }
  `;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: model,
      contents: aiPrompt,
      config: { temperature: 0 }
    });
    const aiEstimates = cleanAndParseJson(response.text || "{}");
    
    let finalName = aiEstimates.chineseName || initialNameHint || yahooData.shortName || yahooData.symbol;
    if (finalName === "正確繁體名稱") finalName = initialNameHint || yahooData.shortName;

    return {
      ticker: yahooData.symbol, 
      name: finalName,
      currentPrice: yahooData.regularMarketPrice, changePercent: yahooData.regularMarketChangePercent,
      peRatio: pe, eps: eps, dividendYield: yieldPercent, high52Week: yahooData.fiftyTwoWeekHigh, low52Week: yahooData.fiftyTwoWeekLow,
      lastDividend: dividend, latestQuarterlyEps: null, lastFullYearEps: null,
      cheapPrice: aiEstimates.cheapPrice || (currentPrice * 0.8), 
      fairPrice: aiEstimates.fairPrice || currentPrice, 
      expensivePrice: aiEstimates.expensivePrice || (currentPrice * 1.2),
      dividendFairPrice: dividend > 0 ? dividend * 20 : null, estimatedYearlyFairPrice: null, lastUpdated: new Date().toLocaleTimeString()
    };
  } catch (error) { 
    return {
      ticker: yahooData.symbol, 
      name: initialNameHint || yahooData.shortName || yahooData.symbol,
      currentPrice: yahooData.regularMarketPrice, changePercent: yahooData.regularMarketChangePercent,
      peRatio: pe, eps: eps, dividendYield: yieldPercent, high52Week: yahooData.fiftyTwoWeekHigh, low52Week: yahooData.fiftyTwoWeekLow,
      lastDividend: dividend, latestQuarterlyEps: null, lastFullYearEps: null,
      cheapPrice: currentPrice * 0.8, 
      fairPrice: currentPrice, 
      expensivePrice: currentPrice * 1.2,
      dividendFairPrice: dividend > 0 ? dividend * 20 : null, estimatedYearlyFairPrice: null, lastUpdated: new Date().toLocaleTimeString()
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
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], temperature: 0 }
    });
    const aiData = cleanAndParseJson(response.text || "{}");
    return aiData;
  } catch (error: any) { throw new Error(error.message || "Fetch failed"); }
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
      config: { tools: [{ googleSearch: {} }], temperature: 0 }
    });
    return cleanAndParseJson(response.text || "{}");
  } catch (error) { return null; }
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
      config: { tools: [{ googleSearch: {} }], temperature: 0 }
    });
    return cleanAndParseJson(response.text || "{}");
  } catch (error) { return null; }
};

export const fetchGoogleFinanceFormula = async (
  userRequest: string,
  model: string = "gemini-3-flash-preview"
) => {
  const prompt = `${GOOGLE_FINANCE_PROMPT}\n\n[USER REQUEST]: ${userRequest}`;
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({ model: model, contents: prompt });
    return cleanAndParseJson(response.text || "{}");
  } catch (error: any) { throw new Error(error.message); }
};
