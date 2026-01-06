
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
 */
export const fetchPriceViaSearch = async (ticker: string): Promise<number | null> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `請問目前 ${ticker} 的即時股價是多少？請僅回傳數字。`,
      config: { tools: [{ googleSearch: {} }] }
    });
    const priceStr = response.text?.replace(/[^\d.]/g, '');
    const price = parseFloat(priceStr || '');
    return isNaN(price) ? null : price;
  } catch (e) {
    return null;
  }
};

/**
 * Valuation and financial summary for a stock
 */
export const fetchStockValuation = async (ticker: string, promptOrName: string, model: string = "gemini-3-flash-preview"): Promise<any> => {
  const ai = getAiClient();
  let finalPrompt = "";
  // Check if it's a template prompt or just a name (used as fallback)
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
export const fetchPotentialStocks = async (prompt: string, model: string): Promise<any> => {
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
 * Generate specific Google Finance formulas based on query
 */
export const fetchGoogleFinanceFormula = async (query: string): Promise<GoogleFinanceResponse | null> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `為以下需求生成 Google Sheets 公式：${query}。請回傳 JSON 格式，包含：stock_request, symbol, attribute, google_finance_formula, explanation。`
    });
    return cleanAndParseJson(response.text || "{}");
  } catch (error) {
    console.error("fetchGoogleFinanceFormula failed", error);
    return null;
  }
};
