
import { GoogleGenAI } from "@google/genai";
import { AI_ANALYSIS_PROMPT } from "../constants";

// Helper to get client
const getAiClient = () => {
  // Use the injected process.env.API_KEY
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "" || apiKey === '""') {
    console.error("FATAL: API Key is missing. Please check Vercel Settings.");
    throw new Error("API Key 未設定 (Missing API Key)");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to clean and extract JSON from AI response
const cleanAndParseJson = (text: string) => {
  if (!text) throw new Error("Empty response text");
  
  // 1. Remove markdown code blocks
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '');
  
  // 2. Attempt to find JSON object bounds
  const startIndex = cleaned.indexOf('{');
  const endIndex = cleaned.lastIndexOf('}');
  
  if (startIndex !== -1 && endIndex !== -1) {
    cleaned = cleaned.substring(startIndex, endIndex + 1);
  }
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error. Raw text:", text);
    throw new Error("AI 回傳格式錯誤 (Invalid JSON)");
  }
};

/**
 * Analyze a stock chart image using the specific prompt
 */
export const analyzeChartImage = async (base64Image: string, customPrompt?: string): Promise<string> => {
  const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
  const promptText = customPrompt || AI_ANALYSIS_PROMPT;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
    if (error.message.includes("API Key")) return `錯誤：${error.message}`;
    return `分析失敗：${error.message || "未知錯誤"}`;
  }
};

/**
 * Fetch current price and detailed financial data
 */
export const fetchStockValuation = async (ticker: string) => {
  const prompt = `
    Search for the latest stock market data for "${ticker}" (Taiwan Stock or US Stock) on Yahoo Finance Taiwan (https://tw.finance.yahoo.com/) or Google Finance.
    
    Extract: Current Price, Daily Change %, P/E, EPS (TTM), Dividend Yield, 52-Week High/Low, Last Cash Dividend, Latest Q EPS, Last Full Year EPS.
    
    Estimate: Cheap/Fair/Expensive prices based on data.
    
    Return strict JSON (no markdown):
    {
      "name": "string", "currentPrice": number, "changePercent": number, "peRatio": number|null, "eps": number|null, "dividendYield": number|null, 
      "high52Week": number|null, "low52Week": number|null, "lastDividend": number|null, "latestQuarterlyEps": number|null, "lastFullYearEps": number|null,
      "cheapPrice": number, "fairPrice": number, "expensivePrice": number
    }
  `;

  try {
    const ai = getAiClient();
    // Use gemini-3-pro-preview for better tool use reliability
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const data = cleanAndParseJson(response.text || "{}");
    
    // --- Calculations ---
    let dividendFairPrice = null;
    if (data.lastDividend) dividendFairPrice = data.lastDividend * 20;

    let estimatedYearlyFairPrice = null;
    if (data.latestQuarterlyEps && data.lastDividend && data.lastFullYearEps) {
      const payoutRatio = data.lastDividend / data.lastFullYearEps;
      estimatedYearlyFairPrice = data.latestQuarterlyEps * 20 * payoutRatio;
    }

    return { ...data, dividendFairPrice, estimatedYearlyFairPrice };

  } catch (error) {
    console.error("Valuation Error:", error);
    return null;
  }
};

/**
 * Fetch Taiwan Economic Monitoring Indicator Data
 */
export const fetchEconomicStrategyData = async () => {
  const prompt = `
    Task: Get Taiwan's Economic Monitoring Indicator (景氣對策信號) data and recommended ETFs.
    
    1. Search for "Taiwan Monitoring Indicator latest score and light color" (台灣景氣燈號 最新).
       - Get the latest available month, score, and light color.
       - Find the scores for the past 12 months.
    
    2. Search for "Taiwan Market Cap Weighted Passive ETFs list" (台灣市值型被動ETF).
       - Select 6 representative ones (e.g., 0050, 006208, 00922, etc.) with latest price.
    
    3. Strategy Logic:
       - Blue (9-16): Aggressive Buy.
       - Yellow-Blue (17-22): Accumulate.
       - Green (23-31): Hold.
       - Yellow-Red (32-37): Caution.
       - Red (38-45): Sell.

    4. Return STRICT JSON (no markdown, no extra text):
    {
       "economic": {
          "currentDate": "YYYY-MM",
          "currentScore": number,
          "currentLight": "RED" | "YELLOW_RED" | "GREEN" | "YELLOW_BLUE" | "BLUE", 
          "history": [{"date": "YYYY-MM", "score": number, "light": "string"}],
          "description": "Brief summary (Traditional Chinese).",
          "strategyAdvice": "Advice (Traditional Chinese)."
       },
       "stocks": [
          {
            "ticker": "string",
            "name": "string",
            "price": number,
            "correlation": "High",
            "description": "Why chosen (Traditional Chinese).",
            "recommendation": "Action (Traditional Chinese)."
          }
       ]
    }
  `;

  try {
    const ai = getAiClient();
    // Upgrade to gemini-3-pro-preview for robust search and JSON formatting
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    return cleanAndParseJson(response.text || "{}");
  } catch (error: any) {
    console.error("Strategy Error:", error);
    // Propagate the error message
    throw new Error(error.message || "Fetch failed");
  }
};

/**
 * Identify Future 50 Candidates
 */
export const fetchFutureCandidates = async () => {
  const prompt = `
    Role: Professional Financial Analyst.
    Goal: Identify 10 "Future 50" candidates (Taiwan mid-cap stocks rank 50-150) potential to enter Top 50.
    
    Steps:
    1. Search for market cap threshold for Top 50.
    2. Search for mid-cap growth stocks (AI, Semi, Green Energy).
    3. Filter for High EPS Growth, Revenue Momentum, Foreign buying.
    4. Select Top 10.
    
    Return STRICT JSON:
    {
      "candidates": [
        {
          "rank": number, "ticker": "string", "name": "string", 
          "currentMarketCap": number (Yi/億), "projectedMarketCap": number (Yi/億),
          "currentPrice": number, "targetPrice": number, "epsGrowthRate": number, 
          "revenueMomentum": number, "pegRatio": number, "industry": "string", "reason": "string"
        }
      ]
    }
  `;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    return cleanAndParseJson(response.text || "{}");
  } catch (error) {
    console.error("Future Candidates Error:", error);
    return null;
  }
};
