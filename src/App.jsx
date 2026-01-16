import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, PhoneCall, MapPin, Users, CheckCircle2, Info, Clock, 
  Megaphone, ShieldAlert, Search, Navigation, Volume2, ArrowLeft, 
  ChevronRight, ClipboardCheck, Map, UserSearch, ShieldCheck, Compass, 
  HeartHandshake, Stethoscope, ExternalLink, Store, MapPinned, XCircle, 
  Eye, ListChecks, AlertCircle, Building2, Trees, ChevronRightCircle, 
  Flag, MessageSquareQuote, Home
} from 'lucide-react';

// --- TTS 工具函式 (改用瀏覽器內建 Web Speech API，無需 API Key) ---
const playTTS = (text) => {
  try {
    const utterance = new SpeechSynthesisUtterance(`請用專業廣播口氣朗讀：${text}`);
    // 嘗試設定中文語音
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.includes('zh-TW') || v.lang.includes('zh'));
    if (zhVoice) utterance.voice = zhVoice;
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.cancel(); // 停止上一句
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error("TTS 播放失敗", e);
  }
};

// --- 主程式組件 ---
const App = () => {
  const [currentPage, setCurrentPage] = useState('main');
  const [completedSteps, setCompletedSteps] = useState([]);
  const [stepTimestamps, setStepTimestamps] = useState({}); 
  const [subStepTimestamps, setSubStepTimestamps] = useState({}); 
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [searchMode, setSearchMode] = useState('internal'); 
  const [mobileViewMode, setMobileViewMode] = useState('list'); 
  const [subCheckItems, setSubCheckItems] = useState({});
  
  // 雖然目前沒用到，但保留結構以便未來擴充
  const [patientInfo] = useState({ 
    name: '個案', gender: '男', idNum: '', clothing: '院服', location: '病房', direction: '不詳'
  });

  // SOP 步驟資料 (Hardcoded)
  const sopSteps = [
    { id: 1, title: '🚨 發現異常狀況', icon: <Search className="w-6 h-6" />, must: ['🔍 確認病人不在原位', '👀 確認是否目擊不假離院'], warn: ['未確認清楚就通報會造成混亂', '不可單獨離開現場追逐'] },
    { id: 2, title: '📞 立即通報 333', icon: <PhoneCall className="w-6 h-6" />, must: ['☎️ 拿電話按 400 或 Speak', '🗣 清楚說出地點、人名、方向', '📢 判斷院內/院外協尋，並用Juiker公告啟動'], warn: ['廣播內容不清會延誤協尋', '記得回報最後目擊移動方向'] },
    { 
      id: 3, 
      title: '🔍 啟動分流協尋', 
      icon: <MapPin className="w-6 h-6" />, 
      must: ['🏃 依指定路線搜尋', '🚗 兩人一組外出協尋', '📱 回應進度精簡(尋獲/未尋獲)'], 
      warn: ['禁止單人行動', '發現蹤跡不可強制接觸'], 
      example: '一病房第一組未尋獲；行政第一組在xxx尋獲',
      isSplitAction: true 
    },
    { id: 4, title: '👥 成立指揮站', icon: <ShieldAlert className="w-6 h-6" />, must: ['🏥 病房成立臨時指揮站', '👨‍⚕️ 主管＋醫師＋主責社工到位', '📱 集中回報協尋資訊'], warn: ['未指定留守人員會導致病房混亂', '確保指揮站通訊與充電'] },
    { id: 5, title: '👀 發現病患蹤跡', icon: <Eye className="w-6 h-6" />, must: ['📞 立即回報指揮站', '🧍 保持距離跟隨'], warn: ['人力不足不得接觸', '持有攻擊工具須通報警方'] },
    { id: 6, title: '🤝 勸服與帶返', icon: <HeartHandshake className="w-6 h-6" />, must: ['🗣 醫師或指揮站協助勸服', '🚗 安排安全方式返院'], warn: ['不可強制壓制', '確保雙方人員安全'] },
    { id: 7, title: '❌ 無法尋獲結案', icon: <XCircle className="w-6 h-6" />, must: ['📞 30分鐘內報警備案', '📝 完成事件通報'], warn: ['超過 30 分鐘未報警屬嚴重疏失'] }
  ];

  // 路線資料 (Hardcoded - 已修正連結)
  const externalRoutes = {
    ward1: [
      { id: '一病房 1', path: '第一組：正門 → 爬山路線 → 廣天宮 → 員水路', mapUrl: 'https://maps.app.goo.gl/VyM7UAog79xh6NFs6' }, 
      { id: '一病房 2', path: '第二組：正門 → 廣成安養院左轉 → 員水路萊爾富 → 員林市區方向', mapUrl: 'https://maps.app.goo.gl/qrNCLNUdqHJWy1a49' }
    ],
    ward2: [
      { id: '二病房 1', path: '正門 → 廣成安養院 right 轉 → 穿過員水路小路 → 青山國小後方 → 林厝派出所 → 山腳路 → 中洲', mapUrl: 'https://maps.app.goo.gl/61cunCZeComGXsQg8' }
    ],
    ward3: [
      { id: '三病房 1', path: '後門 → 右轉 → 往果園方向到底 → 另一方向折返', mapUrl: 'https://maps.app.goo.gl/VzHU3xZGUxqTiBUg9' }
    ],
    admin: [
      { id: '行政 1', path: '後門 → 左轉 → 木材行右轉 → 金龍橋左轉 → 往排水溝方向 → 員水路', mapUrl: 'https://maps.app.goo.gl/MPyPFYJmW36VycrT7' }, 
      { id: '行政 2', path: '後門 → 左轉 → 木材行右轉 → 金龍橋右轉 → 山頂', mapUrl: 'https://maps.app.goo.gl/o4EWPKrwfsGkfhMP8' }, 
      { id: '行政 3', path: '後門 → 左轉 → 木材行右轉 → 金龍橋右轉 → 宿舍前方 → 中洲 → 山腳路', mapUrl: 'https://maps.app.goo.gl/bWUXzELdrsMde8Qj7' }
    ],
    ot: [
      { id: '職能科', path: '後門 → 左轉 → 木材行右轉 → 金龍橋左轉 → 山腳路左轉 → 林厝派出所', mapUrl: 'https://maps.app.goo.gl/VuJXpfRyKPHZZWaG7' }
    ]
  };

  const internalRoutes = {
    admin: [{ id: 'A區', path: '地下停車場、值班室、院長室' }, { id: 'B區', path: '樓梯間、頂樓陽台、洗衣場' }, { id: 'C區', path: '醫院週邊區域、門禁設施' }],
    pharmacy: [{ id: '藥劑科', path: '圖書室、茶水間、行政廁所' }],
    social: [{ id: '社工科', path: '一樓大廳、1-2診間、候診區、電梯、廁所' }],
    ot: [{ id: '職能科', path: '產業治療區、活動室、廚房、主機室' }],
    dayward: [{ id: '日間病房', path: '日間廁所、復健商店' }],
    ward1: [{ id: '一病房區', path: '病房、角落、微風廣場、風雨操場' }],
    ward2: [{ id: '二病房區', path: '病室、角落、微風廣場、風雨操場' }],
    ward3: [{ id: '三病房區', path: '病房、角落、微風廣場' }]
  };

  const labels = { admin: '行政科', pharmacy: '藥劑科', social: '社工科', ot: '職能科', dayward: '日間病房', ward1: '一病房', ward2: '二病房', ward3: '三病房', all: '全部' };

  const start333Action = () => {
    playTTS("啟動三三三協尋機制。");
    setCompletedSteps([]);
    setStepTimestamps({});
    setSubStepTimestamps({});
    setSubCheckItems({});
    setSelectedStepIndex(0); 
    setCurrentPage('process');
    setMobileViewMode('list');
  };

  const toggleStep = (index) => {
    if (completedSteps.includes(index)) {
      setCompletedSteps(prev => prev.filter(i => i !== index));
    } else {
      setCompletedSteps(prev => [...prev, index]);
      const now = new Date();
      setStepTimestamps(prev => ({ ...prev, [index]: now.toLocaleTimeString('zh-TW', { hour12: false }) }));
    }
  };

  const handleSplitAction = (e, mode) => {
    e.stopPropagation();
    const now = new Date();
    setSubStepTimestamps(prev => ({ ...prev, [mode]: now.toLocaleTimeString('zh-TW', { hour12: false }) }));
    setSearchMode(mode);
    setCurrentPage('routes');
  };

  const toggleSubCheck = (stepId, index) => {
    const key = `${stepId}-${index}`;
    setSubCheckItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStepClick = (idx) => {
    setSelectedStepIndex(idx);
    if (window.innerWidth < 1024) setMobileViewMode('detail');
  };

  const handleNextStep = () => {
    if (selectedStepIndex < sopSteps.length - 1) {
      setSelectedStepIndex(selectedStepIndex + 1);
      const detailContainer = document.querySelector('.custom-scrollbar');
      if (detailContainer) detailContainer.scrollTop = 0;
    } else {
      setCurrentPage('main');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 overflow-x-hidden">
      {/* 標頭 */}
      <header className="bg-red-700 text-white px-4 py-3 flex justify-between items-center sticky top-0 z-[60] shadow-xl border-b-2 border-red-800 transition-all">
        <div 
          onClick={() => setCurrentPage('main')} 
          className="flex items-center gap-2 cursor-pointer active:opacity-70 transition-opacity"
        >
          <AlertTriangle className="animate-pulse w-5 h-5 text-yellow-300" />
          <h1 className="text-lg font-black tracking-tight uppercase flex items-center gap-2">
            應變指揮系統 <Home className="w-4 h-4 opacity-50" />
          </h1>
        </div>
        <div className="bg-white/20 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/30 font-mono font-bold text-[10px]">
          <PhoneCall className="w-3 h-3 text-yellow-200" /> 撥 400
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-5xl mx-auto transition-all">
        {/* --- 首頁 --- */}
        {currentPage === 'main' && (
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 items-center">
            
            <section className="w-full max-w-md mt-6">
              <button 
                onClick={start333Action}
                className="w-full bg-red-600 hover:bg-red-700 text-white p-12 rounded-[40px] flex flex-col items-center justify-center gap-6 transition-all shadow-[0_20px_50px_rgba(220,38,38,0.3)] active:scale-95 border-b-8 border-red-800"
              >
                <div className="bg-white/20 p-6 rounded-full animate-pulse">
                  <Megaphone className="w-16 h-16 text-white" />
                </div>
                <div className="text-center space-y-2">
                  <div className="text-5xl font-black tracking-[0.2em]">啟動 333</div>
                  <div className="text-sm font-bold opacity-80">發布院內協尋並開啟檢核作業</div>
                </div>
              </button>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              <button onClick={() => setCurrentPage('roles')} className="bg-white hover:bg-amber-50 group p-6 rounded-3xl border-2 border-slate-100 flex items-center justify-between transition-all shadow-sm active:scale-95">
                <div className="text-left flex items-center gap-4">
                  <div className="bg-amber-100 p-3 rounded-2xl group-hover:bg-amber-500 transition-colors">
                    <Users className="w-6 h-6 text-amber-600 group-hover:text-white" />
                  </div>
                  <div><div className="text-lg font-black text-slate-800">職責組別</div><div className="text-[10px] text-slate-400">分工說明</div></div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </button>
              <button onClick={() => setCurrentPage('routes')} className="bg-white hover:bg-blue-50 group p-6 rounded-3xl border-2 border-slate-100 flex items-center justify-between transition-all shadow-sm active:scale-95">
                <div className="text-left flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-2xl group-hover:bg-blue-500 transition-colors">
                    <Map className="w-6 h-6 text-blue-600 group-hover:text-white" />
                  </div>
                  <div><div className="text-lg font-black text-slate-800">協尋路線</div><div className="text-[10px] text-slate-400">區域速查</div></div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </button>
              <button onClick={() => setCurrentPage('process')} className="bg-white hover:bg-indigo-50 group p-6 rounded-3xl border-2 border-slate-100 flex items-center justify-between transition-all shadow-sm active:scale-95">
                <div className="text-left flex items-center gap-4">
                  <div className="bg-indigo-100 p-3 rounded-2xl group-hover:bg-indigo-500 transition-colors">
                    <ClipboardCheck className="w-6 h-6 text-indigo-600 group-hover:text-white" />
                  </div>
                  <div><div className="text-lg font-black text-slate-800">流程檢核</div><div className="text-[10px] text-slate-400">SOP 紀錄</div></div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </button>
            </div>
          </div>
        )}

        {/* --- 職責組別頁面 --- */}
        {currentPage === 'roles' && (
          <div className="animate-in fade-in duration-300 space-y-6 pb-10 px-2">
            <button onClick={() => setCurrentPage('main')} className="flex items-center gap-1.5 text-slate-500 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 text-xs active:bg-slate-100 transition-all">
              <ArrowLeft className="w-4 h-4" /> 返回首頁
            </button>
            <h2 className="text-xl font-black text-slate-800 uppercase px-2 tracking-tighter">職責組別分工說明</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* A組：發現者 */}
              <div className="bg-white rounded-2xl border border-amber-100 shadow-md overflow-hidden">
                <div className="bg-amber-500 p-4 text-white flex items-center gap-3">
                  <div className="bg-white text-amber-600 w-8 h-8 rounded-full flex items-center justify-center font-black text-lg shadow">A</div>
                  <h3 className="text-lg font-black">發現者</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs font-black text-amber-600 border-b border-amber-100 pb-1 flex items-center gap-1"><ShieldCheck className="w-4 h-4" /> 核心職責</div>
                    <ul className="text-sm font-bold text-slate-700 space-y-2 list-disc list-inside">
                      <li>第一時間發現病患離隊／不在原位</li>
                      <li>立即口頭回報動向、穿著與最後目擊位置</li>
                      <li>撥打 400 啟動 333 通報</li>
                    </ul>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-xl text-[11px] font-bold text-amber-800 space-y-1 border border-amber-100">
                    <div>⚠️ 注意事項：</div>
                    <li>• 未確定清楚就通報會造成混亂</li>
                    <li>• 不刺激病患、不單獨離場追逐</li>
                  </div>
                </div>
              </div>

              {/* B組：指揮官組 */}
              <div className="bg-white rounded-2xl border border-red-100 shadow-md overflow-hidden">
                <div className="bg-red-600 p-4 text-white flex items-center gap-3">
                  <div className="bg-white text-red-600 w-8 h-8 rounded-full flex items-center justify-center font-black text-lg shadow">B</div>
                  <h3 className="text-lg font-black">指揮官組</h3>
                </div>
                <div className="p-5 space-y-4 text-sm font-bold text-slate-700">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-red-600 font-black text-xs border-b border-red-50 pb-1 uppercase"><Stethoscope className="w-4 h-4" /> 醫師 / 病房長</div>
                    <ul className="list-disc list-inside space-y-1">
                      <li>擔任總指揮，統一調度人力並啟動應變</li>
                      <li>若病患受傷，親自到場進行醫療評估</li>
                    </ul>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-slate-50">
                    <div className="flex items-center gap-1.5 text-red-600 font-black text-xs border-b border-red-50 pb-1 uppercase"><HeartHandshake className="w-4 h-4" /> 主責社工</div>
                    <ul className="list-disc list-inside space-y-1">
                      <li>家屬窗口，進行正式通知與情緒安撫</li>
                      <li>以中性、非責備語言說明情況</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* C組：院內支援組 */}
              <div className="bg-white rounded-2xl border border-emerald-100 shadow-md overflow-hidden">
                <div className="bg-emerald-600 p-4 text-white flex items-center gap-3">
                  <div className="bg-white text-emerald-600 w-8 h-8 rounded-full flex items-center justify-center font-black text-lg shadow">C</div>
                  <h3 className="text-lg font-black">院內支援組</h3>
                </div>
                <div className="p-5 space-y-4 text-sm font-bold text-slate-700">
                  <div className="space-y-2">
                    <div className="text-emerald-600 font-black text-xs border-b border-emerald-50 pb-1 uppercase">護理師 (病房留守)</div>
                    <ul className="list-disc list-inside space-y-1">
                      <li>安頓其他病患，清點人數並確保病房秩序</li>
                      <li>維持病房留守人力不可隨意離開</li>
                    </ul>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-slate-50">
                    <div className="text-emerald-600 font-black text-xs border-b border-emerald-50 pb-1 uppercase">非協守組人員 (職、心、社)</div>
                    <ul className="list-disc list-inside space-y-1">
                      <li>支援院區外圍協尋與資源調度</li>
                      <li>隨時聽候指揮站滾動式任務分派</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* D組：協尋組 */}
              <div className="bg-white rounded-2xl border border-indigo-100 shadow-md overflow-hidden">
                <div className="bg-indigo-600 p-4 text-white flex items-center gap-3">
                  <div className="bg-white text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-black text-lg shadow">D</div>
                  <h3 className="text-lg font-black">協尋組</h3>
                </div>
                <div className="p-5 space-y-4">
                   <div className="bg-indigo-50 p-3 rounded-xl mb-3 border border-indigo-100">
                      <div className="text-[10px] font-black text-indigo-700 uppercase mb-1">參與同仁組別</div>
                      <div className="text-xs font-bold text-slate-600 leading-relaxed">行政科、職能科、社工科、藥劑科、護理科、心理科之指派人員</div>
                   </div>
                   <div className="space-y-2">
                   <div className="text-indigo-600 font-black text-xs border-b border-indigo-50 pb-1 flex items-center gap-1 uppercase tracking-widest"><Compass className="w-4 h-4" /> 協尋核心任務</div>
                    <ul className="text-sm font-bold text-slate-700 space-y-2">
                      <li>• 依指定路線搜尋，堅持 <span className="text-red-600">2 人一組</span> 行動</li>
                      <li>• 發現蹤跡立即回報，<span className="underline decoration-red-200">不可強制接觸</span></li>
                      <li>• 隨時注意 Juiker 群組指令更新</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- 協尋路線頁面 --- */}
        {currentPage === 'routes' && (
          <div className="animate-in fade-in duration-300 space-y-4">
             <div className="flex gap-2 overflow-x-auto pb-1 px-1">
                <button onClick={() => setCurrentPage('main')} className="shrink-0 flex items-center gap-1.5 text-slate-500 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 text-xs active:bg-slate-100 transition-all"><ArrowLeft className="w-4 h-4" /> 返回首頁</button>
                <button onClick={() => setCurrentPage('process')} className="shrink-0 flex items-center gap-1.5 text-indigo-600 font-bold bg-indigo-50 px-4 py-2 rounded-xl shadow-sm border border-indigo-100 text-xs active:bg-indigo-100 transition-all"><ClipboardCheck className="w-4 h-4" /> 檢核</button>
             </div>
             <div className="bg-white rounded-3xl shadow-xl overflow-hidden min-h-[400px]">
                <div className="flex border-b text-xs font-black">
                   <button onClick={() => setSearchMode('internal')} className={`flex-1 py-4 ${searchMode === 'internal' ? 'bg-blue-600 text-white shadow-inner' : 'text-slate-400 bg-slate-50'}`}>院內重點</button>
                   <button onClick={() => setSearchMode('external')} className={`flex-1 py-4 ${searchMode === 'external' ? 'bg-red-600 text-white shadow-inner' : 'text-slate-400 bg-slate-50'}`}>院外路線</button>
                </div>
                <div className="p-4 overflow-y-auto max-h-[500px] custom-scrollbar">
                   {searchMode === 'external' && (
                     <div className="bg-indigo-50 border border-indigo-100 p-4 mb-4 rounded-xl flex items-start gap-3 shadow-sm animate-in fade-in">
                       <Info className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                       <div className="text-xs font-bold text-indigo-800 space-y-1">
                         <p className="font-black underline decoration-indigo-200 underline-offset-4 mb-1">院外協尋注意事項：</p>
                         <p>1. 路線點選後可開啟 Google 地圖導航。</p>
                         <p>2. 經過<span className="text-red-600">萊爾富</span>及<span className="text-red-600">東昇超市</span>，務必進店確認。</p>
                       </div>
                     </div>
                   )}
                   {Object.entries(searchMode === 'internal' ? internalRoutes : externalRoutes).map(([key, routes]) => (
                      <div key={key} className="mb-6">
                        <h4 className="text-[10px] font-black text-slate-400 mb-2 border-l-4 border-slate-300 pl-2 uppercase">
                          {labels[key] || key}
                        </h4>
                        <div className="grid gap-2">{routes.map(r => (
                        <a key={r.id} href={r.mapUrl} target={r.mapUrl ? "_blank" : undefined} rel="noopener noreferrer" className="p-3 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-100 active:bg-slate-200 transition-colors shadow-sm">
                           <span className="text-xs font-bold text-slate-700">{r.id}：{r.path}</span>
                           {r.mapUrl && <ExternalLink className="w-4 h-4 text-blue-500" />}
                        </a>
                      ))}</div></div>
                    ))}
                </div>
             </div>
          </div>
        )}

        {/* --- 啟動應變流程 --- */}
        {currentPage === 'process' && (
          <div className="animate-in slide-in-from-right-5 duration-500 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4 shrink-0 px-1">
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage('main')} 
                  className="flex items-center gap-1.5 text-slate-600 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 text-xs active:bg-slate-100 transition-all"
                >
                  <Home className="w-3.5 h-3.5" /> 首頁
                </button>
                {mobileViewMode === 'detail' && (
                  <button 
                    onClick={() => setMobileViewMode('list')} 
                    className="lg:hidden flex items-center gap-1.5 text-indigo-600 font-bold bg-indigo-50 px-4 py-2 rounded-xl shadow-sm border border-indigo-100 text-xs active:bg-indigo-100 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" /> 清單
                  </button>
                )}
              </div>
              <h2 className="text-xl font-black text-slate-800 uppercase px-2 tracking-tighter">流程檢核作業</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-visible">
              
              <div className={`lg:col-span-4 flex flex-col gap-2 overflow-y-auto custom-scrollbar ${mobileViewMode === 'detail' ? 'hidden lg:flex' : 'flex'}`}>
                {sopSteps.map((step, idx) => (
                  <button key={idx} onClick={() => handleStepClick(idx)} className={`w-full flex items-center gap-3 p-4 rounded-2xl border-4 transition-all relative min-h-[70px] ${selectedStepIndex === idx ? 'bg-white border-indigo-500 shadow-md' : 'bg-white border-transparent hover:border-slate-200'}`}>
                    <div className={`shrink-0 p-2 rounded-lg transition-all ${completedSteps.includes(idx) ? 'bg-green-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                      {completedSteps.includes(idx) ? <CheckCircle2 className="w-4 h-4" /> : step.icon}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className={`text-sm font-black truncate ${completedSteps.includes(idx) ? 'text-green-800' : 'text-slate-800'}`}>{idx + 1}. {step.title}</div>
                      {stepTimestamps[idx] && <div className="text-[8px] font-black text-indigo-400 mt-0.5"><Clock className="w-2.5 h-2.5 inline mr-1" /> {stepTimestamps[idx]}</div>}
                    </div>
                    <div onClick={(e) => { e.stopPropagation(); toggleStep(idx); }} className={`shrink-0 p-1.5 rounded-full border-2 transition-all ${completedSteps.includes(idx) ? 'bg-green-100 border-green-500 text-green-600 shadow-inner' : 'border-slate-200 text-slate-200 active:bg-green-50'}`}><CheckCircle2 className="w-4 h-4" /></div>
                  </button>
                ))}
              </div>

              <div className={`lg:col-span-8 flex flex-col min-h-0 ${mobileViewMode === 'list' ? 'hidden lg:flex' : 'flex'}`}>
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 flex-1 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">
                  
                  <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-500 p-2 rounded-lg shadow-lg shrink-0">{sopSteps[selectedStepIndex].icon}</div>
                      <div className="min-w-0"><div className="text-[8px] font-black text-indigo-400 mb-0.5 uppercase tracking-widest">步驟 {selectedStepIndex + 1} 詳情</div><h3 className="text-base font-black truncate">{sopSteps[selectedStepIndex].title}</h3></div>
                    </div>
                    {completedSteps.includes(selectedStepIndex) && (
                      <div className="bg-green-500 text-white text-[10px] px-3 py-1 rounded-full font-black flex items-center gap-1 animate-in zoom-in">
                        <CheckCircle2 className="w-3 h-3" /> 已確實執行
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-24">
                    {selectedStepIndex === 2 && (
                      <div className="space-y-4 animate-in slide-in-from-top-2">
                        <div className="bg-indigo-900 border-l-8 border-indigo-400 rounded-2xl p-4 shadow-xl">
                          <div className="flex items-center gap-2 text-indigo-200 text-[10px] font-black uppercase tracking-widest mb-1.5">
                            <MessageSquareQuote className="w-4 h-4" /> 回報範例 (請務必統一語法)
                          </div>
                          <p className="text-white text-sm font-black leading-relaxed">
                            「{sopSteps[selectedStepIndex].example}」
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                           <button onClick={(e) => handleSplitAction(e, 'internal')} className="bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow active:scale-95 flex flex-col items-center gap-1 transition-all"><Building2 className="w-4 h-4" /> 啟動院內搜尋</button>
                           <button onClick={(e) => handleSplitAction(e, 'external')} className="bg-red-600 text-white py-4 rounded-2xl font-black text-sm shadow active:scale-95 flex flex-col items-center gap-1 transition-all"><Trees className="w-4 h-4" /> 啟動院外搜尋</button>
                        </div>
                        {(subStepTimestamps['internal'] || subStepTimestamps['external']) && (
                             <div className="flex gap-2 justify-center">
                               {subStepTimestamps['internal'] && <span className="text-[8px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">院內啟動: {subStepTimestamps['internal']}</span>}
                               {subStepTimestamps['external'] && <span className="text-[8px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">院外啟動: {subStepTimestamps['external']}</span>}
                             </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] border-b border-blue-50 pb-1 uppercase tracking-widest"><ListChecks className="w-3.5 h-3.5" /> 必須操作項目</div>
                        <div className="space-y-1.5 px-1">
                          {sopSteps[selectedStepIndex].must.map((m, i) => (
                            <div key={i} onClick={() => toggleSubCheck(selectedStepIndex, i)} className={`flex items-center gap-2 cursor-pointer p-2 rounded-xl text-xs font-bold transition-all ${subCheckItems[`${selectedStepIndex}-${i}`] ? 'bg-blue-50 text-blue-900 opacity-60' : 'hover:bg-slate-50'}`}>
                              <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 ${subCheckItems[`${selectedStepIndex}-${i}`] ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'}`}>{subCheckItems[`${selectedStepIndex}-${i}`] && <CheckCircle2 className="w-3 h-3" />}</div>
                              {m}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-amber-600 font-black text-[10px] border-b border-amber-50 pb-1 uppercase tracking-widest"><AlertCircle className="w-3.5 h-3.5" /> 注意事項提醒</div>
                        <div className="space-y-2 px-1">
                          {sopSteps[selectedStepIndex].warn && sopSteps[selectedStepIndex].warn.map((w, i) => (
                            <div key={i} className="flex items-start gap-2 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100 border-dashed italic text-[11px] font-bold text-amber-900 shadow-sm">
                              <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                              <span>{w}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="fixed bottom-0 right-0 w-full lg:absolute lg:bottom-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 flex justify-end items-center gap-4 z-50">
                      {selectedStepIndex < sopSteps.length - 1 ? (
                        <button 
                          onClick={handleNextStep}
                          className="w-full lg:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                        >
                          下一步：{sopSteps[selectedStepIndex + 1].title.split(' ')[1]}
                          <ChevronRightCircle className="w-5 h-5" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => setCurrentPage('main')}
                          className="w-full lg:w-auto bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                        >
                          <Flag className="w-5 h-5" /> 完成所有流程
                        </button>
                      )}
                    </div>

                    {selectedStepIndex === 6 && (
                      <div className="bg-red-600 text-white p-5 rounded-2xl shadow-xl flex items-center gap-4 animate-pulse border-b-4 border-red-800 mb-20">
                        <XCircle className="w-10 h-10 shrink-0" />
                        <div><div className="text-sm font-black uppercase tracking-wider">30 分鐘報警限時</div><p className="text-[9px] font-bold opacity-90 leading-tight">未尋獲個案必須立即通知派出所。</p></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-2 z-[40] shadow-2xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-[8px] font-black tracking-tighter px-2">
          <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100 shadow-sm font-bold">
            <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div>
            應變機制執行中
          </div>
          <div className="flex gap-2 text-slate-700 font-bold items-center">
             <span className="underline decoration-slate-300 font-bold">林厝派出所：已存</span>
            <span className="text-red-700 underline decoration-red-200 font-bold uppercase underline-offset-2">30 分鐘內報警</span>
          </div>
        </div>
      </footer>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default App;