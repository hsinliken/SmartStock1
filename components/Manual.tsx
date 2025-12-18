
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Book, Code, Info, ChevronRight, Bookmark, Layout, Target, Cpu, TrendingUp, HelpCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

const USER_MANUAL_MD = `
# 📖 SmartStock 使用手冊 (User Manual)

歡迎使用 **SmartStock AI 投資分析系統**。本平台結合了即時金融數據與 Google Gemini 3.0 的強大推理能力，旨在協助您實現「量化交易」與「科學理財」。

---

## 🚀 核心模組操作指引

### 1. 投資組合 (Portfolio) - 您的數位帳本
管理資產的第一步是精確紀錄。
- **正確登錄**：輸入台股代碼時，上市標的請用 \`.TW\` (如 \`2330.TW\`)，上櫃標的請用 \`.TWO\` (如 \`8069.TWO\`)。
- **買入原因的妙用**：這是給未來的自己看的。AI 在進行「持倉健檢」時會抓取此欄位，評估當初買入的邏輯（例如：看好 AI 需求）在現狀下是否依然成立。
- **損益試算**：系統採用 **FIFO (先進先出)** 邏輯。若部分賣出，會優先扣除最早買入的批次。

### 2. 價值儀表板 (Market Watch) - 買得便宜是硬道理
本模組利用 AI 自動計算標的的「安全邊際」。
- **三價位估算法**：
  - **便宜價**：歷史本益比下緣 + 殖利率 > 5% 的支撐位。
  - **合理價**：近五年的平均價值中樞。
  - **昂貴價**：噴發段末端或本益比過高警示區。
- **操作建議**：當股價進入「便宜價」區間且景氣燈號為黃藍燈以下時，是極佳的長線佈局點。

### 3. 低買高賣潛力股 (Potential Stocks) - 捕捉波段轉折
鎖定具備成長動能且價格回落至支撐位的標的。
- **勝率解析**：點擊卡片右上角的「WIN %」，可查看 AI 從**基本面 (PEG/營收)**、**籌碼面 (法人連買)**、**技術面 (RSI/均線)** 三維度的權重評分。
- **加入追蹤**：看好但不想立刻買入？點擊「加入追蹤」將其送入價值儀表板持續監控。

### 4. 景氣燈號投資 (Economic Strategy) - 大週期的導航標
跟著國家發展委員會的燈號進行資產配置。
- **藍燈 (12-16分)**：景氣低迷，卻是市值型 ETF (如 0050, 006208) 的最佳買點。
- **紅燈 (38-45分)**：景氣過熱，股市通常處於相對高位，應分批獲利了結。

---

## 💡 常見問題 (FAQ)

**Q: 為什麼有些股票的市價顯示為 0？**
A: 這通常發生在剛收盤或數據源 (Yahoo Finance) 暫時斷線時。請點擊「更新現價」或「重新整理」。系統已針對元太 (8069) 等上櫃股優化搜尋邏輯。

**Q: AI 提供的目標價可以全信嗎？**
A: 不行。AI 建議是基於歷史數據與當前趨勢的推演。請務必配合「AI 炒股大使」上傳圖表進行技術面二次確認。

**Q: 數據安全性如何？**
A: 您的資料存儲於 Google Firebase 加密雲端，僅限您的帳號登入後存取。
`;

const TECH_MANUAL_MD = `
# 🛠️ 技術手冊 (Technical Manual)

本手冊為開發者與高級用戶提供系統架構與算法邏輯的深度解析。

---

## 🧠 AI 勝率計算模型 (Win Rate Algorithm)

### A. 潛力股評分 (Small-Cap Monitor)
AI 使用以下權重動態計算勝率：
1. **價值因子 (40%)**: \`PEG = PE / (EPS Growth * 100)\`。PEG < 1 時得分最高。
2. **動能因子 (30%)**: 法人連續買超天數 (Institutional Buy Days) 超過 3 天具備加分效應。
3. **超賣因子 (30%)**: RSI (14) 位階。當 RSI 介於 40-50 之間且股價位於 MA60 附近時，賦予「回調買入」高權重。

### B. 權值晉升預測 (Future 50)
1. **排名分 (35%)**: 距離第 50 名之排名差距，越近得分越高。
2. **市值分 (25%)**: 當前市值與門檻值 (約 2000 億) 之百分比缺口。
3. **成長分 (40%)**: 預估 EPS 與營收動能的年度複合成長率。

---

## 🛡️ 數據完整性與抗幻覺 (Data Guardrails)

### 1. Ticker 修正算法
針對台股多元交易所 (TSE, OTC) 進行代號修正：
- 若 AI 搜尋回傳 \`8069.TW\` 但 Yahoo Finance 查無數據，前端會自動重試 \`8069.TWO\`。
- 系統會比對代號數字與回傳價格，若 \`Price === TickerNumber\` (常見 AI 幻覺)，則自動捨棄該數值並啟動 Google Search Grounding 二次搜尋。

### 2. 價格倒置校驗
在「潛力股」模組中，若 AI 給出的 \`Take Profit\` (停利點) 低於 \`Current Price\` (現價)，系統會標註為「數據異常」，並在 UI 上給予紅色警示，防止誤導用戶進行錯誤操作。

---

## 🌐 系統技術棧 (Tech Stack)
- **前端**: React 19 (Strict Mode) + TypeScript。
- **樣式**: Tailwind CSS (JIT Engine)。
- **分析引擎**: Google Gemini 3.0 Pro & Flash。
- **資料庫**: Firebase Firestore (Real-time Sync)。
- **報價來源**: Yahoo Finance 2 (透過 Vercel Proxy 轉接)。
`;

export const Manual: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'USER' | 'TECH'>('USER');

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          {activeTab === 'USER' ? <Book size={160} /> : <Code size={160} />}
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
             <div className={`p-4 rounded-2xl shadow-lg ${activeTab === 'USER' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {activeTab === 'USER' ? <HelpCircle size={32} /> : <Cpu size={32} />}
             </div>
             <div>
                <h2 className="text-3xl font-black text-white tracking-tight">
                  {activeTab === 'USER' ? '系統操作手冊' : '技術架構與邏輯'}
                </h2>
                <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  當前版本: v1.3.5 | 數據引擎: Gemini 3.0 Hybrid
                </p>
             </div>
          </div>
          
          <div className="flex p-1.5 bg-slate-900 rounded-2xl border border-slate-700 w-full md:w-auto shadow-inner">
            <button
              onClick={() => setActiveTab('USER')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-black transition-all ${
                activeTab === 'USER' ? 'bg-emerald-600 text-white shadow-xl scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Layout size={18} /> 使用者指南
            </button>
            <button
              onClick={() => setActiveTab('TECH')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-black transition-all ${
                activeTab === 'TECH' ? 'bg-blue-600 text-white shadow-xl scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Code size={18} /> 技術架構
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-3 space-y-4">
           <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-slate-700 pb-2">快速跳轉</h3>
              <nav className="space-y-1">
                 {activeTab === 'USER' ? (
                   ['核心模組操作', '投資組合管理', '價值儀表板', '潛力股偵測', '景氣燈號策略', '常見問題'].map(item => (
                     <button key={item} className="w-full text-left p-3 rounded-lg text-sm text-slate-400 hover:bg-slate-700 hover:text-emerald-400 transition-all flex items-center gap-2 group">
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /> {item}
                     </button>
                   ))
                 ) : (
                   ['數據獲取架構', 'AI 勝率算法', '抗幻覺機制', '價格校驗邏輯', '系統技術棧'].map(item => (
                     <button key={item} className="w-full text-left p-3 rounded-lg text-sm text-slate-400 hover:bg-slate-700 hover:text-blue-400 transition-all flex items-center gap-2 group">
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /> {item}
                     </button>
                   ))
                 )}
              </nav>
           </div>
           
           <div className="bg-amber-900/10 p-6 rounded-2xl border border-amber-900/30 flex gap-4">
              <ShieldAlert className="text-amber-500 shrink-0" size={24} />
              <div>
                 <h4 className="text-amber-400 font-bold text-sm mb-1">風險警示</h4>
                 <p className="text-[10px] text-slate-400 leading-relaxed">
                   AI 分析僅供參考，投資前請務必自行評估並設置停損點。SmartStock 不對任何投資損失負責。
                 </p>
              </div>
           </div>
        </div>

        {/* Main Content Pane */}
        <div className="lg:col-span-9 bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden min-h-[70vh]">
          <div className="p-10 md:p-16 prose prose-invert max-w-none prose-emerald prose-headings:font-black prose-p:text-slate-300 prose-li:text-slate-300 prose-strong:text-white prose-hr:border-slate-700">
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 className="text-4xl border-b border-slate-700 pb-6 mb-10 text-white" {...props} />,
                h2: ({node, ...props}) => <h2 className={`text-2xl ${activeTab === 'USER' ? 'text-emerald-400' : 'text-blue-400'} flex items-center gap-3 mt-16 mb-6 border-l-4 pl-4 ${activeTab === 'USER' ? 'border-emerald-500' : 'border-blue-500'}`} {...props} />,
                h3: ({node, ...props}) => <h3 className="text-xl font-bold text-slate-100 mt-10 mb-4" {...props} />,
                code: ({node, ...props}) => <code className="bg-slate-900 px-2 py-0.5 rounded text-pink-400 font-mono text-sm border border-slate-700" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className={`border-l-4 ${activeTab === 'USER' ? 'border-emerald-500 bg-emerald-950/20' : 'border-blue-500 bg-blue-950/20'} p-6 rounded-r-2xl italic my-8 shadow-inner`} {...props} />,
                ul: ({node, ...props}) => <ul className="space-y-3 my-6" {...props} />,
                li: ({node, ...props}) => <li className="marker:text-emerald-500" {...props} />,
                hr: () => <hr className="my-12 opacity-30" />,
              }}
            >
              {activeTab === 'USER' ? USER_MANUAL_MD : TECH_MANUAL_MD}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};
