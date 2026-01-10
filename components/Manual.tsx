
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Book, Code, Info, ChevronRight, Layout, Cpu, 
  HelpCircle, CheckCircle2, ShieldAlert, Target, 
  Database, Calculator, MousePointer2, AlertCircle,
  Lock, Globe, UserCheck, ShieldCheck
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

---

## 潛力股偵測 (Potential Stocks)
**目標**：捕捉具備基本面支撐且技術面「回檔不破」的轉折機會。

### 勝率 (WIN %) 算法
AI 掃描以下維度並給予權重評分：
- **基本面 (40%)**：PEG < 1.2 且營收 YoY > 20% 分數最高。
- **籌碼面 (30%)**：投信連續買超天數。
- **技術面 (30%)**：RSI 位於 40-55 且貼近支撐均線。

---

## 常見問題 (FAQ)
**Q：我的資料會被別人看到嗎？**
A：本系統預設採用「私密存取模式」，除非您自行將資料公開，否則透過 Firebase 安全規則，只有您本人帳號登入後才能存取您的數據。
`;

const TECH_MANUAL_MD = `
# 🛠️ 技術架構與資料安全

本系統採用雲端加密儲存與 AI 邏輯校驗，確保數據的準確性與私密性。

---

## 🔐 Firebase Firestore 安全規則 (必設)
為了確保「**只有本人可以讀取與寫入自己的資料**」，請在 Firebase Console 的 **Firestore -> Rules** 貼入以下配置。

這套規則會檢查請求者的 UID 是否與資料夾名稱相符：

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 鎖定 users 集合下的每一份文件
    match /users/{userId} {
      // ✅ 僅允許已登入的使用者，且其 UID 必須等於文件 ID
      // 這保證了：我只能讀寫「我的」資料，別人也看不到我的資料
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
\`\`\`

---

## 資料隔離機制 (Data Isolation)
1. **前端過濾**：系統會自動根據當前登入使用者的 UID 建立文件路徑 \`/users/{UID}\`。
2. **後端攔截**：即便惡意使用者嘗試透過程式碼存取其他 UID 的路徑，Firebase 伺服器端也會因上述 Rules 拒絕連線。

---

## 數據獲取與抗幻覺
- **Hybrid 模式**：結合 Yahoo Finance 結構化數據與 Gemini 網頁檢索。
- **數據洗淨**：AI 回傳 JSON 後，系統會進行二次校驗，攔截股價異常（如：現價等於代號數字）的錯誤回傳。

---

## 系統技術棧
- **Frontend**: React 19 + TypeScript + Recharts
- **AI**: Google Gemini 3.0 Pro (Thinking enabled)
- **Backend**: Firebase Auth & Firestore
- **Deployment**: Vercel / Firebase Hosting
`;

export const Manual: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'USER' | 'TECH'>('USER');

  const slugify = (text: string) => {
    return text.trim().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u4e00-\u9fa5-]+/g, '');
  };

  const handleJump = (title: string) => {
    const id = slugify(title);
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
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
    '常見問題 (FAQ)',
  ] : [
    'Firebase Firestore 安全規則 (必設)',
    '資料隔離機制 (Data Isolation)',
    '數據獲獲取與抗幻覺',
    '系統技術棧',
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          {activeTab === 'USER' ? <Book size={160} /> : <ShieldCheck size={160} />}
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
             <div className={`p-4 rounded-2xl shadow-lg ${activeTab === 'USER' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {activeTab === 'USER' ? <HelpCircle size={32} /> : <ShieldCheck size={32} />}
             </div>
             <div>
                <h2 className="text-3xl font-black text-white tracking-tight">
                  {activeTab === 'USER' ? '系統操作手冊' : '技術安全與權限'}
                </h2>
                <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                  <Lock size={14} className="text-blue-500" />
                  權限設定：私密存取模式 (本人讀寫)
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
              <Lock size={18} /> 安全規則
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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
              
              <div className="bg-blue-900/10 p-6 rounded-2xl border border-blue-900/30 flex gap-4">
                  <ShieldAlert className="text-blue-500 shrink-0" size={24} />
                  <div>
                    <h4 className="text-blue-400 font-bold text-sm mb-1">隱私保護</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      本系統預設不公開任何資料。只有您能瀏覽您自己的投資組合。
                    </p>
                  </div>
              </div>
           </div>
        </div>

        <div className="lg:col-span-9 bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden min-h-[70vh]">
          <div className="p-8 md:p-16 prose prose-invert max-w-none prose-emerald">
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 id={slugify(props.children as string)} className="text-4xl border-b border-slate-700 pb-6 mb-10 text-white font-black" {...props} />,
                h2: ({node, ...props}) => <h2 id={slugify(props.children as string)} className={`text-2xl ${activeTab === 'USER' ? 'text-emerald-400' : 'text-blue-400'} flex items-center gap-3 mt-16 mb-6 border-l-4 pl-4 ${activeTab === 'USER' ? 'border-emerald-500' : 'border-blue-500'} font-bold`} {...props} />,
                h3: ({node, ...props}) => <h3 id={slugify(props.children as string)} className="text-xl font-bold text-slate-100 mt-10 mb-4 flex items-center gap-2" {...props} />,
                code: ({node, ...props}) => (
                  <div className="relative group/code">
                    <code className="block bg-slate-950 p-4 rounded-xl text-emerald-400 font-mono text-sm border border-slate-700 overflow-x-auto my-4" {...props} />
                  </div>
                ),
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

            <div className="mt-20 pt-10 border-t border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 opacity-50">
               <div className="flex items-center gap-2">
                  <ShieldCheck size={12} className="text-slate-400" />
                  <span className="text-xs text-slate-400">Strict Data Isolation Enabled</span>
               </div>
               <div className="flex gap-6">
                  <span className="text-xs text-slate-500 flex items-center gap-1"><Database size={10} /> Firebase Rules 2025</span>
                  <span className="text-xs text-slate-500 flex items-center gap-1"><AlertCircle size={10} /> Owner-Only Access</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
