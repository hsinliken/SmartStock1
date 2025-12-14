
import { GoogleGenAI } from "@google/genai";
import { AI_ANALYSIS_PROMPT } from "../constants";

// Helper to get client
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables.");
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
  
  return JSON.parse(cleaned);
};

/**
 * Analyze a stock chart image using the specific prompt
 * @param base64Image The image data
 * @param customPrompt Optional custom system prompt. Defaults to AI_ANALYSIS_PROMPT from constants.
 */
export const analyzeChartImage = async (base64Image: string, customPrompt?: string): Promise<string> => {
  const ai = getAiClient();
  
  // Clean base64 string if it contains metadata header
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  const promptText = customPrompt || AI_ANALYSIS_PROMPT;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/png", data: cleanBase64 } },
          { text: promptText }
        ]
      }
    });

    return response.text || "無法產生分析結果，請稍後再試。";
  } catch (error) {
    console.error("Gemini Image Analysis Error:", error);
    throw new Error("分析失敗，請檢查 API Key 或網路連線。");
  }
};

/**
 * Fetch current price and detailed financial data (Yahoo Finance style)
 * Also calculates valuation (Cheap, Fair, Expensive)
 */
export const fetchStockValuation = async (ticker: string) => {
  const ai = getAiClient();

  const prompt = `
    Search for the latest stock market data for "${ticker}" (Taiwan Stock or US Stock) on Yahoo Finance Taiwan (https://tw.finance.yahoo.com/) or Google Finance.
    
    Extract the following real-time data:
    1. Current Price
    2. Daily Change Percentage (e.g. +1.5% or -0.5%)
    3. P/E Ratio (本益比)
    4. EPS (Trailing Twelve Months)
    5. Dividend Yield (殖利率)
    6. 52-Week High and 52-Week Low
    7. Most recent Cash Dividend Amount (Last full year or latest distribution amount, e.g. 5.0).
    8. Latest Single Quarter EPS (Most recent Q1, Q2, Q3 or Q4 EPS).
    9. Last Full Year EPS (The annual EPS for the fiscal year corresponding to the Last Cash Dividend Amount).
    
    Based on this data and historical performance found in search, estimate:
    1. A "Cheap" price (undervalued buy zone).
    2. A "Fair" price (reasonable value).
    3. An "Expensive" price (overvalued sell zone).
    
    Return the result strictly in raw JSON format (no markdown). The JSON object should have the following properties:
    name, currentPrice (number), changePercent (number), peRatio (number|null), eps (number|null), dividendYield (number|null), high52Week (number|null), low52Week (number|null), 
    lastDividend (number|null), latestQuarterlyEps (number|null), lastFullYearEps (number|null),
    cheapPrice (number), fairPrice (number), expensivePrice (number).
    
    Use null if a specific field cannot be found.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const data = cleanAndParseJson(response.text || "{}");

    // --- Apply Custom Formulas ---
    // Formula 1: Dividend Fair Price = Last Dividend * 20
    let dividendFairPrice = null;
    if (data.lastDividend !== null && data.lastDividend !== undefined) {
      dividendFairPrice = data.lastDividend * 20;
    }

    // Formula 2: Estimated Year Fair Price = Quarterly EPS * 20 * (LastDividend / LastFullYearEPS)
    let estimatedYearlyFairPrice = null;
    
    if (data.latestQuarterlyEps !== null && data.latestQuarterlyEps !== undefined) {
      // Calculate Payout Ratio
      let payoutRatio = null;
      if (data.lastDividend !== null && data.lastFullYearEps !== null && data.lastFullYearEps !== 0) {
        payoutRatio = data.lastDividend / data.lastFullYearEps;
      }
      
      // Only calculate if we have the ratio, otherwise the formula is incomplete
      if (payoutRatio !== null) {
        estimatedYearlyFairPrice = data.latestQuarterlyEps * 20 * payoutRatio;
      }
    }

    return {
      ...data,
      dividendFairPrice,
      estimatedYearlyFairPrice
    };

  } catch (error) {
    console.error("Valuation Fetch Error:", error);
    return null;
  }
};

/**
 * Fetch Taiwan Economic Monitoring Indicator Data and Correlated ETFs
 */
export const fetchEconomicStrategyData = async () => {
  const ai = getAiClient();
  
  const prompt = `
    Task: Get Taiwan's Economic Monitoring Indicator (景氣對策信號) data and recommended ETFs.
    
    1. Search for "Taiwan Monitoring Indicator latest score and light color" (台灣景氣燈號 最新).
       - Get the latest available month, score, and light color.
       - Find the scores for the past 12 months to build a history trend.
    
    2. Search for "Taiwan Market Cap Weighted Passive ETFs list" (台灣市值型被動ETF).
       - INCLUDE a broad range of market-cap weighted ETFs, such as 0050, 006208, 00922, 00923, 00850, 00905, etc.
       - Select at least 6 representative ones.
       - Get their latest price.
    
    3. Determine the strategy advice based on the LATEST score:
       - Blue Light (Score 9-16): "Aggressive Buy" (分批大買).
       - Yellow-Blue (Score 17-22): "Accumulate" (分批買進).
       - Green (Score 23-31): "Hold / Regular Invest" (定期定額/續抱).
       - Yellow-Red (Score 32-37): "Caution / Stop Buying" (停止買進/觀望).
       - Red (Score 38-45): "Sell / Take Profit" (分批賣出).

    4. Return JSON (no markdown):
    {
       "economic": {
          "currentDate": "YYYY-MM",
          "currentScore": number,
          "currentLight": "RED" | "YELLOW_RED" | "GREEN" | "YELLOW_BLUE" | "BLUE", 
          "history": [{"date": "YYYY-MM", "score": number, "light": "string"}], // Last 12 entries
          "description": "Brief summary of the current economic state based on the news (MUST be Traditional Chinese / 繁體中文).",
          "strategyAdvice": "Advice based on the rule: Blue Buy, Red Sell (MUST be Traditional Chinese / 繁體中文)."
       },
       "stocks": [
          {
            "ticker": "string",
            "name": "string",
            "price": number,
            "correlation": "High",
            "description": "Why it is chosen (e.g. 市值型ETF/ESG市值型/智慧多因子市值型). MUST be Traditional Chinese / 繁體中文.",
            "recommendation": "Action based on current light (e.g. 停止買進/觀望). MUST be Traditional Chinese / 繁體中文."
          }
       ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    return cleanAndParseJson(response.text || "{}");
  } catch (error) {
    console.error("Economic Strategy Fetch Error:", error);
    return null;
  }
};

/**
 * Identify Future 50 Candidates
 */
export const fetchFutureCandidates = async () => {
  const ai = getAiClient();
  
  const prompt = `
    Role: Professional Financial Analyst for Taiwan Stock Market.
    Goal: Identify 10 "Future 50" candidates - mid-cap stocks (Ranking 50-150 by Market Cap) that have the highest potential to enter the Top 50 within 1 year.
    
    Steps:
    1. Search for the current market cap threshold for the 50th largest company in Taiwan.
    2. Search for "Taiwan Mid-Cap Growth Stocks 2024 2025" or "Taiwan stocks ranking 50-150 market cap" using Yahoo Finance Taiwan (https://tw.finance.yahoo.com/).
    3. Filter for companies with:
       - Industry: High growth (AI Server, Semiconductor supply chain, Green Energy, Biotech).
       - Financials: High EPS Growth Rate (YoY), Strong Revenue Momentum (QoQ/YoY), Reasonable PEG Ratio.
       - Institutional Interest: Foreign/Investment Trust buying.
    
    4. Select the TOP 10 candidates.
    
    5. Calculate/Estimate for each:
       - Projected Market Cap = Current Market Cap * (1 + Expected Growth Rate).
       - Target Price = Current EPS * (1 + Growth Rate) * Target P/E.
       - PEG Ratio = P/E Ratio / Growth Rate.
    
    CRITICAL DATA VALIDATION (UNIT: Yi / 億 TWD):
    - Market Cap (市值) MUST be returned in "Yi" (億 TWD).
    - Yahoo Finance Taiwan often displays Market Cap in "Millions" (百萬).
      - RULE: If Yahoo says "190,435" (Million), divide by 100 -> 1904.35 億.
      - RULE: If Yahoo says "1,904" (億), keep it as 1904.
      - CHECK: Stock 6446 (PharmaEssentia) has a Market Cap of approx 1,904億.
        - If you find ~190,435 (Millions), convert to 1904.
        - If you find ~190 (Billions), convert to 1900.
        - If you find ~188, this is likely WRONG or Capital (股本). REJECT IT.
    
    IMPORTANT: Return ONLY the raw JSON object. Do NOT include any markdown formatting, backticks, or explanation text.
    
    JSON Format:
    {
      "candidates": [
        {
          "rank": 1,
          "ticker": "XXXX.TW",
          "name": "Stock Name (MUST be Traditional Chinese, e.g. 藥華藥, 台積電, 奇鋐)",
          "currentMarketCap": number (Unit: Yi/億 TWD, e.g. 1904.36),
          "projectedMarketCap": number (Unit: Yi/億 TWD),
          "currentPrice": number,
          "targetPrice": number,
          "epsGrowthRate": number (percentage, e.g., 25 for 25%),
          "revenueMomentum": number (percentage),
          "pegRatio": number,
          "industry": "Industry Name (MUST be Traditional Chinese, e.g. 生技醫療, 半導體)",
          "reason": "Concise reasoning (MUST be Traditional Chinese / 繁體中文): why it will enter Top 50? (e.g. 主力藥品全球銷售擴張，新產能開出帶動營收爆發)"
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    console.log("Future 50 Response Raw:", response.text);
    return cleanAndParseJson(response.text || "{}");
  } catch (error) {
    console.error("Future Candidates Fetch Error:", error);
    return null;
  }
};
