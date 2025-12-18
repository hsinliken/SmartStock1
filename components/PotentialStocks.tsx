
import React, { useEffect, useState } from 'react';
import { fetchPotentialStocks, fetchPriceViaSearch, fetchStockValuation } from '../services/geminiService';
import { StockService } from '../services/stockService';
import { DataService } from '../services/dataService';
import { POTENTIAL_STOCKS_PROMPT } from '../constants';
import { PotentialStock, AnalysisStatus, StockValuation } from '../types';
import { 
  Loader2, Zap, TrendingUp, Target, Shield, Activity, 
  BarChart, ArrowUpCircle, ArrowDownCircle, Info, 
  Settings, ChevronDown, ChevronUp, RotateCcw, 
  Save, Check, RefreshCw, AlertTriangle, Briefcase, ExternalLink
} from 'lucide-react';

export const PotentialStocks: React.FC = () => {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [stocks, setStocks] = useState<PotentialStock[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [addedTickers, setAddedTickers] = useState<Set<string>>(new Set());

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
    try {
      // 1. Fetch full valuation data to make it compatible with Market Watch
      // Use the stock ticker to fetch complete financial data
      const fullData = await fetchStockValuation(stock.ticker, undefined, 'gemini-2.5-flash');
      
      const userData = await DataService.loadUserData();
      const currentWatchlist = userData.watchlist;
      
      // Check for duplicate
      if (currentWatchlist.some(s => s.ticker === stock.ticker)) {
        setAddedTickers(prev => new Set([...prev, stock.ticker]));
        return;
      }

      const newValuation: StockValuation = fullData || {
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
      };

      await DataService.saveWatchlist([...currentWatchlist, newValuation]);
      setAddedTickers(prev => new Set([...prev, stock.ticker]));
    } catch (e) {
      console.error("Failed to add to watchlist:", e);
      alert("加入失敗，請稍後再試");
    }
  };

  const getData = async () => {
    setStatus(AnalysisStatus.LOADING);
    setStocks([]);
    try {
      const data = await fetchPotentialStocks(systemPrompt, selectedModel);
      if (data && data.stocks) {
        setStocks(data.stocks);
        // Real-time price hydration
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
        
        // Improved matching logic
        const yahooData = stockDataList.find(y => 
          y.symbol === item.ticker || 
          y.symbol.split('.')[0] === item.ticker.split('.')[0]
        );

        if (yahooData && yahooData.regularMarketPrice > 0) {
          updatedList[i] = { ...item, currentPrice: yahooData.regularMarketPrice };
        } else {
          // Fallback to Search
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
              {status === AnalysisStatus.LOADING ? '掃描中...' : '開始掃描'}
            </button>
          </div>
        </div>

        {showPromptSettings && (
          <div className="mt-4 p-4 bg-slate-900/60 rounded-xl border border-slate-700 animate-fade-in-down">
             <div className="flex flex-col md:flex-row gap-4 h-full">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-emerald-400">量化篩選邏輯 (System Prompt)</label>
                  <button onClick={handleResetPrompt} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
                    <RotateCcw size={12} /> 恢復預設
                  </button>
                </div>
                <textarea 
                  value={systemPrompt} 
                  onChange={(e) => setSystemPrompt(e.target.value)} 
                  className="w-full h-40 bg-slate-800 text-slate-200 text-sm p-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none font-mono" 
                />
              </div>
              <div className="md:w-64 flex flex-col justify-between">
                <div>
                  <label className="text-sm font-medium text-emerald-400 mb-2 block">AI 模型選擇</label>
                  <div className="space-y-2">
                    {['gemini-2.5-flash', 'gemini-3-pro-preview'].map(m => (
                      <label key={m} className={`block p-3 rounded-lg border cursor-pointer transition-all ${selectedModel === m ? 'bg-emerald-900/30 border-emerald-500' : 'bg-slate-800 border-slate-600 hover:border-slate-500'}`}>
                        <input type="radio" name="model" value={m} checked={selectedModel === m} onChange={(e) => setSelectedModel(e.target.value)} className="hidden" />
                        <div className="font-bold text-white text-sm">{m === 'gemini-3-pro-preview' ? 'Gemini 3 Pro' : 'Gemini 2.5 Flash'}</div>
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
        <div className="flex flex-col items-center justify-center py-20 bg-slate-800/50 rounded-xl border border-slate-700">
          <Loader2 className="w-12 h-12 animate-spin mb-4 text-emerald-500" />
          <p className="animate-pulse text-lg text-slate-300">AI 量化引擎正在篩選中小型成長股...</p>
          <p className="text-sm mt-2 text-slate-500">掃描條件：股本 &lt; 50億、PEG &lt; 1、投信買進</p>
        </div>
      ) : (
        <>
          {status === AnalysisStatus.IDLE && stocks.length === 0 && (
            <div className="text-center py-20 bg-slate-800/50 rounded-xl border border-slate-700 border-dashed">
              <div className="bg-slate-800 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 border border-slate-700 shadow-xl">
                <BarChart className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white">點擊按鈕啟動 AI 篩選引擎</h3>
              <p className="text-slate-500 mt-2 max-w-md mx-auto">
                系統將自動搜尋基本面、籌碼面、技術面皆優的個股，並提供買賣點、停損停利建議。
              </p>
            </div>
          )}

          {status === AnalysisStatus.ERROR && (
            <div className="bg-red-900/20 border border-red-900/50 p-6 rounded-xl text-center text-red-400">
              <AlertTriangle className="mx-auto mb-2" size={32} />
              <p className="font-bold">分析引擎目前無法連線</p>
              <p className="text-sm">請檢查 API Key 或指令設定是否正確。</p>
            </div>
          )}

          {/* Results Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {stocks.map((stock) => {
              const isBuy = stock.signal === 'BUY';
              const isSell = stock.signal === 'SELL';
              const isAdded = addedTickers.has(stock.ticker);
              
              return (
                <div key={stock.ticker} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl flex flex-col group transition-all hover:border-emerald-500/50">
                  {/* Card Header */}
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
                        {stock.currentPrice > 0 ? `$${stock.currentPrice}` : '---'}
                      </div>
                      <div className={`text-xs font-bold ${isBuy ? 'text-red-400' : isSell ? 'text-green-400' : 'text-slate-400'}`}>
                        SIGNAL: {stock.signal}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 grid grid-cols-2 gap-6 border-b border-slate-700 bg-slate-800/50">
                    {/* Metrics */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700 pb-1">量化指標</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-[10px] text-slate-500">股本</div>
                          <div className="text-sm font-bold text-white">{stock.capital}億</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">PE / PEG</div>
                          <div className="text-sm font-bold text-emerald-400">{stock.peRatio} / {stock.pegRatio}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">營收 YoY</div>
                          <div className="text-sm font-bold text-red-400">+{stock.revenueGrowth}%</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">殖利率</div>
                          <div className="text-sm font-bold text-yellow-400">{stock.dividendYield}%</div>
                        </div>
                      </div>
                    </div>

                    {/* Setup */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-700 pb-1">技術 & 籌碼</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-[10px] text-slate-500">RSI(14)</div>
                          <div className={`text-sm font-bold ${stock.rsi < 40 ? 'text-emerald-400' : stock.rsi > 70 ? 'text-red-400' : 'text-slate-300'}`}>{stock.rsi}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">投信連買</div>
                          <div className="text-sm font-bold text-white">{stock.institutionalBuyDays}日</div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-[10px] text-slate-500">200 MA 支撐</div>
                          <div className="text-sm font-bold text-blue-400">${stock.ma200Price}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Execution Strategy */}
                  <div className="p-5 bg-slate-900/30 flex-1">
                    <div className="flex items-start gap-3 mb-4">
                      <Info className="text-emerald-500 mt-1 shrink-0" size={16} />
                      <p className="text-xs text-slate-400 leading-relaxed italic">
                        {stock.reason}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex flex-col items-center">
                        <Target className="text-emerald-400 mb-1" size={16} />
                        <span className="text-[10px] text-slate-500">停利點</span>
                        <span className="text-sm font-bold text-emerald-400">${stock.takeProfit}</span>
                      </div>
                      <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex flex-col items-center">
                        <Shield className="text-red-400 mb-1" size={16} />
                        <span className="text-[10px] text-slate-500">初始停損</span>
                        <span className="text-sm font-bold text-red-400">${stock.stopLoss}</span>
                      </div>
                      <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex flex-col items-center">
                        <TrendingUp className="text-blue-400 mb-1" size={16} />
                        <span className="text-[10px] text-slate-500">動態停損</span>
                        <span className="text-sm font-bold text-blue-400">${stock.trailingStop}</span>
                      </div>
                    </div>
                    
                    {/* Visual Risk/Reward Bar */}
                    <div className="mt-6 flex flex-col gap-2">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-red-400">STOP: ${stock.stopLoss}</span>
                        <span className="text-white">ENTRY: ${stock.currentPrice > 0 ? stock.currentPrice : '---'}</span>
                        <span className="text-emerald-400">TARGET: ${stock.takeProfit}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-700 rounded-full relative overflow-hidden">
                        <div className="absolute top-0 bottom-0 bg-red-500/30" style={{ left: '0', width: '30%' }}></div>
                        <div className="absolute top-0 bottom-0 bg-emerald-500/30" style={{ right: '0', width: '40%' }}></div>
                        {stock.currentPrice > 0 && (
                          <div className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-white border-2 border-slate-900 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)] z-10" style={{ left: '30%' }}></div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-slate-900 border-t border-slate-700 flex justify-between px-4">
                     <button 
                       onClick={() => handleAddToWatchlist(stock)}
                       disabled={isAdded}
                       className={`text-xs font-bold flex items-center gap-1 transition-colors ${isAdded ? 'text-slate-500' : 'text-emerald-500 hover:text-emerald-400'}`}
                     >
                        {isAdded ? <Check size={14} /> : <Briefcase size={14} />} 
                        {isAdded ? '已加入儀表板' : '加入追蹤清單'}
                     </button>
                     {isAdded && (
                       <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          可在「價值儀表板」查看詳細數據 <ExternalLink size={10} />
                       </div>
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
