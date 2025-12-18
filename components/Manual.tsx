
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Book, Code, Info, ChevronRight, Bookmark, Layout, Target, Cpu, TrendingUp } from 'lucide-react';

const USER_MANUAL_MD = `
# 📖 SmartStock 使用手冊 (User Manual)

本手冊將引導您如何善用 **SmartStock** 的各項 AI 功能，從建立首筆投資紀錄到進行深度技術分析。

---

## 1. 投資組合管理 (Portfolio Management)
您的數位投資帳本，支援雲端同步與自動損益試算。

- **登錄買入**：
  - 輸入代號時，台股請務必加上後綴（上市 \`.TW\`，上櫃 \`.TWO\`）。
  - **買入原因**：這不是單純的備註，AI 在進行「持倉健檢」時會抓取此欄位，分析您的投資動機是否依然成立。
- **賣出邏輯 (FIFO)**：系統採用「先進先出」原則。若您輸入賣出 500 股，系統會自動從您最早的一筆買入紀錄中扣除。
- **雲端同步**：只要左下角顯示 \`Online\`，您的數據就會加密存儲於 Firebase，更換設備登入後即可同步。

## 2. 價值儀表板 (Market Watch & Valuation)
幫助您判斷目前股價是否具備投資價值。

- **AI 估價機制**：AI 會結合最近 5 年的本益比 (PE) 軌跡與殖利率區間進行動態估算：
  - **便宜價**：歷史本益比下緣或殖利率極高位。
  - **合理價**：中位數區間。
  - **昂貴價**：歷史高位。
- **自動刷新**：右上角可設定自動更新頻率。若處於「合理價」以下，建議列入重點觀察。

## 3. 波段潛力股偵測 (Potential Stocks)
利用量化指標掃描具備爆發力的中小型股。

- **選股邏輯**：
  - **營收動能**：YoY > 20% 是基本門檻。
  - **籌碼集中**：法人（投信/外資）必須有連續 3 日以上的買超動作。
  - **技術位階**：排除追高的標的，優先選取股價回調至 MA20/MA60 均線支撐的機會。
- **勝率解析**：點擊卡片右上角的 **WIN %** 圓環，可查看詳細的評分比例。

## 4. 未來權值 50 強 (Future 50 Candidates)
專為追蹤「下一家進入 0050」的公司而設計。

- **市值晉升勝率**：
  - **排名權重 (35%)**：目前市值排名在 51~60 名的標的獲得最高分。
  - **成長溢價 (40%)**：具有產業領先地位且 EPS 預估成長強勁者。
- **Google Sheets 公式**：卡片右下角提供一鍵複製公式，方便您將數據整合至自己的 Excel/Sheets 報表。

## 5. AI 技術分析大使 (Visual Analysis)
將您的螢幕截圖轉化為專業分析報告。

- **操作步驟**：
  1. 上傳 K 線圖、均線圖或 MACD 截圖。
  2. 點擊「開始分析」。
  3. AI 會識別阻力位、支撐位，並推演三種情境（突破、跌破、震盪）。
- **互動追問**：分析完畢後，您可以在下方對話框針對特定細節（如：某根成交量的異常）進行追問。
`;

const TECH_MANUAL_MD = `
# 🛠️ 技術手冊 (Technical Manual)

本節詳述 SmartStock 的系統底層邏輯與 AI 模型配置。

## 1. 數據獲取架構 (Data Ingestion)
系統採用多層級數據抓取策略：
1. **第一層 (Yahoo Finance)**：抓取即時價格、PE、EPS 等基本面數值。
2. **第二層 (Google Search Grounding)**：當 API 數據缺失或標的較冷門時（例如 OTC 股），AI 會啟動即時搜尋來補足資訊。
3. **第三層 (邏輯校驗)**：針對「元太 (8069)」等容易發生代號與價格混淆的標的，我們內建了「代號過濾演算法」，防止 AI 產生「股價 = 代號」的幻覺。

## 2. AI 勝率與評分模型 (Scoring Models)

### A. 波段勝率計算 (Swing Trading)
\`\`\`text
WinRate = (基本面 * 0.4) + (籌碼面 * 0.3) + (技術面 * 0.3)
\`\`\`
- **基本面評分**：基於 PEG (Price/Earnings To Growth)。PEG < 1 代表股價低估。
- **技術面評分**：基於 RSI 位階。RSI 介於 45-55（起漲點）得分最高。

### B. 市值晉升機率 (Future 50)
\`\`\`text
PromotionRate = (排名分 * 0.35) + (市值缺口 * 0.25) + (營收動能 * 0.4)
\`\`\`

## 3. 抗幻覺與安全機制 (Safety Guardrails)
- **價格倒置偵測**：系統會自動檢查 \`Target Price > Current Price\` (Buy 訊號時)。若邏輯不通，系統將禁止「登錄成交」並發出警告。
- **API 管理**：
  - **Flash 模式**：適用於快速價值監控。
  - **Pro 模式**：適用於投資組合深度分析與權值股預測。

## 4. 前端技術棧
- **框架**：React 19 (Hooks / Functional Components)。
- **圖表**：Recharts (SVG 渲染，高效流暢)。
- **樣式**：Tailwind CSS (自定義 Slate 色系與玻璃擬態 UI)。
- **資料庫**：Firebase Firestore (無伺服器架構)。
`;

export const Manual: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'USER' | 'TECH'>('USER');

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Info */}
      <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg mb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-emerald-500/10 rounded-xl">
                <Book className="text-emerald-400" size={24} />
             </div>
             <div>
               <h2 className="text-2xl font-black text-white">SmartStock 指南與技術文檔</h2>
               <p className="text-slate-400 text-sm">瞭解 AI 邏輯、操作流程與資產安全</p>
             </div>
          </div>
          
          <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-700 w-full md:w-auto shadow-inner">
            <button
              onClick={() => setActiveTab('USER')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'USER' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layout size={16} /> 使用手冊
            </button>
            <button
              onClick={() => setActiveTab('TECH')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'TECH' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu size={16} /> 技術手冊
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Nav (Desktop) */}
        <div className="hidden lg:block space-y-2">
           <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">快速索引</h3>
              <div className="space-y-1">
                 {activeTab === 'USER' ? (
                   <>
                     <a href="#portfolio" className="flex items-center gap-2 text-sm text-slate-300 hover:text-emerald-400 p-2 rounded transition-colors"><Bookmark size={14}/> 投資組合管理</a>
                     <a href="#valuation" className="flex items-center gap-2 text-sm text-slate-300 hover:text-emerald-400 p-2 rounded transition-colors"><Bookmark size={14}/> 價值儀表板</a>
                     <a href="#potential" className="flex items-center gap-2 text-sm text-slate-300 hover:text-emerald-400 p-2 rounded transition-colors"><Bookmark size={14}/> 波段潛力股</a>
                     <a href="#analysis" className="flex items-center gap-2 text-sm text-slate-300 hover:text-emerald-400 p-2 rounded transition-colors"><Bookmark size={14}/> AI 技術分析</a>
                   </>
                 ) : (
                   <>
                     <a href="#data" className="flex items-center gap-2 text-sm text-slate-300 hover:text-blue-400 p-2 rounded transition-colors"><Code size={14}/> 數據獲取架構</a>
                     <a href="#score" className="flex items-center gap-2 text-sm text-slate-300 hover:text-blue-400 p-2 rounded transition-colors"><Code size={14}/> 勝率評分模型</a>
                     <a href="#safety" className="flex items-center gap-2 text-sm text-slate-300 hover:text-blue-400 p-2 rounded transition-colors"><Code size={14}/> 抗幻覺機制</a>
                   </>
                 )}
              </div>
           </div>
           
           <div className="bg-gradient-to-br from-emerald-600/20 to-blue-600/20 p-6 rounded-xl border border-slate-700/50">
              <TrendingUp className="text-emerald-400 mb-3" size={24} />
              <h4 className="text-white font-bold text-sm mb-1">穩定性更新 v1.2.0</h4>
              <p className="text-[10px] text-slate-400 leading-relaxed">修正了 OTC 股票 (如 8069) 價位抓取異常，並優化了 AI 價格邏輯校驗功能。</p>
           </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden min-h-[60vh]">
          <div className="p-8 md:p-12 prose prose-invert max-w-none prose-emerald prose-headings:font-black prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-white prose-hr:border-slate-700">
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 className="text-3xl border-b border-slate-700 pb-4 mb-8 text-white" {...props} />,
                h2: ({node, ...props}) => {
                  const id = props.children?.toString().toLowerCase().includes('投資組合') ? 'portfolio' : 
                             props.children?.toString().toLowerCase().includes('價值儀表板') ? 'valuation' :
                             props.children?.toString().toLowerCase().includes('潛力股') ? 'potential' :
                             props.children?.toString().toLowerCase().includes('技術分析') ? 'analysis' :
                             props.children?.toString().toLowerCase().includes('數據獲取') ? 'data' :
                             props.children?.toString().toLowerCase().includes('評分模型') ? 'score' :
                             props.children?.toString().toLowerCase().includes('抗幻覺') ? 'safety' : '';
                  return <h2 id={id} className={`text-xl ${activeTab === 'USER' ? 'text-emerald-400' : 'text-blue-400'} flex items-center gap-2 mt-12 mb-4`} {...props} />;
                },
                h3: ({node, ...props}) => <h3 className="text-lg font-bold text-slate-100 mt-8 mb-2" {...props} />,
                code: ({node, ...props}) => <code className="bg-slate-900 px-1.5 py-0.5 rounded text-pink-400 font-mono text-sm" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className={`border-l-4 ${activeTab === 'USER' ? 'border-emerald-500 bg-emerald-950/20' : 'border-blue-500 bg-blue-950/20'} p-4 rounded-r-xl italic`} {...props} />,
                ul: ({node, ...props}) => <ul className="space-y-2" {...props} />,
                li: ({node, ...props}) => <li className="marker:text-emerald-500" {...props} />,
              }}
            >
              {activeTab === 'USER' ? USER_MANUAL_MD : TECH_MANUAL_MD}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Footer Support */}
      <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 text-center flex flex-col items-center gap-3">
         <p className="text-xs text-slate-500 font-medium">找不到您需要的答案？</p>
         <div className="flex gap-4">
            <button className="text-sm font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              技術支援中心 <ChevronRight size={14}/>
            </button>
            <button className="text-sm font-bold text-slate-400 hover:text-white flex items-center gap-1">
              回報數據異常 <ChevronRight size={14}/>
            </button>
         </div>
      </div>
    </div>
  );
};
