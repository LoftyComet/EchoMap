"use client";

import { useState, useEffect } from "react";
import MapComponent from "@/app/components/MapComponent";
import { RecordButton } from "@/app/components/RecordButton";
import { AudioDetailOverlay } from "@/app/components/AudioDetailOverlay";
import RecommendationPanel from "@/app/components/RecommendationPanel";
import { AudioRecord } from "@/types";
import { api } from "@/services/api";

export default function Home() {
  // States
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<AudioRecord | null>(null);
  const [audioRecords, setAudioRecords] = useState<AudioRecord[]>([]);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [currentCity, setCurrentCity] = useState<string>("上海市");
  const [visitedAudioIds, setVisitedAudioIds] = useState<Set<string>>(new Set());
  const [isLocating, setIsLocating] = useState(false);
  const [showDiscoveryPrompt, setShowDiscoveryPrompt] = useState(false);
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [viewMode, setViewMode] = useState<'web' | 'mobile' | null>(null);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [isAudioDetailMinimized, setIsAudioDetailMinimized] = useState(false);


  // Initialize User
  useEffect(() => {
    const initUser = async () => {
      let storedUserId = localStorage.getItem("sound_memory_user_id");
      
      if (storedUserId) {
        try {
          // Verify if user exists in backend
          await api.getUser(storedUserId);
        } catch (e) {
          console.warn("Stored user not found in backend, creating new one.");
          storedUserId = null;
          localStorage.removeItem("sound_memory_user_id");
        }
      }

      if (!storedUserId) {
        try {
          // Create a guest user
          const randomSuffix = Math.floor(Math.random() * 100000);
          const newUser = await api.createUser(`guest_${randomSuffix}`, `guest_${randomSuffix}@example.com`);
          storedUserId = newUser.id;
          localStorage.setItem("sound_memory_user_id", storedUserId!);
        } catch (e) {
          console.error("Failed to create guest user", e);
        }
      }
      if (storedUserId) setUserId(storedUserId);
    };
    initUser();
  }, []);

  // Fetch records
  const fetchRecords = async () => {
    try {
      const records = await api.getMapRecords();
      setAudioRecords(records);
    } catch (e) {
      console.error("Failed to fetch records", e);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          // Start locating animation after a short delay
          setTimeout(() => setIsLocating(true), 1000);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  const handleLocationReached = () => {
    setIsLocating(false);
    setShowDiscoveryPrompt(true);
  };

  const handleExploreNext = () => {
    setShowDiscoveryPrompt(false);
    if (audioRecords.length > 0) {
      // Find nearest or just pick first for now
      handleMarkerClick(audioRecords[0]);
    }
  };

  // Cinematic Tour Logic
  useEffect(() => {
    let tourInterval: NodeJS.Timeout;
    if (isRecordingMode && audioRecords.length > 0) {
      let currentIndex = 0;
      const runTour = () => {
        handleMarkerClick(audioRecords[currentIndex]);
        currentIndex = (currentIndex + 1) % audioRecords.length;
      };
      
      runTour(); // Start immediately
      tourInterval = setInterval(runTour, 6000); // Move every 6 seconds
    }
    return () => clearInterval(tourInterval);
  }, [isRecordingMode, audioRecords]);

  // Handle marker click
  const handleMarkerClick = (record: AudioRecord) => {
    setSelectedAudio(record);
    setIsAudioDetailMinimized(false); // Reset minimized state when opening new audio
    setVisitedAudioIds(prev => {
      const next = new Set(prev);
      next.add(record.id);
      return next;
    });
  };

  // Handle close audio detail
  const handleCloseAudioDetail = () => {
    setSelectedAudio(null);
  };

  // Handle navigation
  const handleNavigate = (direction: 'next' | 'prev') => {
    if (!selectedAudio) return;
    const currentIndex = audioRecords.findIndex(r => r.id === selectedAudio.id);
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % audioRecords.length;
    } else {
      newIndex = (currentIndex - 1 + audioRecords.length) % audioRecords.length;
    }
    setSelectedAudio(audioRecords[newIndex]);
  };

  return (
    <main className="w-full h-screen overflow-hidden bg-black text-white relative">
       {/* Mode Selection Screen */}
       {!viewMode && (
         <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-3xl flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-1000">
           <div className="text-center space-y-4">
             <h1 className="text-5xl font-bold tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
               EchoMap
             </h1>
             <p className="text-white/40 text-sm tracking-[0.2em] uppercase">声音记忆图谱</p>
           </div>
           
           <div className="flex gap-8">
             <button 
               onClick={() => setViewMode('web')}
               className="group relative w-40 h-48 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-500 flex flex-col items-center justify-center gap-4 hover:scale-105 hover:border-white/30"
             >
               <div className="w-16 h-12 rounded border border-white/20 group-hover:border-white/60 transition-colors" />
               <span className="text-xs text-white/60 tracking-widest group-hover:text-white">DESKTOP</span>
             </button>
             
             <button 
               onClick={() => setViewMode('mobile')}
               className="group relative w-40 h-48 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-500 flex flex-col items-center justify-center gap-4 hover:scale-105 hover:border-white/30"
             >
               <div className="w-8 h-14 rounded border border-white/20 group-hover:border-white/60 transition-colors" />
               <span className="text-xs text-white/60 tracking-widest group-hover:text-white">MOBILE</span>
             </button>
           </div>
         </div>
       )}

       {/* 背景地图 */}
       <MapComponent
         audioRecords={audioRecords}
         onMarkerClick={handleMarkerClick}
         userLocation={userLocation}
         selectedAudio={selectedAudio}
         visitedAudioIds={visitedAudioIds}
         isLocating={isLocating}
         onLocationReached={handleLocationReached}
       />

       {/* 录制模式切换器 (仅在左下角微弱显示) */}
       <button 
         onClick={() => setIsRecordingMode(!isRecordingMode)}
         className="absolute bottom-6 left-6 z-50 p-2 rounded-full bg-white/5 hover:bg-red-500/20 border border-white/10 transition-all group"
         title="电影级演示模式"
       >
         <div className={`w-2 h-2 rounded-full ${isRecordingMode ? 'bg-red-500 animate-pulse' : 'bg-white/20 group-hover:bg-white/40'}`} />
       </button>

       {/* 顶层 UI 元素 */}
       <div className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-1000 ${isRecordingMode ? 'opacity-0' : 'opacity-100'}`}>
          {/* Logo 或 标题 - 保持在左上角 */}
          <h1 className="absolute top-6 left-6 text-2xl font-bold tracking-tighter mix-blend-difference text-white drop-shadow-md">
            EchoMap
          </h1>

          {/* Discovery Prompt */}
          {showDiscoveryPrompt && (
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 pointer-events-auto">
              <div className="bg-black/60 backdrop-blur-2xl border border-white/20 p-6 rounded-[2rem] shadow-2xl flex flex-col items-center space-y-4 min-w-[280px]">
                <div className="text-white/90 text-sm font-medium tracking-wide">已定位到你的当前位置</div>
                <div className="flex space-x-3 w-full">
                  <button 
                    onClick={() => setShowDiscoveryPrompt(false)}
                    className="flex-1 py-3 px-6 rounded-full bg-white/5 hover:bg-white/10 text-white/60 text-xs transition-all border border-white/10"
                  >
                    稍后探索
                  </button>
                  <button 
                    onClick={handleExploreNext}
                    className="flex-1 py-3 px-6 rounded-full bg-white text-black text-xs font-bold transition-all shadow-[0_10px_20px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95"
                  >
                    探索下一处
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 城市搜索与推荐面板 */}
          <div className={`absolute pointer-events-auto space-y-4 transition-all duration-500 ${
            viewMode === 'mobile' 
              ? 'top-20 left-4 right-4 w-auto z-30' 
              : 'top-6 right-6 w-80 z-30'
          } ${
            (viewMode === 'mobile' && !!selectedAudio && !isAudioDetailMinimized) ? '-translate-y-[200%] opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
          }`}>
            <div className="bg-white/90 backdrop-blur-md p-2 rounded-lg shadow-lg flex items-center border border-gray-200">
              <input 
                type="text" 
                value={currentCity}
                onChange={(e) => setCurrentCity(e.target.value)}
                className="bg-transparent text-black outline-none flex-1 px-2 text-sm"
                placeholder="输入城市漫游..."
              />
              <span className="text-gray-500 px-2">🔍</span>
            </div>
            
            <RecommendationPanel 
              currentCity={currentCity}
              userLat={userLocation?.lat || 31.2304}
              userLng={userLocation?.lng || 121.4737}
              onPlayAudio={handleMarkerClick}
              selectedAudio={selectedAudio}
              isMobile={viewMode === 'mobile'}
              isHidden={!!selectedAudio && !isAudioDetailMinimized}
              onExpandChange={setIsPanelExpanded}
            />
          </div>
       </div>

       {/* 录音按钮 (允许点击) */}
       {!isRecordingMode && (
         <div className={`transition-all duration-500 z-20 ${
           (viewMode === 'mobile' && (isPanelExpanded || (!!selectedAudio && !isAudioDetailMinimized))) 
             ? 'opacity-0 translate-y-20 pointer-events-none' 
             : 'opacity-100 translate-y-0'
         }`}>
            <RecordButton userId={userId} onUploadSuccess={fetchRecords} isMobile={viewMode === 'mobile'} />
         </div>
       )}

       {/* 音频详情弹窗 */}
       {selectedAudio && !isRecordingMode && (
         <AudioDetailOverlay
           record={selectedAudio}
           onClose={handleCloseAudioDetail}
           onNext={() => handleNavigate('next')}
           onPrev={() => handleNavigate('prev')}
           isMobile={viewMode === 'mobile'}
           isMinimized={isAudioDetailMinimized}
           onMinimize={() => setIsAudioDetailMinimized(!isAudioDetailMinimized)}
         />
       )}
    </main>
  )
}