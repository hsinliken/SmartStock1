
import React, { useState } from 'react';
import { fetchGoogleFinanceFormula } from '../services/geminiService';
import { GoogleFinanceResponse } from '../types';
import { FileSpreadsheet, Send, Copy, Check, Info, Loader2, Sparkles } from 'lucide-react';

export const SheetHelper: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<GoogleFinanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await fetchGoogleFinanceFormula(query);
      if (data && data.google_finance_formula) {
        setResult(data);
      } else {
        setError("無法生成公式，請嘗試更具體的描述。");
      }
    } catch (err) {
      console.error(err);
      setError("發生錯誤，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.google_finance_formula);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="text-green-500" />
              Google Sheets 公式生成器
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              輸入您的需求（例如：「台積電今年以來的股價走勢」），AI 將自動生成對應的 GOOGLEFINANCE 函數供您複製使用。
            </p>
          </div>
        </div>

        {/* Input Area */}
        <form onSubmit={handleGenerate} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="請輸入需求，例如：查詢 Apple 目前的本益比..."
            className="w-full bg-slate-900 border border-slate-600 rounded-xl py-4 pl-6 pr-16 text-white text-lg placeholder-slate-500 focus:ring-2 focus:ring-green-500 outline-none shadow-inner"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-2 bottom-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </form>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="text-xs text-slate-500 py-1">試試看：</span>
          {['台積電收盤價', 'NVDA 52週最高價', '0050 歷史股價', 'Google 市值', '特斯拉本益比'].map((tag) => (
            <button
              key={tag}
              onClick={() => setQuery(tag)}
              className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-full transition-colors border border-slate-600"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Result Card */}
      {result && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-1 rounded-xl shadow-2xl animate-fade-in-down border border-green-900/50">
          <div className="bg-slate-800 rounded-lg p-6 h-full relative overflow-hidden">
             {/* Background Decoration */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col gap-6 relative z-10">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                   <h3 className="text-sm text-slate-400 font-bold uppercase tracking-wider mb-1">Target Symbol</h3>
                   <div className="text-2xl font-black text-white font-mono bg-slate-900 px-3 py-1 rounded inline-block border border-slate-700">
                     {result.symbol}
                   </div>
                </div>
                <div className="text-right">
                   <h3 className="text-sm text-slate-400 font-bold uppercase tracking-wider mb-1">Attribute</h3>
                   <span className="inline-block px-2 py-1 bg-green-900/30 text-green-400 border border-green-700/50 rounded text-xs font-mono">
                     {result.attribute}
                   </span>
                </div>
              </div>

              {/* Formula Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-400 font-bold flex items-center gap-1">
                    <Sparkles size={14} />
                    Generated Formula
                  </span>
                  {copied && <span className="text-xs text-green-400 animate-fade-in">已複製！</span>}
                </div>
                <div className="relative group">
                  <div className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 font-mono text-green-300 text-sm break-all shadow-inner">
                    {result.google_finance_formula}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    title="複製公式"
                  >
                    {copied ? <Check size={16} className="text-green-400"/> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Explanation Section */}
              <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-700 flex gap-3">
                 <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />
                 <div className="space-y-1">
                   <h4 className="text-sm font-bold text-white">說明</h4>
                   <p className="text-sm text-slate-300 leading-relaxed">
                     {result.explanation}
                   </p>
                 </div>
              </div>

              {/* User Original Request Context */}
              <div className="pt-4 border-t border-slate-700/50">
                 <p className="text-xs text-slate-500">
                   原始需求：{result.stock_request}
                 </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-xl text-center text-red-400 flex items-center justify-center gap-2">
           <Info size={16} />
           {error}
        </div>
      )}
    </div>
  );
};
