
import React, { useEffect, useState } from 'react';
import { fetchFutureCandidates, fetchPriceViaSearch } from '../services/geminiService';
import { StockService } from '../services/stockService';
import { DataService } from '../services/dataService';
import { FUTURE_CANDIDATES_PROMPT } from '../constants';
import { FutureCandidate, AnalysisStatus } from '../types';
import { Loader2, TrendingUp, Award, Target, Rocket, AlertCircle, RefreshCw, Info, Settings, ChevronDown, ChevronUp, RotateCcw, Save, Check, FileSpreadsheet } from 'lucide-react';

interface FutureCandidatesProps {
  candidates: FutureCandidate[];
  setCandidates: React.Dispatch<React.SetStateAction<FutureCandidate[]>>;
}

export const FutureCandidates: React.FC<FutureCandidatesProps> = ({ candidates, setCandidates }) => {
  const [status, setStatus] = useState<AnalysisStatus>(candidates.length > 0 ? AnalysisStatus.SUCCESS : AnalysisStatus.IDLE);
  const [priceUpdateProgress, setPriceUpdateProgress] = useState<{current: number, total: number} | null>(null);

  const [systemPrompt, setSystemPrompt] = useState<string>(FUTURE_CANDIDATES_PROMPT);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3-pro-preview');
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const data = await DataService.loadUserData();
      setSystemPrompt(data.futureCandidatesPrompt || FUTURE_CANDIDATES_PROMPT);
      setSelectedModel(data.futureCandidatesModel || 'gemini-3-pro-preview');
      setIsLoadingPrompt(false);
    };
    loadData();
  }, []);

  const handleSavePrompt = async () => {
    setIsSaved(true);
    await DataService.saveFutureCandidatesSettings(systemPrompt, selectedModel);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleResetPrompt = async () => {
    if (window.confirm('確定要恢復預設指令嗎？')) {
      const defaultPrompt = FUTURE_CANDIDATES_PROMPT;
      const defaultModel = 'gemini-3-pro-preview';
      setSystemPrompt(defaultPrompt);
      setSelectedModel(defaultModel);
      await DataService.saveFutureCandidatesSettings(defaultPrompt, defaultModel);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const getData = async () => {
    setStatus(AnalysisStatus.LOADING);
    setCandidates([]);
    setPriceUpdateProgress(null);
    try {
      const data = await fetchFutureCandidates(systemPrompt, selectedModel);
      if (data && data.candidates) {
        setCandidates(data.candidates);
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
    const tickers = initialList.map(item => item.ticker);

    try {
        const stockDataList = await StockService.getBatchStockData(tickers);
        for (let i = 0; i < updatedList.length; i++) {
            const item = updatedList[i];
            let price = 0;
            let mCapYi = 0;

            const yahooData = stockDataList.find(y => 
              y.symbol === item.ticker || y.symbol.includes(item.ticker) || item.ticker.includes(y.symbol)
            );
            
            if (yahooData && yahooData.regularMarketPrice) {
                price = yahooData.regularMarketPrice;
                mCapYi = Math.round(yahooData.marketCap / 100000000);
            } else {
                try {
                  const searchPrice = await fetchPriceViaSearch(item.ticker);
                  if (searchPrice) { price = searchPrice; mCapYi = item.currentMarketCap || 0; }
                } catch (err) { console.warn(`Fallback search failed for ${item.ticker}`); }
            }

            let growthRate = 10;
            if (item.epsGrowthRate !== undefined && item.epsGrowthRate !== null) {
                const parsed = parseFloat(String(item.epsGrowthRate).replace('%', ''));
                if (!isNaN(parsed) && parsed !== 0) growthRate = parsed;
            }

            if (price > 0) {
               updatedList[i] = {
                  ...item,
                  currentPrice: price,
                  currentMarketCap: mCapYi > 0 ? mCapYi : item.currentMarketCap,
                  targetPrice: Math.round(price * (1 + growthRate/100)),
               };
            } else {
               updatedList[i] = { ...item, currentPrice: -1, currentMarketCap: -1 };
            }
            setPriceUpdateProgress(prev => prev ? { ...prev, current: i + 1 } : { current: i + 1, total: initialList.length });
        }
        setCandidates([...updatedList]);
    } catch (e) { console.error("Batch update failed", e); }
    setPriceUpdateProgress(null);
  };

  const copyFormula = (ticker: string, index: number) => {
    const cleanTicker = ticker.replace(/\.TW/i, '').replace(/\.TWO/i, '').trim();
    const formula = /^\d+$/.test(cleanTicker) ? `=GOOGLEFINANCE("TPE:${cleanTicker}", "price")` : `=GOOGLEFINANCE("${cleanTicker}", "price")`;
    navigator.clipboard.writeText(formula);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (status === AnalysisStatus.LOADING) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-emerald-500" />
        <p className="animate-pulse text-lg">AI 正在掃描台股中大型股...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 flex items-center gap-2"><Award className="text-yellow-500" /> 未來權值 50 強 (Future 50)</h2>
            <div className="flex items-center gap-2 mt-1"><p className="text-slate-400 text-sm">篩選市值排名 51-80 名的潛力股，預測入選 0050 機率。</p></div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowPromptSettings(!showPromptSettings)} 
              disabled={isLoadingPrompt}
              className={`flex items-center gap-1 text-sm px-3 py-2 rounded-lg border transition-colors ${showPromptSettings ? 'bg-amber-600/20 text-amber-400 border-amber-600/50' : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'}`}
            >
              <Settings size={14} /> 設定 AI {showPromptSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button onClick={getData} disabled={!!priceUpdateProgress} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-medium transition-all shadow-lg active:scale-95">
              <RefreshCw size={16} className={!!priceUpdateProgress ? 'animate-spin' : ''}/> 重新掃描
            </button>
          </div>
        </div>

        {showPromptSettings && (
          <div className="mt-4 p-4 bg-slate-900/60 rounded-xl border border-slate-700 animate-fade-in-down">
             <div className="flex flex-col md:flex-row gap-4 h-full">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-amber-400">未來 50 強篩選邏輯 (System Prompt)</label>
                  <button onClick={handleResetPrompt} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
                    <RotateCcw size={12} /> 恢復預設
                  </button>
                </div>
                <textarea 
                  value={systemPrompt} 
                  onChange={(e) => setSystemPrompt(e.target.value)} 
                  className="w-full h-40 bg-slate-800 text-slate-200 text-sm p-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-amber-500 outline-none font-mono" 
                />
              </div>
              <div className="md:w-64 flex flex-col justify-between">
                <div>
                  <label className="text-sm font-medium text-amber-400 mb-2 block">AI 模型選擇</label>
                  <div className="space-y-2">
                    {['gemini-2.5-flash', 'gemini-3-pro-preview'].map(m => (
                      <label key={m} className={`block p-3 rounded-lg border cursor-pointer transition-all ${selectedModel === m ? 'bg-amber-900/30 border-amber-500' : 'bg-slate-800 border-slate-600 hover:border-slate-500'}`}>
                        <input type="radio" name="model" value={m} checked={selectedModel === m} onChange={(e) => setSelectedModel(e.target.value)} className="hidden" />
                        <div className="font-bold text-white text-sm">{m === 'gemini-3-pro-preview' ? 'Gemini 3 Pro' : 'Gemini 2.5 Flash'}</div>
                        <div className="text-[10px] text-slate-400">{m === 'gemini-3-pro-preview' ? '分析更精準但速度稍慢' : '平衡速度與效能'}</div>
                      </label>
                    ))}
                  </div>
                </div>
                <button onClick={handleSavePrompt} className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isSaved ? 'bg-emerald-600 text-white' : 'bg-slate-700 hover:bg-emerald-600'}`}>
                  {isSaved ? <Check size={16} /> : <Save size={16} />} {isSaved ? '已儲存' : '儲存設定'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {candidates.map((stock, index) => {
          const isUpdating = priceUpdateProgress !== null && priceUpdateProgress.current <= index;
          return (
            <div key={stock.ticker} className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg relative p-6 group hover:border-amber-500/50 transition-all">
               <div className="flex items-center gap-4">
                  <span className="text-2xl font-black text-slate-500 group-hover:text-amber-500 transition-colors">#{stock.rank}</span>
                  <div>
                    <h3 className="text-xl font-bold text-white">{stock.name} <span className="text-slate-500 text-sm font-mono">{stock.ticker}</span></h3>
                    <p className="text-xs text-slate-400">{stock.industry}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-lg font-bold text-emerald-400">{isUpdating ? '---' : `$${stock.currentPrice > 0 ? stock.currentPrice : '---'}`}</div>
                    <div className="text-xs text-slate-500">MCap: {stock.currentMarketCap > 0 ? stock.currentMarketCap : '---'}億</div>
                  </div>
               </div>
               
               <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3 bg-slate-900/50 p-3 rounded border border-slate-700 text-sm text-slate-300 italic">
                    <Info size={14} className="inline-block mr-2 text-amber-500 mb-1" />
                    {stock.reason}
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded border border-slate-700 flex flex-col justify-center items-center">
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">預估增長 (YoY)</div>
                    <div className="text-lg font-black text-red-400">+{stock.epsGrowthRate}%</div>
                  </div>
               </div>

               <div className="mt-4 flex items-center justify-between">
                  <div className="flex gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">PEG Ratio</span>
                      <span className={`text-sm font-bold ${stock.pegRatio < 1 ? 'text-emerald-400' : 'text-slate-300'}`}>{stock.pegRatio}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">營收動能</span>
                      <span className="text-sm font-bold text-slate-300">{stock.revenueMomentum}%</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => copyFormula(stock.ticker, index)}
                    className="flex items-center gap-1 text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded transition-colors"
                  >
                    {copiedIndex === index ? <Check size={10} className="text-emerald-400" /> : <FileSpreadsheet size={10} />}
                    {copiedIndex === index ? '已複製公式' : 'Google Sheets 公式'}
                  </button>
               </div>
            </div>
          );
        })}
        {status === AnalysisStatus.IDLE && candidates.length === 0 && (
          <div className="text-center py-20 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
            <Rocket className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-30" />
            <h3 className="text-xl font-bold text-slate-400">尚未執行掃描</h3>
            <p className="text-slate-500 mt-2">點擊右上方按鈕開始搜尋潛在權值股</p>
          </div>
        )}
      </div>
    </div>
  );
};
