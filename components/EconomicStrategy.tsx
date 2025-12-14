
import React, { useEffect, useState } from 'react';
import { fetchEconomicStrategyData } from '../services/geminiService';
import { EconomicData, CorrelatedStock, AnalysisStatus } from '../types';
import { Loader2, Lightbulb, TrendingUp, AlertTriangle, ExternalLink, RefreshCw, Wallet, Activity, Leaf, Coins, BookOpen } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';

export const EconomicStrategy: React.FC = () => {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [economicData, setEconomicData] = useState<EconomicData | null>(null);
  const [stocks, setStocks] = useState<CorrelatedStock[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fetchData = async () => {
    setStatus(AnalysisStatus.LOADING);
    setErrorMessage('');
    try {
      const data = await fetchEconomicStrategyData();
      if (data && data.economic) {
        setEconomicData(data.economic);
        setStocks(data.stocks || []);
        setStatus(AnalysisStatus.SUCCESS);
      } else {
        setErrorMessage("AI 回傳資料格式不完整");
        setStatus(AnalysisStatus.ERROR);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || "發生未知錯誤");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const actionPlans = [
    {
      title: '追求極致低成本、跟隨大盤',
      tag: '新手首選',
      tickers: '006208 (富邦台50)',
      reason: '與 0050 追蹤相同指數，但內扣費用僅約 0050 的一半，長期複利效果更好。股價也比 0050 親民。',
      icon: Wallet,
      color: 'text-emerald-400',
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-900/10'
    },
    {
      title: '重視流動性、習慣操作龍頭',
      tag: '大戶首選',
      tickers: '0050 (元大台灣50)',
      reason: '全台規模最大、最老牌，流動性最好，期貨選擇權等衍生商品最齊全。但費用率較高是硬傷。',
      icon: Activity,
      color: 'text-blue-400',
      border: 'border-blue-500/30',
      bg: 'bg-blue-900/10'
    },
    {
      title: '看好 ESG / 低碳趨勢',
      tag: '趨勢分散',
      tickers: '00923 (群益低碳) / 00850 (ESG永續)',
      reason: '00923 排除高碳排傳產，更純粹的科技成長導向；00850 有單一個股權重限制，台積電佔比不像 0050 那麼高，風險較分散。',
      icon: Leaf,
      color: 'text-green-400',
      border: 'border-green-500/30',
      bg: 'bg-green-900/10'
    },
    {
      title: '資金有限、喜歡以小博大',
      tag: '小資/積極',
      tickers: '00905 (Smart) / 00922 (領袖50)',
      reason: '單價低（10~20元區間），入手無壓力。00905 帶有量化多因子策略，在多頭市場有機會衝贏大盤，但空頭時波動可能也較大。',
      icon: Coins,
      color: 'text-amber-400',
      border: 'border-amber-500/30',
      bg: 'bg-amber-900/10'
    }
  ];

  if (status === AnalysisStatus.LOADING) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-emerald-500" />
        <p className="animate-pulse">正在搜尋國發會最新景氣數據與相關 ETF...</p>
        <p className="text-xs text-slate-600 mt-2">使用模型：gemini-3-pro-preview</p>
      </div>
    );
  }

  if (status === AnalysisStatus.ERROR || !economicData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 p-6 text-center">
        <AlertTriangle className="w-12 h-12 mb-4 text-red-400" />
        <h3 className="text-lg text-white font-bold mb-2">無法載入數據</h3>
        <p className="mb-4 text-sm text-red-300 max-w-md bg-red-900/20 p-3 rounded border border-red-900/50">
          錯誤原因: {errorMessage}
        </p>
        <div className="flex gap-4">
          <a href="/" className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600 text-white text-sm">
             檢查設定
          </a>
          <button onClick={fetchData} className="px-4 py-2 bg-emerald-600 rounded hover:bg-emerald-500 text-white text-sm">
            重試
          </button>
        </div>
      </div>
    );
  }

  const currentInfo = getLightColorInfo(economicData.currentLight);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header & Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Status Card */}
        <div className="md:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-32 h-32 ${currentInfo.bg} blur-[60px] opacity-20 pointer-events-none`}></div>
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Lightbulb className={currentInfo.text} />
                景氣燈號投資法
              </h2>
              <p className="text-slate-400 text-sm mt-1">資料來源：國發會 (AI 即時搜尋)</p>
            </div>
            <a 
              href="https://index.ndc.gov.tw/m/zh_tw/data/eco/indicators" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs text-slate-500 hover:text-emerald-400 flex items-center gap-1"
            >
              官方網站 <ExternalLink size={12} />
            </a>
          </div>

          <div className="flex items-center gap-6">
            <div className={`w-24 h-24 rounded-full ${currentInfo.bg} shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center border-4 border-slate-900`}>
              <div className="text-slate-900 font-black text-3xl">{economicData.currentScore}</div>
            </div>
            <div>
               <div className="text-sm text-slate-400 mb-1">{economicData.currentDate} 統計結果</div>
               <div className={`text-3xl font-bold ${currentInfo.text} mb-2`}>{currentInfo.label}</div>
               <div className="text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-slate-700 text-sm leading-relaxed max-w-lg">
                 <span className="font-bold text-white">操作策略：</span> {currentInfo.desc}
               </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-700 text-slate-400 text-sm">
             <span className="font-bold text-emerald-400">AI 觀點：</span> {economicData.description}
          </div>
        </div>

        {/* Strategy Rule Card */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-4">判斷規則</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded bg-red-900/20 border border-red-900/50">
                <span className="text-red-400 font-bold">紅燈 (38-45)</span>
                <span className="text-xs text-red-200">賣出/減碼</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-orange-900/20 border border-orange-900/50">
                <span className="text-orange-400 font-bold">黃紅燈 (32-37)</span>
                <span className="text-xs text-orange-200">觀望</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-emerald-900/20 border border-emerald-900/50">
                <span className="text-emerald-400 font-bold">綠燈 (23-31)</span>
                <span className="text-xs text-emerald-200">持有</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-yellow-900/20 border border-yellow-900/50">
                <span className="text-yellow-400 font-bold">黃藍燈 (17-22)</span>
                <span className="text-xs text-yellow-200">關注</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-blue-900/20 border border-blue-900/50">
                <span className="text-blue-400 font-bold">藍燈 (9-16)</span>
                <span className="text-xs text-blue-200">買進</span>
              </div>
            </div>
          </div>
          <button 
             onClick={fetchData} 
             className="mt-4 w-full flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-200 transition-colors"
          >
            <RefreshCw size={14} /> 更新數據
          </button>
        </div>
      </div>

      {/* History Chart */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg h-[400px]">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-emerald-400"/>
          近一年景氣分數走勢
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={economicData.history} margin={{ top: 5, right: 20, bottom: 25, left: 0 }}>
            {/* Background Zones for Lights */}
            <ReferenceArea y1={38} y2={45} fill="#7f1d1d" fillOpacity={0.1} /> {/* Red */}
            <ReferenceArea y1={32} y2={38} fill="#c2410c" fillOpacity={0.1} /> {/* Yellow-Red */}
            <ReferenceArea y1={23} y2={32} fill="#064e3b" fillOpacity={0.1} /> {/* Green */}
            <ReferenceArea y1={17} y2={23} fill="#713f12" fillOpacity={0.1} /> {/* Yellow-Blue */}
            <ReferenceArea y1={9} y2={17} fill="#1e3a8a" fillOpacity={0.1} /> {/* Blue */}

            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 12}} />
            <YAxis domain={[9, 45]} stroke="#94a3b8" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Line 
              type="monotone" 
              dataKey="score" 
              stroke="#10b981" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#10b981' }} 
              activeDot={{ r: 6 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recommended ETFs List */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
        <div className="p-6 border-b border-slate-700">
           <h3 className="text-lg font-bold text-white">大盤連動型 ETF 推薦清單 (AI 即時)</h3>
           <p className="text-sm text-slate-400">當景氣燈號出現「藍燈」或「黃藍燈」時，這些標的為首選佈局對象。</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4">代號 / 名稱</th>
                <th className="px-6 py-4 text-right">即時參考價</th>
                <th className="px-6 py-4">關聯性</th>
                <th className="px-6 py-4">說明</th>
                <th className="px-6 py-4 text-center">目前建議</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {stocks.map((stock) => (
                <tr key={stock.ticker} className="hover:bg-slate-750">
                  <td className="px-6 py-4 font-medium text-white">
                    <div className="flex flex-col">
                      <span className="text-base">{stock.ticker}</span>
                      <span className="text-xs text-slate-500">{stock.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-emerald-300 text-base">
                    ${stock.price}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-2 py-1 rounded bg-slate-700 text-xs text-slate-300">
                      {stock.correlation}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 max-w-xs">
                    {stock.description}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`font-bold ${
                      stock.recommendation.includes('買') || stock.recommendation.includes('Buy') ? 'text-blue-400' : 
                      stock.recommendation.includes('賣') || stock.recommendation.includes('Sell') ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {stock.recommendation}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Plan Section */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <BookOpen size={20} className="text-blue-400"/>
          ETF 購買優先順序建議 (Action Plan)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {actionPlans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <div key={index} className={`p-5 rounded-lg border ${plan.border} ${plan.bg} relative group transition-transform hover:-translate-y-1`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-slate-900/50 ${plan.color}`}>
                       <Icon size={20} />
                    </div>
                    <h4 className="font-bold text-slate-100 text-lg">{plan.title}</h4>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full bg-slate-900/80 ${plan.color} border border-slate-700`}>
                    {plan.tag}
                  </span>
                </div>
                
                <div className="mb-3">
                  <span className="text-xs text-slate-400 uppercase tracking-wider">首選標的</span>
                  <div className={`font-mono font-bold text-lg ${plan.color}`}>
                    {plan.tickers}
                  </div>
                </div>
                
                <p className="text-sm text-slate-300 leading-relaxed border-t border-slate-700/50 pt-3">
                  {plan.reason}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
