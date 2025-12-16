
import { GoogleGenAI } from "@google/genai";
import { AI_ANALYSIS_PROMPT, FUTURE_CANDIDATES_PROMPT, MARKET_WATCH_PROMPT, ECONOMIC_STRATEGY_PROMPT, PORTFOLIO_ANALYSIS_PROMPT } from "../constants";
import { ChatMessage } from "../types";

// Helper to get client
const getAiClient = () => {
  // Use process.env.API_KEY exclusively as per guidelines.
  // This variable is injected via Vite's define plugin in vite.config.ts
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "" || apiKey === '""') {
    console.error("FATAL: API Key is missing. Please check Vercel Settings (Ensure var is named VITE_API_KEY or API_KEY).");
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

// Helper to append current date context to prompts and replace date variables
const processPrompt = (template: string, ticker?: string) => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentMonthYear = now.toLocaleString('en-US', { month: 'long', year: 'numeric' }); // e.g., "December 2024"
  
  let processed = template;
  
  // Replace {{ticker}} if provided
  if (ticker) {
    processed = processed.replace(/{{ticker}}/g, ticker);
  }

  // Replace {{current_date}} with "Month Year" for search queries to get recent data
  processed = processed.replace(/{{current_date}}/g, currentMonthYear);

  return `${processed}\n\n[SYSTEM TIME CONTEXT]\nToday is: ${today}.\nEnsure all extracted data (Price, Market Cap) is from ${currentMonthYear}.\nDISCARD data from previous quarters (e.g., Jan/Feb 2024) unless it matches today's date.`;
};

/**
 * Analyze a stock chart image using the specific prompt
 */
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
    
    // Ensure we use a supported model or fallback
    const selectedModel = (model === 'gemini-3-pro-preview' || model === 'gemini-2.5-flash') 
      ? model 
      : 'gemini-2.5-flash';

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
    if (error.message.includes("API Key")) return `錯誤：${error.message}`;
    return `分析失敗：${error.message || "未知錯誤"}`;
  }
};

/**
 * Chat with AI regarding the chart analysis
 */
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
  
  // Construct context prompt
  // Since this is a stateless call, we provide the image + initial analysis + history + new question
  let contextText = `
    Context: You have previously analyzed this stock chart. 
    Here is your Initial Analysis: 
    """${initialAnalysis}"""
    
    Current Conversation History:
  `;

  history.forEach(msg => {
    contextText += `\n${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`;
  });

  contextText += `\n\nUser's New Question: ${newQuestion}\n\nAnswer the user's question concisely based on the chart visual and the previous analysis context.`;

  try {
    const ai = getAiClient();
    const selectedModel = (model === 'gemini-3-pro-preview' || model === 'gemini-2.5-flash') 
      ? model 
      : 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: cleanBase64 } },
          { text: contextText }
        ]
      }
    });
    return response.text || "無法產生回應。";

  } catch (error: any) {
    console.error("Chat Error:", error);
    return `回應失敗：${error.message || "未知錯誤"}`;
  }
};

/**
 * Analyze Portfolio Holdings
 * @param portfolioData Cleaned/Grouped portfolio data object
 * @param customPrompt Optional
 * @param model Optional
 */
export const analyzePortfolio = async (
  portfolioData: any[],
  customPrompt?: string,
  model: string = "gemini-3-pro-preview"
) => {
  const promptTemplate = customPrompt || PORTFOLIO_ANALYSIS_PROMPT;
  
  // Convert portfolio data to string
  const dataString = JSON.stringify(portfolioData, null, 2);
  
  const fullPrompt = processPrompt(`
    ${promptTemplate}

    【投資組合數據】:
    ${dataString}
  `);

  try {
    const ai = getAiClient();
    
    // Ensure we use a supported model or fallback
    const selectedModel = (model === 'gemini-3-pro-preview' || model === 'gemini-2.5-flash') 
      ? model 
      : 'gemini-3-pro-preview';

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: fullPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    return response.text || "無法產生分析結果。";
  } catch (error: any) {
    console.error("Portfolio Analysis Error:", error);
    return `分析失敗：${error.message || "未知錯誤"}`;
  }
};

/**
 * Fetch current price and detailed financial data
 * @param ticker Stock Symbol
 * @param customPromptTemplate Optional template (must contain {{ticker}})
 * @param model Optional model selection (default gemini-2.5-flash)
 */
export const fetchStockValuation = async (
  ticker: string, 
  customPromptTemplate?: string, 
  model: string = "gemini-2.5-flash"
) => {
  
  const template = customPromptTemplate || MARKET_WATCH_PROMPT;
  const prompt = processPrompt(template, ticker);

  try {
    const ai = getAiClient();
    
    // Ensure we use a supported model or fallback
    const selectedModel = (model === 'gemini-3-pro-preview' || model === 'gemini-2.5-flash') 
      ? model 
      : 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model: selectedModel,
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
export const fetchEconomicStrategyData = async (
  customPrompt?: string,
  model: string = "gemini-3-pro-preview"
) => {
  // Use custom prompt if provided, otherwise default
  const prompt = processPrompt(customPrompt || ECONOMIC_STRATEGY_PROMPT);

  try {
    const ai = getAiClient();
    
    // Ensure we use a supported model or fallback
    const selectedModel = (model === 'gemini-3-pro-preview' || model === 'gemini-2.5-flash') 
      ? model 
      : 'gemini-3-pro-preview';
    
    const response = await ai.models.generateContent({
      model: selectedModel,
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
export const fetchFutureCandidates = async (
  customPrompt?: string,
  model: string = "gemini-3-pro-preview"
) => {
  // Use custom prompt if provided, otherwise default
  const prompt = processPrompt(customPrompt || FUTURE_CANDIDATES_PROMPT);

  try {
    const ai = getAiClient();
    
    // Ensure we use a supported model or fallback
    const selectedModel = (model === 'gemini-3-pro-preview' || model === 'gemini-2.5-flash') 
      ? model 
      : 'gemini-3-pro-preview';
    
    const response = await ai.models.generateContent({
      model: selectedModel,
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
