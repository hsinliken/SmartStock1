
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Book, Code, Info, ChevronRight, Layout, Cpu, 
  HelpCircle, CheckCircle2, ShieldAlert, Target, 
  Database, Calculator, MousePointer2, AlertCircle 
} from 'lucide-react';

const USER_MANUAL_MD = `
# 📖 SmartStock 使用者操作指南

本平台旨在將「AI 深度推理」與「即時市場數據」結合，協助投資者建立科學化的交易體系。

---

## <a id="core-ops"></a>核心模組與投資目標
每個功能模組都對應不同的投資階段：
1. **紀錄與健檢**：[投資組合] - 管理資產現況。
2. **監控與估值**：[價值儀表板] - 判斷標的是否過貴。
3. **選股與轉折**：[潛力股偵測] - 尋找技術面回檔機會。
4. **週期與配置**：[景氣燈號] - 決定目前的總倉位水位。

---

## <a id="portfolio-mgmt"></a>投資組合管理 (Portfolio)
**目標**：精確紀錄交易歷程，並透過 AI 評估持倉風險。

### 欄位與邏輯說明
- **FIFO (先進先出)**：當您進行「賣出股票」時，系統會自動優先扣除最早買入的批次，以計算正確的已實現損益。
- **買入原因/筆記**：這不僅是備忘錄。當您點擊 **[AI 持倉健檢]** 時，AI 會讀取您的初衷，對比當前市場現狀（如：原本看好營收，但現在營收衰退），給予「續抱」或「止損」的客觀建議。

### 操作步驟
1. 點擊「新增交易」，選擇買入/賣出。
2. 輸入代號（上市加 \`.TW\`，上櫃加 \`.TWO\`）。
3. 提交後點擊「更新現價」同步最新行情。
4. 點擊「AI 持倉健檢」獲取資產配置與風險分析報告。

---

## <a id="market-watch"></a>價值儀表板 (Market Watch)
**目標**：監控自選股，避免買在昂貴區，並在便宜區大膽佈局。

### 估值公式解析
AI 根據以下邏輯推算三價位：
- **便宜價 (Cheap)**：\`Min(歷史本益比區間下緣, 殖利率 6% 之股價位階)\`。
- **合理價 (Fair)**：\`近五年本益比中位數 * 近四季 EPS 總和\`。
- **昂貴價 (Expensive)**：\`Max(歷史本益比區間頂部, 殖利率低於 3% 之位階)\`。

### 使用建議
- **狀態顯示「便宜」**：適合長線價值投資者分批建立基本倉位。
- **狀態顯示「合理」**：適合定期定額，不宜大舉加碼。
- **狀態顯示「昂貴」**：需注意回檔風險，短線投資者應考慮止盈。

---

## <a id="potential-detection"></a>潛力股偵測 (Potential Stocks)
**目標**：透過量化指標過濾，捕捉具備基本面支撐且技術面「回檔不破」的強勢股。

### 勝率 (WIN %) 計算因子
AI 掃描以下維度並給予加權評分：
- **基本面 (40%)**：PEG (本益成長比) < 1.2 且營收 YoY > 20% 分數最高。
- **籌碼面 (30%)**：投信連續買超天數 > 3 天，顯示大戶鎖碼。
- **技術面 (30%)**：RSI 位於 40-55 之間（代表非過熱區）且股價貼近 MA20 或 MA60 支撐。

---

## <a id="economic-strategy"></a>景氣燈號策略 (Economic Indicator)
**目標**：根據國發會發布的「景氣對策信號」，調整整體資產配置比例。

### 燈號與操作公式
- **藍燈 (12-16分)**：景氣谷底。策略：**分批買進 0050/006208 等市值型 ETF**。
- **綠燈 (23-31分)**：景氣穩定。策略：維持定期定額，可適度配置高股息 ETF。
- **紅燈 (38-45分)**：景氣過熱。策略：**逐步減碼，提高現金比重或轉入美債等避險資產**。

---

## <a id="faq"></a>常見問題 (FAQ)
**Q：AI 分析結果可以作為唯一交易依據嗎？**
A：不可以。AI 分析是基於歷史數據與量化模型的推演，投資前請務必結合自身風險承受能力。

**Q：為什麼有些股票搜尋不到？**
A：請確保代號輸入正確。對於剛上市或數據源暫時缺失的標的，AI 會自動啟動「Search Grounding」搜尋網路資訊進行補充。
`;

const TECH_MANUAL_MD = `
# 🛠️ 技術架構與開發者手冊

本系統採用微服務概念，結合 Firebase 雲端同步與 Google Gemini 3.0 大語言模型進行數據處理。

---

## <a id="data-architecture"></a>數據獲取架構 (Data Flow)
系統採用 **Hybrid 雙路徑模式**：
1. **結構化路徑**：透過 Yahoo Finance API 獲取開盤、收盤、EPS、本益比等精確數字。
2. **非結構化路徑**：當 API 數據不足（如上櫃股或新興產業），系統會調用 Gemini **Google Search Tool** 進行即時網頁檢索，獲取最新的法人評論與新聞動向。

---

## <a id="ai-winrate"></a>AI 勝率算法邏輯
勝率並非隨機產生，而是透過 Prompt Engineering 強制 AI 執行以下計算（偽代碼）：
\`\`\`typescript
Score = (Fundamental_Score * 0.4) + (MoneyFlow_Score * 0.3) + (Technical_Score * 0.3)
If (PEG < 1) Fundamental_Score += 20;
If (Inst_Buy_Days > 3) MoneyFlow_Score += 25;
If (Price_Near_MA20) Technical_Score += 20;
\`\`\`
系統在 \`PotentialStocks.tsx\` 中設有防禦性代碼，若 AI 回傳結構異常，會自動觸發預設估計邏輯以防止介面黑屏。

---

## <a id="anti-hallucination"></a>抗幻覺機制 (Anti-Hallucination)
- **代號校驗**：若 AI 回傳的價格等於股票代號（常見 AI 幻覺，如 2330 股價回傳 2330），前端會自動將該數據標註為「失效」並啟動二次校驗。
- **邏輯門檻**：若 AI 提供之「停利價」低於「當前市價」，系統會自動拋出 \`isLogicError\` 旗標，並在 UI 上顯示紅色警示。

---

## <a id="price-validation"></a>價格校驗邏輯
在「潛力股」與「未來權值股」模組中，數據獲取分為三階段：
1. **AI 預測**：AI 給出初步參考價格。
2. **API 實價同步**：獲取清單後，前端發起 Batch Request 向伺服器換取精確收盤價。
3. **Search Fallback**：若 API 無回應，則由 AI 進行搜尋補齊。

---

## <a id="tech-stack"></a>系統技術棧
- **Framework**: React 19 + TypeScript (Strict Mode)
- **AI Engine**: Google Gemini 3.0 Pro/Flash (via @google/genai)
- **Realtime DB**: Firebase Firestore
- **State Mgmt**: React Context/Hooks (無外部 Redux 以降低延遲)
- **Styling**: Tailwind CSS + Lucide Icons
`;

export const Manual: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'USER' | 'TECH'>('USER');

  const handleJump = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // 微調滾動位置以避免被 Sticky Header 遮擋
      window.scrollBy(0, -80);
    }
  };

  const navItems = activeTab === 'USER' ? [
    { label: '核心模組', id: 'core-ops' },
    { label: '投資組合管理', id: 'portfolio-mgmt' },
    { label: '價值儀表板', id: 'market-watch' },
    { label: '潛力股偵測', id: 'potential-detection' },
    { label: '景氣燈號策略', id: 'economic-strategy' },
    { label: '常見問題', id: 'faq' },
  ] : [
    { label: '數據獲取架構', id: 'data-architecture' },
    { label: 'AI 勝率算法', id: 'ai-winrate' },
    { label: '抗幻覺機制', id: 'anti-hallucination' },
    { label: '價格校驗邏輯', id: 'price-validation' },
    { label: '系統技術棧', id: 'tech-stack' },
  ];

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
                  當前版本: v1.5.2 | 引擎: Gemini 3.0 Pro
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
        <div className="lg:col-span-3">
           <div className="sticky top-24 space-y-4">
              <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-lg">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-slate-700 pb-2 flex items-center gap-2">
                   <Target size={14} /> 快速跳轉
                </h3>
                <nav className="space-y-1">
                  {navItems.map(item => (
                    <button 
                      key={item.id} 
                      onClick={() => handleJump(item.id)}
                      className="w-full text-left p-3 rounded-lg text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-all flex items-center gap-2 group"
                    >
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /> {item.label}
                    </button>
                  ))}
                </nav>
              </div>
              
              <div className="bg-amber-900/10 p-6 rounded-2xl border border-amber-900/30 flex gap-4">
                  <ShieldAlert className="text-amber-500 shrink-0" size={24} />
                  <div>
                    <h4 className="text-amber-400 font-bold text-sm mb-1">風險警示</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      本系統提供之分析、評分與建議僅供參考，不代表投資保證。投資前請審慎評估風險並設置止損。
                    </p>
                  </div>
              </div>
           </div>
        </div>

        {/* Main Content Pane */}
        <div className="lg:col-span-9 bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden min-h-[70vh]">
          <div className="p-8 md:p-16 prose prose-invert max-w-none prose-emerald">
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 className="text-4xl border-b border-slate-700 pb-6 mb-10 text-white font-black" {...props} />,
                h2: ({node, ...props}) => <h2 className={`text-2xl ${activeTab === 'USER' ? 'text-emerald-400' : 'text-blue-400'} flex items-center gap-3 mt-16 mb-6 border-l-4 pl-4 ${activeTab === 'USER' ? 'border-emerald-500' : 'border-blue-500'} font-bold`} {...props} />,
                h3: ({node, ...props}) => <h3 className="text-xl font-bold text-slate-100 mt-10 mb-4 flex items-center gap-2" {...props} />,
                code: ({node, ...props}) => <code className="bg-slate-900 px-2 py-0.5 rounded text-pink-400 font-mono text-sm border border-slate-700" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className={`border-l-4 ${activeTab === 'USER' ? 'border-emerald-500 bg-emerald-950/20' : 'border-blue-500 bg-blue-950/20'} p-6 rounded-r-2xl italic my-8 shadow-inner text-slate-300`} {...props} />,
                ul: ({node, ...props}) => <ul className="space-y-3 my-6 list-none pl-0" {...props} />,
                li: ({node, ...props}) => (
                  <li className="flex items-start gap-2">
                    <MousePointer2 size={16} className={`shrink-0 mt-1 ${activeTab === 'USER' ? 'text-emerald-500' : 'text-blue-500'}`} />
                    <span className="text-slate-300">{props.children}</span>
                  </li>
                ),
                hr: () => <hr className="my-12 border-slate-700 opacity-50" />,
                a: ({node, ...props}) => <a {...props} className="scroll-mt-24" />, // 用於錨點偏移
              }}
            >
              {activeTab === 'USER' ? USER_MANUAL_MD : TECH_MANUAL_MD}
            </ReactMarkdown>

            {/* Bottom Footer Decoration */}
            <div className="mt-20 pt-10 border-t border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 opacity-50">
               <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-slate-700 rounded flex items-center justify-center">
                    <Target size={12} className="text-slate-400" />
                  </div>
                  <span className="text-xs text-slate-400">SmartStock AI Analyst Ecosystem</span>
               </div>
               <div className="flex gap-6">
                  <span className="text-xs text-slate-500 flex items-center gap-1"><Database size={10} /> Firebase Synced</span>
                  <span className="text-xs text-slate-500 flex items-center gap-1"><Calculator size={10} /> Quant Verified</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
