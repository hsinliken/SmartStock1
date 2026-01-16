
import { GoogleGenAI } from "@google/genai";
import { 
  HotSectorsAnalysisResult, 
  StockValuation, 
  EconomicData, 
  CorrelatedStock, 
  FutureCandidate, 
  PotentialStock, 
  GoogleFinanceResponse,
  ChatMessage
} from "../types";
import { 
  HOT_SECTORS_PROMPT, 
  SECTOR_DETAIL_PROMPT, 
  MARKET_WATCH_PROMPT,
  AI_ANALYSIS_PROMPT,
  PORTFOLIO_ANALYSIS_PROMPT,
  ECONOMIC_STRATEGY_PROMPT,
  FUTURE_CANDIDATES_PROMPT,
  POTENTIAL_STOCKS_PROMPT
} from "../constants";

// Helper to initialize GoogleGenAI client
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Helper to extract JSON from markdown or raw text responses
const cleanAndParseJson = (text: string) => {
  if (!text) return null;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (e) {
    console.error("JSON parse error", e);
    return null;
  }
};

/**
 * Fetch hot sectors analysis
 */
export const fetchHotSectorsAnalysis = async (
  model: string = "gemini-3-pro-preview"
): Promise<HotSectorsAnalysisResult | null> => {
  const prompt = HOT_SECTORS_PROMPT;
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], temperature: 0 }
    });
    return cleanAndParseJson(response.text || "{}");
  } catch (error: any) {
    console.error("fetchHotSectorsAnalysis failed", error);
    return null;
  }
};

/**
 * Fetch sector detail analysis
 */
export const fetchSectorDetailAnalysis = async (
  sectorName: string,
  model: string = "gemini-3-pro-preview"
): Promise<string> => {
  const prompt = SECTOR_DETAIL_PROMPT.replace(/{{sector_name}}/g, sectorName);
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], temperature: 0.2 }
    });
    return response.text || "無法生成深度分析報告。";
  } catch (error: any) {
    console.error("fetchSectorDetailAnalysis failed", error);
    return `分析失敗：${error.message}`;
  }
};

/**
 * Analyze stock chart image with technical analysis context
 */
export const analyzeChartImage = async (image: string, prompt: string, model: string): Promise<string> => {
  const ai = getAiClient();
  const base64Data = image.split(',')[1];
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [
        {
          parts: [
            { inlineData: { data: base64Data, mimeType: 'image/png' } },
            { text: prompt || AI_ANALYSIS_PROMPT }
          ]
        }
      ]
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("analyzeChartImage failed", error);
    throw error;
  }
};

/**
 * Follow-up chat response for technical analysis
 */
export const fetchChartChatResponse = async (
  image: string,
  analysis: string,
  history: ChatMessage[],
  question: string,
  model: string
): Promise<string> => {
  const ai = getAiClient();
  const base64Data = image.split(',')[1];
  try {
    const contents = [
      { role: 'user', parts: [{ inlineData: { data: base64Data, mimeType: 'image/png' } }, { text: `這是之前的分析背景：\n${analysis}` }] },
      ...history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
      { role: 'user', parts: [{ text: question }] }
    ];
    const response = await ai.models.generateContent({
      model: model,
      contents: contents as any
    });
    return response.text || "No response generated.";
  } catch (error) {
    console.error("fetchChartChatResponse failed", error);
    throw error;
  }
};

/**
 * Portfolio health check analysis
 */
export const analyzePortfolio = async (portfolio: any[], prompt: string, model: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `${prompt || PORTFOLIO_ANALYSIS_PROMPT}\n\n投資組合數據：\n${JSON.stringify(portfolio, null, 2)}`
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("analyzePortfolio failed", error);
    throw error;
  }
};

/**
 * Get current price of a ticker using Search Grounding
 * Optimized with high-precision prompt and search grounding
 */
export const fetchPriceViaSearch = async (ticker: string): Promise<number | null> => {
  const ai = getAiClient();
  try {
    // 使用與 MarketWatch 一致的高精確度搜尋與角色設定
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Role: 你是財務分析專家。
Task: 搜尋股票「${ticker}」在台灣股市的最新成交價格。
請使用 googleSearch 工具獲取最新數據，並確保獲取的數字是「今日股價」。
必須僅回傳以下 JSON 格式：{"price": 數字}。
注意：嚴禁將日期（如 20241113）或代號（如 1301）拼接到價格中。如果台塑目前的股價是 43 左右，請確保回傳 43.0 而非其他無關數字。`,
      config: { tools: [{ googleSearch: {} }] }
    });
    
    const json = cleanAndParseJson(response.text || "");
    if (json && typeof json.price === 'number') {
      const price = json.price;
      // 進行基本合理性驗證
      if (isValidSanityPrice(price, ticker)) {
        return price;
      }
    }

    // 備用解析邏輯：過濾常見幻覺數字
    const rawText = (response.text || "").replace(/[,]/g, '');
    const matches = rawText.match(/\d+\.\d+/g) || rawText.match(/\d+/g);
    if (matches) {
      for (const m of matches) {
        const val = parseFloat(m);
        if (isValidSanityPrice(val, ticker)) return val;
      }
    }
    return null;
  } catch (e) {
    console.error("fetchPriceViaSearch failed for", ticker, e);
    return null;
  }
};

/**
 * 內部輔助：初步檢查價格合理性 (Sanity Check)
 */
const isValidSanityPrice = (price: number, ticker: string): boolean => {
  if (!price || isNaN(price) || price <= 0 || price > 100000) return false;
  
  const pStr = price.toString();
  const tickerBase = ticker.split('.')[0];
  
  // 1. 排除看起來像日期（8位整數）的數字
  if (pStr.length >= 8 && !pStr.includes('.')) return false;
  
  // 2. 排除剛好等於股票代號的數字 (幻覺)
  if (pStr === tickerBase) return false;
  
  // 3. 排除年份開頭的異常長數字
  if ((pStr.startsWith('2024') || pStr.startsWith('2025')) && pStr.length > 5) return false;
  
  return true;
};

/**
 * Valuation and financial summary for a stock
 */
export const fetchStockValuation = async (ticker: string, promptOrName: string, model: string = "gemini-3-flash-preview"): Promise<any> => {
  const ai = getAiClient();
  let finalPrompt = "";
  if (promptOrName.includes('{{ticker}}')) {
    finalPrompt = promptOrName.replace(/{{ticker}}/g, ticker);
  } else {
    finalPrompt = MARKET_WATCH_PROMPT.replace(/{{ticker}}/g, ticker);
  }
  
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: finalPrompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    return cleanAndParseJson(response.text || "{}");
  } catch (error) {
    console.error("fetchStockValuation failed", error);
    return null;
  }
};

/**
 * Macroeconomic indicator analysis
 */
export const fetchEconomicStrategyData = async (prompt: string, model: string): Promise<any> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt || ECONOMIC_STRATEGY_PROMPT,
      config: { tools: [{ googleSearch: {} }] }
    });
    return cleanAndParseJson(response.text || "{}");
  } catch (error) {
    console.error("fetchEconomicStrategyData failed", error);
    return null;
  }
};

/**
 * Predict potential Taiwan 50 candidates
 */
export const fetchFutureCandidates = async (prompt: string, model: string): Promise<any> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt || FUTURE_CANDIDATES_PROMPT,
      config: { tools: [{ googleSearch: {} }] }
    });
    return cleanAndParseJson(response.text || "{}");
  } catch (error) {
    console.error("fetchFutureCandidates failed", error);
    return null;
  }
};

/**
 * Pullback strategy potential stock scanner
 */
export const fetchPotentialStocks = async (
  prompt: string,
  model: string = "gemini-3-pro-preview"
): Promise<any> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt || POTENTIAL_STOCKS_PROMPT,
      config: { tools: [{ googleSearch: {} }] }
    });
    return cleanAndParseJson(response.text || "{}");
  } catch (error) {
    console.error("fetchPotentialStocks failed", error);
    return null;
  }
};

/**
 * Generate Google Finance formula based on natural language query
 */
export const fetchGoogleFinanceFormula = async (
  query: string
): Promise<GoogleFinanceResponse | null> => {
  const ai = getAiClient();
  const prompt = `Based on this request: "${query}", generate a Google Sheets GOOGLEFINANCE formula. 
  Return a JSON object with fields: "stock_request", "symbol", "attribute", "google_finance_formula", "explanation".`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    return cleanAndParseJson(response.text || "{}");
  } catch (error) {
    console.error("fetchGoogleFinanceFormula failed", error);
    return null;
  }
};
