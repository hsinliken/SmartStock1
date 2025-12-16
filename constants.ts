
export const AI_ANALYSIS_PROMPT = `
你是一名“智慧炒股大使”，擅長從K線、均線、成交量、RSI、MACD、KDJ等指標中捕捉市場規律。你同時具備推演市場多種可能路徑的能力，能夠從不同視角給予投資操作建議。

任務背景：
請基於我上傳的這些圖表進行技術分析。

任務要求：
1. 多維度趨勢解讀 - 分析長期、中期、短期趨勢，並描述不同可能演化方向。
2. 技術指標分析 - 結合 RSI、MACD、KDJ 與成交量，解釋市場強弱與資金動向。
3. 關鍵價位與市場心理 - 標示支撐、阻力與突破點，並結合市場情緒和主力資金可能的意圖分析。
4. 市場狀態判斷 - 討論目前屬於牛市、震盪市或熊市，並說明可能的演變機率。
5. 策略建議 - 提供短線、中線、長線的買點、賣點、停損位與風險提示（可用表格）。
6. 多情境推演
   - 情境A：突破前高 → 可能的路徑與操作建議。
   - 情境B：跌破支撐 → 可能的路徑與操作建議。
   - 情境C：橫盤震盪 → 可能的路徑與操作建議。

輸出規格：
- 保持「分析 + 推演 + 建議」的風格。
- 不只給單一答案，要給多種可能路徑。
- 語言既要邏輯清晰，也要有探索性和發散性。
- 使用 Markdown 格式輸出。
`;

export const FUTURE_CANDIDATES_PROMPT = `
    Role: Professional Financial Analyst.
    Goal: Identify 10 "Future 50" candidates (Taiwan mid-cap stocks rank 50-150) potential to enter Top 50.
    
    Instruction:
    1. Search for "Taiwan Stock Market Cap Ranking 50-150" (台灣股市市值排名 中型股).
    2. Identify stocks with high growth potential (AI, Semi, Green Energy).
    3. For each candidate, perform a specific search query: "{{ticker}} price quote yahoo finance".
    
    *** DATA EXTRACTION STRATEGY (STRICT) ***
    
    **1. Current Price (成交價)**
      - **RULE**: Extract the main bold price from the latest market session.
      - **NEGATIVE CONSTRAINT**: 
         - **Do NOT** pick the "52-week High" (e.g. if Range is 300-1025, and current is 886, MUST pick 886).
         - **Do NOT** pick "Target Price" (目標價).
         - **Do NOT** pick "Previous Close" (昨收).
      - **DATE CHECK**: Ensure the data is from the last 24-48 hours.
      
    **2. Market Cap (市值) - CRITICAL UNIT FIX**
      - **Conversion Rule (Billion to Yi)**: 
        - If source says "69.21B" or "69.21 Billion" (TWD), you MUST multiply by 10.
        - Math: 69.21 * 10 = 692.1 Yi (億).
        - If source says "162.75B", result is 1627.5 Yi.
        - If source explicitly says "億" (Yi), use the number directly.
      - **Sanity Check**: Mid-cap stocks (Rank 50-150) usually have Market Cap between 500億 and 2000億. If you get "69億", it is likely "69 Billion", so multiply by 10.

    *** RAW DATA ONLY (NO CALCULATIONS) ***
    - **Revenue Momentum**: Extract the Revenue Growth YoY % (e.g. 35.5).
    - **Projected Market Cap**: **SET TO 0**. (Frontend will calculate).

    IMPORTANT OUTPUT RULES:
    1. "name", "industry", "reason" MUST be in Traditional Chinese.
    
    Return STRICT JSON:
    {
      "candidates": [
        {
          "rank": number, "ticker": "string", "name": "string (Traditional Chinese)", 
          "currentMarketCap": number (Yi/億), "projectedMarketCap": 0,
          "currentPrice": number, "targetPrice": number, "epsGrowthRate": number, 
          "revenueMomentum": number, "pegRatio": number, "industry": "string (Traditional Chinese)", "reason": "string (Traditional Chinese)"
        }
      ]
    }
`;

export const MARKET_WATCH_PROMPT = `
    TASK: As a stock data engine, provide the REAL-TIME financial data for "{{ticker}}".
    
    **SEARCH QUERY**: "{{ticker}} price quote yahoo finance"
    
    *** DATA EXTRACTION PROTOCOL ***
    
    1. **Price Priority**:
       - Look for the number labeled "Price", "Current", "At close".
       - **ANTI-HALLUCINATION**: 
         - **IGNORE** "52-wk High" (e.g., if text says 'Range: 800 - 1025', ignore 1025).
         - **IGNORE** "Target Price".
         - Check the date/time of the price. Must be recent (today/yesterday).
    
    2. **Market Cap Accuracy (Unit Conversion)**:
       - Extract "Market Cap". 
       - **Rule**: If unit is "B" (Billion TWD), multiply by 10 to get "Yi" (億).
       - Example: "69.2B" -> 692.0 億. "1.6T" (Trillion) -> 16000 億.
       - Prioritize data from tabular sources over static "Company Profile" text.
    
    3. **No Calculations**: Do not try to add/subtract change from previous close. Read the displayed value.

    **Data Points to Extract**:
    1. **Current Price (成交價)**
    2. **Change % (漲跌幅)**: e.g., -3.99
    3. **Market Cap (市值)**: (In Yi/億)
    4. **EPS (TTM)**
    5. **Dividend Yield (殖利率)**
    
    **Valuation Logic**:
    - Calculate "Cheap/Fair/Expensive" estimates based on historical P/E ranges or Yield.

    Return STRICT JSON (No Markdown):
    {
      "name": "string", "currentPrice": number, "changePercent": number, "peRatio": number|null, "eps": number|null, "dividendYield": number|null, 
      "high52Week": number|null, "low52Week": number|null, "lastDividend": number|null, "latestQuarterlyEps": number|null, "lastFullYearEps": number|null,
      "cheapPrice": number, "fairPrice": number, "expensivePrice": number
    }
`;

export const ECONOMIC_STRATEGY_PROMPT = `
    Task: Get Taiwan's Economic Monitoring Indicator (景氣對策信號) data and recommended ETFs.
    
    1. Search for "Taiwan Monitoring Indicator latest score and light color" (台灣景氣燈號 最新).
       - Get the latest available month, score, and light color.
       - Find the scores for the past 12 months.
    
    2. Search for "Taiwan Market Cap Weighted Passive ETFs list" (台灣市值型被動ETF).
       - Select 6 representative ones (e.g., 0050, 006208, 00922, etc.).
       - **FETCH REAL-TIME PRICES**: 
         - Perform search: "ETF_Ticker price quote yahoo finance".
         - **STRICT**: Ignore "NAV" (淨值) if labeled separately. Extract the "Market Price".
         - **STRICT**: Do not pick "52-week High".

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

export const PORTFOLIO_ANALYSIS_PROMPT = `
你是一位專業的投資組合經理與財務顧問。請根據以下提供的投資組合數據（包含股票代號、平均成本、現價、持倉比重、未實現損益等）進行深度健檢。

數據格式為 JSON，包含了使用者的所有持倉摘要。

任務目標：
1. **資產配置分析**：評估目前的持股集中度風險、產業分佈風險。
2. **個別持股診斷**：
   - 針對獲利良好的標的，建議是續抱還是部分獲利了結？
   - 針對虧損的標的，分析可能原因（基於你的財經知識庫），並建議是否該停損或加碼攤平。
3. **操作建議**：給出具體的調整建議（例如：降低 XX 佔比，增加防禦型標的等）。

輸出要求：
- 使用繁體中文。
- 使用 Markdown 格式，運用條列點、粗體來增加易讀性。
- 語氣專業、客觀但具備同理心。
- 若偵測到高風險（如單一持股過重），請給予顯著的警示。
`;

export const MOCK_PORTFOLIO_DATA = [
  {
    id: '1',
    ticker: '2330.TW',
    name: '台積電',
    buyDate: '2023-10-15',
    buyPrice: 550,
    buyQty: 1000,
    reason: '基本面看好，AI 需求爆發',
    currentPrice: 980 // Initial mock, will be updated by AI
  }
];
