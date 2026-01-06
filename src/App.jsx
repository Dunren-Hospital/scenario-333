import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  PhoneCall, 
  MapPin, 
  Users, 
  CheckCircle2, 
  Info, 
  Clock, 
  Megaphone, 
  ShieldAlert, 
  Search, 
  Navigation, 
  Sparkles, 
  Volume2, 
  Copy, 
  Loader2, 
  Send, 
  MessageSquare,
  Building2,
  Trees,
  ArrowLeft,
  ChevronRight,
  ClipboardCheck,
  Map,
  UserSearch,
  ShieldCheck,
  UserPlus,
  Compass,
  Briefcase,
  HeartHandshake,
  Stethoscope,
  ExternalLink,
  Store,
  MapPinned
} from 'lucide-react';

// --- Gemini API 工具函式 ---
const apiKey = "";
const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

const fetchGemini = async (prompt, systemInstruction = "") => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] }
  };

  let delay = 1000;
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (e) {
      if (i === 4) throw e;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
};

const playTTS = async (text) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: `請用清楚、專業的口氣朗讀：${text}` }] }],
    generationConfig: { 
      responseModalities: ["AUDIO"], 
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } } 
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    const base64Audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioBlob = await fetch(`data:audio/wav;base64,${base64Audio}`).then(r => r.blob());
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    }
  } catch (e) {
    console.error("TTS 播放失敗", e);
  }
};

// --- 主程式組件 ---
const App = () => {
  const [currentPage, setCurrentPage] = useState('main'); // 'main', 'routes', 'process', 'roles'
  const [completedSteps, setCompletedSteps] = useState([]);
  const [stepTimestamps, setStepTimestamps] = useState({}); 
  const [currentWard, setCurrentWard] = useState('all');
  const [searchMode, setSearchMode] = useState('internal'); 
  
  // AI 狀態
  const [aiLoading, setAiLoading] = useState(false);
  const [patientInfo, setPatientInfo] = useState({ 
    name: '', gender: '男', idNum: '', clothing: '', location: '', direction: ''
  });
  const [aiDraft, setAiDraft] = useState("");
  const [copyFeedback, setCopyFeedback] = useState(false);

  const sopSteps = [
    { title: '發現異常狀況', icon: <Search className="w-5 h-5" />, desc: '確認病人不在原位，判斷是否目擊不假離院。' },
    { title: '立即通報 333', icon: <Megaphone className="w-5 h-5" />, desc: '按 400 或 Speak，說明地點、人名、移動方向。' },
    { title: '成立指揮站', icon: <ShieldAlert className="w-5 h-5" />, desc: '單位主管、醫師、社工到位並分配任務。' },
    { title: '院內外協尋', icon: <MapPin className="w-5 h-5" />, desc: '啟動分流搜尋，隨時回報進度。' },
    { title: '發現蹤跡', icon: <Navigation className="w-5 h-5" />, desc: '保持距離跟隨，切勿單獨接觸。' },
    { title: '勸服與帶返', icon: <Users className="w-5 h-5" />, desc: '專業團隊到場勸服，安全帶回。' },
    { title: '結案/通報', icon: <CheckCircle2 className="w-5 h-5" />, desc: '1-2小時內報警，填寫事件通報。' }
  ];

  const externalRoutes = {
    ward1: [
      { id: 'W1-1', path: '第一組：正門 → 爬山路線 → 廣天宮 → 員水路', mapUrl: 'https://maps.app.goo.gl/VyM7UAog79xh6NFs6' }, 
      { id: 'W1-2', path: '第二組：正門 → 廣成安養院左轉 → 員水路萊爾富 → 員林市區方向', mapUrl: 'https://maps.app.goo.gl/qrNCLNUdqHJWy1a49' }
    ],
    ward2: [
      { id: 'W2-1', path: '正門 → 廣成安養院右轉 → 穿過員水路小路 → 青山國小後方 → 林厝派出所 → 山腳路 → 中洲', mapUrl: 'https://maps.app.goo.gl/61cunCZeComGXsQg8' }
    ],
    ward3: [
      { id: 'W3-1', path: '後門 → 右轉 → 往果園方向到底 → 另一方向折返', mapUrl: 'https://maps.app.goo.gl/VzHU3xZGUxqTiBUg9' }
    ],
    admin: [
      { id: 'AD-1', path: '行政1：後門 → 左轉 → 木材行右轉 → 金龍橋左轉 → 往排水溝方向 → 員水路', mapUrl: 'https://maps.app.goo.gl/MPyPFYJmW36VycrT7' }, 
      { id: 'AD-2', path: '行政2：後門 → 左轉 → 木材行右轉 → 金龍橋右轉 → 山頂', mapUrl: 'https://maps.app.goo.gl/o4EWPKrwfsGkfhMP8' },
      { id: 'AD-3', path: '行政3：後門 → 左轉 → 木材行右轉 → 金龍橋右轉 → 宿舍前方 → 中洲 → 山腳路', mapUrl: 'https://maps.app.goo.gl/bWUXzELdrsMde8Qj7' }
    ],
    ot: [
      { id: '職能', path: '後門 → 左轉 → 木材行右轉 → 金龍橋左轉 → 山腳路左轉 → 林厝派出所', mapUrl: 'https://maps.app.goo.gl/VuJXpfRyKPHZZWaG7' }
    ]
  };

  const internalRoutes = {
    admin: [
      { id: 'A區', path: '地下停車場、值班室、院長室' },
      { id: 'B區', path: '樓梯間、頂樓陽台、洗衣場' },
      { id: 'C區', path: '醫院週邊區域、東西側之門禁設施' }
    ],
    pharmacy: [{ id: '藥劑', path: '圖書室、茶水間、行政廁所' }],
    social: [{ id: '社工', path: '一樓大廳、1-2診間、候診區、電梯內、會談室、一樓廁所' }],
    ot: [{ id: '職能', path: '產業治療區、活動室、復健商店、廚房、主機室' }],
    ward1: [{ id: '一病房', path: '病房病室、角落、微風廣場及風雨操場' }],
    ward2: [{ id: '二病房', path: '各病室、角落、微風廣場及風雨操場' }],
    ward3: [{ id: '三病房', path: '病房病室、角落、微風廣場' }]
  };

  const generateJuikerDraft = async () => {
    if (!patientInfo.name) return;
    setAiLoading(true);
    const prompt = `請將資訊填入固定格式：\n姓名：${patientInfo.name}\n性別：${patientInfo.gender}\n病歷號：${patientInfo.idNum || '待補'}\n衣著：${patientInfo.clothing || '待補'}\n最後目擊地點：${patientInfo.location || '待補'}\n移動方向：${patientInfo.direction || '待補'}\n\n固定格式要求：\n【緊急協尋：不假離院】\n📢 請全體同仁注意：病人不假離院緊急通報 📢\n一位住院病患已在未經許可的情況下離開院區。請各單位同仁協助留意並進行協尋。\n---\n【病人特徵與最後目擊資訊】\n* 病歷號碼：[填入病歷號]\n* 姓 名：[填入姓名]\n* 性 別：[填入性別]\n* 衣著特徵：[填入衣著特徵]\n* 最後目擊地點：[填入最後目擊地點]\n* 移動方向：[填入移動方向]`;
    try {
      const res = await fetchGemini(prompt, "醫院行政通報助手，嚴禁更動固定格式。");
      setAiDraft(res);
    } catch (e) {
      setAiDraft("無法生成草稿。");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(aiDraft);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const toggleStep = (index) => {
    if (completedSteps.includes(index)) {
      setCompletedSteps(prev => prev.filter(i => i !== index));
      const newTimestamps = { ...stepTimestamps };
      delete newTimestamps[index];
      setStepTimestamps(newTimestamps);
    } else {
      setCompletedSteps(prev => [...prev, index]);
      const now = new Date();
      const timeString = now.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setStepTimestamps(prev => ({ ...prev, [index]: timeString }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      {/* 標頭 */}
      <header className="bg-red-700 text-white px-6 py-4 flex flex-col md:flex-row justify-between items-center sticky top-0 z-[60] shadow-xl border-b-4 border-red-800 transition-all">
        <div className="flex items-center gap-3">
          <AlertTriangle className="animate-pulse w-8 h-8 text-yellow-300" />
          <h1 className="text-2xl font-black tracking-tight uppercase">不假離院應變系統</h1>
        </div>
        <div className="flex gap-4 mt-3 md:mt-0">
          <div className="bg-white/20 px-4 py-2 rounded-lg flex items-center gap-2 border border-white/30 font-mono font-bold">
            <PhoneCall className="w-5 h-5 text-yellow-200" /> 按 400 (Speak)
          </div>
          <button 
            onClick={() => {
              playTTS("緊急廣播。現在啟動三三三協尋機制，請同仁注意Juiker群組訊息。");
              setCurrentPage('process');
            }}
            className="bg-yellow-400 text-red-900 px-4 py-2 rounded-lg font-black flex items-center gap-2 hover:bg-yellow-300 shadow-inner active:scale-95 transition-all"
          >
            <Megaphone className="w-5 h-5" /> 啟動 333
          </button>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto transition-all duration-300">
        
        {/* --- 首頁 --- */}
        {currentPage === 'main' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <button 
                onClick={() => setCurrentPage('roles')}
                className="bg-white hover:bg-amber-500 group p-6 rounded-3xl border-2 border-amber-100 hover:border-amber-500 flex items-center justify-between transition-all shadow-lg hover:shadow-amber-200 active:scale-95"
              >
                <div className="text-left">
                  <div className="text-2xl font-black text-slate-800 group-hover:text-white flex items-center gap-3">
                    <Users className="w-8 h-8 text-amber-500 group-hover:text-white" /> 職責組別
                  </div>
                  <div className="text-sm text-slate-500 group-hover:text-amber-50 mt-2 font-bold italic tracking-wide">
                    各組員身分與核心任務分工
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-white" />
              </button>

              <button 
                onClick={() => setCurrentPage('routes')}
                className="bg-white hover:bg-blue-600 group p-6 rounded-3xl border-2 border-blue-100 hover:border-blue-500 flex items-center justify-between transition-all shadow-lg hover:shadow-blue-200 active:scale-95"
              >
                <div className="text-left">
                  <div className="text-2xl font-black text-slate-800 group-hover:text-white flex items-center gap-3">
                    <Map className="w-8 h-8 text-blue-500 group-hover:text-white" /> 協尋路線速查
                  </div>
                  <div className="text-sm text-slate-500 group-hover:text-blue-100 mt-2 font-bold italic tracking-wide">
                    查看院內搜尋點與院外路線
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-white" />
              </button>

              <button 
                onClick={() => setCurrentPage('process')}
                className="bg-white hover:bg-indigo-600 group p-6 rounded-3xl border-2 border-indigo-100 hover:border-indigo-500 flex items-center justify-between transition-all shadow-lg hover:shadow-indigo-200 active:scale-95"
              >
                <div className="text-left">
                  <div className="text-2xl font-black text-slate-800 group-hover:text-white flex items-center gap-3">
                    <ClipboardCheck className="w-8 h-8 text-indigo-500 group-hover:text-white" /> 啟動應變流程
                  </div>
                  <div className="text-sm text-slate-500 group-hover:text-indigo-100 mt-2 font-bold italic tracking-wide">
                    進入 SOP 檢核表與進度儀
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-white" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7">
                <section className="bg-white rounded-3xl shadow-2xl border-t-8 border-blue-600 overflow-hidden">
                  <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                    <h2 className="font-black text-xl flex items-center gap-3 text-slate-800">
                      <Send className="w-6 h-6 text-blue-600" /> Juiker 通報草稿生成器
                    </h2>
                    {aiLoading && <Loader2 className="w-6 h-6 animate-spin text-blue-600" />}
                  </div>
                  
                  <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-black text-slate-400 ml-1 uppercase tracking-widest">病人姓名</label>
                        <input 
                          type="text" placeholder="輸入姓名" 
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all font-bold"
                          value={patientInfo.name} onChange={(e) => setPatientInfo({...patientInfo, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 ml-1 uppercase tracking-widest">性別</label>
                        <select 
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:outline-none transition-all font-bold appearance-none cursor-pointer"
                          value={patientInfo.gender} onChange={(e) => setPatientInfo({...patientInfo, gender: e.target.value})}
                        >
                          <option value="男">男</option>
                          <option value="女">女</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 ml-1 uppercase tracking-widest">病歷號碼</label>
                        <input 
                          type="text" placeholder="123456" 
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:outline-none font-bold"
                          value={patientInfo.idNum} onChange={(e) => setPatientInfo({...patientInfo, idNum: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 ml-1 uppercase tracking-widest">當日衣著</label>
                        <input 
                          type="text" placeholder="例如：藍色院服" 
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:outline-none font-bold"
                          value={patientInfo.clothing} onChange={(e) => setPatientInfo({...patientInfo, clothing: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 ml-1 uppercase tracking-widest">目擊地點</label>
                        <input 
                          type="text" placeholder="一樓大廳" 
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:outline-none font-bold"
                          value={patientInfo.location} onChange={(e) => setPatientInfo({...patientInfo, location: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 ml-1 uppercase tracking-widest">移動方向</label>
                        <input 
                          type="text" placeholder="往正門方向" 
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:outline-none font-bold"
                          value={patientInfo.direction} onChange={(e) => setPatientInfo({...patientInfo, direction: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <button 
                      onClick={generateJuikerDraft}
                      disabled={aiLoading || !patientInfo.name}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-5 rounded-3xl font-black text-xl transition-all flex justify-center items-center gap-3 shadow-xl active:scale-95"
                    >
                      <Sparkles className="w-6 h-6" /> 生成固定格式通報訊息
                    </button>

                    {aiDraft && (
                      <div className="mt-6 animate-in zoom-in-95 duration-300">
                        <div className="bg-slate-900 rounded-3xl p-8 relative border-4 border-slate-800 shadow-2xl">
                          <button onClick={handleCopy} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all">
                            {copyFeedback ? <CheckCircle2 className="w-6 h-6 text-green-400" /> : <Copy className="w-6 h-6" />}
                          </button>
                          <div className="text-xs font-black text-blue-400 mb-4 flex items-center gap-2 tracking-[0.3em] uppercase">
                            <MessageSquare className="w-4 h-4" /> 預覽 Juiker 文字內容
                          </div>
                          <pre className="text-base text-slate-200 font-mono whitespace-pre-wrap leading-relaxed pr-10">{aiDraft}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="lg:col-span-5 space-y-8">
                <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-2xl border-b-8 border-indigo-600 overflow-hidden relative">
                  <h3 className="font-black text-xl mb-6 flex items-center gap-3 text-indigo-300">
                    <Volume2 className="w-7 h-7" /> 快速廣播範例
                  </h3>
                  <div className="space-y-6 relative z-10">
                    <button 
                      onClick={() => playTTS(`發現離院：${patientInfo.location || '某地點'}三三三，${patientInfo.name || '某某某'}，往${patientInfo.direction || '某方向'}移動`)}
                      className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-left hover:bg-white/10 transition-all group"
                    >
                      <div className="text-[10px] font-black text-indigo-400 mb-2 uppercase tracking-widest">目睹不假離院廣播語法</div>
                      <p className="text-lg italic font-mono text-slate-100 leading-tight">
                        「{patientInfo.location || '地點'} 333, {patientInfo.name || '姓名'} {patientInfo.idNum || '病歷號'} 往 {patientInfo.direction || '方向'} 移動」
                      </p>
                    </button>
                    <button 
                      onClick={() => playTTS(`${patientInfo.location || '某病房'}三三三，${patientInfo.name || '某某某'}，查房未尋獲`)}
                      className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-left hover:bg-white/10 transition-all group"
                    >
                      <div className="text-[10px] font-black text-indigo-400 mb-2 uppercase tracking-widest">未尋獲廣播語法</div>
                      <p className="text-lg italic font-mono text-slate-100 leading-tight">
                        「{patientInfo.location || '病房'} 333, {patientInfo.name || '姓名'} {patientInfo.idNum || '病歷號'} 查房未尋獲」
                      </p>
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border-2 border-slate-100 p-8 shadow-lg shadow-slate-200">
                  <h3 className="font-black text-slate-800 text-xl flex items-center gap-3 mb-8">
                    <ShieldAlert className="w-7 h-7 text-red-500" /> 安全執行要點
                  </h3>
                  <div className="space-y-6">
                    <div className="flex items-center gap-5 bg-red-50 p-6 rounded-3xl border-l-8 border-red-500 shadow-sm shadow-red-100">
                      <div className="bg-red-500 text-white p-3 rounded-2xl shadow-lg"><Users className="w-7 h-7" /></div>
                      <div className="flex flex-col">
                        <span className="text-xl font-black text-red-700">兩人一組行動</span>
                        <span className="text-sm text-red-600 font-bold opacity-80 underline decoration-red-200 decoration-2 underline-offset-4 tracking-tighter">嚴禁單人單獨追逐接觸</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-5 bg-amber-50 p-6 rounded-3xl border-l-8 border-amber-500 shadow-sm shadow-amber-100">
                      <div className="bg-amber-500 text-white p-3 rounded-2xl shadow-lg"><Navigation className="w-7 h-7" /></div>
                      <div className="flex flex-col">
                        <span className="text-xl font-black text-amber-700">保持距離回報</span>
                        <span className="text-sm text-amber-600 font-bold opacity-80">發現蹤跡勿強制接觸，立即通報</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- 職責組別頁面 --- */}
        {currentPage === 'roles' && (
          <div className="animate-in slide-in-from-right-10 duration-500 space-y-8 pb-10">
            <div className="flex items-center justify-between">
              <button onClick={() => setCurrentPage('main')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-black transition-all bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-400">
                <ArrowLeft className="w-5 h-5" /> 返回首頁
              </button>
              <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3 uppercase">職責組別分工</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white rounded-3xl border-2 border-amber-100 shadow-xl overflow-hidden flex flex-col">
                <div className="bg-amber-500 p-6 text-white flex items-center gap-4">
                  <div className="bg-white text-amber-600 w-12 h-12 rounded-full flex items-center justify-center font-black text-2xl shadow-lg">A</div>
                  <div>
                    <h3 className="text-2xl font-black">發現者</h3>
                    <p className="text-amber-50 text-xs font-bold">當下發現病患不在的人（無限定）</p>
                  </div>
                </div>
                <div className="p-8 flex-1 space-y-6">
                  <div>
                    <h4 className="flex items-center gap-2 text-amber-700 font-black mb-3 underline decoration-amber-200 underline-offset-4">核心職責</h4>
                    <ul className="space-y-3 text-slate-700 font-bold leading-relaxed list-disc list-inside marker:text-amber-500">
                      <li>第一時間發現病患離隊／離開視線／不在原位或病房</li>
                      <li>立即口頭回報病患動向與最後位置</li>
                      <li>啟動 333 通報流程</li>
                    </ul>
                  </div>
                  <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200">
                    <h4 className="text-amber-800 font-black mb-2 flex items-center gap-2">⚠️ 注意原則</h4>
                    <ul className="text-sm text-amber-700 font-bold space-y-1">
                      <li>• 未確定清楚就通報會造成混亂</li>
                      <li>• 不追逐、不刺激病患</li>
                      <li>• 不單獨行動</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-3xl border-2 border-red-100 shadow-xl overflow-hidden flex flex-col">
                <div className="bg-red-600 p-6 text-white flex items-center gap-4">
                  <div className="bg-white text-red-600 w-12 h-12 rounded-full flex items-center justify-center font-black text-2xl shadow-lg">B</div>
                  <div>
                    <h3 className="text-2xl font-black">指揮官組</h3>
                    <p className="text-red-50 text-xs font-bold">總指揮調度與聯繫</p>
                  </div>
                </div>
                <div className="p-8 flex-1 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2"><Stethoscope className="w-5 h-5 text-red-600" /><span className="font-black text-red-800">1. 值班醫師／主治醫師／病房長</span></div>
                    <ul className="pl-7 space-y-2 text-slate-700 font-bold text-sm leading-relaxed">
                      <li>• 擔任總指揮，統一調度人力</li>
                      <li>• 啟動不假離院應變機制</li>
                      <li>• 病患受傷時，親自到場進行醫療評估</li>
                    </ul>
                  </div>
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2"><HeartHandshake className="w-5 h-5 text-red-600" /><span className="font-black text-red-800">2. 病患主責社工</span></div>
                    <ul className="pl-7 space-y-2 text-slate-700 font-bold text-sm leading-relaxed">
                      <li>• 家屬溝通的主要窗口</li>
                      <li>• 以中性、非責備語言說明不假離院</li>
                      <li>• 病患受傷時，進行醫療風險保護式通知</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-3xl border-2 border-green-100 shadow-xl overflow-hidden flex flex-col">
                <div className="bg-emerald-600 p-6 text-white flex items-center gap-4">
                  <div className="bg-white text-emerald-600 w-12 h-12 rounded-full flex items-center justify-center font-black text-2xl shadow-lg">C</div>
                  <div>
                    <h3 className="text-2xl font-black">院內支援組</h3>
                    <p className="text-emerald-50 text-xs font-bold">維持秩序與外圍支援</p>
                  </div>
                </div>
                <div className="p-8 flex-1 space-y-6">
                  <div className="space-y-4">
                    <div className="font-black text-emerald-800">人員：護理師 (各病房留守)</div>
                    <ul className="pl-5 text-sm font-bold text-slate-700 space-y-2">
                      <li>• 安頓其他病患，確保病房秩序與安全。</li>
                    </ul>
                    <div className="pt-4 border-t border-slate-100 font-black text-emerald-800">人員：非協尋組人員</div>
                    <ul className="pl-5 text-sm font-bold text-slate-700 space-y-2">
                      <li>• 支援院區外圍協尋，採滾動式彈性支援。</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-3xl border-2 border-indigo-100 shadow-xl overflow-hidden flex flex-col">
                <div className="bg-indigo-600 p-6 text-white flex items-center gap-4">
                  <div className="bg-white text-indigo-600 w-12 h-12 rounded-full flex items-center justify-center font-black text-2xl shadow-lg">D</div>
                  <div>
                    <h3 className="text-2xl font-black">協尋組</h3>
                    <p className="text-indigo-50 text-xs font-bold">院內院外實際搜索任務</p>
                  </div>
                </div>
                <div className="p-8 flex-1 space-y-6">
                  <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <p className="text-xs font-black text-indigo-800 mb-2">參與單位：</p>
                    <p className="text-xs font-bold text-indigo-700">行政、職能、社工、藥劑、護理、心理科人員</p>
                  </div>
                  <ul className="space-y-3 text-slate-700 font-bold leading-relaxed list-decimal list-inside">
                    <li>依照指派路線進行協尋</li>
                    <li>必須保持 2 人一組行動</li>
                    <li>隨時回報指揮站進度</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- 協尋路線頁面 --- */}
        {currentPage === 'routes' && (
          <div className="animate-in slide-in-from-right-10 duration-500 space-y-8 pb-10">
            <div className="flex items-center justify-between">
              <button onClick={() => setCurrentPage('main')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-black transition-all bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-400">
                <ArrowLeft className="w-5 h-5" /> 返回首頁
              </button>
              <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3 uppercase">
                <Map className="w-8 h-8 text-blue-600" /> 協尋路線速查專區
              </h2>
            </div>

            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
              <div className="p-0 border-b border-slate-100 bg-slate-50 flex">
                <button onClick={() => { setSearchMode('internal'); setCurrentWard('all'); }} className={`flex-1 py-8 text-lg font-black flex items-center justify-center gap-4 transition-all ${searchMode === 'internal' ? 'bg-white text-blue-600 border-b-8 border-blue-600 shadow-md' : 'text-slate-400 hover:bg-slate-100'}`}>
                  <Building2 className="w-7 h-7" /> 院內搜尋重點區
                </button>
                <button onClick={() => { setSearchMode('external'); setCurrentWard('all'); }} className={`flex-1 py-8 text-lg font-black flex items-center justify-center gap-4 transition-all ${searchMode === 'external' ? 'bg-white text-red-600 border-b-8 border-red-600 shadow-md' : 'text-slate-400 hover:bg-slate-100'}`}>
                  <Trees className="w-7 h-7" /> 院外協尋分道路線
                </button>
              </div>
              
              <div className="p-6 bg-slate-50/50 border-b border-slate-100 overflow-x-auto">
                <div className="flex gap-2 justify-center">
                  {['all', 'admin', 'pharmacy', 'social', 'ot', 'ward1', 'ward2', 'ward3'].map(ward => {
                    if (searchMode === 'external' && !['all', 'ward1', 'ward2', 'ward3', 'admin', 'ot'].includes(ward)) return null;
                    const labels = { all: '全部', admin: '行政', pharmacy: '藥劑', social: '社工', ot: '職能', ward1: '一病房', ward2: '二病房', ward3: '三病房' };
                    return (
                      <button key={ward} onClick={() => setCurrentWard(ward)} className={`px-6 py-2.5 text-xs font-black rounded-full border-2 transition-all shadow-sm ${currentWard === ward ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-800'}`}>
                        {labels[ward]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-0 flex-1 bg-white">
                {searchMode === 'external' && (
                  <div className="bg-indigo-50 border-b border-indigo-100 py-4 px-10 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-10">
                      <div className="flex items-center gap-2 text-indigo-700 font-black text-sm">
                        <Info className="w-5 h-5" />
                        <span>院外協尋提醒：</span>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-8">
                        <div className="flex items-center gap-2 text-slate-700 text-sm font-bold">
                          <MapPinned className="w-4 h-4 text-blue-500" />
                          1. 路線點選後可開啟 Google 地圖導航。
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 text-sm font-bold">
                          <Store className="w-4 h-4 text-emerald-600" />
                          2. 經過萊爾富及東昇超市，務必進店確認。
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-10">
                  <div className="space-y-8 max-h-[500px] overflow-y-auto pr-6 custom-scrollbar">
                    {Object.entries(searchMode === 'internal' ? internalRoutes : externalRoutes).map(([key, routes]) => {
                      if (currentWard !== 'all' && currentWard !== key) return null;
                      const wardLabels = { admin: '行政科', pharmacy: '藥劑科', social: '社工科', ot: '職能治療科', ward1: '一病房', ward2: '二病房', ward3: '三病房' };
                      return (
                        <div key={key} className="space-y-4 animate-in fade-in duration-300 mb-10 last:mb-0">
                          <h4 className="text-sm font-black text-slate-400 tracking-[0.4em] flex items-center gap-4 uppercase mb-6">
                            <div className={`w-3 h-3 rounded-full ${searchMode === 'internal' ? 'bg-blue-500 shadow-blue-200' : 'bg-red-500 shadow-red-200'} shadow-lg`}></div>
                            {wardLabels[key]}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {routes.map(r => {
                              const isClickable = !!r.mapUrl;
                              const CardTag = isClickable ? 'a' : 'div';
                              const cardProps = isClickable ? { href: r.mapUrl, target: "_blank", rel: "noopener noreferrer" } : {};
                              return (
                                <CardTag key={r.id} {...cardProps} className={`p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl flex items-start gap-4 hover:bg-white transition-all group shadow-sm ${isClickable ? 'cursor-pointer hover:border-blue-400 hover:shadow-lg' : ''}`}>
                                  <div className="bg-white px-3 py-1.5 rounded-xl text-xs font-black shadow-sm border-2 border-slate-100 group-hover:border-blue-400 group-hover:text-blue-600 shrink-0 uppercase flex items-center gap-1">
                                    {r.id} {isClickable && <ExternalLink className="w-3 h-3" />}
                                  </div>
                                  <p className="text-sm text-slate-700 font-bold leading-relaxed">{r.path}</p>
                                </CardTag>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- SOP 檢核頁面 --- */}
        {currentPage === 'process' && (
          <div className="animate-in slide-in-from-right-10 duration-500 space-y-8 pb-10">
            <div className="flex items-center justify-between">
              <button onClick={() => setCurrentPage('main')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-black transition-all bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-400">
                <ArrowLeft className="w-5 h-5" /> 返回首頁
              </button>
              <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter">
                <ClipboardCheck className="w-8 h-8 text-indigo-600" /> 啟動應變流程檢核
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8">
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
                  <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                    <div className="space-y-1">
                      <h3 className="text-2xl font-black flex items-center gap-3 uppercase"><Clock className="w-7 h-7 text-indigo-400" /> SOP 應變檢核表</h3>
                      <p className="text-slate-400 text-xs font-bold tracking-widest uppercase ml-10">完成操作後請確實勾選紀錄時間</p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-mono font-black text-indigo-400">{Math.round((completedSteps.length / 7) * 100)}%</div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mt-1">應變執行進度</div>
                    </div>
                  </div>
                  <div className="p-8 space-y-4 bg-slate-50/50">
                    {sopSteps.map((step, idx) => (
                      <button
                        key={idx}
                        onClick={() => toggleStep(idx)}
                        className={`w-full flex items-center gap-6 p-6 rounded-3xl border-2 transition-all group ${completedSteps.includes(idx) ? 'bg-green-50 border-green-200 opacity-70 scale-[0.98]' : 'bg-white border-white shadow-md hover:border-indigo-300'}`}
                      >
                        <div className={`p-4 rounded-2xl transition-all shadow-lg ${completedSteps.includes(idx) ? 'bg-green-500 text-white shadow-green-100' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                          {completedSteps.includes(idx) ? <CheckCircle2 className="w-7 h-7" /> : step.icon}
                        </div>
                        <div className="text-left flex-1">
                          <div className="flex items-center justify-between">
                            <div className={`text-xl font-black ${completedSteps.includes(idx) ? 'text-green-800' : 'text-slate-800'}`}>{idx + 1}. {step.title}</div>
                            {completedSteps.includes(idx) && stepTimestamps[idx] && (
                              <div className="flex items-center gap-1.5 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-black shadow-sm border border-indigo-200">
                                <Clock className="w-3 h-3" /> {stepTimestamps[idx]}
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-slate-400 font-bold mt-1 leading-snug">{step.desc}</div>
                        </div>
                        {completedSteps.includes(idx) && (
                          <div className="hidden md:block text-green-600 font-black text-sm">已完成</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-4 space-y-6">
                 <div className="bg-indigo-900 text-white p-10 rounded-3xl shadow-2xl relative overflow-hidden border-b-8 border-indigo-700">
                    <h4 className="font-black text-2xl mb-6 flex items-center gap-3 text-indigo-300 underline underline-offset-8">指揮站提醒</h4>
                    <ul className="space-y-6 text-indigo-100 font-bold leading-relaxed">
                      <li>• 主管、醫師、社工應立即成立臨時指揮站。</li>
                      <li>• 確保使用 Juiker 發布病人當日照片與具體特徵。</li>
                    </ul>
                 </div>
                 <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-lg flex items-start gap-4">
                    <Info className="w-7 h-7 text-indigo-500 shrink-0" />
                    <div className="space-y-2">
                       <div className="font-black text-slate-800">1-2 小時警訊</div>
                       <p className="text-sm text-slate-500 font-bold leading-relaxed">若於 1-2 小時內仍無法掌握個案行蹤，須報警並通知主治醫師。</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t-2 border-slate-200 p-4 z-[60] shadow-[0_-8px_30px_rgba(0,0,0,0.1)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center text-[11px] font-black gap-4 sm:gap-0 tracking-tighter">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5 text-red-600 bg-red-50 px-4 py-2 rounded-full border border-red-200 shadow-sm shadow-red-50">
              <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></div>
              緊急應變機制啟動中
            </div>
            <span className="text-slate-400 border-l pl-8 hidden md:inline uppercase tracking-[0.2em]">敦仁醫院應變指揮系統 v2.3</span>
          </div>
          <div className="flex gap-6 text-slate-700 bg-slate-100 px-5 py-2 rounded-full border border-slate-200 shadow-sm">
            <span className="flex items-center gap-1.5 underline decoration-slate-300">林厝派出所：已存入公務機</span>
            <span className="text-red-700 underline decoration-red-300 underline-offset-4 decoration-2">時限：1-2 小時內報警</span>
          </div>
        </div>
      </footer>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-in { animation: fade-in 0.5s ease-out; }
      `}</style>
    </div>
  );
};

export default App;