
import React, { useEffect, useState } from 'react';
import { fetchFutureCandidates, fetchPriceViaSearch, fetchStockValuation } from '../services/geminiService';
import { StockService } from '../services/stockService';
import { DataService } from '../services/dataService';
import { FUTURE_CANDIDATES_PROMPT } from '../constants';
import { FutureCandidate, AnalysisStatus, StockTransaction, ViewMode, StockValuation } from '../types';
import { 
  Loader2, TrendingUp, Award, Target, Rocket, AlertCircle, RefreshCw, Info, Settings, 
  ChevronDown, ChevronUp, RotateCcw, Save, Check, FileSpreadsheet, X, Shield, Trophy,
  Briefcase, ChevronRight, Calendar, DollarSign, Tag, Hash, Zap
} from 'lucide-react';

interface WinRateCircleProps {
  rate: number;
  onClick: () => void;
}

const WinRateCircle: React.FC<WinRateCircleProps> = ({ rate, onClick }) => {
  const size = 64;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (rate / 100) * circumference;

  const getColor = (r: number) => {
    if (r >= 80) return '#fbbf24'; // amber-400 (Top Potential)
    if (r >= 60) return '#f59e0b'; // amber-500
    if (r >= 40) return '#d97706'; // amber-600
    return '#64748b'; // slate-500
  };

  const color = getColor(rate);

  return (
    <div 
      onClick={onClick}
      className="relative cursor-pointer group flex items-center justify-center transition-all hover:scale-110 active:scale-95 bg-slate-900 rounded-full shadow-inner p-1 border border-slate-700"
      style={{ width: size + 8, height: size + 8 }}
      title="點擊查看市值晉升勝率解析"
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#1e293b" strokeWidth={strokeWidth} fill="transparent" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] text-slate-500 font-bold leading-none mb-0.5">P(50)</span>
        <span className="text-sm font-black leading-none" style={{ color }}>{rate}%</span>
      </div>
      {rate >= 80 && (
        <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-1 shadow-lg animate-bounce">
          <Trophy size={12} className="text-white" />
        </div>
      )}
    </div>
  );
};

interface BuyLogModalProps {
  stock: FutureCandidate;
  onClose: () => void;
  onSuccess: () => void;
}

const BuyLogModal: React.FC<BuyLogModalProps> = ({ stock, onClose, onSuccess }) => {
  const [qty, setQty] = useState('1000');
  const [price, setPrice] = useState(stock.currentPrice.toString());
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState(stock.reason);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalAmount = (parseFloat(price) || 0) * (parseInt(qty) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = await DataService.loadUserData();
      const newTransaction: StockTransaction = {
        id: Date.now().toString(),
        ticker: stock.ticker,
        name: stock.name,
        buyDate: date,
        buyPrice: parseFloat(price),
        buyQty: parseInt(qty),
        reason: reason,
        currentPrice: stock.currentPrice
      };
      await DataService.savePortfolio([...data.portfolio, newTransaction]);
      onSuccess();
    } catch (e) {
      alert("登錄失敗");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
       <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-down">
          <div className="p-6 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
             <h3 className="text-xl font-bold text-white flex items-center gap-2">
               <Briefcase className="text-amber-400" /> 登錄權值股佈局 (Log Purchase)
             </h3>
             <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24}/></button>
          </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
             <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
                <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-400 font-bold">
                  {stock.ticker.split('.')[0]}
                </div>
                <div>
                   <h4 className="text-white font-bold">{stock.name}</h4>
                   <p className="text-xs text-slate-500 font-mono">{stock.ticker}</p>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><Hash size={12}/> 購入股數</label>
                   <input required type="number" value={qty} onChange={e => setQty(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-mono" />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><DollarSign size={12}/> 購入單價</label>
                   <input required type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-mono" />
                </div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><Calendar size={12}/> 購入日期</label>
                   <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white" />
                </div>
                <div className="space-y-1.5">
                   {/* Fix: Added Zap to the import list from lucide-react above */}
                   <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><Zap size={12}/> 總成交金額</label>
                   <div className="w-full bg-slate-900/40 border border-amber-900/30 rounded-xl p-3 text-amber-400 font-mono font-bold">
                     ${totalAmount.toLocaleString()}
                   </div>
                </div>
             </div>
             <button type="submit" disabled={isSubmitting} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2">
               {isSubmitting ? <Loader2 className="animate-spin" /> : <Check />} 確認登錄至投資組合
             </button>
          </form>
       </div>
    </div>
  );
};

interface FutureCandidatesProps {
  candidates: FutureCandidate[];
  setCandidates: React.Dispatch<React.SetStateAction<FutureCandidate[]>>;
  onNavigate: (view: ViewMode) => void;
}

export const FutureCandidates: React.FC<FutureCandidatesProps> = ({ candidates, setCandidates, onNavigate }) => {
  const [status, setStatus] = useState<AnalysisStatus>(candidates.length > 0 ? AnalysisStatus.SUCCESS : AnalysisStatus.IDLE);
  const [priceUpdateProgress, setPriceUpdateProgress] = useState<{current: number, total: number} | null>(null);

  const [systemPrompt, setSystemPrompt] = useState<string>(FUTURE_CANDIDATES_PROMPT);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3-pro-preview');
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const [selectedBreakdown, setSelectedBreakdown] = useState<FutureCandidate | null>(null);
  const [logStock, setLogStock] = useState<FutureCandidate | null>(null);
  const [addedTickers, setAddedTickers] = useState<Set<string>>(new Set());
  const [addingTicker, setAddingTicker] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const data = await DataService.loadUserData();
      setSystemPrompt(data.futureCandidatesPrompt || FUTURE_CANDIDATES_PROMPT);
      setSelectedModel(data.futureCandidatesModel || 'gemini-3-pro-preview');
      const watchlistTickers = new Set(data.watchlist.map(s => s.ticker));
      setAddedTickers(watchlistTickers);
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

  const handleAddToWatchlist = async (stock: FutureCandidate) => {
    setAddingTicker(stock.ticker);
    try {
      const fullData = await fetchStockValuation(stock.ticker, stock.name, 'gemini-3-flash-preview');
      const userData = await DataService.loadUserData();
      const currentWatchlist = userData.watchlist;
      
      if (currentWatchlist.some(s => s.ticker === stock.ticker)) {
        setAddedTickers(prev => new Set([...prev, stock.ticker]));
        setAddingTicker(null);
        return;
      }

      const newValuation: StockValuation = {
        ...(fullData || {
            ticker: stock.ticker,
            name: stock.name,
            currentPrice: stock.currentPrice,
            changePercent: 0,
            peRatio: 0,
            eps: 0,
            dividendYield: 0,
            high52Week: 0,
            low52Week: 0,
            lastDividend: 0,
            latestQuarterlyEps: 0,
            lastFullYearEps: 0,
            cheapPrice: stock.currentPrice * 0.8,
            fairPrice: stock.currentPrice,
            expensivePrice: stock.currentPrice * 1.2,
            dividendFairPrice: null,
            estimatedYearlyFairPrice: null,
            lastUpdated: new Date().toLocaleTimeString()
        })
      };

      await DataService.saveWatchlist([...currentWatchlist, newValuation]);
      setAddedTickers(prev => new Set([...prev, stock.ticker]));
    } catch (e) {
      console.error(e);
    } finally {
      setAddingTicker(null);
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

  return (
    <div className="space-y-6 animate-fade-in pb-12 relative">
      {/* Breakdown Modal */}
      {selectedBreakdown && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md transition-all">
           <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-down">
              <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                 <h3 className="text-lg font-bold text-white flex items-center gap-2">
                   <Award className="text-amber-400" /> 市值晉升權重解析 (Top 50)
                 </h3>
                 <button onClick={() => setSelectedBreakdown(null)} className="text-slate-400 hover:text-white p-1">
                   <X size={20} />
                 </button>
              </div>
              <div className="p-6 space-y-6">
                 <div className="flex items-center gap-5">
                    <div className="p-4 bg-slate-900 rounded-2xl border border-slate-700 shadow-inner">
                       <span className={`text-4xl font-black ${selectedBreakdown.winRate >= 80 ? 'text-amber-400' : 'text-amber-500'}`}>{selectedBreakdown.winRate}%</span>
                    </div>
                    <div>
                       <p className="text-white text-lg font-bold">{selectedBreakdown.name}</p>
                       <p className="text-xs text-slate-500 font-mono">目前排名：#{selectedBreakdown.rank}</p>
                    </div>
                 </div>
                 <div className="space-y-5">
                    {[
                      { label: '排名親近度 (35%)', value: selectedBreakdown.winRateBreakdown?.rankProximity || 50, color: 'bg-blue-500', desc: '距離第 50 名排名差距' },
                      { label: '市值門檻缺口 (25%)', value: selectedBreakdown.winRateBreakdown?.marketCapGap || 50, color: 'bg-purple-500', desc: '距離晉升市值門檻缺口' },
                      { label: '成長動能權重 (40%)', value: selectedBreakdown.winRateBreakdown?.growthMomentum || 50, color: 'bg-amber-500', desc: 'EPS 及營收預估增長穩定度' }
                    ].map(item => (
                      <div key={item.label}>
                         <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-slate-300 font-medium">{item.label}</span>
                            <span className="text-white font-bold">{item.value}%</span>
                         </div>
                         <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                            <div className={`h-full ${item.color} transition-all duration-1000`} style={{ width: `${item.value}%` }} />
                         </div>
                      </div>
                    ))}
                 </div>
                 <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700 text-xs text-slate-400">
                    <span className="font-bold text-slate-300 block mb-1">晉升評估分析：</span>
                    {selectedBreakdown.reason}
                 </div>
              </div>
              <div className="p-4 bg-slate-900 border-t border-slate-700 flex gap-3">
                 <button onClick={() => { setSelectedBreakdown(null); setLogStock(selectedBreakdown); }} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg active:scale-95">登錄佈局紀錄</button>
                 <button onClick={() => setSelectedBreakdown(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl transition-all">關閉</button>
              </div>
           </div>
        </div>
      )}

      {logStock && (
        <BuyLogModal stock={logStock} onClose={() => setLogStock(null)} onSuccess={() => { setLogStock(null); onNavigate('PORTFOLIO'); }} />
      )}

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 flex items-center gap-2"><Award className="text-yellow-500" /> 未來權值 50 強 (Future 50)</h2>
            <p className="text-slate-400 text-sm mt-1">預測入選台灣 50 成份股潛力，掌握大盤權值晉升節奏。</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowPromptSettings(!showPromptSettings)} disabled={isLoadingPrompt} className={`flex items-center gap-1 text-sm px-3 py-2 rounded-lg border transition-colors ${showPromptSettings ? 'bg-amber-600/20 text-amber-400 border-amber-600/50' : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'}`}>
              <Settings size={14} /> 設定 AI {showPromptSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button onClick={getData} disabled={status === AnalysisStatus.LOADING || !!priceUpdateProgress} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-medium transition-all shadow-lg active:scale-95">
              <RefreshCw size={16} className={(status === AnalysisStatus.LOADING || !!priceUpdateProgress) ? 'animate-spin' : ''}/> 重新掃描
            </button>
          </div>
        </div>
        {showPromptSettings && (
          <div className="mt-4 p-4 bg-slate-900/60 rounded-xl border border-slate-700 animate-fade-in-down">
             <div className="flex flex-col md:flex-row gap-4 h-full">
              <div className="flex-1">
                <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} className="w-full h-40 bg-slate-800 text-slate-200 text-sm p-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-amber-500 outline-none font-mono" />
              </div>
              <div className="md:w-64 flex flex-col justify-between">
                <div>
                  <label className="text-sm font-medium text-amber-400 mb-2 block">AI 模型選擇</label>
                  <div className="space-y-2">
                    {['gemini-3-flash-preview', 'gemini-3-pro-preview'].map(m => (
                      <label key={m} className={`block p-3 rounded-lg border cursor-pointer transition-all ${selectedModel === m ? 'bg-amber-900/30 border-amber-500' : 'bg-slate-800 border-slate-600 hover:border-slate-500'}`}>
                        <input type="radio" name="model" value={m} checked={selectedModel === m} onChange={(e) => setSelectedModel(e.target.value)} className="hidden" />
                        <div className="font-bold text-white text-sm">{m}</div>
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

      {status === AnalysisStatus.LOADING ? (
        <div className="flex flex-col items-center justify-center py-24 bg-slate-800/50 rounded-2xl border border-slate-700 border-dashed">
          <Loader2 className="w-16 h-16 animate-spin mb-6 text-amber-500" />
          <p className="animate-pulse text-xl font-black text-white tracking-widest uppercase">Analyzing Top 50 Potential...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {candidates.map((stock, index) => {
            const isUpdating = priceUpdateProgress !== null && priceUpdateProgress.current <= index;
            const isAdded = addedTickers.has(stock.ticker);
            const isAdding = addingTicker === stock.ticker;
            
            return (
              <div key={stock.ticker} className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl flex flex-col group transition-all duration-300 hover:border-amber-500/50">
                <div className="p-6 border-b border-slate-700/50 flex justify-between items-center bg-slate-850">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-900/30 rounded-2xl border border-amber-800/50 text-amber-400 font-black text-xl">
                      #{stock.rank}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white">{stock.name} <span className="text-slate-500 font-mono text-sm">{stock.ticker}</span></h3>
                      <p className="text-xs text-slate-400 mt-1">{stock.industry}</p>
                    </div>
                  </div>
                  <WinRateCircle rate={stock.winRate || 50} onClick={() => setSelectedBreakdown(stock)} />
                </div>

                <div className="p-6 grid grid-cols-2 gap-8 bg-slate-800/30 flex-1">
                   <div className="space-y-4">
                      <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 italic text-xs text-slate-300">
                        {stock.reason}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                         <div className="text-center bg-slate-900/40 p-3 rounded-xl border border-slate-700/50">
                           <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">即時市值</div>
                           <div className="text-sm font-black text-white">{isUpdating ? '---' : `${stock.currentMarketCap} 億`}</div>
                         </div>
                         <div className="text-center bg-slate-900/40 p-3 rounded-xl border border-slate-700/50">
                           <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">現價</div>
                           <div className="text-sm font-black text-emerald-400">${isUpdating ? '---' : stock.currentPrice}</div>
                         </div>
                      </div>
                   </div>
                   <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase border-b border-slate-700 pb-2 tracking-widest">量化數據分析</h4>
                      <div className="grid grid-cols-2 gap-y-3 text-sm">
                        <span className="text-slate-500">預估成長</span><span className="text-red-400 text-right font-bold">+{stock.epsGrowthRate}%</span>
                        <span className="text-slate-500">營收動能</span><span className="text-amber-400 text-right font-bold">{stock.revenueMomentum}%</span>
                        <span className="text-slate-500">PEG</span><span className="text-white text-right font-bold">{stock.pegRatio}</span>
                        <span className="text-slate-500">目標價</span><span className="text-blue-400 text-right font-bold">${stock.targetPrice}</span>
                      </div>
                   </div>
                </div>

                <div className="p-4 bg-slate-900/50 border-t border-slate-700/50 flex justify-between px-6 items-center">
                   <div className="flex gap-4">
                     <button onClick={() => handleAddToWatchlist(stock)} disabled={isAdded || isAdding} className={`text-sm font-bold flex items-center gap-2 transition-all ${isAdded ? 'text-slate-500' : 'text-blue-500 hover:text-blue-400'}`}>
                        {isAdding ? <Loader2 size={16} className="animate-spin" /> : (isAdded ? <Check size={16} /> : <Target size={16} />)} 
                        {isAdding ? '同步中' : isAdded ? '已追蹤' : '加入追蹤'}
                     </button>
                     <button onClick={() => setLogStock(stock)} className="text-sm font-bold flex items-center gap-2 text-emerald-500 hover:text-emerald-400">
                        <Briefcase size={16} /> 登錄成交
                     </button>
                   </div>
                   <button onClick={() => copyFormula(stock.ticker, index)} className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1">
                     {copiedIndex === index ? <Check size={12} className="text-emerald-400" /> : <FileSpreadsheet size={12} />}
                     {copiedIndex === index ? '已複製' : 'Sheets 公式'}
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
