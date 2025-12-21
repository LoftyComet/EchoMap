import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Minus } from 'lucide-react';
import { AudioRecord } from '@/types';
import { api } from '@/services/api';

interface RecommendationPanelProps {
  currentCity: string;
  userLat: number;
  userLng: number;
  onPlayAudio: (audio: AudioRecord) => void;
  selectedAudio?: AudioRecord | null;
  isMobile?: boolean;
  isHidden?: boolean;
  onExpandChange?: (expanded: boolean) => void;
}

const RecommendationPanel: React.FC<RecommendationPanelProps> = ({ 
  currentCity, 
  userLat, 
  userLng, 
  onPlayAudio,
  selectedAudio,
  isMobile,
  isHidden = false,
  onExpandChange
}) => {
  const [activeTab, setActiveTab] = useState<'resonance' | 'culture' | 'roaming'>('resonance');
  const [records, setRecords] = useState<AudioRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Notify parent about expansion state
  useEffect(() => {
    onExpandChange?.(isExpanded);
  }, [isExpanded, onExpandChange]);

  useEffect(() => {
    const fetchRecords = async () => {
      if (!currentCity) return;
      
      setLoading(true);
      try {
        let data: AudioRecord[] = [];
        if (activeTab === 'resonance') {
          const currentHour = new Date().getHours();
          data = await api.getResonanceAudio(currentCity, currentHour);
        } else if (activeTab === 'culture') {
          data = await api.getCultureAudio(currentCity);
        } else if (activeTab === 'roaming') {
          data = await api.getRoamingAudio(currentCity, userLat, userLng);
        }
        setRecords(data);
        // Auto-select first record when tab changes to trigger map animation
        if (data.length > 0 && !isMobile) { // Don't auto-play on mobile to avoid confusion
          onPlayAudio(data[0]);
        }
      } catch (error) {
        console.error("Failed to fetch recommendations", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [activeTab, currentCity, userLat, userLng, isMobile]);

  // Mobile View
  if (isMobile) {
    return (
      <AnimatePresence>
        {!isHidden && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ 
              y: 0,
              height: isExpanded ? '70vh' : '100px'
            }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-2xl border-t border-white/10 z-40 rounded-t-[2rem] overflow-hidden flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.6)]"
          >
            {/* Drag Handle / Header */}
            <div 
              className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-pointer active:bg-white/5 transition-colors"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mb-3" />
              {!isExpanded && (
                <span className="text-xs text-white/50 font-medium tracking-widest uppercase">
                  Swipe or Tap to Explore
                </span>
              )}
            </div>

            <div className="px-4 pb-2 flex-shrink-0">
              <div className="flex p-1 bg-white/5 rounded-xl mb-2 border border-white/5">
                {(['resonance', 'culture', 'roaming'] as const).map((tab) => (
                  <button 
                    key={tab}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab(tab);
                      if (!isExpanded) setIsExpanded(true);
                    }}
                    className={`flex-1 py-2.5 text-xs font-medium rounded-lg transition-all duration-300 ${
                      activeTab === tab 
                        ? 'bg-white/15 text-white shadow-lg' 
                        : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    {tab === 'resonance' ? '共鸣' : tab === 'culture' ? '文化' : '漫游'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-8 custom-scrollbar space-y-2">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                </div>
              ) : (
                records.map(record => {
                  const isSelected = selectedAudio?.id === record.id;
                  return (
                    <motion.div 
                      layout
                      key={record.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-2xl flex items-center gap-4 transition-all active:scale-98 ${
                        isSelected ? 'bg-white/10 border border-white/20' : 'bg-white/5 border border-transparent'
                      }`}
                      onClick={() => {
                        onPlayAudio(record);
                        // Optional: Collapse on selection? Maybe not, user might want to browse.
                      }}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white/20' : 'bg-white/10'}`}>
                         <div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-[#A7BBC7] animate-pulse' : 'bg-white/40'}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-white/80'}`}>
                          {record.story}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-white/40 border border-white/5">#{record.tags[0]}</span>
                          <span className="text-[10px] text-white/30 flex items-center gap-1">
                            <span className="text-red-400/60">♥</span> {record.likeCount}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
              
              {/* Bottom spacer for safe area */}
              <div className="h-8" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Desktop View (Original)
  return (
    <div className="bg-black/40 backdrop-blur-xl p-4 rounded-2xl shadow-2xl max-h-[500px] overflow-hidden flex flex-col border border-white/10 pointer-events-auto">
      <div className="flex p-1 bg-white/5 rounded-xl mb-4 border border-white/5">
        {(['resonance', 'culture', 'roaming'] as const).map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-300 ${
              activeTab === tab 
                ? 'bg-white/10 text-white shadow-lg' 
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {tab === 'resonance' ? '时空共鸣' : tab === 'culture' ? '文化声标' : '乡愁漫游'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
          <div className="text-white/40 text-xs tracking-widest">探索中</div>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar">
          {records.length === 0 ? (
            <div className="text-white/30 text-center py-8 text-sm italic">暂无推荐内容</div>
          ) : (
            records.map(record => {
              const isSelected = selectedAudio?.id === record.id;
              return (
                <div 
                  key={record.id} 
                  className={`group p-4 rounded-xl cursor-pointer transition-all duration-500 border ${
                    isSelected 
                      ? 'bg-white/15 border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]' 
                      : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                  }`} 
                  onClick={() => onPlayAudio(record)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`font-medium text-sm transition-colors duration-300 ${isSelected ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>
                      {record.story.substring(0, 40)}...
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-[#A7BBC7] animate-pulse shadow-[0_0_8px_rgba(167,187,199,0.8)]" />
                    )}
                  </div>
                  
                  <div className="text-[10px] text-white/40 mt-2 flex justify-between items-center">
                    <div className="flex gap-2">
                      {record.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 bg-white/5 rounded-md border border-white/5">#{tag}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="opacity-60">❤️</span> {record.likeCount}
                      </span>
                      {record.city && (
                        <span className="text-[#A7BBC7]/80 flex items-center gap-0.5">
                          <span className="text-[8px]">📍</span> {record.district || record.city}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default RecommendationPanel;
