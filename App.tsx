
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, LineChart, Briefcase, Menu, X, Bot, Lightbulb, Rocket, Cloud, CloudOff, Key, User as UserIcon, LogOut, FileSpreadsheet } from 'lucide-react';
import { User } from 'firebase/auth';
import { Portfolio } from './components/Portfolio';
import { Analysis } from './components/Analysis';
import { MarketWatch } from './components/MarketWatch';
import { EconomicStrategy } from './components/EconomicStrategy';
import { FutureCandidates } from './components/FutureCandidates';
import { SheetHelper } from './components/SheetHelper';
import { Login } from './components/Login';
import { ViewMode, StockTransaction } from './types';
import { DataService } from './services/dataService';
import { AuthService } from './services/authService';
import { db } from './services/firebase';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // App State
  const [currentView, setCurrentView] = useState<ViewMode>('PORTFOLIO');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'OK' | 'MISSING'>('OK');
  
  // Data State
  const [portfolio, setPortfolio] = useState<StockTransaction[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = AuthService.subscribe(async (currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);
      
      // If user logs in, load data immediately
      if (currentUser) {
        setIsLoadingData(true);
        const data = await DataService.loadUserData();
        setPortfolio(data.portfolio);
        setIsLoadingData(false);
      } else {
        setPortfolio([]); // Clear data on logout
      }
    });

    // Check API Key Env
    if (!process.env.API_KEY || process.env.API_KEY === '""') {
      setApiKeyStatus('MISSING');
    } else {
      setApiKeyStatus('OK');
    }

    return () => unsubscribe();
  }, []);

  // 2. Save Portfolio on Change (Only if logged in and not loading)
  useEffect(() => {
    if (user && !isLoadingData && !isAuthChecking) {
      DataService.savePortfolio(portfolio);
    }
  }, [portfolio, user, isLoadingData, isAuthChecking]);

  const handleLogout = async () => {
    if(window.confirm("確定要登出嗎？")) {
      await AuthService.logout();
      setShowUserMenu(false);
    }
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

  // Render Loading Screen (Initial Check)
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mr-2"></div>
        系統初始化中...
      </div>
    );
  }

  // Render Login Screen if not logged in
  if (!user) {
    return <Login />;
  }

  // Render Main App
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
          <NavItem view="SHEET_HELPER" icon={FileSpreadsheet} label="Google 試算表助手" />
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
                <UserIcon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 font-medium">Logged in as</p>
                <p className="text-xs text-white truncate font-mono" title={user.email || ''}>{user.email}</p>
              </div>
           </div>

           {/* User Menu Dropup */}
           {showUserMenu && (
             <div className="absolute bottom-20 left-4 right-4 bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-2 animate-fade-in-down z-50">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-red-900/30 text-xs text-red-300 transition-colors"
                >
                  <LogOut size={14} />
                  登出帳號
                </button>
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
            {currentView === 'SHEET_HELPER' && 'Google 試算表公式助手'}
          </h1>

          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-1 text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">
                <span>Gemini 3 Pro</span>
             </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {isLoadingData ? (
            <div className="flex h-64 items-center justify-center text-slate-500 gap-2 flex-col">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              <p>正在同步雲端資料...</p>
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
              {currentView === 'SHEET_HELPER' && (
                <SheetHelper />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
