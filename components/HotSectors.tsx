
import React, { useState } from 'react';
import { fetchHotSectorsAnalysis } from '../services/geminiService';
import { AnalysisStatus, HotSectorsAnalysisResult, HotSector } from '../types';
// Add missing Activity import
import { 
  Flame, TrendingUp, Users, Newspaper, Info, 
  AlertTriangle, RefreshCw, Loader2, ChevronRight, 
  Award, BarChart3, ShieldCheck, Zap, Activity
} from 'lucide-react';

interface HotSectorsProps {
  cachedData: HotSectorsAnalysisResult | null;
  setCachedData: React.Dispatch<React.SetStateAction<HotSectorsAnalysisResult | null>>;
}

export const HotSectors: React.FC<HotSectorsProps> = ({ cachedData, setCachedData }) => {
  const [status, setStatus] = useState<AnalysisStatus>(cachedData ? AnalysisStatus.SUCCESS : AnalysisStatus.IDLE);

  const runAnalysis = async () => {
    setStatus(AnalysisStatus.LOADING);
    const result = await fetchHotSectorsAnalysis();
    if (result && result.top_sectors) {
      setCachedData(result);
      setStatus(AnalysisStatus.SUCCESS);
    } else {
      setStatus(AnalysisStatus.ERROR);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Flame size={160} className="text-orange-500" />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 flex items-center gap-3">
            <Flame className="text-orange-500" />
            股票熱門族群 AI 分析
          </h2>
          <p className="text-slate-400 mt-2 max-w-2xl">
            結合「三維分析法」：敘事、資金、情緒。由 AI 即時掃描新聞、籌碼動向與 PTT 討論熱度，預測下週最具潛力的熱門族群。
          </p>
          <div className="mt-6 flex gap-3">
             <button 
              onClick={runAnalysis}
              disabled={status === AnalysisStatus.LOADING}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50"
             >
               {status === AnalysisStatus.LOADING ? <Loader2 className="animate-spin" /> : <RefreshCw />}
               {status === AnalysisStatus.LOADING ? '正在掃描市場數據...' : '啟動 AI 三維分析'}
             </button>
          </div>
        </div>
      </div>

      {status === AnalysisStatus.LOADING && (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-800/30 rounded-3xl border border-slate-700 border-dashed">
          <Loader2 className="w-16 h-16 animate-spin text-orange-500 mb-6" />
          <p className="text-xl font-bold text-white tracking-widest animate-pulse">AI ANALYST IS SCANNING MARKET DATA...</p>
          <div className="mt-4 flex gap-4 text-xs text-slate-500">
             <span className="flex items-center gap-1"><Newspaper size={12}/> 新聞掃描</span>
             <span className="flex items-center gap-1"><TrendingUp size={12}/> 籌碼追踪</span>
             <span className="flex items-center gap-1"><Users size={12}/> PTT 情緒分析</span>
          </div>
        </div>
      )}

      {status === AnalysisStatus.SUCCESS && cachedData && (
        <div className="space-y-8">
          {/* Overall Sentiment */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center gap-4">
                <div className="p-4 bg-orange-500/20 rounded-xl text-orange-500">
                   <Activity size={24} />
                </div>
                <div>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">市場整體情緒</p>
                   <p className="text-white font-black">{cachedData.overall_market_sentiment}</p>
                </div>
             </div>
             <div className="md:col-span-2 bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center gap-4">
                <div className="p-4 bg-blue-500/20 rounded-xl text-blue-500">
                   <ShieldCheck size={24} />
                </div>
                <div>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">分析師總結</p>
                   <p className="text-slate-300 text-sm leading-relaxed">{cachedData.conclusion}</p>
                </div>
             </div>
          </div>

          {/* Top Sectors */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {cachedData.top_sectors.map((sector, idx) => (
              <div key={idx} className="bg-slate-800 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl flex flex-col group transition-all hover:border-orange-500/50">
                <div className="p-6 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black">
                         {idx + 1}
                      </div>
                      <h3 className="text-xl font-black text-white">{sector.name}</h3>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] text-slate-500 font-bold">熱度指數</p>
                      <p className="text-orange-500 font-black text-xl">{sector.hot_score}%</p>
                   </div>
                </div>

                <div className="p-6 space-y-4 flex-1">
                   <div className="space-y-3">
                      <div className="flex gap-3">
                         <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 shrink-0 h-fit"><Zap size={16}/></div>
                         <div>
                            <p className="text-[10px] text-blue-400 font-bold uppercase">敘事題材 (Narrative)</p>
                            <p className="text-xs text-slate-300 leading-relaxed">{sector.narrative}</p>
                         </div>
                      </div>
                      <div className="flex gap-3">
                         <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 shrink-0 h-fit"><TrendingUp size={16}/></div>
                         <div>
                            <p className="text-[10px] text-purple-400 font-bold uppercase">資金動向 (Flow)</p>
                            <p className="text-xs text-slate-300 leading-relaxed">{sector.flow}</p>
                         </div>
                      </div>
                      <div className="flex gap-3">
                         <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 shrink-0 h-fit"><Users size={16}/></div>
                         <div>
                            <p className="text-[10px] text-emerald-400 font-bold uppercase">市場情緒 (Sentiment)</p>
                            <p className="text-xs text-slate-300 leading-relaxed">{sector.sentiment}</p>
                         </div>
                      </div>
                   </div>

                   <div className="pt-4 border-t border-slate-700">
                      <p className="text-[10px] text-slate-500 font-bold mb-3 uppercase tracking-widest">代表個股與推薦理由</p>
                      <div className="space-y-3">
                        {sector.representative_stocks.map((stock, sIdx) => (
                          <div key={sIdx} className="bg-slate-900/50 p-3 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
                             <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-bold text-white">{stock.name} <span className="text-xs text-slate-500 font-mono">{stock.ticker}</span></span>
                                <span className="text-xs text-emerald-400 font-bold">{stock.strength_score}% 強度</span>
                             </div>
                             <p className="text-[10px] text-slate-400 italic">{stock.reason}</p>
                          </div>
                        ))}
                      </div>
                   </div>
                </div>

                <div className="p-4 bg-red-900/10 border-t border-slate-700 flex gap-3">
                   <AlertTriangle className="text-red-500 shrink-0" size={16} />
                   <p className="text-[10px] text-red-400 leading-relaxed">
                      <span className="font-bold">風險提示：</span>{sector.risk_warning}
                   </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {status === AnalysisStatus.IDLE && (
        <div className="py-32 flex flex-col items-center justify-center bg-slate-800/30 rounded-3xl border border-slate-700 border-dashed">
           <BarChart3 size={64} className="text-slate-700 mb-6" />
           <p className="text-slate-500 mb-8 max-w-sm text-center">
              分析系統尚未啟動。請點擊上方按鈕開始掃描最新的市場敘事、資金流向與社群情緒。
           </p>
           <button onClick={runAnalysis} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl transition-all">
              <RefreshCw size={18} /> 首次掃描分析
           </button>
        </div>
      )}

      {status === AnalysisStatus.ERROR && (
        <div className="py-20 flex flex-col items-center justify-center bg-red-900/10 rounded-3xl border border-red-900/30">
           <AlertTriangle size={64} className="text-red-500 mb-6" />
           <p className="text-white font-bold mb-2">分析失敗</p>
           <p className="text-red-400 text-sm mb-6">這可能是因為 Google Search 回傳數據過於混亂或 API Key 配額限制。</p>
           <button onClick={runAnalysis} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-xl">重試一次</button>
        </div>
      )}
    </div>
  );
};
