import React, { useState } from 'react';
import { AuthService } from '../services/authService';
import { LogIn, UserPlus, LineChart, Loader2, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegistering) {
        await AuthService.register(email, password);
      } else {
        await AuthService.login(email, password);
      }
      // Successful login/register will trigger onAuthStateChanged in App.tsx
    } catch (err: any) {
      console.error(err);
      setError(AuthService.getErrorMessage(err.code));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center animate-fade-in-down">
        <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
          <LineChart className="text-white" size={32} />
        </div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
          SmartStock
        </h1>
        <p className="text-slate-400 mt-2 text-sm">AI 驅動的投資分析助理</p>
      </div>

      <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden animate-fade-in">
        <div className="p-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            {isRegistering ? <UserPlus size={24} className="text-emerald-400"/> : <LogIn size={24} className="text-emerald-400"/>}
            {isRegistering ? '註冊新帳號' : '登入您的帳號'}
          </h2>

          {error && (
            <div className="mb-6 bg-red-900/20 border border-red-900/50 text-red-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="name@example.com"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">密碼</label>
              <input 
                type="password" 
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  處理中...
                </>
              ) : (
                isRegistering ? '建立帳號' : '登入'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
                setPassword('');
              }}
              className="text-sm text-slate-400 hover:text-white transition-colors border-b border-dashed border-slate-600 hover:border-white pb-0.5"
            >
              {isRegistering ? '已有帳號？點此登入' : '還沒有帳號？點此註冊'}
            </button>
          </div>
        </div>
        
        {/* Footer Info */}
        <div className="bg-slate-900 p-4 text-center border-t border-slate-700">
           <p className="text-xs text-slate-500">
             使用 Firebase Authentication 進行安全驗證<br/>您的投資數據將加密存儲於雲端
           </p>
        </div>
      </div>
    </div>
  );
};