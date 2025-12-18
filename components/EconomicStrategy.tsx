
import React, { useEffect, useState } from 'react';
import { fetchEconomicStrategyData } from '../services/geminiService';
import { DataService } from '../services/dataService';
import { ECONOMIC_STRATEGY_PROMPT } from '../constants';
import { EconomicData, CorrelatedStock, AnalysisStatus } from '../types';
import { Loader2, Lightbulb, TrendingUp, AlertTriangle, ExternalLink, RefreshCw, Wallet, Activity, Leaf, Coins, BookOpen, Settings, ChevronDown, ChevronUp, RotateCcw, Save, Check, Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';

interface EconomicStrategyProps {
  economicData: EconomicData | null;
  setEconomicData: React.Dispatch<React.SetStateAction<EconomicData | null>>;
  stocks: CorrelatedStock[];
  setStocks: React.Dispatch<React.SetStateAction<CorrelatedStock[]>>;
}

export const EconomicStrategy: React.FC<EconomicStrategyProps> = ({ economicData, setEconomicData, stocks, setStocks }) => {
  const [status, setStatus] = useState<AnalysisStatus>(economicData ? AnalysisStatus.SUCCESS : AnalysisStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [systemPrompt, setSystemPrompt] = useState<string>(ECONOMIC_STRATEGY_PROMPT);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3-pro-preview');
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const data = await DataService.loadUserData();
      setSystemPrompt(data.economicPrompt);
      setSelectedModel(data.economicModel || 'gemini-3-pro-preview');
      setIsLoadingPrompt(false);
    };
    loadData();
  }, []);

  const fetchData = async () => {
    setStatus(AnalysisStatus.LOADING);
    setErrorMessage('');
    try {
      const data = await fetchEconomicStrategyData(systemPrompt, selectedModel);
      if (data && data.economic) {
        setEconomicData(data.economic);
        setStocks(data.stocks || []);
        setStatus(AnalysisStatus.SUCCESS);
      } else {
        setErrorMessage("AI 回傳資料格式不完整");
        setStatus(AnalysisStatus.ERROR);
      }
    } catch (e: any) {
      setErrorMessage(e.message || "發生未知錯誤");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const getLightColorInfo = (light: string) => {
    switch (light) {
      case 'RED': return { bg: 'bg-red-500', text: 'text-red-500', label: '紅燈 (熱絡)', desc: '股市過熱，建議分批獲利了結' };
      case 'YELLOW_RED': return { bg: 'bg-orange-400', text: 'text-orange-400', label: '黃紅燈 (轉向)', desc: '景氣轉熱，謹慎操作，暫停加碼' };
      case 'GREEN': return { bg: 'bg-emerald-500', text: 'text-emerald-500', label: '綠燈 (穩定)', desc: '景氣穩定，持續定期定額投資' };
      case 'YELLOW_BLUE': return { bg: 'bg-yellow-400', text: 'text-yellow-400', label: '黃藍燈 (轉向)', desc: '景氣趨緩，適合分批佈局' };
      case 'BLUE': return { bg: 'bg-blue-500', text: 'text-blue-500', label: '藍燈 (低迷)', desc: '景氣低迷，最佳買點，大膽加碼' };
      default: return { bg: 'bg-slate-500', text: 'text-slate-500', label: '未知', desc: '無法判斷' };
    }
  };

  if (status === AnalysisStatus.LOADING) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-emerald-500" />
        <p className="animate-pulse">正在搜尋國發會最新景氣數據...</p>
      </div>
    );
  }

  if (status === AnalysisStatus.IDLE && !economicData) {
    return (
      <div className="bg-slate-800 p-20 rounded-xl border border-slate-700 border-dashed text-center">
         <Search className="w-16 h-16 text-slate-600 mx-auto mb-4" />
         <button onClick={fetchData} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-full shadow-lg">
           開始 AI 搜尋
         </button>
      </div>
    );
  }

  const currentInfo = economicData ? getLightColorInfo(economicData.currentLight) : { bg: '', text: '', label: '', desc: '' };

  return (
    <div className="space-y-8 animate-fade-in">
      {economicData && (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
           <div className="flex items-center gap-6">
              <div className={`w-20 h-20 rounded-full ${currentInfo.bg} flex items-center justify-center text-slate-900 font-black text-2xl`}>
                {economicData.currentScore}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{currentInfo.label}</h3>
                <p className="text-slate-400 text-sm">{currentInfo.desc}</p>
              </div>
              <button onClick={fetchData} className="ml-auto p-2 bg-slate-700 rounded-lg hover:bg-slate-600">
                <RefreshCw size={16} />
              </button>
           </div>
        </div>
      )}
    </div>
  );
};
