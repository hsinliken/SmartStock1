
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

## 核心模組與投資目標
每個功能模組都對應不同的投資階段：
1. **紀錄與健檢**：[投資組合] - 管理資產現況。
2. **監控與估值**：[價值儀表板] - 判斷標的是否過貴。
3. **選股與轉折**：[潛力股偵測] - 尋找技術面回檔機會。
4. **週期與配置**：[景氣燈號] - 決定目前的總倉位水位。

---

## 投資組合管理 (Portfolio)
**目標**：精確紀錄交易歷程，並透過 AI 評估持倉風險。

### 欄位說明
- **庫存股數**：目前持有的總股數。
- **平均成本**：多筆買入後的加權平均價。
- **買入原因**：這不僅是筆記，AI 健檢會以此對比當前現況給予建議。

### 核心公式：先進先出 (FIFO)
當您進行「賣出」操作時，系統會自動優先扣除「最早買入」的批次。
- **計算方式**：已實現損益 = (賣出價 - 最早買入價) * 賣出股數。

### 操作步驟
1. 點擊 **[新增交易]**。
2. 輸入代號（台股需含 \`.TW\` 或 \`.TWO\`）。
3. 定期使用 **[更新現價]**。
4. 點擊 **[AI 持倉健檢]** 獲取專業診斷報告。

---

## 價值儀表板 (Market Watch)
**目標**：監控自選股，避免買在昂貴區，並在便宜區大膽佈局。

### 估值模型解析
AI 根據以下雙軌模型推算價格區間：
1. **本益比模型 (P/E Bands)**：參考過去 5 年本益比位階。
2. **殖利率模型 (Yield-Based)**：
   - 便宜價：殖利率 > 6% 的位階。
   - 合理價：殖利率 4-5% 的位階。
   - 昂貴價：殖利率 < 3% 的位階。

### 使用建議
- **狀態為「便宜」**：適合長線分批建立基本倉。
- **狀態為「昂貴」**：需注意回檔風險，考慮分批止盈。

---

## 潛力股偵測 (Potential Stocks)
**目標**：捕捉具備基本面支撐且技術面「回檔不破」的轉折機會。

### 勝率 (WIN %) 算法
AI 掃描以下維度並給予權重評分：
- **基本面 (40%)**：PEG < 1.2 且營收 YoY > 20% 分數最高。
- **籌碼面 (30%)**：投信連續買超天數（鎖碼效應）。
- **技術面 (30%)**：RSI 位於 40-55（代表非超買區）且貼近支撐均線。

---

## 景氣燈號策略 (Economic Indicator)
**目標**：根據總體經濟週期調整整體資產配置比例（Beta 策略）。

### 燈號對策
- **藍燈/黃藍燈**：景氣低迷，適合佈局市值型 ETF（如 0050）。
- **綠燈**：景氣穩定，維持定期定額。
- **紅燈/黃紅燈**：景氣過熱，應逐步回收現金，提高避險資產比重。

---

## 常見問題 (FAQ)
**Q：AI 分析結果可以作為唯一交易依據嗎？**
A：不可以。AI 分析是基於量化模型的推演，請務必結合個人風險承受能力與停損機制。
`;

const TECH_MANUAL_MD = `
# 🛠️ 技術架構與邏輯說明

本系統採用微服務概念，整合 Firebase 雲端同步與 Google Gemini 3.0 大語言模型。

---

## 數據獲取架構 (Data Architecture)
系統採用 **Hybrid 雙路徑模式**：
1. **結構化路徑**：透過 Yahoo Finance API 獲取確切財報數字（EPS, P/E）。
2. **非結構化路徑**：調用 Gemini **Google Search Tool** 進行即時網頁檢索，補充 API 缺失的最新法人動態或新聞。

---

## 抗幻覺機制 (Anti-Hallucination)
- **代號校驗**：若 AI 回傳的股價等於代號數字（例如：2330 價格回傳 2330），前端會自動攔截該錯誤。
- **邏輯門檻**：系統會自動檢查「停利價」是否低於「現價」，若發生邏輯衝突則拋出 \`isLogicError\` 警示。

---

## 雲端同步與安全 (Security)
- **Firebase Auth**：確保使用者資料隔離。
- **Scoped Storage**：LocalStorage 與 Firestore 同步，提供離線可用性與多端存取。

---

## 系統技術棧
- **Frontend**: React 19 + TypeScript
- **AI Engine**: Google Gemini 3.0 Pro/Flash
- **Database**: Firebase Firestore
- **State**: React Hooks (Custom Scoped Cache)
`;

export const Manual: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'USER' | 'TECH'>('USER');

  // 將標題文字轉換為 ID
  const slugify = (text: string) => {
    return text.trim().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u4e00-\u9fa5-]+/g, '');
  };

  const handleJump = (title: string) => {
    const id = slugify(title);
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // 避開 Sticky Header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const navItems = activeTab === 'USER' ? [
    '核心模組與投資目標',
    '投資組合管理 (Portfolio)',
    '價值儀表板 (Market Watch)',
    '潛力股偵測 (Potential Stocks)',
    '景氣燈號策略 (Economic Indicator)',
    '常見問題 (FAQ)',
  ] : [
    '數據獲取架構 (Data Architecture)',
    '抗幻覺機制 (Anti-Hallucination)',
    '雲端同步與安全 (Security)',
    '系統技術棧',
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
                  當前版本: v1.6.0 | 引擎: Gemini 3.0 Pro
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
                   <Target size={14} /> 內容跳轉
                </h3>
                <nav className="space-y-1">
                  {navItems.map(item => (
                    <button 
                      key={item} 
                      onClick={() => handleJump(item)}
                      className="w-full text-left p-3 rounded-lg text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-all flex items-center gap-2 group"
                    >
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /> {item}
                    </button>
                  ))}
                </nav>
              </div>
              
              <div className="bg-amber-900/10 p-6 rounded-2xl border border-amber-900/30 flex gap-4">
                  <ShieldAlert className="text-amber-500 shrink-0" size={24} />
                  <div>
                    <h4 className="text-amber-400 font-bold text-sm mb-1">風險警示</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      本系統提供之分析結果僅供參考，不構成任何投資建議。投資前請審慎評估。
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
                h1: ({node, ...props}) => <h1 id={slugify(props.children as string)} className="text-4xl border-b border-slate-700 pb-6 mb-10 text-white font-black" {...props} />,
                h2: ({node, ...props}) => <h2 id={slugify(props.children as string)} className={`text-2xl ${activeTab === 'USER' ? 'text-emerald-400' : 'text-blue-400'} flex items-center gap-3 mt-16 mb-6 border-l-4 pl-4 ${activeTab === 'USER' ? 'border-emerald-500' : 'border-blue-500'} font-bold`} {...props} />,
                h3: ({node, ...props}) => <h3 id={slugify(props.children as string)} className="text-xl font-bold text-slate-100 mt-10 mb-4 flex items-center gap-2" {...props} />,
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
              }}
            >
              {activeTab === 'USER' ? USER_MANUAL_MD : TECH_MANUAL_MD}
            </ReactMarkdown>

            {/* Bottom Footer */}
            <div className="mt-20 pt-10 border-t border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 opacity-50">
               <div className="flex items-center gap-2">
                  <Target size={12} className="text-slate-400" />
                  <span className="text-xs text-slate-400">SmartStock AI Ecosystem</span>
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
