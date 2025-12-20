"use client";

import { useState, useEffect } from "react";
import MapComponent from "@/app/components/MapComponent";
import { RecordButton } from "@/app/components/RecordButton";
import { AudioDetailOverlay } from "@/app/components/AudioDetailOverlay";
import { AudioRecord } from "@/types";

export default function Home() {
  // States
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<AudioRecord | null>(null);

  // Demo audio records for map demonstration
  const demoAudioRecords: AudioRecord[] = [
    {
      id: 'demo-1',
      latitude: 39.9042,
      longitude: 116.4074,
      emotion: 'Joy',
      tags: ['music', 'street', 'traditional'],
      story: '在北京的胡同里听到了悠扬的二胡声，仿佛时间倒流回了老北京。那旋律承载着岁月的痕迹，让人心绪宁静。',
      audioUrl: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAAAQAEAAEAfAAAQAQABAAgAZGF0YQAAAAA=',
      createdAt: new Date('2024-01-15T10:30:00Z').toISOString()
    },
    {
      id: 'demo-2',
      latitude: 39.9142,
      longitude: 116.4174,
      emotion: 'Loneliness',
      tags: ['night', 'rain', 'quiet'],
      story: '深夜的雨滴敲打着窗户，带来了几分宁静与思念。独处时刻，雨声成了最好的陪伴。',
      audioUrl: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAAAQAEAAEAfAAAQAQABAAgAZGF0YQAAAAA=',
      createdAt: new Date('2024-02-20T22:45:00Z').toISOString()
    },
    {
      id: 'demo-3',
      latitude: 39.9242,
      longitude: 116.4274,
      emotion: 'Peace',
      tags: ['park', 'morning', 'birds'],
      story: '清晨的公园里，鸟鸣声伴随着晨练的人们，充满生机。这是一天中最美好的时光。',
      audioUrl: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAAAQAEAAEAfAAAQAQABAAgAZGF0YQAAAAA=',
      createdAt: new Date('2024-03-10T06:15:00Z').toISOString()
    },
    {
      id: 'demo-4',
      latitude: 39.8942,
      longitude: 116.3974,
      emotion: 'Nostalgia',
      tags: ['childhood', 'market', 'crowd'],
      story: '菜市场里的叫卖声让我想起了童年时光，那种热闹的氛围和新鲜蔬菜的香气至今难忘。',
      audioUrl: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAAAQAEAAEAfAAAQAQABAAgAZGF0YQAAAAA=',
      createdAt: new Date('2024-01-05T08:30:00Z').toISOString()
    },
    {
      id: 'demo-5',
      latitude: 39.9342,
      longitude: 116.4374,
      emotion: 'Excitement',
      tags: ['festival', 'celebration', 'drums'],
      story: '春节庙会上的锣鼓声震耳欲聋，但却让人感到无比兴奋和快乐。这就是新年的味道！',
      audioUrl: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAAAQAEAAEAfAAAQAQABAAgAZGF0YQAAAAA=',
      createdAt: new Date('2024-02-10T14:20:00Z').toISOString()
    }
  ];

  const [audioRecords, setAudioRecords] = useState<AudioRecord[]>(demoAudioRecords);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  // Handle marker click
  const handleMarkerClick = (record: AudioRecord) => {
    setSelectedAudio(record);
  };

  // Handle close audio detail
  const handleCloseAudioDetail = () => {
    setSelectedAudio(null);
  };

  return (
    <main className="w-full h-screen overflow-hidden bg-black text-white relative">
       {/* 背景地图 */}
       <MapComponent
         audioRecords={audioRecords}
         onMarkerClick={handleMarkerClick}
         userLocation={userLocation}
       />

       {/* 顶层 UI 元素 */}
       <div className="pointer-events-none absolute inset-0 z-10">
          {/* Logo 或 标题 */}
          <h1 className="absolute top-6 left-6 text-2xl font-bold tracking-tighter mix-blend-difference">
            ECHOES
          </h1>
       </div>

       {/* 录音按钮 (允许点击) */}
       <RecordButton />

       {/* 音频详情弹窗 */}
       {selectedAudio && (
         <AudioDetailOverlay
           record={selectedAudio}
           onClose={handleCloseAudioDetail}
         />
       )}
    </main>
  )
}