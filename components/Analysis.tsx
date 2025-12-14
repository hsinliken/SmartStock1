
import React, { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, BarChart2, Settings, RotateCcw, ChevronDown, ChevronUp, Save, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeChartImage } from '../services/geminiService';
import { DataService } from '../services/dataService';
import { AnalysisStatus } from '../types';
import { AI_ANALYSIS_PROMPT } from '../constants';

export const Analysis: React.FC = () => {
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prompt Management State
  const [systemPrompt, setSystemPrompt] = useState<string>(AI_ANALYSIS_PROMPT);
  const [showPromptSettings, setShowPromptSettings] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true);

  // Load Prompt from Cloud/Local
  useEffect(() => {
    const loadData = async () => {
      const data = await DataService.loadUserData();
      setSystemPrompt(data.aiPrompt);
      setIsLoadingPrompt(false);
    };
    loadData();
  }, []);

  const handleSavePrompt = async () => {
    setIsSaved(true); // Optimistic UI
    await DataService.saveAiPrompt(systemPrompt);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleResetPrompt = async () => {
    if (window.confirm('確定要恢復預設的 AI 指令嗎？您的自定義修改將會遺失。')) {
      const defaultPrompt = AI_ANALYSIS_PROMPT;
      setSystemPrompt(defaultPrompt);
      await DataService.saveAiPrompt(defaultPrompt);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setStatus(AnalysisStatus.IDLE);
        setResult('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setStatus(AnalysisStatus.LOADING);
    try {
      const analysisText = await analyzeChartImage(selectedImage, systemPrompt);
      setResult(analysisText);
      setStatus(AnalysisStatus.SUCCESS);
    } catch (error) {
      console.error(error);
      setResult("發生錯誤：無法完成分析，請檢查 API Key 設置。");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2">
            <BarChart2 className="w-6 h-6" />
            智慧炒股大使 (AI 技術分析)
          </h2>
          <button
            onClick={() => setShowPromptSettings(!showPromptSettings)}
            disabled={isLoadingPrompt}
            className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              showPromptSettings 
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/50' 
                : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
            }`}
          >
            {isLoadingPrompt ? <Loader2 size={14} className="animate-spin" /> : <Settings size={14} />}
            設定 AI 指令
            {showPromptSettings ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
        
        {/* Prompt Settings Panel */}
        {showPromptSettings && (
          <div className="mb-6 p-4 bg-slate-900/60 rounded-xl border border-slate-700 animate-fade-in">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-slate-300">
                AI 角色設定與分析指令 (System Prompt)
              </label>
              <button 
                onClick={handleResetPrompt}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <RotateCcw size={12} />
                恢復預設值
              </button>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full h-48 bg-slate-800 text-slate-200 text-sm p-3 rounded-lg border border-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none font-mono"
              placeholder="輸入您希望 AI 遵循的分析規則..."
            />
            <div className="flex justify-between items-center mt-3">
              <p className="text-xs text-slate-500">
                提示：您可以修改此指令來調整分析風格。請記得點擊右側按鈕儲存。
              </p>
              <button 
                onClick={handleSavePrompt}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isSaved 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-700 hover:bg-emerald-600 text-white'
                }`}
              >
                {isSaved ? <Check size={16} /> : <Save size={16} />}
                {isSaved ? '已儲存設定' : '儲存設定'}
              </button>
            </div>
          </div>
        )}

        <p className="text-slate-400 mb-6">
          上傳 K 線圖或技術分析圖表，AI 大使將為您解讀趨勢、關鍵價位並提供操作建議。
        </p>

        {/* Upload Area */}
        <div 
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
            selectedImage ? 'border-emerald-500/50 bg-slate-800' : 'border-slate-600 hover:border-emerald-500 hover:bg-slate-750'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          
          {selectedImage ? (
            <div className="flex flex-col items-center">
              <img src={selectedImage} alt="Analysis Target" className="max-h-64 rounded-lg shadow-md mb-4" />
              <button 
                className="text-sm text-slate-400 hover:text-white underline"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(null);
                  setResult('');
                }}
              >
                移除並重新上傳
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8">
              <div className="bg-slate-700 p-4 rounded-full mb-4">
                <Upload className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-lg font-medium text-slate-200">點擊上傳圖表截圖</p>
              <p className="text-sm text-slate-500 mt-2">支援 JPG, PNG, WEBP</p>
            </div>
          )}
        </div>

        {/* Action Button */}
        {selectedImage && status !== AnalysisStatus.LOADING && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleAnalyze}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition hover:scale-105 active:scale-95"
            >
              開始深度分析
            </button>
          </div>
        )}

        {/* Loading State */}
        {status === AnalysisStatus.LOADING && (
          <div className="mt-8 flex flex-col items-center justify-center p-8 bg-slate-900/50 rounded-xl">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
            <p className="text-emerald-400 font-medium animate-pulse">
              智慧大使正在解讀盤勢與推演劇本...
            </p>
            <p className="text-xs text-slate-500 mt-2">這可能需要幾秒鐘</p>
          </div>
        )}
      </div>

      {/* Results Area */}
      {result && (
        <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-lg">
          <div className="prose prose-invert max-w-none prose-emerald">
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-emerald-400 border-b border-emerald-900 pb-2 mb-4" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-bold text-white mt-8 mb-4 flex items-center before:content-[''] before:block before:w-1 before:h-6 before:bg-emerald-500 before:mr-2" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-emerald-200 mt-6 mb-2" {...props} />,
                strong: ({node, ...props}) => <strong className="text-emerald-300 font-bold" {...props} />,
                li: ({node, ...props}) => <li className="mb-1" {...props} />,
                table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="w-full text-left border-collapse" {...props} /></div>,
                th: ({node, ...props}) => <th className="bg-slate-700 p-2 border border-slate-600 text-emerald-100" {...props} />,
                td: ({node, ...props}) => <td className="p-2 border border-slate-600" {...props} />,
              }}
            >
              {result}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};
