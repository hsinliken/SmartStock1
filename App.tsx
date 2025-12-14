
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, LineChart, Briefcase, Menu, X, Bot, Lightbulb, Rocket, Cloud, CloudOff } from 'lucide-react';
import { Portfolio } from './components/Portfolio';
import { Analysis } from './components/Analysis';
import { MarketWatch } from './components/MarketWatch';
import { EconomicStrategy } from './components/EconomicStrategy';
import { FutureCandidates } from './components/FutureCandidates';
import { ViewMode, StockTransaction } from './types';
import { DataService } from './services/dataService';
import { db } from './services/firebase';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('PORTFOLIO');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Data State
  const [portfolio, setPortfolio] = useState<StockTransaction[]>([]);

  // Initial Data Load
  useEffect(() => {
    const initData = async () => {
      const data = await DataService.loadUserData();
      setPortfolio(data.portfolio);
      setIsLoading(false);
    };
    initData();
  }, []);

  // Save on Change (Debounced slightly in real apps, but direct here for simplicity)
  // We wrap the DataService call to avoid dependency loops, but strictly speaking
  // The DataService.savePortfolio updates local AND cloud.
  // However, since Portfolio component calls setPortfolio, we need to detect changes.
  // Best practice: Pass the save function to the component, or use an Effect.
  useEffect(() => {
    if (!isLoading) {
      DataService.savePortfolio(portfolio);
    }
  }, [portfolio, isLoading]);

  // Helper for Nav Items
  const NavItem = ({ view, icon: Icon, label }: { view: ViewMode; icon: any; label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        currentView === view 
          ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 flex">
      {/* Sidebar - Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside 
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-slate-950 border-r border-slate-800 p-4 z-50 transform transition-transform lg:transform-none ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <LineChart className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
              SmartStock
            </span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400">
            <X size={24} />
          </button>
        </div>

        <nav className="space-y-2">
          <NavItem view="PORTFOLIO" icon={Briefcase} label="投資組合" />
          <NavItem view="MARKET_WATCH" icon={LayoutDashboard} label="價值儀表板" />
          <NavItem view="ECONOMIC_INDICATOR" icon={Lightbulb} label="景氣燈號投資" />
          <NavItem view="AI_ANALYSIS" icon={Bot} label="AI 炒股大使" />
          <NavItem view="FUTURE_CANDIDATES" icon={Rocket} label="未來權值 50 強" />
        </nav>

        <div className="absolute bottom-4 left-4 right-4 p-4 bg-slate-900 rounded-xl border border-slate-800">
           <div className="flex items-center justify-between mb-2">
             <p className="text-xs text-slate-500">Cloud Status</p>
             {db ? (
               <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                 <Cloud size={12} /> Online
               </div>
             ) : (
               <div className="flex items-center gap-1 text-[10px] text-slate-500">
                 <CloudOff size={12} /> Local
               </div>
             )}
           </div>
           <p className="text-xs text-slate-500 mb-1">Powered by</p>
           <div className="flex items-center gap-2 text-slate-300 font-bold">
             <span>Gemini 2.5 Flash</span>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-slate-400"
          >
            <Menu size={24} />
          </button>
          
          <h1 className="text-lg font-semibold text-white">
            {currentView === 'PORTFOLIO' && '我的投資組合'}
            {currentView === 'MARKET_WATCH' && '市場價值監控'}
            {currentView === 'ECONOMIC_INDICATOR' && '景氣燈號投資策略'}
            {currentView === 'AI_ANALYSIS' && '智能技術分析'}
            {currentView === 'FUTURE_CANDIDATES' && '未來權值 50 強潛力股'}
          </h1>

          <div className="flex items-center gap-4">
             {/* Optional User Avatar or settings */}
             <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400">
               USER
             </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-slate-500 animate-pulse">
              載入雲端資料中...
            </div>
          ) : (
            <>
              {currentView === 'PORTFOLIO' && (
                <Portfolio portfolio={portfolio} setPortfolio={setPortfolio} />
              )}
              {currentView === 'MARKET_WATCH' && (
                <MarketWatch />
              )}
              {currentView === 'ECONOMIC_INDICATOR' && (
                <EconomicStrategy />
              )}
              {currentView === 'AI_ANALYSIS' && (
                <Analysis />
              )}
              {currentView === 'FUTURE_CANDIDATES' && (
                <FutureCandidates />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
