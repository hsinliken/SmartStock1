
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, LineChart, Briefcase, Menu, X, Bot, Lightbulb, Rocket, Cloud, CloudOff, Key, User, LogOut, Copy, RefreshCw } from 'lucide-react';
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
  const [apiKeyStatus, setApiKeyStatus] = useState<'OK' | 'MISSING'>('OK');
  
  // Data State
  const [portfolio, setPortfolio] = useState<StockTransaction[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Initial Data Load
  useEffect(() => {
    const initData = async () => {
      // Load ID
      const uid = DataService.getCurrentUserId();
      setUserId(uid);

      const data = await DataService.loadUserData();
      setPortfolio(data.portfolio);
      setIsLoading(false);

      // Check API Key
      if (!process.env.API_KEY || process.env.API_KEY === '""') {
        setApiKeyStatus('MISSING');
      } else {
        setApiKeyStatus('OK');
      }
    };
    initData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      DataService.savePortfolio(portfolio);
    }
  }, [portfolio, isLoading]);

  const handleSwitchUser = () => {
    const newId = window.prompt("請輸入舊的 User ID 以恢復資料 (例如: user_abc123...)", userId);
    if (newId && newId !== userId) {
      if(window.confirm("確定要切換使用者嗎？頁面將會重新整理。")) {
        DataService.switchUser(newId);
      }
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?uid=${userId}`;
    navigator.clipboard.writeText(url);
    alert("個人專屬連結已複製！請將此連結加入書籤，以後透過此連結開啟即可保留資料。\n\n" + url);
  };

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
        } flex flex-col`}
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

        <nav className="space-y-2 flex-1">
          <NavItem view="PORTFOLIO" icon={Briefcase} label="投資組合" />
          <NavItem view="MARKET_WATCH" icon={LayoutDashboard} label="價值儀表板" />
          <NavItem view="ECONOMIC_INDICATOR" icon={Lightbulb} label="景氣燈號投資" />
          <NavItem view="AI_ANALYSIS" icon={Bot} label="AI 炒股大使" />
          <NavItem view="FUTURE_CANDIDATES" icon={Rocket} label="未來權值 50 強" />
        </nav>

        <div className="space-y-3 mt-4">
           {/* API Key Status */}
           <div className={`px-3 py-2 rounded-lg border flex items-center justify-between ${apiKeyStatus === 'OK' ? 'bg-slate-900 border-slate-800' : 'bg-red-900/20 border-red-800 animate-pulse'}`}>
              <div className="flex items-center gap-2">
                 <Key size={14} className={apiKeyStatus === 'OK' ? "text-emerald-400" : "text-red-400"} />
                 <span className="text-xs text-slate-400">API Key</span>
              </div>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${apiKeyStatus === 'OK' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-red-900/30 text-red-400'}`}>
                {apiKeyStatus === 'OK' ? 'SET' : 'MISSING'}
              </span>
           </div>

           {/* Cloud Status */}
           <div className="px-3 py-2 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
               <span className="text-xs text-slate-500">Cloud Sync</span>
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
        </div>

        {/* User Profile Section */}
        <div className="mt-4 pt-4 border-t border-slate-800">
           <div 
             className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors relative group"
             onClick={() => setShowUserMenu(!showUserMenu)}
           >
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-emerald-400 border border-slate-600">
                <User size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 font-medium">Current User</p>
                <p className="text-xs text-white truncate font-mono" title={userId}>{userId || 'Loading...'}</p>
              </div>
              
              {/* Tooltip hint */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                點擊管理帳號
              </div>
           </div>

           {/* User Menu Dropup */}
           {showUserMenu && (
             <div className="absolute bottom-20 left-4 right-4 bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-2 animate-fade-in-down z-50">
                <button 
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-700 text-xs text-slate-200 mb-1"
                >
                  <Copy size={14} className="text-emerald-400"/>
                  複製專屬連結 (備份)
                </button>
                <button 
                  onClick={handleSwitchUser}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-700 text-xs text-slate-200"
                >
                  <RefreshCw size={14} className="text-blue-400"/>
                  切換使用者 ID
                </button>
                <div className="my-2 border-t border-slate-700"></div>
                <p className="text-[10px] text-slate-500 px-2 text-center">
                  請保存您的專屬連結以防止資料遺失
                </p>
             </div>
           )}
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
             {/* Simple Indicator of API */}
             <div className="hidden md:flex items-center gap-1 text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">
                <span>Gemini 3 Pro</span>
             </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-slate-500 animate-pulse gap-2">
              <RefreshCw className="animate-spin" size={20} />
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
