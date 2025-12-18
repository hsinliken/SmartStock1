
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
  Save, Check, RefreshCw, AlertTriangle, Briefcase, ExternalLink
} from 'lucide-react';

interface PotentialStocksProps {
  stocks: PotentialStock[];
  setStocks: React.Dispatch<React.SetStateAction<PotentialStock[]>>;
  onNavigate: (view: ViewMode) => void;
}

export const PotentialStocks: React.FC<PotentialStocksProps> = ({ stocks, setStocks, onNavigate }) => {
  const [status, setStatus] = useState<AnalysisStatus>(stocks.length > 0 ? AnalysisStatus.SUCCESS : AnalysisStatus.IDLE);
  const [isUpdating, setIsUpdating] = useState(false);
  const [addedTickers, setAddedTickers] = useState<Set<string>>(new Set());
  const [addingTicker, setAddingTicker] = useState<string | null>(null);

  const [systemPrompt, setSystemPrompt] = useState<string>(POTENTIAL_STOCKS_PROMPT);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3-pro-preview');
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true);

  // Load Prompt settings & check existing watchlist on mount
  useEffect(() => {
    const loadData = async () => {
      const data = await DataService.loadUserData();
      setSystemPrompt(data.potentialStocksPrompt || POTENTIAL_STOCKS_PROMPT);
      setSelectedModel(data.potentialStocksModel || 'gemini-3-pro-preview');
      
      // Sync addedTickers with watchlist
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
      // Pass the stock.name as a hint to prevent AI hallucinations (like 2439.TW -> 中華電)
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
        // Double-check: If AI returned a weird name, use the one from our scanning phase
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
    try {
      const data = await fetchPotentialStocks(systemPrompt, selectedModel);
      if (data && data.stocks) {
        setStocks(data.stocks);
        hydratePrices(data.stocks);
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
    const updatedList = [...initialList];
    const tickers = initialList.map(s => s.ticker);
    
    try {
      const stockDataList = await StockService.getBatchStockData(tickers);
      for (let i = 0; i < updatedList.length; i++) {
        const item = updatedList[i];
        const yahooData = stockDataList.find(y => 
          y.symbol === item.ticker || 
          y.symbol.split('.')[0] === item.ticker.split('.')[0]
        );

        if (yahooData && yahooData.regularMarketPrice > 0) {
          updatedList[i] = { ...item, currentPrice: yahooData.regularMarketPrice };
        } else {
          const searchPrice = await fetchPriceViaSearch(item.ticker);
          if (searchPrice && searchPrice > 0) {
            updatedList[i] = { ...item, currentPrice: searchPrice };
          }
        }
      }
      setStocks([...updatedList]);
    } catch (e) {
      console.error("Hydration failed", e);
    }
    setIsUpdating(false);
  };

  const showLogic = (title: string, price: number, reason: string) => {
      alert(`【${title}】: $${price}\n策略邏輯: ${reason}`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Card */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 flex items-center gap-2">
              <Zap className="text-yellow-400 fill-yellow-400" /> 
              中小型低買高賣監控 (Growth & Value)
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              結合基本面篩選與籌碼驗證，鎖定「買在回調、賣在超漲」的高勝率機會。
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowPromptSettings(!showPromptSettings)} 
              className={`flex items-center gap-1 text-sm px-3 py-2 rounded-lg border transition-colors ${showPromptSettings ? 'bg-blue-600/20 text-blue-400 border-blue-600/50' : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'}`}
            >
              <Settings size={14} /> 設定 AI {showPromptSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button 
              onClick={getData} 
              disabled={status === AnalysisStatus.LOADING}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all shadow-lg active:scale-95"
            >
              <RefreshCw size={16} className={status === AnalysisStatus.LOADING ? 'animate-spin' : ''} />
              {status === AnalysisStatus.LOADING ? '掃描中...' : '重新掃描'}
            </button>
          </div>
        </div>

        {showPromptSettings && (
          <div className="mt-4 p-4 bg-slate-900/60 rounded-xl border border-slate-700 animate-fade-in-down">
             <div className="flex flex-col md:flex-row gap-4 h-full">
              <div className="flex-1">
                <textarea 
                  value={systemPrompt} 
                  onChange={(e) => setSystemPrompt(e.target.value)} 
                  className="w-full h-40 bg-slate-800 text-slate-200 text-sm p-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none font-mono" 
                />
              </div>
              <div className="md:w-64">
                <button onClick={handleSavePrompt} className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isSaved ? 'bg-emerald-600 text-white' : 'bg-slate-700 hover:bg-emerald-600'}`}>
                  {isSaved ? <Check size={16} /> : <Save size={16} />} {isSaved ? '已儲存' : '儲存設定'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {status === AnalysisStatus.LOADING ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-800/50 rounded-xl border border-slate-700">
          <Loader2 className="w-12 h-12 animate-spin mb-4 text-emerald-500" />
          <p className="animate-pulse text-lg text-slate-300">AI 量化引擎正在篩選中小型成長股...</p>
        </div>
      ) : (
        <>
          {status === AnalysisStatus.IDLE && stocks.length === 0 && (
            <div className="text-center py-20 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
              <BarChart className="w-10 h-10 text-emerald-400 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-white">點擊按鈕啟動 AI 篩選引擎</h3>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {stocks.map((stock) => {
              const isBuy = stock.signal === 'BUY';
              const isSell = stock.signal === 'SELL';
              const isAdded = addedTickers.has(stock.ticker);
              const isAdding = addingTicker === stock.ticker;
              const hasPrice = stock.currentPrice > 0;
              
              return (
                <div key={stock.ticker} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl flex flex-col group transition-all hover:border-emerald-500/50">
                  <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-850">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isBuy ? 'bg-red-900/30 text-red-400' : isSell ? 'bg-green-900/30 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                        {isBuy ? <ArrowUpCircle size={24} /> : isSell ? <ArrowDownCircle size={24} /> : <Activity size={24} />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white leading-tight">{stock.name} <span className="text-slate-500 font-mono text-xs">{stock.ticker}</span></h3>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 uppercase font-bold tracking-tighter">Small-Cap</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter ${stock.strategy === 'SWING' ? 'bg-purple-900/30 text-purple-400' : 'bg-blue-900/30 text-blue-400'}`}>{stock.strategy}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-white font-mono">
                        {hasPrice ? `$${stock.currentPrice}` : '無報價'}
                      </div>
                      <div className={`text-xs font-bold ${isBuy ? 'text-red-400' : isSell ? 'text-green-400' : 'text-slate-400'}`}>
                        SIGNAL: {stock.signal}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 grid grid-cols-2 gap-6 border-b border-slate-700 bg-slate-800/50 flex-1">
                     <div className="space-y-4">
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 flex items-start gap-2">
                           <Info className="text-blue-400 mt-1 shrink-0" size={14} />
                           <p className="text-xs text-slate-300 leading-relaxed italic">{stock.reason}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                           <div 
                             onClick={() => showLogic('停利點目標', stock.takeProfit, '基於預期成長動能與壓力位設定之獲利目標。')}
                             className="text-center bg-slate-900/30 p-2 rounded border border-slate-700 cursor-pointer hover:bg-slate-700 transition-colors"
                           >
                             <div className="text-[10px] text-slate-500 uppercase">停利</div>
                             <div className="text-xs font-bold text-emerald-400">${stock.takeProfit}</div>
                           </div>
                           <div 
                             onClick={() => showLogic('停損點位', stock.stopLoss, '若跌破此價位，代表趨勢轉弱或關鍵支撐失守。')}
                             className="text-center bg-slate-900/30 p-2 rounded border border-slate-700 cursor-pointer hover:bg-slate-700 transition-colors"
                           >
                             <div className="text-[10px] text-slate-500 uppercase">停損</div>
                             <div className="text-xs font-bold text-red-400">${stock.stopLoss}</div>
                           </div>
                           <div 
                             onClick={() => showLogic('移動停損', stock.trailingStop, '隨著股價上漲，停損位應動態上移以鎖定利潤。')}
                             className="text-center bg-slate-900/30 p-2 rounded border border-slate-700 cursor-pointer hover:bg-slate-700 transition-colors"
                           >
                             <div className="text-[10px] text-slate-500 uppercase">移動</div>
                             <div className="text-xs font-bold text-blue-400">${stock.trailingStop}</div>
                           </div>
                        </div>
                     </div>
                     <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase border-b border-slate-700 pb-1">量化指標</h4>
                        <div className="grid grid-cols-2 gap-y-2 text-xs">
                          <span className="text-slate-500">股本</span><span className="text-white text-right">{stock.capital}億</span>
                          <span className="text-slate-500">營收 YoY</span><span className="text-red-400 text-right">+{stock.revenueGrowth}%</span>
                          <span className="text-slate-500">PEG</span><span className="text-emerald-400 text-right">{stock.pegRatio}</span>
                          <span className="text-slate-500">投信連買</span><span className="text-white text-right">{stock.institutionalBuyDays}日</span>
                        </div>
                     </div>
                  </div>
                  
                  <div className="p-3 bg-slate-900 border-t border-slate-700 flex justify-between px-4 items-center">
                     <button 
                       onClick={() => handleAddToWatchlist(stock)}
                       disabled={isAdded || isAdding}
                       className={`text-xs font-bold flex items-center gap-1 transition-colors ${isAdded ? 'text-slate-500' : 'text-emerald-500 hover:text-emerald-400'}`}
                     >
                        {isAdding ? <Loader2 size={14} className="animate-spin" /> : (isAdded ? <Check size={14} /> : <Briefcase size={14} />)} 
                        {isAdding ? '加入中...' : (isAdded ? '已加入儀表板' : '加入追蹤清單')}
                     </button>
                     {isAdded && (
                       <button 
                        onClick={() => onNavigate('MARKET_WATCH')}
                        className="text-[10px] text-blue-400 flex items-center gap-1 hover:underline cursor-pointer bg-blue-900/20 px-2 py-1 rounded border border-blue-800/50"
                       >
                          前往價值儀表板查看詳細數據 <ExternalLink size={10} />
                       </button>
                     )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
