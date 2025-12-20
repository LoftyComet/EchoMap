// src/app/components/AudioDetailOverlay.tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Play, Pause, Heart, Share2 } from 'lucide-react';
import { AudioRecord } from '@/types';

interface DetailProps {
  record: AudioRecord;
  onClose: () => void;
}

export const AudioDetailOverlay: React.FC<DetailProps> = ({ record, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(30); // Mock duration for demo
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element for demo
    if (record.audioUrl && !audioRef.current) {
      audioRef.current = new Audio();
      // For demo, we'll simulate playback with a timer
      // In real app, you would: audioRef.current.src = record.audioUrl;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [record.audioUrl]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying) {
      interval = setInterval(() => {
        setPlaybackTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, duration]);

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      // audioRef.current?.pause();
    } else {
      setIsPlaying(true);
      // For demo: simulate short playback
      setTimeout(() => {
        setIsPlaying(false);
        setPlaybackTime(0);
      }, 5000);
      // audioRef.current?.play();
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (playbackTime / duration) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      className="absolute top-20 right-5 w-80 md:w-96 z-40"
    >
      {/* iOS Style Blur Card */}
      <div className="bg-gray-900/70 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl text-white overflow-hidden relative">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
          <X size={16} />
        </button>

        {/* Header: Emotion Tag */}
        <div className="flex items-center space-x-2 mb-4">
          <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-indigo-500/80 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            {record.emotion}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(record.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Story Content */}
        <h2 className="text-xl font-semibold mb-2 leading-tight">声音的故事</h2>
        <p className="text-sm text-gray-300 leading-relaxed font-light mb-6">
          {record.story}
        </p>

        {/* Audio Player */}
        <div className="bg-white/5 rounded-xl mb-6 p-4 border border-white/5">
          {/* Play Controls */}
          <div className="flex items-center justify-center mb-4">
            <button
              onClick={handlePlayPause}
              className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            >
              {isPlaying ? (
                <Pause size={18} className="text-black" />
              ) : (
                <Play size={18} className="text-black ml-1" />
              )}
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="relative h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-white rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{formatTime(playbackTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Waveform Visualization */}
          <div className="flex items-center justify-center space-x-1 mt-3 h-8">
            {[...Array(15)].map((_, i) => {
              const isActive = isPlaying && Math.random() > 0.3;
              const height = isActive ? Math.random() * 100 + 50 : 20;
              return (
                <div
                  key={i}
                  className="w-1 bg-white/40 rounded-full transition-all duration-150"
                  style={{
                    height: `${height}%`,
                    opacity: isActive ? 0.8 : 0.4
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center border-t border-white/10 pt-4">
           <div className="flex space-x-2">
             {record.tags.map(tag => (
               <span key={tag} className="text-xs text-cyan-300">#{tag}</span>
             ))}
           </div>
           <div className="flex space-x-3">
             <Heart size={20} className="text-gray-400 hover:text-red-500 transition cursor-pointer" />
             <Share2 size={20} className="text-gray-400 hover:text-white transition cursor-pointer" />
           </div>
        </div>
      </div>
    </motion.div>
  );
};