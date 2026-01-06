
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { fetchHotSectorsAnalysis, fetchSectorDetailAnalysis } from '../services/geminiService';
import { DataService } from '../services/dataService';
import { AnalysisStatus, HotSectorsAnalysisResult, HotSector } from '../types';
import { 
  Flame, TrendingUp, Users, Newspaper, 
  AlertTriangle, RefreshCw, Loader2, ChevronRight, 
  BarChart3, ShieldCheck, Zap, Activity, Info, X, 
  ArrowRightCircle, SearchCode
} from 'lucide-react';

interface HotSectorsProps {
  cachedData: HotSectorsAnalysisResult | null;
  setCachedData: React.Dispatch<React.SetStateAction<HotSectorsAnalysisResult | null>>;
}

export const HotSectors: React.FC<HotSectorsProps> = ({ cachedData, setCachedData }) => {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [detailStatus, setDetailStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [selectedSector, setSelectedSector] = useState<HotSector | null>(null);
  const [detailReport, setDetailReport] = useState<string>('');

  // 初始化時讀取雲端存儲的族群
  useEffect(() => {
    const init = async () => {
      if (!cachedData) {
        setStatus(AnalysisStatus.LOADING);
        const data = await DataService.loadUserData();
        if (data.hotSectors) {
          setCachedData(data.hotSectors);
          setStatus(AnalysisStatus.SUCCESS);
        } else {
          setStatus(AnalysisStatus.IDLE);
        }
      } else {
        setStatus(AnalysisStatus.SUCCESS);
      }
    };
    init();
  }, []);

  const runScanning = async () => {
    setStatus(AnalysisStatus.LOADING);
    setSelectedSector(null);
    setDetailReport('');
    const result = await fetchHotSectorsAnalysis();
    if (result && result.top_sectors) {
      setCachedData(result);
      await DataService.saveHotSectors(result);
      setStatus(AnalysisStatus.SUCCESS);
    } else {
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const handleDeepDive = async (sector: HotSector) => {
    setSelectedSector(sector);
    setDetailStatus(AnalysisStatus.LOADING);
    setDetailReport('');
    
    // 平滑滾動到報告區域
    setTimeout(() => {
      document.getElementById('deep-dive-report')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    const report = await fetchSectorDetailAnalysis(sector.name);
    setDetailReport(report);
    setDetailStatus(AnalysisStatus.SUCCESS);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* 頂部 Header */}
      <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Flame size={160} className="text-orange-500" />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 flex items-center gap-3">
            <Flame className="text-orange-500" />
            股票熱門族群分析
          </h2>
          <p className="text-slate-400 mt-2 max-w-2xl">
            第一階：AI 掃描全市場 Top 5 熱門族群。第二階：點擊族群進行「個股別」深度產業對決分析。
          </p>
          <div className="mt-6 flex items-center gap-4">
             <button 
              onClick={runScanning}
              disabled={status === AnalysisStatus.LOADING}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50"
             >
               {status === AnalysisStatus.LOADING ? <Loader2 className="animate-spin" /> : <RefreshCw />}
               手動更新市場掃描
             </button>
             {cachedData && (
               <span className="text-xs text-slate-500 font-mono">
                 最後掃描日期：{cachedData.update_date}
               </span>
             )}
          </div>
        </div>
      </div>

      {status === AnalysisStatus.LOADING && (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-800/30 rounded-3xl border border-slate-700 border-dashed">
          <Loader2 className="w-16 h-16 animate-spin text-orange-500 mb-6" />
          <p className="text-xl font-bold text-white tracking-widest animate-pulse uppercase">Scanning Taiwan Market Top 5 Sectors...</p>
        </div>
      )}

      {status === AnalysisStatus.SUCCESS && cachedData && (
        <div className="space-y-8">
          {/* 第一階：族群卡片列表 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {cachedData.top_sectors.map((sector, idx) => (
              <div 
                key={idx} 
                onClick={() => handleDeepDive(sector)}
                className={`cursor-pointer group relative bg-slate-800 p-5 rounded-2xl border transition-all hover:scale-[1.03] active:scale-95 ${
                  selectedSector?.name === sector.name ? 'border-orange-500 ring-1 ring-orange-500' : 'border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-orange-500 font-black border border-slate-700">
                    {idx + 1}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">熱度</span>
                    <p className="text-orange-500 font-black leading-none">{sector.hot_score}%</p>
                  </div>
                </div>
                <h3 className="text-lg font-black text-white mb-2 group-hover:text-orange-400 transition-colors">{sector.name}</h3>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                  {sector.narrative}
                </p>
                <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase">
                  <span>深度分析</span>
                  <ArrowRightCircle size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>

          {/* 第二階：深度報告區域 */}
          {selectedSector && (
            <div id="deep-dive-report" className="space-y-6 animate-fade-in-down">
               <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-700 shadow-2xl">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-700 pb-6">
                     <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-orange-600 text-[10px] text-white font-black rounded uppercase">Stage 2 Analysis</span>
                          <h3 className="text-2xl font-black text-white">【{selectedSector.name}】公司別深度分析</h3>
                        </div>
                        <p className="text-slate-400 text-sm">正在針對該族群之龍頭企業、營收獲利與籌碼位階進行透視分析。</p>
                     </div>
                     <button onClick={() => setSelectedSector(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500">
                       <X size={24} />
                     </button>
                  </div>

                  {detailStatus === AnalysisStatus.LOADING ? (
                    <div className="py-20 flex flex-col items-center justify-center">
                       <SearchCode size={48} className="text-orange-500 animate-bounce mb-4" />
                       <p className="text-white font-bold tracking-widest animate-pulse">AI 研究員正在檢索個股財報與產業位階...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                       {/* 左側：Markdown 報告 */}
                       <div className="lg:col-span-2 bg-slate-800 p-8 rounded-2xl border border-slate-700 prose prose-invert max-w-none">
                          <ReactMarkdown
                            components={{
                              h2: ({node, ...props}) => <h2 className="text-xl font-black text-orange-400 border-l-4 border-orange-500 pl-3 mb-4 mt-8" {...props} />,
                              strong: ({node, ...props}) => <strong className="text-white font-bold bg-orange-900/30 px-1 rounded" {...props} />,
                            }}
                          >
                            {detailReport}
                          </ReactMarkdown>
                       </div>

                       {/* 右側：族群概覽側欄 */}
                       <div className="space-y-6">
                          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                             <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                               <TrendingUp size={14} /> 核心代表股
                             </h4>
                             <div className="space-y-3">
                                {selectedSector.representative_stocks.map((s, si) => (
                                  <div key={si} className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                                     <div className="flex justify-between mb-1">
                                        <span className="text-sm font-bold text-white">{s.name} <span className="font-mono text-xs text-slate-500">{s.ticker}</span></span>
                                        <span className="text-xs text-orange-400 font-bold">{s.strength_score}%</span>
                                     </div>
                                     <p className="text-[10px] text-slate-400 italic leading-relaxed">{s.reason}</p>
                                  </div>
                                ))}
                             </div>
                          </div>

                          <div className="bg-red-900/10 p-6 rounded-2xl border border-red-900/30">
                             <h4 className="text-xs font-black text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                               <AlertTriangle size={14} /> 風險警示
                             </h4>
                             <p className="text-xs text-red-300 leading-relaxed">{selectedSector.risk_warning}</p>
                          </div>
                       </div>
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>
      )}

      {status === AnalysisStatus.IDLE && (
        <div className="py-32 flex flex-col items-center justify-center bg-slate-800/30 rounded-3xl border border-slate-700 border-dashed text-center">
           <BarChart3 size={64} className="text-slate-700 mb-6" />
           <p className="text-slate-500 mb-8 max-w-sm">
              尚未掃描市場數據。請點擊「手動更新市場掃描」來獲取目前台股最熱門的 5 個族群。
           </p>
           <button onClick={runScanning} className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-xl transition-all font-bold">
              首次啟動 AI 市場掃描
           </button>
        </div>
      )}
    </div>
  );
};
