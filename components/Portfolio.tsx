
import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, RefreshCw, ChevronDown, ChevronRight, DollarSign, Briefcase, Settings, ChevronUp, RotateCcw, Save, Check, Bot, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { StockTransaction } from '../types';
import { analyzePortfolio, fetchPriceViaSearch } from '../services/geminiService';
import { StockService } from '../services/stockService'; 
import { DataService } from '../services/dataService';
import { PORTFOLIO_ANALYSIS_PROMPT } from '../constants';

interface PortfolioProps {
  portfolio: StockTransaction[];
  setPortfolio: React.Dispatch<React.SetStateAction<StockTransaction[]>>;
}

export const Portfolio: React.FC<PortfolioProps> = ({ portfolio, setPortfolio }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [updatingTicker, setUpdatingTicker] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set());
  
  // AI Settings State
  const [systemPrompt, setSystemPrompt] = useState<string>(PORTFOLIO_ANALYSIS_PROMPT);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3-pro-preview');
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true);
  
  // Analysis State
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Load Prompt settings
  useEffect(() => {
    const loadData = async () => {
      const data = await DataService.loadUserData();
      setSystemPrompt(data.portfolioPrompt || PORTFOLIO_ANALYSIS_PROMPT);
      setSelectedModel(data.portfolioModel || 'gemini-3-pro-preview');
      setIsLoadingPrompt(false);
    };
    loadData();
  }, []);

  const handleSavePrompt = async () => {
    setIsSaved(true); 
    await DataService.savePortfolioSettings(systemPrompt, selectedModel);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleResetPrompt = async () => {
    if (window.confirm('確定要恢復預設的指令與模型嗎？')) {
      const defaultPrompt = PORTFOLIO_ANALYSIS_PROMPT;
      const defaultModel = 'gemini-3-pro-preview';
      setSystemPrompt(defaultPrompt);
      setSelectedModel(defaultModel);
      await DataService.savePortfolioSettings(defaultPrompt, defaultModel);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  // Form State
  const [transactionType, setTransactionType] = useState<'BUY' | 'SELL'>('BUY');
  const [newTicker, setNewTicker] = useState('');
  const [newName, setNewName] = useState('');
  const [newBuyDate, setNewBuyDate] = useState('');
  const [newBuyPrice, setNewBuyPrice] = useState('');
  const [newBuyQty, setNewBuyQty] = useState('');
  const [newReason, setNewReason] = useState('');

  const estimatedTotal = (parseFloat(newBuyPrice) || 0) * (parseInt(newBuyQty) || 0);

  // Data Processing
  const groupedPortfolio = useMemo(() => {
    const groups: Record<string, {
      ticker: string;
      name: string;
      transactions: StockTransaction[];
      totalShares: number;
      totalCost: number;
      marketValue: number;
      unrealizedPL: number;
      realizedPL: number;
      avgCost: number;
      currentPrice: number;
    }> = {};

    portfolio.forEach(stock => {
      if (!groups[stock.ticker]) {
        groups[stock.ticker] = {
          ticker: stock.ticker,
          name: stock.name,
          transactions: [],
          totalShares: 0,
          totalCost: 0,
          marketValue: 0,
          unrealizedPL: 0,
          realizedPL: 0,
          avgCost: 0,
          currentPrice: stock.currentPrice || stock.buyPrice
        };
      }
      
      const group = groups[stock.ticker];
      group.transactions.push(stock);
      
      if (!group.name && stock.name) group.name = stock.name;
      if (stock.currentPrice) group.currentPrice = stock.currentPrice;

      if (stock.sellQty && stock.sellPrice) {
        group.realizedPL += (stock.sellPrice - stock.buyPrice) * stock.sellQty;
      }

      const remainingQty = stock.buyQty - (stock.sellQty || 0);
      if (remainingQty > 0) {
        group.totalShares += remainingQty;
        group.totalCost += remainingQty * stock.buyPrice;
      }
    });

    Object.values(groups).forEach(group => {
      if (group.totalShares > 0) {
        group.avgCost = group.totalCost / group.totalShares;
        group.marketValue = group.totalShares * group.currentPrice;
        group.unrealizedPL = group.marketValue - group.totalCost;
      }
    });

    return Object.values(groups).sort((a, b) => b.marketValue - a.marketValue);
  }, [portfolio]);

  const totalCost = groupedPortfolio.reduce((acc, g) => acc + g.totalCost, 0);
  const totalMarketValue = groupedPortfolio.reduce((acc, g) => acc + g.marketValue, 0);
  const totalUnrealizedPL = groupedPortfolio.reduce((acc, g) => acc + g.unrealizedPL, 0);
  const totalRealizedPL = groupedPortfolio.reduce((acc, g) => acc + g.realizedPL, 0);

  const toggleExpand = (ticker: string) => {
    const newSet = new Set(expandedTickers);
    if (newSet.has(ticker)) newSet.delete(ticker);
    else newSet.add(ticker);
    setExpandedTickers(newSet);
  };

  const handleAnalyzePortfolio = async () => {
    if (groupedPortfolio.length === 0) return;
    setIsAnalyzing(true);
    setAnalysisResult('');
    const dataForAi = groupedPortfolio.map(g => ({
      ticker: g.ticker,
      name: g.name,
      avgCost: g.avgCost.toFixed(1),
      currentPrice: g.currentPrice,
      totalShares: g.totalShares,
      totalCost: g.totalCost.toFixed(0),
      marketValue: g.marketValue.toFixed(0),
      unrealizedPL: g.unrealizedPL.toFixed(0),
      plPercent: ((g.unrealizedPL / g.totalCost) * 100).toFixed(2) + '%',
      weight: ((g.marketValue / totalMarketValue) * 100).toFixed(1) + '%'
    }));
    try {
      const result = await analyzePortfolio(dataForAi, systemPrompt, selectedModel);
      setAnalysisResult(result);
    } catch (e) {
      console.error(e);
      setAnalysisResult("分析失敗，請檢查網路連線或稍後再試。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTicker = newTicker.trim().toUpperCase();

    if (transactionType === 'BUY') {
      const newStock: StockTransaction = {
        id: Date.now().toString(),
        ticker: cleanTicker,
        name: newName.trim(),
        buyDate: newBuyDate,
        buyPrice: parseFloat(newBuyPrice),
        buyQty: parseInt(newBuyQty),
        reason: newReason,
        currentPrice: parseFloat(newBuyPrice)
      };
      setPortfolio(prev => [...prev, newStock]);
    } else {
      const qtyToSell = parseInt(newBuyQty);
      const sellPrice = parseFloat(newBuyPrice);
      const sellDate = newBuyDate;
      const targetTicker = cleanTicker;
      const group = groupedPortfolio.find(g => g.ticker === targetTicker);
      if (!group || group.totalShares < qtyToSell) {
        alert(`持股不足！`);
        return;
      }
      let remainingSellQty = qtyToSell;
      let newPortfolio = [...portfolio];
      const relevantIndices = newPortfolio
        .map((t, index) => ({ t, index }))
        .filter(({ t }) => t.ticker === targetTicker && (t.buyQty - (t.sellQty || 0)) > 0)
        .sort((a, b) => new Date(a.t.buyDate).getTime() - new Date(b.t.buyDate).getTime());

      for (const { t, index } of relevantIndices) {
        if (remainingSellQty <= 0) break;
        const availableQty = t.buyQty - (t.sellQty || 0);
        const takeQty = Math.min(availableQty, remainingSellQty);
        if (takeQty === availableQty && !t.sellQty) {
          newPortfolio[index] = { ...t, sellQty: takeQty, sellPrice: sellPrice, sellDate: sellDate };
        } else {
          const soldPart: StockTransaction = { ...t, id: Date.now().toString() + Math.random(), buyQty: takeQty, sellQty: takeQty, sellPrice: sellPrice, sellDate: sellDate };
          newPortfolio[index] = { ...t, buyQty: t.buyQty - takeQty };
          newPortfolio.push(soldPart);
        }
        remainingSellQty -= takeQty;
      }
      setPortfolio(newPortfolio);
    }
    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setNewTicker(''); setNewName(''); setNewBuyDate(''); setNewBuyPrice(''); setNewBuyQty(''); setNewReason(''); setTransactionType('BUY');
  };

  const handleRemoveStock = (id: string) => {
    if (window.confirm('確定要刪除此紀錄嗎？')) {
      setPortfolio(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleSingleTickerUpdate = async (ticker: string) => {
    if (updatingPrices || updatingTicker) return;
    setUpdatingTicker(ticker);
    try {
      const data = await StockService.getStockData(ticker, true);
      if (data && data.regularMarketPrice) {
        setPortfolio(prev => prev.map(s => {
          if (s.ticker === ticker) return { ...s, currentPrice: data.regularMarketPrice };
          return s;
        }));
      }
    } catch (e) {
      console.error(`Quick update failed for ${ticker}`, e);
    } finally {
      setUpdatingTicker(null);
    }
  };

  const handleUpdatePrices = async () => {
    if (updatingPrices) return;
    setUpdatingPrices(true);
    setUpdateStatus('批量同步現價中...');
    
    const uniqueTickers = Array.from(new Set(portfolio.map(s => {
      const remaining = s.buyQty - (s.sellQty || 0);
      return remaining > 0 ? s.ticker.trim().toUpperCase() : null;
    }).filter(t => t !== null)));

    if (uniqueTickers.length === 0) {
       setUpdatingPrices(false);
       setUpdateStatus('');
       return;
    }

    try {
        const stockDataList = await StockService.getBatchStockData(uniqueTickers as string[], true);
        
        if (stockDataList.length > 0) {
            setPortfolio(prev => prev.map(s => {
                const pTicker = s.ticker.trim().toUpperCase();
                const pBase = pTicker.split('.')[0];
                
                const data = stockDataList.find(sd => {
                    const apiSymbol = sd.symbol.trim().toUpperCase();
                    if (apiSymbol === pTicker) return true;
                    const apiBase = apiSymbol.split('.')[0];
                    return apiBase === pBase && pBase.length >= 4;
                });

                if (data && data.regularMarketPrice) {
                    return { ...s, currentPrice: data.regularMarketPrice };
                }
                return s;
            }));
        }
    } catch (e) {
        console.error("Batch update failed:", e);
    }

    setUpdatingPrices(false);
    setUpdateStatus('');
  };

  const allocationData = groupedPortfolio.filter(g => g.marketValue > 0).map(g => ({ name: g.name || g.ticker, value: g.marketValue }));
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 w-full">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">總投入成本</p>
            <p className="text-2xl font-black text-white">${totalCost.toLocaleString()}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">目前市值</p>
            <p className="text-2xl font-black text-white">${totalMarketValue.toLocaleString()}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">未實現損益</p>
            <p className={`text-2xl font-black flex items-center gap-1 ${totalUnrealizedPL >= 0 ? 'text-red-400' : 'text-green-400'}`}>
              {totalUnrealizedPL >= 0 ? <TrendingUp size={20}/> : <TrendingDown size={20}/>}
              ${Math.abs(totalUnrealizedPL).toLocaleString()}
            </p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">已實現損益</p>
            <p className={`text-2xl font-black flex items-center gap-1 ${totalRealizedPL >= 0 ? 'text-red-400' : 'text-green-400'}`}>
              ${totalRealizedPL.toLocaleString()}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowPromptSettings(!showPromptSettings)}
          disabled={isLoadingPrompt}
          className={`shrink-0 flex items-center gap-1 text-sm px-3 py-2 rounded-lg border transition-colors h-fit mt-1 ${showPromptSettings ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/50' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}
        >
          <Settings size={14} /> 設定 AI {showPromptSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {showPromptSettings && (
          <div className="mb-6 p-4 bg-slate-900/60 rounded-xl border border-slate-700 animate-fade-in">
             <div className="flex flex-col md:flex-row gap-4 h-full">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-emerald-400">AI 投資組合顧問指令</label>
                  <button onClick={handleResetPrompt} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"><RotateCcw size={12} /> 恢復預設值</button>
                </div>
                <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} className="w-full h-40 bg-slate-800 text-slate-200 text-sm p-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none font-mono"/>
              </div>
              <div className="md:w-64 flex flex-col justify-between">
                <div>
                  <label className="text-sm font-medium text-emerald-400 mb-2 block">選擇 AI 模型</label>
                  <div className="space-y-2">
                    <label className={`block p-3 rounded-lg border cursor-pointer transition-all ${selectedModel === 'gemini-3-flash-preview' ? 'bg-emerald-900/30 border-emerald-500' : 'bg-slate-800 border-slate-600 hover:border-slate-500'}`}>
                      <input type="radio" name="port_model" value="gemini-3-flash-preview" checked={selectedModel === 'gemini-3-flash-preview'} onChange={(e) => setSelectedModel(e.target.value)} className="hidden" />
                      <div className="font-bold text-white text-sm">Gemini 3.0 Flash</div>
                    </label>
                    <label className={`block p-3 rounded-lg border cursor-pointer transition-all ${selectedModel === 'gemini-3-pro-preview' ? 'bg-purple-900/30 border-purple-500' : 'bg-slate-800 border-slate-600 hover:border-slate-500'}`}>
                      <input type="radio" name="port_model" value="gemini-3-pro-preview" checked={selectedModel === 'gemini-3-pro-preview'} onChange={(e) => setSelectedModel(e.target.value)} className="hidden" />
                      <div className="font-bold text-white text-sm">Gemini 3.0 Pro</div>
                    </label>
                  </div>
                </div>
                <button onClick={handleSavePrompt} className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isSaved ? 'bg-emerald-600 text-white' : 'bg-slate-700 hover:bg-emerald-600 text-white'}`}>{isSaved ? <Check size={16} /> : <Save size={16} />} {isSaved ? '已儲存' : '儲存設定'}</button>
              </div>
            </div>
          </div>
      )}

      {analysisResult && (
        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-lg animate-fade-in relative">
          <button onClick={() => setAnalysisResult('')} className="absolute top-4 right-4 text-slate-500 hover:text-white">關閉分析</button>
          <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-700"><Bot size={24} className="text-emerald-400" /><h3 className="text-xl font-bold text-white">AI 投資組合健檢報告</h3></div>
          <div className="prose prose-invert max-w-none prose-emerald"><ReactMarkdown>{analysisResult}</ReactMarkdown></div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col shadow-lg">
          <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-850 gap-4">
            <h3 className="font-bold text-lg text-white flex items-center gap-2"><Briefcase size={20} className="text-emerald-400"/> 持倉明細</h3>
            <div className="flex flex-wrap gap-2 items-center">
              {updateStatus && (
                  <span className="text-[10px] text-emerald-400 animate-pulse bg-emerald-900/20 px-2 py-1 rounded border border-emerald-900/30">
                      {updateStatus}
                  </span>
              )}
              <button onClick={handleUpdatePrices} disabled={updatingPrices} className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-sm transition-colors shadow-sm disabled:opacity-50"><RefreshCw size={14} className={updatingPrices ? 'animate-spin' : ''} /> {updatingPrices ? '同步中' : '批量更新價格'}</button>
              <button onClick={handleAnalyzePortfolio} disabled={isAnalyzing || groupedPortfolio.length === 0} className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors shadow-sm ${isAnalyzing ? 'bg-emerald-800 text-slate-300' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>{isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />} {isAnalyzing ? '分析中' : 'AI 健檢'}</button>
              <button onClick={() => { setIsAdding(!isAdding); resetForm(); }} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-sm transition-colors shadow-sm"><Plus size={14} /> 新增交易</button>
            </div>
          </div>
          
          {isAdding && (
            <div className="p-4 bg-slate-750 border-b border-slate-700 animate-fade-in-down">
              <form onSubmit={handleTransactionSubmit}>
                <div className="flex gap-4 mb-4 border-b border-slate-600 pb-2">
                   <label className={`cursor-pointer flex items-center gap-2 pb-1 ${transactionType === 'BUY' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400'}`}><input type="radio" className="hidden" name="type" checked={transactionType === 'BUY'} onChange={() => setTransactionType('BUY')} /><span className="font-bold">買入股票</span></label>
                   <label className={`cursor-pointer flex items-center gap-2 pb-1 ${transactionType === 'SELL' ? 'text-red-400 border-b-2 border-red-400' : 'text-slate-400'}`}><input type="radio" className="hidden" name="type" checked={transactionType === 'SELL'} onChange={() => setTransactionType('SELL')} /><span className="font-bold">賣出股票</span></label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-xs text-slate-400">股票代號</label><input required placeholder="例如：2330.TW" value={newTicker} onChange={e => setNewTicker(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" /></div>
                  {transactionType === 'BUY' && <div className="space-y-1"><label className="text-xs text-slate-400">股票名稱</label><input required placeholder="例如：台積電" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" /></div>}
                  <div className="space-y-1"><label className="text-xs text-slate-400">{transactionType === 'BUY' ? '買入日期' : '賣出日期'}</label><input required type="date" value={newBuyDate} onChange={e => setNewBuyDate(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" /></div>
                  <div className="space-y-1"><label className="text-xs text-slate-400">{transactionType === 'BUY' ? '買入價格' : '賣出價格'}</label><input required type="number" step="0.01" value={newBuyPrice} onChange={e => setNewBuyPrice(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" /></div>
                  <div className="space-y-1"><label className="text-xs text-slate-400">交易股數</label><input required type="number" value={newBuyQty} onChange={e => setNewBuyQty(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" /></div>
                  <div className="space-y-1"><label className="text-xs text-slate-400">總金額 (試算)</label><div className="w-full bg-slate-900/50 border border-slate-700 rounded p-2 text-emerald-400 font-mono font-bold">${estimatedTotal.toLocaleString()}</div></div>
                  {transactionType === 'BUY' && <div className="space-y-1 md:col-span-2"><label className="text-xs text-slate-400">買入理由 / 筆記</label><input placeholder="選填" value={newReason} onChange={e => setNewReason(e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" /></div>}
                </div>
                <div className="flex justify-end gap-2 mt-4"><button type="button" onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white px-4">取消</button><button type="submit" className={`px-6 py-2 rounded text-white ${transactionType === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'}`}>確定{transactionType === 'BUY' ? '買入' : '賣出'}</button></div>
              </form>
            </div>
          )}

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="text-[10px] text-slate-500 uppercase bg-slate-900 font-black tracking-widest border-b border-slate-800">
                <tr><th className="px-4 py-3 w-10"></th><th className="px-4 py-3">標的</th><th className="px-4 py-3 text-right">股數</th><th className="px-4 py-3 text-right">平均成本</th><th className="px-4 py-3 text-right">現價</th><th className="px-4 py-3 text-right">損益 (未實現)</th><th className="px-4 py-3 text-right">市值</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {groupedPortfolio.map((group) => {
                  const isExpanded = expandedTickers.has(group.ticker);
                  const isProfit = group.unrealizedPL >= 0;
                  const plPercent = group.totalCost > 0 ? (group.unrealizedPL / group.totalCost) * 100 : 0;
                  const isUpdatingThis = updatingTicker === group.ticker;
                  
                  return (
                    <React.Fragment key={group.ticker}>
                      <tr className="hover:bg-slate-750 cursor-pointer transition-colors bg-slate-800/50" onClick={() => toggleExpand(group.ticker)}>
                        <td className="px-4 py-4 text-center">{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                        <td className="px-4 py-4"><div className="flex flex-col"><span className="font-black text-white text-base">{group.name}</span><span className="text-[10px] text-slate-500 font-mono">{group.ticker}</span></div></td>
                        <td className="px-4 py-4 text-right font-mono text-white">{group.totalShares.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right font-mono text-slate-400">${group.avgCost.toFixed(1)}</td>
                        <td className="px-4 py-4 text-right font-mono">
                           <div className="flex items-center justify-end gap-1.5 group/price">
                              <span className="text-emerald-400 font-black text-base">${group.currentPrice}</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSingleTickerUpdate(group.ticker);
                                }}
                                disabled={updatingPrices || isUpdatingThis}
                                className={`p-1 rounded bg-slate-900/50 border border-slate-700 text-slate-500 hover:text-emerald-400 transition-colors ${isUpdatingThis ? 'text-emerald-500' : 'opacity-0 group-hover/price:opacity-100'}`}
                                title="快速更新現價"
                              >
                                <RefreshCw size={10} className={isUpdatingThis ? 'animate-spin' : ''} />
                              </button>
                           </div>
                        </td>
                        <td className={`px-4 py-4 text-right font-mono font-black ${isProfit ? 'text-red-400' : 'text-green-400'}`}><div>${Math.abs(group.unrealizedPL).toLocaleString()}</div><div className="text-[10px]">{isProfit ? '+' : ''}{plPercent.toFixed(2)}%</div></td>
                        <td className="px-4 py-4 text-right font-mono text-white font-bold">${group.marketValue.toLocaleString()}</td>
                      </tr>
                      {isExpanded && (
                        <tr><td colSpan={7} className="px-0 py-0 bg-slate-900/50 border-b border-slate-700 shadow-inner overflow-hidden">
                            <div className="px-4 py-3 border-l-4 border-slate-600 ml-4 my-2 animate-fade-in">
                              <h4 className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest flex items-center justify-between"><span>交易歷程 (FIFO)</span>{group.realizedPL !== 0 && (<span className={`px-2 py-0.5 rounded ${group.realizedPL > 0 ? 'bg-red-900/20 text-red-400' : 'bg-green-900/20 text-green-400'}`}>已實現損益: ${group.realizedPL.toLocaleString()}</span>)}</h4>
                              <table className="w-full text-xs">
                                <thead className="text-slate-500 border-b border-slate-800"><tr><th className="py-2 text-left">日期</th><th className="py-2 text-right">價格</th><th className="py-2 text-right">股數</th><th className="py-2 text-right">金額</th><th className="py-2 text-left pl-4">理由 / 備註</th><th className="py-2 text-center">狀態</th><th className="py-2 text-right">操作</th></tr></thead>
                                <tbody className="text-slate-300">
                                  {group.transactions.sort((a,b) => new Date(b.buyDate).getTime() - new Date(a.buyDate).getTime()).map(t => {
                                       const sold = t.sellQty || 0; const remaining = t.buyQty - sold; const isFullySold = remaining === 0; const totalBuyCost = t.buyPrice * t.buyQty;
                                       return (
                                        <tr key={t.id} className="border-b border-slate-800/30 hover:bg-slate-800/30">
                                          <td className="py-2 font-mono">{t.buyDate}</td><td className="py-2 text-right font-mono text-slate-100">${t.buyPrice}</td><td className="py-2 text-right font-mono text-slate-500">{t.buyQty.toLocaleString()}{sold > 0 && <span className="block text-[10px] text-blue-400">剩 {remaining}</span>}</td><td className="py-2 text-right font-mono text-slate-100">${totalBuyCost.toLocaleString()}</td><td className="py-2 pl-4 truncate max-w-[150px] text-slate-500 italic" title={t.reason}>{t.reason || '-'}</td><td className="py-2 text-center">{isFullySold ? (<span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 text-[9px] uppercase font-bold">已結清</span>) : sold > 0 ? (<span className="px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-300 text-[9px] uppercase font-bold">部分賣出</span>) : (<span className="px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-300 text-[9px] uppercase font-bold">持有中</span>)}</td><td className="py-2 text-right"><button onClick={() => handleRemoveStock(t.id)} className="text-slate-600 hover:text-red-400 transition-colors" title="刪除此筆紀錄"><Trash2 size={12} /></button></td>
                                        </tr>
                                       );
                                     })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {groupedPortfolio.length === 0 && (<tr><td colSpan={7} className="px-4 py-20 text-center text-slate-500"><div className="bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700 opacity-20"><Briefcase size={32} /></div>尚無持倉紀錄，請點擊上方「新增交易」建立您的投資組合。</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col shadow-lg">
          <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2"><DollarSign size={20} className="text-yellow-400"/> 資產配置</h3>
          <div className="flex-1 min-h-[300px]">
            {allocationData.length > 0 ? (<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={allocationData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{allocationData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#1e293b" strokeWidth={2} />))}</Pie><Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px' }} itemStyle={{ color: '#e2e8f0' }} formatter={(value: number) => `$${value.toLocaleString()}`} /><Legend wrapperStyle={{ paddingTop: '20px' }} /></PieChart></ResponsiveContainer>) : (<div className="h-full flex flex-col items-center justify-center text-slate-500"><p>無持倉數據</p></div>)}
          </div>
        </div>
      </div>
    </div>
  );
};
