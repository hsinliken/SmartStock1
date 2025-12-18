
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
      setSystemPrompt(data.futureCandidatesPrompt);
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
          <button onClick={getData} disabled={!!priceUpdateProgress} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-medium"><RefreshCw size={16} className={!!priceUpdateProgress ? 'animate-spin' : ''}/> 重新掃描</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {candidates.map((stock, index) => {
          const isUpdating = priceUpdateProgress !== null && priceUpdateProgress.current <= index;
          return (
            <div key={stock.ticker} className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg relative p-6">
               <div className="flex items-center gap-4">
                  <span className="text-2xl font-black text-slate-500">#{stock.rank}</span>
                  <div>
                    <h3 className="text-xl font-bold text-white">{stock.name} <span className="text-slate-500 text-sm">{stock.ticker}</span></h3>
                    <p className="text-xs text-slate-400">{stock.industry}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-lg font-bold text-emerald-400">{isUpdating ? '---' : `$${stock.currentPrice}`}</div>
                    <div className="text-xs text-slate-500">MCap: {stock.currentMarketCap}億</div>
                  </div>
               </div>
               <div className="mt-4 bg-slate-900/50 p-3 rounded border border-slate-700 text-sm text-slate-300">
                  {stock.reason}
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
