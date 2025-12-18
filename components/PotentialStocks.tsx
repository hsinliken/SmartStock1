
import React, { useEffect, useState } from 'react';
import { fetchPotentialStocks, fetchPriceViaSearch, fetchStockValuation } from '../services/geminiService';
import { StockService } from '../services/stockService';
import { DataService } from '../services/dataService';
import { POTENTIAL_STOCKS_PROMPT } from '../constants';
import { PotentialStock, AnalysisStatus, StockValuation, ViewMode } from '../types';
import { 
  Loader2, Zap, TrendingUp, Target, Shield, Activity, 
  BarChart, ArrowUpCircle, ArrowDownCircle, Info, 
  Settings, ChevronDown, ChevronUp, RotateCcw, 
  Save, Check, RefreshCw, AlertTriangle, Briefcase, ExternalLink, Trophy, X
} from 'lucide-react';

interface WinRateCircleProps {
  rate: number;
  onClick: () => void;
}

const WinRateCircle: React.FC<WinRateCircleProps> = ({ rate, onClick }) => {
  const size = 60;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (rate / 100) * circumference;

  const getColor = (r: number) => {
    if (r >= 85) return '#fbbf24'; // amber-400 (Gold)
    if (r >= 70) return '#34d399'; // emerald-400 (Green)
    if (r >= 50) return '#22d3ee'; // cyan-400 (Blue)
    return '#94a3b8'; // slate-400 (Grey)
  };

  const color = getColor(rate);

  return (
    <div 
      onClick={onClick}
      className="relative cursor-pointer group flex items-center justify-center transition-transform hover:scale-110"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#334155"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs font-black" style={{ color }}>{rate}%</span>
      </div>
      {rate >= 85 && (
        <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 animate-bounce">
          <Trophy size={10} className="text-white" />
        </div>
      )}
    </div>
  );
};

interface PotentialStocksProps {
  stocks: PotentialStock[];
  setStocks: React.Dispatch<React.SetStateAction<PotentialStock[]>>;
  onNavigate: (view: ViewMode) => void;
}

export const PotentialStocks: React.FC<PotentialStocksProps> = ({ stocks, setStocks, onNavigate }) => {
  const [status, setStatus] = useState<AnalysisStatus>(stocks.length > 0 ? AnalysisStatus.SUCCESS : AnalysisStatus.IDLE);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hydrationProgress, setHydrationProgress] = useState<{current: number, total: number} | null>(null);
  const [addedTickers, setAddedTickers] = useState<Set<string>>(new Set());
  const [addingTicker, setAddingTicker] = useState<string | null>(null);
  const [selectedBreakdown, setSelectedBreakdown] = useState<PotentialStock | null>(null);

  const [systemPrompt, setSystemPrompt] = useState<string>(POTENTIAL_STOCKS_PROMPT);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3-pro-preview');
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const data = await DataService.loadUserData();
      setSystemPrompt(data.potentialStocksPrompt || POTENTIAL_STOCKS_PROMPT);
      setSelectedModel(data.potentialStocksModel || 'gemini-3-pro-preview');
      const watchlistTickers = new Set(data.watchlist.map(s => s.ticker));
      setAddedTickers(watchlistTickers);
      setIsLoadingPrompt(false);
    };
    loadData();
  }, []);

  const handleSavePrompt = async () => {
    setIsSaved(true);
    await DataService.savePotentialStocksSettings(systemPrompt, selectedModel);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleResetPrompt = async () => {
    if (window.confirm('確定要恢復預設指令嗎？')) {
      const defaultPrompt = POTENTIAL_STOCKS_PROMPT;
      const defaultModel = 'gemini-3-pro-preview';
      setSystemPrompt(defaultPrompt);
      setSelectedModel(defaultModel);
      await DataService.savePotentialStocksSettings(defaultPrompt, defaultModel);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleAddToWatchlist = async (stock: PotentialStock) => {
    setAddingTicker(stock.ticker);
    try {
      const fullData = await fetchStockValuation(stock.ticker, stock.name, 'gemini-2.5-flash');
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
            peRatio: stock.peRatio,
            eps: 0,
            dividendYield: stock.dividendYield,
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
        }),
        name: (fullData && fullData.name && fullData.name.length > 1) ? fullData.name : stock.name
      };

      await DataService.saveWatchlist([...currentWatchlist, newValuation]);
      setAddedTickers(prev => new Set([...prev, stock.ticker]));
    } catch (e) {
      console.error("Failed to add to watchlist:", e);
    } finally {
      setAddingTicker(null);
    }
  };

  const getData = async () => {
    setStatus(AnalysisStatus.LOADING);
    setStocks([]);
    setHydrationProgress(null);
    try {
      const data = await fetchPotentialStocks(systemPrompt, selectedModel);
      if (data && data.stocks) {
        const sorted = data.stocks.sort((a: any, b: any) => (b.winRate || 0) - (a.winRate || 0));
        const sanitized = sorted.map((s: PotentialStock) => {
           const tickerNum = parseFloat(s.ticker.replace(/\D/g, ''));
           // Ensure winRateBreakdown exists to prevent UI errors
           if (!s.winRateBreakdown) {
             s.winRateBreakdown = { fundamentals: 70, moneyFlow: 70, technicals: 70 };
           }
           if (s.currentPrice === tickerNum || s.currentPrice === 0) {
             return { ...s, currentPrice: 0 };
           }
           return s;
        });
        setStocks(sanitized);
        hydratePrices(sanitized);
        setStatus(AnalysisStatus.SUCCESS);
      } else {
        setStatus(AnalysisStatus.ERROR);
      }
    } catch (e) {
      console.error(e);
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const hydratePrices = async (initialList: PotentialStock[]) => {
    setIsUpdating(true);
    setHydrationProgress({ current: 0, total: initialList.length });
    const updatedList = [...initialList];
    const tickers = initialList.map(s => s.ticker);
    
    try {
      const stockDataList = await StockService.getBatchStockData(tickers);
      for (let i = 0; i < updatedList.length; i++) {
        const item = updatedList[i];
        const pTickerBase = item.ticker.split('.')[0].toUpperCase();
        const tickerNum = parseFloat(pTickerBase);
        const yahooData = stockDataList.find(y => y.symbol.split('.')[0].toUpperCase() === pTickerBase);
        let finalPrice = 0;
        if (yahooData && yahooData.regularMarketPrice > 0 && yahooData.regularMarketPrice !== tickerNum) {
          finalPrice = yahooData.regularMarketPrice;
        } else {
          const searchPrice = await fetchPriceViaSearch(item.ticker);
          if (searchPrice && searchPrice > 0 && searchPrice !== tickerNum) {
            finalPrice = searchPrice;
          }
        }
        updatedList[i] = { ...item, currentPrice: finalPrice };
        setHydrationProgress(prev => prev ? { ...prev, current: i + 1 } : { current: i + 1, total: initialList.length });
        setStocks([...updatedList]); 
      }
    } catch (e) { console.error("Hydration failed", e); }
    setIsUpdating(false);
    setHydrationProgress(null);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 relative">
      {/* Breakdown Modal */}
      {selectedBreakdown && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-down">
              <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                 <h3 className="text-lg font-bold text-white flex items-center gap-2">
                   <Shield className="text-emerald-400" /> AI 獲利機率模型解析
                 </h3>
                 <button onClick={() => setSelectedBreakdown(null)} className="text-slate-400 hover:text-white">
                   <X size={20} />
                 </button>
              </div>
              <div className="p-6 space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-900 rounded-xl">
                       <span className="text-3xl font-black text-amber-400">{selectedBreakdown.winRate}%</span>
                    </div>
                    <div>
                       <p className="text-white font-bold">{selectedBreakdown.name} ({selectedBreakdown.ticker})</p>
                       <p className="text-xs text-slate-400">當前交易訊號：{selectedBreakdown.signal}</p>
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                    {[
                      { label: '基本面權重 (40%)', value: selectedBreakdown.winRateBreakdown.fundamentals, color: 'bg-blue-500' },
                      { label: '籌碼面權重 (30%)', value: selectedBreakdown.winRateBreakdown.moneyFlow, color: 'bg-purple-500' },
                      { label: '技術面權重 (30%)', value: selectedBreakdown.winRateBreakdown.technicals, color: 'bg-emerald-500' }
                    ].map(item => (
                      <div key={item.label}>
                         <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">{item.label}</span>
                            <span className="text-white font-bold">{item.value}/100</span>
                         </div>
                         <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${item.color} transition-all duration-1000`} 
                              style={{ width: `${item.value}%` }} 
                            />
                         </div>
                      </div>
                    ))}
                 </div>
                 
                 <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700 text-xs text-slate-400 leading-relaxed italic">
                    <Info size={14} className="inline-block mr-2 text-emerald-500 mb-1" />
                    此機率基於 AI 深度掃描當前市場數據生成。當勝率大於 80% 時代表具備強大支撐與動能契合。
                 </div>
              </div>
              <div className="p-4 bg-slate-900 border-t border-slate-700">
                 <button 
                  onClick={() => setSelectedBreakdown(null)}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg"
                 >
                   關閉解析
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 flex items-center gap-2">
              <Zap className="text-yellow-400 fill-yellow-400" /> 
              中小型低買高賣監控 (Growth & Value)
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              結合基本面、籌碼與技術面權重，由 AI 估算「波段交易勝率」。
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowPromptSettings(!showPromptSettings)} className={`flex items-center gap-1 text-sm px-3 py-2 rounded-lg border transition-colors ${showPromptSettings ? 'bg-blue-600/20 text-blue-400 border-blue-600/50' : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'}`}>
              <Settings size={14} /> 設定 AI {showPromptSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button onClick={getData} disabled={status === AnalysisStatus.LOADING || isUpdating} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all shadow-lg active:scale-95">
              <RefreshCw size={16} className={(status === AnalysisStatus.LOADING || isUpdating) ? 'animate-spin' : ''} />
              {status === AnalysisStatus.LOADING ? '分析中...' : isUpdating ? '驗證報價...' : '重新掃描'}
            </button>
          </div>
        </div>

        {showPromptSettings && (
          <div className="mt-4 p-4 bg-slate-900/60 rounded-xl border border-slate-700 animate-fade-in-down">
             <div className="flex flex-col md:flex-row gap-4">
              <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} className="flex-1 h-32 bg-slate-800 text-slate-200 text-sm p-3 rounded-lg border border-slate-600 outline-none font-mono" />
              <button onClick={handleSavePrompt} className={`md:w-32 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isSaved ? 'bg-emerald-600 text-white' : 'bg-slate-700 hover:bg-emerald-600'}`}>
                {isSaved ? <Check size={16} /> : <Save size={16} />} {isSaved ? '已儲存' : '儲存'}
              </button>
            </div>
          </div>
        )}
        
        {hydrationProgress && (
           <div className="mt-4 bg-slate-900/40 rounded-lg p-3 border border-slate-700 flex items-center gap-4">
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(hydrationProgress.current / hydrationProgress.total) * 100}%` }} />
              </div>
              <span className="text-xs text-slate-400 font-mono">驗證報價中: {hydrationProgress.current}/{hydrationProgress.total}</span>
           </div>
        )}
      </div>

      {status === AnalysisStatus.LOADING ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-800/50 rounded-xl border border-slate-700">
          <Loader2 className="w-12 h-12 animate-spin mb-4 text-emerald-500" />
          <p className="animate-pulse text-lg text-slate-300 font-bold">AI 量化引擎計算中...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {stocks.map((stock) => {
            const isBuy = stock.signal === 'BUY';
            const isSell = stock.signal === 'SELL';
            const isAdded = addedTickers.has(stock.ticker);
            const isAdding = addingTicker === stock.ticker;
            const isPriceSuspect = stock.currentPrice === parseFloat(stock.ticker.replace(/\D/g, ''));
            
            return (
              <div key={stock.ticker} className={`bg-slate-800 rounded-2xl border overflow-hidden shadow-2xl flex flex-col group transition-all ${isPriceSuspect ? 'border-red-900/50 bg-red-900/5' : 'border-slate-700 hover:border-emerald-500/50'}`}>
                <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-850 relative">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isBuy ? 'bg-red-900/30 text-red-400' : isSell ? 'bg-green-900/30 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                      {isBuy ? <ArrowUpCircle size={24} /> : isSell ? <ArrowDownCircle size={24} /> : <Activity size={24} />}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white leading-tight">{stock.name} <span className="text-slate-500 font-mono text-xs">{stock.ticker}</span></h3>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-300 uppercase font-bold tracking-tighter border border-blue-800/50">
                          策略: {stock.strategy}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter ${isBuy ? 'bg-red-900/30 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
                          {stock.signal}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* WIN RATE CIRCLE */}
                  <WinRateCircle rate={stock.winRate} onClick={() => setSelectedBreakdown(stock)} />
                </div>

                <div className="p-5 grid grid-cols-2 gap-6 border-b border-slate-700 bg-slate-800/50 flex-1">
                   <div className="space-y-4">
                      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex items-start gap-2">
                         <Info className="text-blue-400 mt-1 shrink-0" size={14} />
                         <p className="text-xs text-slate-300 leading-relaxed italic">{stock.reason}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                         <div className="text-center bg-slate-900/30 p-2 rounded border border-slate-700">
                           <div className="text-[10px] text-slate-500 uppercase">現價</div>
                           <div className={`text-sm font-bold ${isPriceSuspect ? 'text-red-500' : 'text-white'}`}>${stock.currentPrice || '---'}</div>
                         </div>
                         <div className="text-center bg-slate-900/30 p-2 rounded border border-slate-700">
                           <div className="text-[10px] text-slate-500 uppercase">目標</div>
                           <div className="text-sm font-bold text-emerald-400">${stock.takeProfit}</div>
                         </div>
                      </div>
                   </div>
                   <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase border-b border-slate-700 pb-1">量化指標</h4>
                      <div className="grid grid-cols-2 gap-y-2 text-xs">
                        <span className="text-slate-500">營收 YoY</span><span className="text-red-400 text-right">+{stock.revenueGrowth}%</span>
                        <span className="text-slate-500">PEG</span><span className="text-emerald-400 text-right">{stock.pegRatio}</span>
                        <span className="text-slate-500">投信</span><span className="text-white text-right">{stock.institutionalBuyDays}日</span>
                        <span className="text-slate-500">RSI</span><span className="text-blue-400 text-right">{stock.rsi}</span>
                      </div>
                   </div>
                </div>
                
                <div className="p-3 bg-slate-900 border-t border-slate-700 flex justify-between px-4 items-center">
                   <button 
                     onClick={() => handleAddToWatchlist(stock)}
                     disabled={isAdded || isAdding || isPriceSuspect}
                     className={`text-xs font-bold flex items-center gap-1 transition-colors ${isAdded ? 'text-slate-500' : isPriceSuspect ? 'text-slate-600' : 'text-emerald-500 hover:text-emerald-400'}`}
                   >
                      {isAdding ? <Loader2 size={14} className="animate-spin" /> : (isAdded ? <Check size={14} /> : <Briefcase size={14} />)} 
                      {isAdding ? '加入中...' : (isAdded ? '已在觀察清單' : isPriceSuspect ? '報價異常' : '加入觀察清單')}
                   </button>
                   <button onClick={() => setSelectedBreakdown(stock)} className="text-[10px] text-blue-400 hover:underline">查看權值解析</button>
                </div>
              </div>
            );
          })}
          {status === AnalysisStatus.IDLE && stocks.length === 0 && (
            <div className="lg:col-span-2 text-center py-20 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
              <BarChart className="w-10 h-10 text-emerald-400 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-white">點擊按鈕啟動 AI 勝率分析</h3>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
