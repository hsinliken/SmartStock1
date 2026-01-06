
import React, { useEffect, useState } from 'react';
import { fetchPotentialStocks, fetchPriceViaSearch, fetchStockValuation } from '../services/geminiService';
import { StockService } from '../services/stockService';
import { DataService } from '../services/dataService';
import { POTENTIAL_STOCKS_PROMPT } from '../constants';
import { PotentialStock, AnalysisStatus, StockValuation, ViewMode, StockTransaction } from '../types';
import { 
  Loader2, Zap, TrendingUp, Target, Shield, Activity, 
  BarChart, ArrowUpCircle, ArrowDownCircle, Info, 
  Settings, ChevronDown, ChevronUp, ChevronRight, RotateCcw, 
  Save, Check, RefreshCw, AlertTriangle, Briefcase, Trophy, X,
  Calendar, DollarSign, Hash, Cpu
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
  // 安全檢查：確保 rate 有值且在 0-100 之間
  const safeRate = Math.min(Math.max(rate || 0, 0), 100);
  const offset = circumference - (safeRate / 100) * circumference;

  const getColor = (r: number) => {
    if (r >= 85) return '#fbbf24'; // amber-400 (Gold)
    if (r >= 70) return '#10b981'; // emerald-500 (Green)
    if (r >= 50) return '#06b6d4'; // cyan-500 (Blue)
    return '#64748b'; // slate-500 (Grey)
  };

  const color = getColor(safeRate);

  return (
    <div 
      onClick={onClick}
      className="relative cursor-pointer group flex items-center justify-center transition-all hover:scale-110 active:scale-95 bg-slate-900 rounded-full shadow-inner p-1 border border-slate-700"
      style={{ width: size + 8, height: size + 8 }}
      title="點擊查看勝率權重解析"
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1e293b"
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
        <span className="text-[10px] text-slate-500 font-bold leading-none mb-0.5">WIN</span>
        <span className="text-sm font-black leading-none" style={{ color }}>{safeRate > 0 ? `${safeRate}%` : 'N/A'}</span>
      </div>
      {(safeRate >= 85) && (
        <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-1 shadow-lg animate-bounce">
          <Trophy size={12} className="text-white" />
        </div>
      )}
    </div>
  );
};

interface BuyLogModalProps {
  stock: PotentialStock;
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
               <Briefcase className="text-emerald-400" /> 登錄成交紀錄
             </h3>
             <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24}/></button>
          </div>
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
             <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 font-bold uppercase">
                  {(stock.ticker || '???').split('.')[0]}
                </div>
                <div>
                   <h4 className="text-white font-bold">{stock.name || '未知股票'}</h4>
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
                   <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1"><Zap size={12}/> 總成交金額</label>
                   <div className="w-full bg-slate-900/40 border border-emerald-900/30 rounded-xl p-3 text-emerald-400 font-mono font-bold">
                     ${totalAmount.toLocaleString()}
                   </div>
                </div>
             </div>

             <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2"
             >
               {isSubmitting ? <Loader2 className="animate-spin" /> : <Check />}
               確認登錄至投資組合
             </button>
          </form>
       </div>
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
  const [logStock, setLogStock] = useState<PotentialStock | null>(null);

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
      if (data && Array.isArray(data.stocks)) {
        const sanitized = data.stocks.map((s: any): PotentialStock => {
           // 防禦性檢查：確保所有必要屬性都有預設值
           const tickerNumStr = s.ticker ? String(s.ticker).replace(/\D/g, '') : '0';
           const tickerNum = parseFloat(tickerNumStr);
           
           // 如果 winRate 是 0 或缺失，進行備用計算
           let calculatedWinRate = parseFloat(String(s.winRate)) || 0;
           if (calculatedWinRate === 0) {
              if (s.revenueGrowth > 20 && s.pegRatio < 1) calculatedWinRate = 78;
              else if (s.revenueGrowth > 10) calculatedWinRate = 65;
              else calculatedWinRate = 55;
           }
           
           // 強制補齊 winRateBreakdown 防止渲染崩潰
           const safeBreakdown = { 
             fundamentals: Math.round(s.winRateBreakdown?.fundamentals || calculatedWinRate * 0.9), 
             moneyFlow: Math.round(s.winRateBreakdown?.moneyFlow || calculatedWinRate * 0.8), 
             technicals: Math.round(s.winRateBreakdown?.technicals || calculatedWinRate * 0.85) 
           };

           return {
             ...s,
             ticker: s.ticker || 'UNKNOWN',
             name: s.name || '未知標的',
             currentPrice: (s.currentPrice === tickerNum || !s.currentPrice) ? 0 : parseFloat(String(s.currentPrice)),
             winRate: calculatedWinRate,
             winRateBreakdown: safeBreakdown,
             reason: s.reason || 'AI 正在分析中...',
             signal: s.signal || 'WAIT',
             strategy: s.strategy || 'SWING',
             takeProfit: parseFloat(String(s.takeProfit)) || 0,
             stopLoss: parseFloat(String(s.stopLoss)) || 0,
             revenueGrowth: parseFloat(String(s.revenueGrowth)) || 0,
             peRatio: parseFloat(String(s.peRatio)) || 0,
             pegRatio: parseFloat(String(s.pegRatio)) || 0,
             dividendYield: parseFloat(String(s.dividendYield)) || 0,
             rsi: parseFloat(String(s.rsi)) || 50,
             institutionalBuyDays: parseInt(String(s.institutionalBuyDays)) || 0
           };
        });
        
        const sorted = sanitized.sort((a: PotentialStock, b: PotentialStock) => b.winRate - a.winRate);
        setStocks(sorted);
        hydratePrices(sorted);
        setStatus(AnalysisStatus.SUCCESS);
      } else {
        setStatus(AnalysisStatus.ERROR);
      }
    } catch (e) {
      console.error("Critical Analysis Error:", e);
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
        
        const yahooData = stockDataList.find(y => {
            const yBase = y.symbol.split('.')[0].toUpperCase();
            return yBase === pTickerBase;
        });
        
        let finalPrice = 0;
        if (yahooData && yahooData.regularMarketPrice > 0 && yahooData.regularMarketPrice !== tickerNum) {
          finalPrice = yahooData.regularMarketPrice;
        } else {
          const searchPrice = await fetchPriceViaSearch(item.ticker);
          if (searchPrice && searchPrice > 0 && searchPrice !== tickerNum) {
            finalPrice = searchPrice;
          }
        }
        
        updatedList[i] = { ...item, currentPrice: finalPrice || item.currentPrice };
        setHydrationProgress(prev => prev ? { ...prev, current: i + 1 } : { current: i + 1, total: initialList.length });
        setStocks([...updatedList]); 
      }
    } catch (e) { 
        console.error("Hydration failed", e); 
    }
    setIsUpdating(false);
    setHydrationProgress(null);
  };

  const getStrategyLabel = (s: string) => {
    switch(s) {
      case 'SWING': return '波段策略';
      case 'GRID': return '網格交易';
      default: return s;
    }
  };

  const getSignalLabel = (s: string) => {
    switch(s) {
      case 'BUY': return '建議買入';
      case 'SELL': return '建議賣出';
      case 'HOLD': return '持續持有';
      case 'WAIT': return '觀望等待';
      default: return s;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 relative">
      {/* Breakdown Modal */}
      {selectedBreakdown && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-md transition-all">
           <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in-down">
              <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                 <h3 className="text-lg font-bold text-white flex items-center gap-2">
                   <Shield className="text-emerald-400" /> AI 波段勝率權重解析
                 </h3>
                 <button onClick={() => setSelectedBreakdown(null)} className="text-slate-400 hover:text-white p-1">
                   <X size={20} />
                 </button>
              </div>
              <div className="p-6 space-y-6">
                 <div className="flex items-center gap-5">
                    <div className="p-4 bg-slate-900 rounded-2xl border border-slate-700 shadow-inner">
                       <span className={`text-4xl font-black ${selectedBreakdown.winRate >= 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                         {selectedBreakdown.winRate > 0 ? `${selectedBreakdown.winRate}%` : '評估中'}
                       </span>
                    </div>
                    <div>
                       <p className="text-white text-lg font-bold">{selectedBreakdown.name}</p>
                       <p className="text-xs text-slate-500 font-mono">{selectedBreakdown.ticker}</p>
                       <div className="mt-1 flex gap-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-800/50 font-bold">{getStrategyLabel(selectedBreakdown.strategy)}</span>
                       </div>
                    </div>
                 </div>
                 
                 <div className="space-y-5">
                    {[
                      { label: '基本面健康度 (40%)', value: selectedBreakdown.winRateBreakdown?.fundamentals || 0, color: 'bg-blue-500', desc: '營收成長性、PEG、利潤率穩定度' },
                      { label: '籌碼面集中度 (30%)', value: selectedBreakdown.winRateBreakdown?.moneyFlow || 0, color: 'bg-purple-500', desc: '法人連續買超、成交量能配合度' },
                      { label: '技術面位階感 (30%)', value: selectedBreakdown.winRateBreakdown?.technicals || 0, color: 'bg-emerald-500', desc: '買在回調 (RSI位階)、關鍵均線支撐' }
                    ].map(item => (
                      <div key={item.label}>
                         <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-slate-300 font-medium">{item.label}</span>
                            <span className="text-white font-bold">{item.value}%</span>
                         </div>
                         <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700 shadow-inner">
                            <div 
                              className={`h-full ${item.color} transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.5)]`} 
                              style={{ width: `${item.value}%` }} 
                            />
                         </div>
                         <p className="text-[10px] text-slate-500 mt-1 italic">{item.desc}</p>
                      </div>
                    ))}
                 </div>
                 
                 <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700 text-xs text-slate-400 leading-relaxed shadow-inner">
                    <div className="flex items-start gap-2">
                      <Info size={16} className="text-blue-400 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-300 block mb-1">AI 綜合評估結論：</span>
                        {selectedBreakdown.reason}
                      </div>
                    </div>
                 </div>
              </div>
              <div className="p-4 bg-slate-900 border-t border-slate-700 flex gap-3">
                 <button 
                  onClick={() => {
                    setSelectedBreakdown(null);
                    setLogStock(selectedBreakdown);
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg active:scale-95"
                 >
                   登錄買入紀錄
                 </button>
                 <button 
                  onClick={() => setSelectedBreakdown(null)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl transition-all"
                 >
                   關閉
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Buy Log Modal */}
      {logStock && (
        <BuyLogModal 
          stock={logStock} 
          onClose={() => setLogStock(null)} 
          onSuccess={() => {
            setLogStock(null);
            onNavigate('PORTFOLIO');
          }}
        />
      )}

      {/* Header Card */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 flex items-center gap-2">
              <Zap className="text-yellow-400 fill-yellow-400" /> 
              中小型低買高賣監控
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              鎖定「買在回調、賣在超漲」的高勝率機會，由 AI 深度驗證量化指標。
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowPromptSettings(!showPromptSettings)} className={`flex items-center gap-1 text-sm px-3 py-2 rounded-lg border transition-colors ${showPromptSettings ? 'bg-blue-600/20 text-blue-400 border-blue-600/50' : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'}`}>
              <Settings size={14} /> 設定 AI {showPromptSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button onClick={getData} disabled={status === AnalysisStatus.LOADING || isUpdating} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all shadow-lg active:scale-95">
              <RefreshCw size={16} className={(status === AnalysisStatus.LOADING || isUpdating) ? 'animate-spin' : ''} />
              {status === AnalysisStatus.LOADING ? '分析中...' : isUpdating ? '驗證實價...' : '開始 AI 分析'}
            </button>
          </div>
        </div>

        {showPromptSettings && (
          <div className="mt-4 p-4 bg-slate-900/60 rounded-xl border border-slate-700 animate-fade-in-down">
             <div className="flex flex-col md:flex-row gap-4">
              <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} className="flex-1 h-32 bg-slate-800 text-slate-200 text-sm p-3 rounded-lg border border-slate-600 outline-none font-mono" />
              <button onClick={handleSavePrompt} className={`md:w-32 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isSaved ? 'bg-emerald-600 text-white' : 'bg-slate-700 hover:bg-emerald-600'}`}>
                {isSaved ? <Check size={16} /> : <Save size={16} />} {isSaved ? '已儲存' : '儲存變更'}
              </button>
            </div>
          </div>
        )}
        
        {hydrationProgress && (
           <div className="mt-4 bg-slate-900/40 rounded-lg p-3 border border-slate-700 flex items-center gap-4 shadow-inner">
              <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(hydrationProgress.current / hydrationProgress.total) * 100}%` }} />
              </div>
              <span className="text-xs text-slate-400 font-mono">驗證進度: {hydrationProgress.current}/{hydrationProgress.total}</span>
           </div>
        )}
      </div>

      {status === AnalysisStatus.LOADING ? (
        <div className="flex flex-col items-center justify-center py-24 bg-slate-800/50 rounded-2xl border border-slate-700 border-dashed">
          <Loader2 className="w-16 h-16 animate-spin mb-6 text-emerald-500" />
          <p className="animate-pulse text-xl font-black text-white tracking-widest uppercase">AI Quant Engine Analysis...</p>
          <p className="text-slate-500 text-sm mt-4 text-center">正在搜尋台股最新籌碼動向與技術位階...</p>
        </div>
      ) : status === AnalysisStatus.ERROR ? (
        <div className="flex flex-col items-center justify-center py-24 bg-red-900/10 rounded-2xl border border-red-900/30">
          <AlertTriangle className="w-16 h-16 mb-4 text-red-500" />
          <h3 className="text-xl font-bold text-white mb-2">分析失敗</h3>
          <p className="text-slate-400 text-center mb-6">AI 無法生成結構化數據，這可能是因為搜尋量過大或代碼錯誤。</p>
          <button onClick={getData} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all">重新嘗試</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {stocks.map((stock) => {
            const isBuy = stock.signal === 'BUY';
            const isSell = stock.signal === 'SELL';
            const isAdded = addedTickers.has(stock.ticker);
            const isAdding = addingTicker === stock.ticker;
            const isPriceSuspect = stock.currentPrice === parseFloat(stock.ticker.replace(/\D/g, ''));
            const isLogicError = isBuy && stock.takeProfit <= stock.currentPrice && stock.currentPrice > 0;
            const hasWinRate = (stock.winRate || 0) > 0;
            
            return (
              <div key={stock.ticker} className={`bg-slate-800 rounded-3xl border overflow-hidden shadow-2xl flex flex-col group transition-all duration-300 ${isPriceSuspect || isLogicError ? 'border-red-900 bg-red-900/5' : 'border-slate-700 hover:border-emerald-500/50 hover:shadow-emerald-500/10'}`}>
                <div className="p-6 border-b border-slate-700/50 flex justify-between items-center bg-slate-850 relative">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl shadow-lg transition-transform group-hover:scale-110 ${isBuy ? 'bg-red-900/30 text-red-400 border border-red-800/50' : isSell ? 'bg-green-900/30 text-green-400 border border-green-800/50' : 'bg-slate-700 text-slate-400 border border-slate-600'}`}>
                      {isBuy ? <ArrowUpCircle size={28} /> : isSell ? <ArrowDownCircle size={28} /> : <Activity size={28} />}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white leading-tight group-hover:text-emerald-400 transition-colors">
                        {stock.name} <span className="text-slate-500 font-mono text-sm ml-1 uppercase">{stock.ticker}</span>
                      </h3>
                      <div className="flex gap-2 mt-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 uppercase font-black tracking-widest border border-slate-600">
                           {getStrategyLabel(stock.strategy)}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border ${isBuy ? 'bg-red-900/40 text-red-400 border-red-800/50' : isSell ? 'bg-green-900/40 text-green-400 border-green-800/50' : 'bg-slate-700 text-slate-400 border border-slate-600'}`}>
                           {getSignalLabel(stock.signal)}
                        </span>
                        {!hasWinRate && (
                           <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/50 text-slate-500 border border-slate-700 flex items-center gap-1">
                              <Cpu size={10} /> 智能估值中
                           </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* WIN RATE CIRCLE */}
                  <div className="flex flex-col items-center">
                    <WinRateCircle rate={stock.winRate} onClick={() => setSelectedBreakdown(stock)} />
                    <span className="text-[8px] text-slate-500 mt-1 font-bold">AI 綜合評估</span>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-2 gap-8 border-b border-slate-700/50 bg-slate-800/30 flex-1">
                   <div className="space-y-4">
                      <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 flex items-start gap-3 shadow-inner">
                         <Info className="text-blue-400 mt-1 shrink-0" size={16} />
                         <p className="text-xs text-slate-300 leading-relaxed italic">{stock.reason || '尚無具體分析理由'}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                         <div className="text-center bg-slate-900/40 p-3 rounded-xl border border-slate-700/50 shadow-inner">
                           <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">即時行情</div>
                           <div className={`text-lg font-black font-mono ${isPriceSuspect || isLogicError ? 'text-red-500 animate-pulse' : 'text-white'}`}>${stock.currentPrice || '---'}</div>
                         </div>
                         <div className="text-center bg-slate-900/40 p-3 rounded-xl border border-slate-700/50 shadow-inner">
                           <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">停利目標</div>
                           <div className={`text-lg font-black font-mono ${isLogicError ? 'text-red-500' : 'text-emerald-400'}`}>${stock.takeProfit || 0}</div>
                         </div>
                      </div>
                      {isLogicError && (
                        <div className="flex items-center gap-2 text-[10px] text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-800/50">
                          <AlertTriangle size={14} /> 數據異常：目標價異常，請重新刷新。
                        </div>
                      )}
                   </div>
                   <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase border-b border-slate-700 pb-2 tracking-[0.2em]">量化數據分析</h4>
                      <div className="grid grid-cols-2 gap-y-3 text-sm">
                        <span className="text-slate-500">營收 YoY</span><span className="text-red-400 text-right font-bold">+{stock.revenueGrowth || 0}%</span>
                        <span className="text-slate-500">PEG Ratio</span><span className="text-emerald-400 text-right font-bold">{stock.pegRatio || '-'}</span>
                        <span className="text-slate-500">投信買超</span><span className="text-white text-right font-bold font-mono">{stock.institutionalBuyDays || 0} D</span>
                        <span className="text-slate-500">RSI (14)</span><span className="text-blue-400 text-right font-bold font-mono">{stock.rsi || '-'}</span>
                      </div>
                   </div>
                </div>
                
                <div className="p-4 bg-slate-900/50 border-t border-slate-700/50 flex justify-between px-6 items-center">
                   <div className="flex gap-4">
                     <button 
                       onClick={() => handleAddToWatchlist(stock)}
                       disabled={isAdded || isAdding || isPriceSuspect || isLogicError}
                       className={`text-sm font-bold flex items-center gap-2 transition-all ${isAdded ? 'text-slate-500 cursor-default' : isPriceSuspect || isLogicError ? 'text-slate-600 cursor-not-allowed' : 'text-blue-500 hover:text-blue-400 hover:translate-x-1'}`}
                     >
                        {isAdding ? <Loader2 size={16} className="animate-spin" /> : (isAdded ? <Check size={16} /> : <Target size={16} />)} 
                        {isAdding ? '同步中' : (isAdded ? '已在觀察' : '加入觀察')}
                     </button>
                     <button 
                       onClick={() => setLogStock(stock)}
                       disabled={isPriceSuspect || isLogicError}
                       className={`text-sm font-bold flex items-center gap-2 transition-all ${isPriceSuspect || isLogicError ? 'text-slate-600 cursor-not-allowed' : 'text-emerald-500 hover:text-emerald-400 hover:translate-x-1'}`}
                     >
                        <Briefcase size={16} /> 登錄成交
                     </button>
                   </div>
                   <button 
                    onClick={() => setSelectedBreakdown(stock)} 
                    className="text-xs text-slate-400 hover:text-white font-bold flex items-center gap-1 group/btn"
                   >
                      查看勝率解析 
                      <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                   </button>
                </div>
              </div>
            );
          })}
          {status === AnalysisStatus.IDLE && stocks.length === 0 && (
            <div className="lg:col-span-2 text-center py-24 bg-slate-800/30 rounded-3xl border border-slate-700 border-dashed">
              <div className="bg-slate-700/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart className="w-10 h-10 text-emerald-500/50" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">啟動 AI 波段偵測器</h3>
              <p className="text-slate-500 max-w-sm mx-auto">點擊開始分析以掃描台股中具備回調買入潛力的成長標的。</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
