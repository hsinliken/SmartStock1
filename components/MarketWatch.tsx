import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, RefreshCw, Trash2, Clock, ArrowUp, ArrowDown, ExternalLink, Settings, ChevronDown, ChevronUp, RotateCcw, Save, Check } from 'lucide-react';
import { fetchStockValuation } from '../services/geminiService';
import { DataService } from '../services/dataService';
import { StockValuation } from '../types';
import { MARKET_WATCH_PROMPT } from '../constants';

export const MarketWatch: React.FC = () => {
  const [watchlist, setWatchlist] = useState<StockValuation[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [newTicker, setNewTicker] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  // Refresh Settings
  const [refreshInterval, setRefreshInterval] = useState<number>(0); // 0 = Manual
  const [nextRefreshTime, setNextRefreshTime] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  // AI Prompt Settings
  const [systemPrompt, setSystemPrompt] = useState<string>(MARKET_WATCH_PROMPT);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true);

  // Initial Load from Service
  useEffect(() => {
    const loadData = async () => {
      const data = await DataService.loadUserData();
      setWatchlist(data.watchlist);
      setSystemPrompt(data.marketWatchPrompt);
      setSelectedModel(data.marketWatchModel || 'gemini-2.5-flash');
      setInitializing(false);
      setIsLoadingPrompt(false);
    };
    loadData();
  }, []);

  // Save Watchlist to Service on change
  useEffect(() => {
    if (!initializing) {
      DataService.saveWatchlist(watchlist);
    }
  }, [watchlist, initializing]);

  // Handle Save Prompt
  const handleSavePrompt = async () => {
    setIsSaved(true); // Optimistic UI
    await DataService.saveMarketWatchSettings(systemPrompt, selectedModel);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Handle Reset Prompt
  const handleResetPrompt = async () => {
    if (window.confirm('確定要恢復預設的指令與模型嗎？您的自定義修改將會遺失。')) {
      const defaultPrompt = MARKET_WATCH_PROMPT;
      const defaultModel = 'gemini-2.5-flash';
      setSystemPrompt(defaultPrompt);
      setSelectedModel(defaultModel);
      await DataService.saveMarketWatchSettings(defaultPrompt, defaultModel);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  // Auto Refresh Logic
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (refreshInterval > 0) {
      setNextRefreshTime(Date.now() + refreshInterval);
      timerRef.current = window.setInterval(() => {
        refreshAll();
        setNextRefreshTime(Date.now() + refreshInterval);
      }, refreshInterval);
    } else {
      setNextRefreshTime(null);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refreshInterval]);

  const mapDataToValuation = (ticker: string, data: any): StockValuation => {
    return {
      ticker: ticker.toUpperCase(),
      name: data.name || ticker.toUpperCase(),
      currentPrice: data.currentPrice,
      changePercent: data.changePercent || 0,
      peRatio: data.peRatio || null,
      eps: data.eps || null,
      dividendYield: data.dividendYield || null,
      high52Week: data.high52Week || null,
      low52Week: data.low52Week || null,
      
      // Raw data
      lastDividend: data.lastDividend || null,
      latestQuarterlyEps: data.latestQuarterlyEps || null,
      lastFullYearEps: data.lastFullYearEps || null,

      // AI Logic
      cheapPrice: data.cheapPrice,
      fairPrice: data.fairPrice,
      expensivePrice: data.expensivePrice,

      // Custom Formulas
      dividendFairPrice: data.dividendFairPrice || null,
      estimatedYearlyFairPrice: data.estimatedYearlyFairPrice || null,
      
      lastUpdated: new Date().toLocaleTimeString()
    };
  };

  const addToWatchlist = async () => {
    if (!newTicker) return;
    setLoading(true);
    
    try {
      // Pass the current prompt and model to the service
      const data = await fetchStockValuation(newTicker, systemPrompt, selectedModel);
      if (data) {
        const newValuation = mapDataToValuation(newTicker, data);
        
        setWatchlist(prev => {
          // Check for duplicates
          if (prev.some(item => item.ticker === newValuation.ticker)) {
             alert("此股票已在觀察清單中");
             return prev;
          }
          const filtered = prev.filter(i => i.ticker !== newValuation.ticker);
          return [...filtered, newValuation];
        });
        setNewTicker('');
      } else {
        alert("無法獲取該股票資訊，請確認代號正確或稍後再試。");
      }
    } catch (error) {
      console.error(error);
      alert("搜尋失敗");
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    if (watchlist.length === 0) return;
    setLoading(true);
    
    const BATCH_SIZE = 3; // Number of concurrent requests
    const updatedList = [...watchlist];
    setProgress({ current: 0, total: updatedList.length });
    
    // Split into batches to speed up processing while respecting rate limits
    for (let i = 0; i < updatedList.length; i += BATCH_SIZE) {
      const batchIndices = [];
      for(let j = 0; j < BATCH_SIZE && (i + j) < updatedList.length; j++) {
        batchIndices.push(i + j);
      }

      await Promise.all(batchIndices.map(async (idx) => {
        try {
          // Pass the current prompt and model to the service
          const data = await fetchStockValuation(updatedList[idx].ticker, systemPrompt, selectedModel);
          if (data) {
             updatedList[idx] = mapDataToValuation(updatedList[idx].ticker, data);
          }
        } catch (e) {
          console.error(`Failed to refresh ${updatedList[idx].ticker}`, e);
        } finally {
          setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }
      }));
    }
    
    setWatchlist(updatedList);
    setLoading(false);
    setProgress({ current: 0, total: 0 });
  };

  const removeStock = (ticker: string) => {
    if(window.confirm('確定要移除此觀察股嗎？')) {
      setWatchlist(prev => prev.filter(s => s.ticker !== ticker));
    }
  };

  const getPriceStatus = (current: number, cheap: number, expensive: number) => {
    if (current <= cheap) return { text: '便宜', color: 'text-green-400', bg: 'bg-green-900/30 border-green-700' };
    if (current >= expensive) return { text: '昂貴', color: 'text-red-400', bg: 'bg-red-900/30 border-red-700' };
    return { text: '合理', color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-700' };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Control Panel */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="w-full md:w-auto flex-1">
           <div className="flex items-center gap-3 mb-2">
             <h2 className="text-xl font-bold text-white">觀察股清單 (Market Watch)</h2>
             <button
              onClick={() => setShowPromptSettings(!showPromptSettings)}
              disabled={isLoadingPrompt}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${
                showPromptSettings 
                  ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/50' 
                  : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
              }`}
            >
              <Settings size={12} />
              設定 AI
              {showPromptSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
           </div>
           <p className="text-sm text-slate-400">
             系統自動抓取財務數據，並依據「股利*20」與「季EPS*20*盈配率」推算合理價格區間。
           </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
           {/* Add Stock */}
           <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value)}
              placeholder="輸入代號 (e.g. 2330.TW)" 
              className="w-full md:w-48 bg-slate-900 border border-slate-600 rounded-lg py-2 pl-9 pr-4 text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && addToWatchlist()}
            />
          </div>
          <button 
            onClick={addToWatchlist}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            新增
          </button>

          <div className="w-px bg-slate-700 hidden md:block mx-2"></div>

          {/* Refresh Controls */}
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-700">
             <Clock size={16} className="text-slate-400 ml-2" />
             <select 
               value={refreshInterval} 
               onChange={(e) => setRefreshInterval(Number(e.target.value))}
               className="bg-transparent text-slate-300 text-sm border-none focus:ring-0 cursor-pointer py-1"
             >
               <option value={0}>手動更新</option>
               <option value={300000}>每 5 分鐘</option>
               <option value={900000}>每 15 分鐘</option>
               <option value={1800000}>每 30 分鐘</option>
               <option value={3600000}>每 1 小時</option>
             </select>
          </div>

          <button 
            onClick={refreshAll}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? (progress.total > 0 ? `更新中 (${progress.current}/${progress.total})` : '更新中...') : '立即更新'}
          </button>
        </div>
      </div>

      {/* Prompt Settings Panel */}
      {showPromptSettings && (
        <div className="p-4 bg-slate-800 rounded-xl border border-slate-600 shadow-xl animate-fade-in">
          <div className="flex flex-col md:flex-row gap-4 h-full">
             <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-emerald-400">
                    AI 估價模型 Prompt 設定 (System Prompt)
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
                  className="w-full h-40 bg-slate-900 text-slate-200 text-xs p-3 rounded-lg border border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none font-mono"
                  placeholder="請保留 {{ticker}} 作為股票代號的替換變數..."
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  注意：指令中必須包含 <code className="bg-slate-700 px-1 rounded text-slate-300">{'{{ticker}}'}</code> 以便系統自動帶入股票代號。
                </p>
             </div>
             <div className="md:w-64 flex flex-col justify-between">
                <div>
                  <label className="text-sm font-medium text-emerald-400 mb-2 block">
                    選擇 AI 模型
                  </label>
                  <div className="space-y-2">
                    <label className={`block p-3 rounded-lg border cursor-pointer transition-all ${selectedModel === 'gemini-2.5-flash' ? 'bg-emerald-900/30 border-emerald-500' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}>
                      <input 
                        type="radio" 
                        name="model" 
                        value="gemini-2.5-flash" 
                        checked={selectedModel === 'gemini-2.5-flash'} 
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="hidden"
                      />
                      <div className="font-bold text-white text-sm">Gemini 2.5 Flash</div>
                      <div className="text-xs text-slate-400">速度快，省 Token (預設)</div>
                    </label>
                    <label className={`block p-3 rounded-lg border cursor-pointer transition-all ${selectedModel === 'gemini-3-pro-preview' ? 'bg-purple-900/30 border-purple-500' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}>
                      <input 
                        type="radio" 
                        name="model" 
                        value="gemini-3-pro-preview" 
                        checked={selectedModel === 'gemini-3-pro-preview'} 
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="hidden"
                      />
                      <div className="font-bold text-white text-sm">Gemini 3.0 Pro</div>
                      <div className="text-xs text-slate-400">邏輯推理能力更強</div>
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

      {/* Data Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300 whitespace-nowrap">
            <thead className="text-xs text-slate-400 uppercase bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 bg-slate-900 sticky left-0 z-10 border-b border-slate-700">代號 / 名稱</th>
                <th className="px-4 py-3 text-right">現價</th>
                <th className="px-4 py-3 text-right">漲跌幅</th>
                <th className="px-4 py-3 text-center">AI 評估</th>
                
                {/* AI Estimates */}
                <th className="px-4 py-3 text-right text-green-400">便宜價</th>
                <th className="px-4 py-3 text-right text-yellow-400">合理價</th>
                <th className="px-4 py-3 text-right text-red-400">昂貴價</th>

                {/* Formula Estimates */}
                <th className="px-4 py-3 text-right bg-slate-900/50 text-blue-300 border-l border-slate-700">
                  股利合理價<br/><span className="text-[10px] text-slate-500">(股利x20)</span>
                </th>
                <th className="px-4 py-3 text-right bg-slate-900/50 text-purple-300 border-r border-slate-700">
                  今年合理價<br/><span className="text-[10px] text-slate-500">(季EPSx20x盈配率)</span>
                </th>

                <th className="px-4 py-3 text-right">本益比</th>
                <th className="px-4 py-3 text-right">EPS</th>
                <th className="px-4 py-3 text-right">殖利率</th>
                <th className="px-4 py-3 text-right">更新時間</th>
                <th className="px-4 py-3 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {initializing ? (
                <tr><td colSpan={15} className="py-8 text-center text-slate-500">載入清單中...</td></tr>
              ) : watchlist.map((item) => {
                const status = getPriceStatus(item.currentPrice, item.cheapPrice, item.expensivePrice);
                const isPositive = (item.changePercent || 0) >= 0;
                
                return (
                  <tr key={item.ticker} className="hover:bg-slate-750 transition-colors">
                    <td className="px-4 py-3 bg-slate-800 sticky left-0 z-10">
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-base">{item.ticker}</span>
                        <span className="text-xs text-slate-500">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white text-base font-medium">
                      ${item.currentPrice}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-medium ${isPositive ? 'text-red-400' : 'text-green-400'}`}>
                      <div className="flex items-center justify-end gap-1">
                        {isPositive ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}
                        {Math.abs(item.changePercent || 0)}%
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold border ${status.bg} ${status.color}`}>
                        {status.text}
                      </span>
                    </td>
                    
                    {/* AI Logic Columns */}
                    <td className="px-4 py-3 text-right font-mono text-green-400 font-medium">
                      ${item.cheapPrice}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-yellow-400 font-medium">
                      ${item.fairPrice}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-red-400 font-medium">
                      ${item.expensivePrice}
                    </td>

                    {/* Formula Logic Columns */}
                    <td className="px-4 py-3 text-right font-mono text-blue-300 font-bold bg-slate-800/50 border-l border-slate-700">
                      {item.dividendFairPrice ? `$${item.dividendFairPrice.toFixed(1)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-purple-300 font-bold bg-slate-800/50 border-r border-slate-700">
                      {item.estimatedYearlyFairPrice ? `$${item.estimatedYearlyFairPrice.toFixed(1)}` : '-'}
                    </td>

                    <td className="px-4 py-3 text-right text-slate-300">
                      {item.peRatio ? item.peRatio.toFixed(1) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300">
                      {item.eps ? item.eps.toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-300">
                      {item.dividendYield ? `${item.dividendYield}%` : '-'}
                    </td>
                    
                    <td className="px-4 py-3 text-right text-xs text-slate-500">
                      {item.lastUpdated}
                    </td>
                    <td className="px-4 py-3 text-center">
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           removeStock(item.ticker);
                         }}
                         className="p-1.5 hover:bg-slate-700 rounded-md text-slate-500 hover:text-red-400 transition-colors"
                         title="移除"
                       >
                         <Trash2 size={16} />
                       </button>
                    </td>
                  </tr>
                );
              })}
              
              {watchlist.length === 0 && !loading && !initializing && (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-500">
                    目前沒有觀察中的股票，請點擊上方「新增」按鈕。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {nextRefreshTime && (
        <div className="text-right text-xs text-slate-500">
          下次自動更新: {new Date(nextRefreshTime).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};