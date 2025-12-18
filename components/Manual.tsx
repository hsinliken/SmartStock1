
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Book, Code, Info, ChevronRight, Bookmark } from 'lucide-react';

const USER_MANUAL_MD = `
# 📖 SmartStock 使用手冊 (User Manual)

歡迎使用 **SmartStock AI 投資分析助理**。本系統整合了實時市場數據與 Google Gemini AI，旨在幫助您實現科學化、數據化的投資管理。

## 1. 投資組合 (Portfolio)
- **登錄交易**：點擊「新增交易」，輸入代號（台股請加 \`.TW\`，如 \`2330.TW\`）、價格與股數。
- **買入原因**：建議詳細填寫購買動機，這將成為日後 AI 進行「持倉健檢」時的重要依據。
- **獲利追蹤**：系統自動計算「未實現損益」與「資產配置比例」，並支援 FIFO（先進先出）賣出邏輯。

## 2. 價值儀表板 (Market Watch)
- **AI 估價**：輸入股票代號後，AI 會自動分析該標的的歷史本益比與殖利率區間，推算出「便宜、合理、昂貴」價格。
- **即時更新**：可設定自動刷新頻率（5分鐘~1小時），即時監控標的是否進入買入區間。

## 3. 低買高賣潛力股 (Potential Stocks)
- **策略邏輯**：AI 每日掃描全市場，鎖定「營收高成長、低本益比、法人連買、且 RSI 回調至支撐位」的標的。
- **勝率解析**：點擊勝率圓環可查看「基本面、籌碼面、技術面」的權重評分。
- **一鍵佈局**：直接點擊「登錄成交」即可將推薦標的存入您的投資組合。

## 4. 景氣燈號投資策略 (Economic Indicator)
- **大盤風向**：自動同步國發會景氣燈號。
- **操作心法**：
  - 🔵 **藍燈**：分批大膽佈局市值型 ETF（如 0050）。
  - 🔴 **紅燈**：過熱警訊，應分批獲利了結。

## 5. AI 炒股大使 (Analysis)
- **視覺分析**：上傳 K 線圖截圖，AI 會自動識別型態（如 W 底、頭肩頂）、均線糾結與量價背離。
- **互動對話**：對分析結果有疑問？直接在下方對話框向 AI 提問，模擬專業分析師的一對一諮詢。
`;

const TECH_MANUAL_MD = `
# 🛠️ 技術手冊 (Technical Manual)

本節詳述系統底層邏輯、公式設計與 AI 模型配置，適合對量化投資與開發有興趣的用戶。

## 1. AI 勝率計算公式 (Win Rate Formulas)

### A. 波段交易勝率 (Swing Trading)
由 **Gemini 3 Pro** 根據以下權重實時計算：
- **基本面 (40%)**: \`Revenue Growth\` > 20% 且 \`PEG\` < 1.1。
- **籌碼面 (30%)**: \`Institutional Buy Days\` > 3 且法人買超力道佔比。
- **技術面 (30%)**: \`RSI (14)\` 位階（40-55 為優）與關鍵均線 (\`MA20/MA60\`) 距離。

### B. 權值股晉升機率 (Future 50)
- **排名權重 (35%)**: 距離市值第 50 名之排名差。
- **市值缺口 (25%)**: 當前市值與門檻市值 (約 2000 億) 之百分比缺口。
- **成長動能 (40%)**: 預估營收成長率與產業趨勢權重。

## 2. 系統架構
- **Frontend**: React 19 + Tailwind CSS。
- **Database**: Firebase Firestore (同步雲端資料)。
- **Auth**: Firebase Authentication (Email/Password 加密)。
- **Data Source**: 
  - Yahoo Finance API Proxy (實時報價、PE、EPS)。
  - Google Search Grounding (補足缺失的財務細項與新聞)。
- **LLM**: Google Gemini 3.0 Pro / Flash。

## 3. 抗幻覺機制 (Anti-Hallucination)
- **價格邏輯校驗**：當訊號為 \`BUY\` 時，系統會自動核對 \`Take Profit\` 必須大於 \`Current Price\`。若 AI 生成之目標價低於現價，UI 會標註紅色警示並隱藏登錄按鈕。
- **Ticker 標準化**：系統內部統一將 4 位數代號轉化為 \`.TW\` (證交所) 或 \`.TWO\` (櫃買中心) 格式以確保數據抓取準確。
`;

export const Manual: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'USER' | 'TECH'>('USER');

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Tabs */}
      <div className="flex p-1 bg-slate-800 rounded-xl border border-slate-700 w-fit mx-auto sm:mx-0">
        <button
          onClick={() => setActiveTab('USER')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'USER' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Book size={18} /> 使用手冊
        </button>
        <button
          onClick={() => setActiveTab('TECH')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'TECH' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code size={18} /> 技術手冊
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden min-h-[60vh]">
        {/* Banner */}
        <div className={`p-8 border-b border-slate-700 bg-gradient-to-r ${
          activeTab === 'USER' ? 'from-emerald-900/40 to-slate-800' : 'from-blue-900/40 to-slate-800'
        }`}>
          <div className="flex items-center gap-4">
             <div className={`p-4 rounded-2xl ${activeTab === 'USER' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {activeTab === 'USER' ? <Info size={32}/> : <Bookmark size={32}/>}
             </div>
             <div>
                <h2 className="text-2xl font-black text-white">
                  {activeTab === 'USER' ? 'SmartStock 投資操作指南' : '量化模型與技術架構說明'}
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  最後更新：{new Date().toLocaleDateString('zh-TW')} | Version 1.2.0
                </p>
             </div>
          </div>
        </div>

        {/* Markdown Content */}
        <div className="p-8 md:p-12 prose prose-invert max-w-none prose-emerald prose-headings:font-black prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-white">
          <ReactMarkdown
            components={{
              h1: ({node, ...props}) => <h1 className="text-3xl border-b border-slate-700 pb-4 mb-8" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-xl text-emerald-400 flex items-center gap-2 mt-12 mb-4" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-lg font-bold text-slate-100 mt-8 mb-2" {...props} />,
              code: ({node, ...props}) => <code className="bg-slate-900 px-1.5 py-0.5 rounded text-pink-400 font-mono text-sm" {...props} />,
              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-emerald-500 bg-emerald-950/20 p-4 rounded-r-xl italic" {...props} />,
            }}
          >
            {activeTab === 'USER' ? USER_MANUAL_MD : TECH_MANUAL_MD}
          </ReactMarkdown>
        </div>
      </div>

      {/* Quick Links Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between group cursor-pointer hover:border-emerald-500/50 transition-all">
            <span className="text-xs text-slate-400 font-bold">查看開源授權</span>
            <ChevronRight size={16} className="text-slate-600 group-hover:translate-x-1 transition-transform"/>
         </div>
         <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between group cursor-pointer hover:border-blue-500/50 transition-all">
            <span className="text-xs text-slate-400 font-bold">聯絡技術支援</span>
            <ChevronRight size={16} className="text-slate-600 group-hover:translate-x-1 transition-transform"/>
         </div>
         <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex items-center justify-between group cursor-pointer hover:border-amber-500/50 transition-all">
            <span className="text-xs text-slate-400 font-bold">回報 Bug / 建議</span>
            <ChevronRight size={16} className="text-slate-600 group-hover:translate-x-1 transition-transform"/>
         </div>
      </div>
    </div>
  );
};
