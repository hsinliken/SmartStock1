
import React, { useEffect, useState } from 'react';
import { fetchFutureCandidates, fetchStockValuation } from '../services/geminiService';
import { DataService } from '../services/dataService';
import { FUTURE_CANDIDATES_PROMPT } from '../constants';
import { FutureCandidate, AnalysisStatus } from '../types';
import { Loader2, TrendingUp, Award, Target, Rocket, AlertCircle, RefreshCw, Info, Settings, ChevronDown, ChevronUp, RotateCcw, Save, Check, FileSpreadsheet } from 'lucide-react';

export const FutureCandidates: React.FC = () => {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [candidates, setCandidates] = useState<FutureCandidate[]>([]);
  const [priceUpdateProgress, setPriceUpdateProgress] = useState<{current: number, total: number} | null>(null);

  // Prompt Settings State
  const [systemPrompt, setSystemPrompt] = useState<string>(FUTURE_CANDIDATES_PROMPT);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3-pro-preview');
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true);

  // Copy State
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Load Prompt
  useEffect(() => {
    const loadData = async () => {
      const data = await DataService.loadUserData();
      setSystemPrompt(data.futureCandidatesPrompt);
      setSelectedModel(data.futureCandidatesModel || 'gemini-3-pro-preview');
      setIsLoadingPrompt(false);
    };
    loadData();
  }, []);

  const handleSavePrompt = async () => {
    setIsSaved(true); // Optimistic UI
    await DataService.saveFutureCandidatesSettings(systemPrompt, selectedModel);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleResetPrompt = async () => {
    if (window.confirm('確定要恢復預設的指令與模型嗎？您的自定義修改將會遺失。')) {
      const defaultPrompt = FUTURE_CANDIDATES_PROMPT;
      const defaultModel = 'gemini-3-pro-preview';
      setSystemPrompt(defaultPrompt);
      setSelectedModel(defaultModel);
      await DataService.saveFutureCandidatesSettings(defaultPrompt, defaultModel);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  // Main Logic: 2-Stage Fetching
  const getData = async () => {
    setStatus(AnalysisStatus.LOADING);
    setCandidates([]);
    setPriceUpdateProgress(null);

    try {
      // Stage 1: Get the list (names only, prices are 0)
      const data = await fetchFutureCandidates(systemPrompt, selectedModel);
      
      if (data && data.candidates) {
        setCandidates(data.candidates);
        
        // Stage 2: Sub-routine to update prices individually
        updateCandidatePrices(data.candidates);
        setStatus(AnalysisStatus.SUCCESS);
      } else {
        setStatus(AnalysisStatus.ERROR);
      }
    } catch (e) {
      console.error(e);
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const updateCandidatePrices = async (initialList: FutureCandidate[]) => {
    setPriceUpdateProgress({ current: 0, total: initialList.length });
    const updatedList = [...initialList];

    // Process individually to ensure accuracy (Gemini is better at "One Ticker" queries)
    for (let i = 0; i < initialList.length; i++) {
      const item = initialList[i];
      try {
        // Use the existing robust stock valuation fetcher
        const marketData = await fetchStockValuation(item.ticker, undefined, 'gemini-2.5-flash');
        
        if (marketData) {
          updatedList[i] = {
            ...item,
            currentPrice: marketData.currentPrice || 0,
            currentMarketCap: marketData.marketCap || 0,
            targetPrice: marketData.currentPrice ? Math.round(marketData.currentPrice * (1 + (item.epsGrowthRate || 10)/100)) : 0,
            // Re-calc projected cap logic here if needed, or leave to render
          };
          setCandidates([...updatedList]); // Trigger re-render per item
        }
      } catch (e) {
        console.error(`Failed to update price for ${item.ticker}`, e);
      }
      setPriceUpdateProgress(prev => prev ? { ...prev, current: i + 1 } : null);
    }
    setPriceUpdateProgress(null); // Done
  };

  const generateGoogleFinanceFormula = (ticker: string) => {
    // Simple heuristic for Taiwan stocks: Remove .TW and prepend TPE:
    const cleanTicker = ticker.replace(/\.TW/i, '').replace(/\.TWO/i, '').trim();
    
    // Check if it looks like a Taiwan stock code (digits)
    if (/^\d+$/.test(cleanTicker)) {
      return `=GOOGLEFINANCE("TPE:${cleanTicker}", "price")`;
    }
    // Fallback/Default
    return `=GOOGLEFINANCE("${cleanTicker}", "price")`;
  };

  const copyFormula = (ticker: string, index: number) => {
    const formula = generateGoogleFinanceFormula(ticker);
    navigator.clipboard.writeText(formula);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (status === AnalysisStatus.LOADING) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-emerald-500" />
        <p className="animate-pulse text-lg">AI 正在掃描台股中大型股 (市值榜 51-80 名)...</p>
        <p className="text-sm mt-2 text-slate-500">正在篩選市值 &gt; 1500 億的潛力名單 ({selectedModel})</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 flex items-center gap-2">
              <Award className="text-yellow-500" />
              未來權值 50 強 (Future 50)
            </h2>
            <div className="flex items-center gap-2 mt-1">
               <p className="text-slate-400 text-sm">
                 篩選市值排名 51-80 名，市值 &gt; 1500 億的潛力股，預測入選 0050 機率。
               </p>
               {priceUpdateProgress && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded-full animate-pulse border border-emerald-800">
                    <RefreshCw size={10} className="animate-spin" />
                    更新即時股價中 ({priceUpdateProgress.current}/{priceUpdateProgress.total})
                  </span>
               )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPromptSettings(!showPromptSettings)}
              disabled={isLoadingPrompt}
              className={`flex items-center gap-1 text-sm px-3 py-2 rounded-lg border transition-colors ${
                showPromptSettings 
                  ? 'bg-amber-600/20 text-amber-400 border-amber-600/50' 
                  : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
              }`}
            >
              <Settings size={14} />
              設定 AI
              {showPromptSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button 
              onClick={getData}
              disabled={!!priceUpdateProgress}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors text-sm font-medium"
            >
              <RefreshCw size={16} className={!!priceUpdateProgress ? 'animate-spin' : ''}/> 
              {!!priceUpdateProgress ? '分析中...' : '重新掃描'}
            </button>
          </div>
        </div>

        {/* Prompt Settings Panel */}
        {showPromptSettings && (
          <div className="mt-4 mb-2 p-4 bg-slate-900/60 rounded-xl border border-slate-700 animate-fade-in">
             <div className="flex flex-col md:flex-row gap-4 h-full">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-amber-400">
                    AI 篩選邏輯與指令 (System Prompt)
                  </label>
                  <button 
                    onClick={handleResetPrompt}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    <RotateCcw size={12} />
                    恢復預設值
                  </button>
                </div>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full h-40 bg-slate-800 text-slate-200 text-sm p-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none font-mono"
                  placeholder="輸入您希望 AI 遵循的篩選邏輯..."
                />
              </div>

              {/* Model Selection */}
              <div className="md:w-64 flex flex-col justify-between">
                <div>
                  <label className="text-sm font-medium text-amber-400 mb-2 block">
                    選擇 AI 模型
                  </label>
                  <div className="space-y-2">
                    <label className={`block p-3 rounded-lg border cursor-pointer transition-all ${selectedModel === 'gemini-2.5-flash' ? 'bg-emerald-900/30 border-emerald-500' : 'bg-slate-800 border-slate-600 hover:border-slate-500'}`}>
                      <input 
                        type="radio" 
                        name="future_model" 
                        value="gemini-2.5-flash" 
                        checked={selectedModel === 'gemini-2.5-flash'} 
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="hidden"
                      />
                      <div className="font-bold text-white text-sm">Gemini 2.5 Flash</div>
                      <div className="text-xs text-slate-400">速度快，省 Token</div>
                    </label>
                    <label className={`block p-3 rounded-lg border cursor-pointer transition-all ${selectedModel === 'gemini-3-pro-preview' ? 'bg-purple-900/30 border-purple-500' : 'bg-slate-800 border-slate-600 hover:border-slate-500'}`}>
                      <input 
                        type="radio" 
                        name="future_model" 
                        value="gemini-3-pro-preview" 
                        checked={selectedModel === 'gemini-3-pro-preview'} 
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="hidden"
                      />
                      <div className="font-bold text-white text-sm">Gemini 3.0 Pro</div>
                      <div className="text-xs text-slate-400">推理強，建議使用 (預設)</div>
                    </label>
                  </div>
                </div>
                
                <button 
                  onClick={handleSavePrompt}
                  className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isSaved 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-700 hover:bg-emerald-600 text-white'
                  }`}
                >
                  {isSaved ? <Check size={16} /> : <Save size={16} />}
                  {isSaved ? '已儲存' : '儲存設定'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {status === AnalysisStatus.ERROR && (
        <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-xl text-center text-red-400">
          <AlertCircle className="mx-auto mb-2" />
          分析失敗，請檢查 API 連線或稍後再試。
        </div>
      )}

      {status === AnalysisStatus.IDLE && candidates.length === 0 && (
        <div className="text-center py-20 bg-slate-800 rounded-xl border border-slate-700 border-dashed">
          <Rocket className="w-16 h-16 mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400 text-lg">尚未進行分析</p>
          <button 
              onClick={getData}
              className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-full text-white transition-colors text-sm font-bold shadow-lg"
            >
              開始 AI 掃描
          </button>
        </div>
      )}

      {/* Candidates List */}
      <div className="grid grid-cols-1 gap-6">
        {candidates.map((stock, index) => {
          const isPegGood = stock.pegRatio < 1;
          const isPegHigh = stock.pegRatio > 2;
          
          // --- FRONTEND CALCULATION LOGIC ---
          // Rule: Projected Cap = Current Cap * (1 + Growth). 
          // Cap the Growth at 30% (0.3) max to be conservative.
          const rawMomentum = stock.revenueMomentum || 0;
          const conservativeGrowth = Math.min(Math.max(rawMomentum, 0), 30); // Max 30%
          const projectedMarketCap = Math.round(stock.currentMarketCap * (1 + conservativeGrowth / 100));
          // ----------------------------------

          // While updating, currentMarketCap might be 0.
          const isUpdating = stock.currentMarketCap === 0;

          return (
            <div key={stock.ticker} className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg relative group/card">
              {/* Rank Badge */}
              <div className="absolute top-0 left-0 bg-slate-900/80 backdrop-blur border-r border-b border-slate-700 px-4 py-2 rounded-br-xl rounded-tl-xl z-20 flex items-center gap-2">
                <span className={`text-xl font-black ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-500'}`}>
                  #{stock.rank}
                </span>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Potential Rank</span>
              </div>

              {/* Increased top padding (pt-16) for mobile and left padding (md:pl-60) for desktop to prevent overlapping */}
              <div className="p-6 pt-16 md:pt-6 md:pl-60 grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
                
                {/* Basic Info */}
                <div className="md:col-span-3 flex flex-col justify-center">
                  <div className="flex items-baseline gap-2 mb-1">
                    <h3 className="text-2xl font-bold text-white">{stock.name}</h3>
                    <span className="text-slate-500 font-mono">{stock.ticker}</span>
                  </div>
                  <span className="inline-block px-2 py-1 bg-slate-700 rounded text-xs text-slate-300 w-fit mb-4">
                    {stock.industry}
                  </span>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <div className="text-slate-500 text-xs">目前股價</div>
                      <div className="text-white font-mono font-bold">
                        {isUpdating ? <span className="text-slate-500 animate-pulse">更新中...</span> : `$${stock.currentPrice}`}
                      </div>
                    </div>
                    <div>
                      {/* Target Price Tooltip */}
                      <div className="group flex items-center gap-1 cursor-help relative w-fit">
                         <div className="text-slate-500 text-xs border-b border-dotted border-slate-500">目標價 (推估)</div>
                         <Info size={10} className="text-slate-600 group-hover:text-emerald-400"/>
                         
                         <div className="absolute bottom-full left-0 mb-2 w-56 p-3 bg-slate-900 border border-slate-600 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                            <div className="font-bold text-white mb-1 text-xs border-b border-slate-700 pb-1">AI 目標價模型</div>
                            <p className="text-[10px] text-slate-400 mb-1 font-mono">公式 = 目前 EPS × (1 + 成長率) × 目標本益比</p>
                            <p className="text-[11px] text-emerald-300 leading-tight">
                              基於公司未來的獲利爆發力，所推算的未來 12 個月合理目標價。
                            </p>
                         </div>
                      </div>
                      <div className="text-emerald-400 font-mono font-bold flex items-center">
                        {isUpdating ? <span className="text-slate-500 animate-pulse">...</span> : `$${stock.targetPrice}`}
                        <TrendingUp size={12} className="ml-1"/>
                      </div>
                    </div>
                  </div>

                  {/* Copy G-Sheet Formula Button */}
                  <button 
                    onClick={() => copyFormula(stock.ticker, index)}
                    className="flex items-center gap-2 text-xs bg-green-900/20 hover:bg-green-900/40 text-green-400 border border-green-800 rounded px-2 py-1.5 transition-colors w-fit"
                    title="複製 GOOGLEFINANCE 函數到剪貼簿"
                  >
                    {copiedIndex === index ? (
                       <>
                         <Check size={12} /> 已複製
                       </>
                    ) : (
                       <>
                         <FileSpreadsheet size={12} /> 複製 G-Sheet 函數
                       </>
                    )}
                  </button>
                </div>

                {/* Market Cap & Growth Logic */}
                <div className="md:col-span-4 flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-700 pt-4 md:pt-0 md:pl-6">
                   <div className="mb-4">
                     <div className="flex justify-between text-xs text-slate-400 mb-1">
                       <span>目前市值</span>
                       <div className="flex items-center gap-1 group relative cursor-help">
                          <span>預估市值 (YoY)</span>
                          <Info size={10} />
                          <div className="absolute bottom-full right-0 mb-2 w-56 p-3 bg-slate-900 border border-slate-600 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                            <div className="font-bold text-white mb-1 text-xs border-b border-slate-700 pb-1">保守估算模型</div>
                            <p className="text-[10px] text-slate-400 mb-1 font-mono">公式 = 現有市值 × (1 + 營收動能%)</p>
                            <p className="text-[11px] text-amber-300 leading-tight">
                              * 為避免過度樂觀，營收動能上限強制設定為 30%。即使動能超過 100%，計算時仍以 30% 為限。
                            </p>
                          </div>
                       </div>
                     </div>
                     <div className="flex items-end gap-2">
                       <span className="text-xl font-bold text-white">
                         {isUpdating ? '---' : `${stock.currentMarketCap}億`}
                       </span>
                       <Rocket size={16} className="text-slate-500 mb-1.5"/>
                       <span className="text-xl font-bold text-emerald-400">
                         {isUpdating ? '---' : `${projectedMarketCap}億`}
                       </span>
                     </div>
                     {!isUpdating && (
                       <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                         <div 
                           className="bg-emerald-500 h-full rounded-full" 
                           style={{ width: `${Math.min((stock.currentMarketCap / projectedMarketCap) * 100, 100)}%` }}
                         ></div>
                       </div>
                     )}
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       {/* EPS Growth Tooltip */}
                       <div className="group flex items-center gap-1 cursor-help relative w-fit mb-1">
                          <div className="text-xs text-slate-500 border-b border-dotted border-slate-500">EPS 成長率</div>
                          <Info size={10} className="text-slate-600 group-hover:text-red-400"/>
                          
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-900 border border-slate-600 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                            <div className="font-bold text-white mb-1 text-xs border-b border-slate-700 pb-1">每股盈餘成長率 (YoY)</div>
                            <p className="text-[10px] text-slate-400 mb-1 font-mono">公式 = (今年預估EPS - 去年EPS) ÷ 去年EPS</p>
                            <p className="text-[11px] text-red-300 leading-tight">
                              高成長率代表公司獲利能力快速提升，是股價與市值攀升的核心動能。
                            </p>
                          </div>
                       </div>
                       <div className="text-red-400 font-bold">+{stock.epsGrowthRate}%</div>
                     </div>
                     <div>
                       {/* Revenue Momentum Tooltip */}
                       <div className="group flex items-center gap-1 cursor-help relative w-fit mb-1">
                          <div className="text-xs text-slate-500 border-b border-dotted border-slate-500">營收動能</div>
                          <Info size={10} className="text-slate-600 group-hover:text-red-400"/>
                          
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-900 border border-slate-600 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                            <div className="font-bold text-white mb-1 text-xs border-b border-slate-700 pb-1">營收成長動能</div>
                            <p className="text-[10px] text-slate-400 mb-1 font-mono">觀察指標：月營收或季營收的年增率 (YoY)</p>
                            <p className="text-[11px] text-red-300 leading-tight">
                              反映市場對產品的需求熱度。注意：此數值在計算預估市值時設有 30% 上限。
                            </p>
                          </div>
                       </div>
                       <div className="text-red-400 font-bold">+{stock.revenueMomentum}%</div>
                     </div>
                   </div>
                </div>

                {/* PEG & Reasoning */}
                <div className="md:col-span-5 flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-700 pt-4 md:pt-0 md:pl-6">
                  <div className="flex items-center justify-between mb-3 relative">
                    <div className="group flex items-center gap-1 cursor-help relative">
                      <span className="text-xs text-slate-400 font-bold uppercase border-b border-dotted border-slate-500">PEG 指標 (本益成長比)</span>
                      <Info size={14} className="text-slate-500 group-hover:text-emerald-400 transition-colors"/>
                      
                      {/* Tooltip (Fixed clipping by removing overflow-hidden on parent) */}
                      <div className="absolute bottom-full right-0 md:right-auto md:left-0 mb-2 w-64 p-4 bg-slate-900 border border-slate-600 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none transform translate-y-2 group-hover:translate-y-0">
                        <div className="font-bold text-white mb-2 text-sm border-b border-slate-700 pb-2">本益成長比 (PEG)</div>
                        <p className="text-xs text-slate-400 mb-2 font-mono">公式 = 本益比 / 稅後淨利成長率</p>
                        <ul className="space-y-1.5 text-xs">
                          <li className="flex justify-between"><span className="text-emerald-400 font-bold">PEG &lt; 0.75</span> <span>股價強力低估 (買進)</span></li>
                          <li className="flex justify-between"><span className="text-green-300 font-bold">PEG &lt; 1.0</span> <span>股價被低估</span></li>
                          <li className="flex justify-between"><span className="text-yellow-400 font-bold">PEG ≈ 1.0</span> <span>股價合理</span></li>
                          <li className="flex justify-between"><span className="text-red-400 font-bold">PEG &gt; 1.2</span> <span>股價偏高</span></li>
                        </ul>
                        <div className="absolute bottom-[-6px] left-4 w-3 h-3 bg-slate-900 border-r border-b border-slate-600 transform rotate-45"></div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      isPegGood ? 'bg-green-900/50 text-green-400 border border-green-700' : 
                      isPegHigh ? 'bg-red-900/50 text-red-400 border border-red-700' : 'bg-yellow-900/50 text-yellow-400 border border-yellow-700'
                    }`}>
                      {stock.pegRatio} {isPegGood ? '(低估)' : isPegHigh ? '(高估)' : '(合理)'}
                    </span>
                  </div>
                  
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                    <div className="flex items-start gap-2">
                      <Target className="text-emerald-500 mt-0.5 shrink-0" size={14} />
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {stock.reason}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
