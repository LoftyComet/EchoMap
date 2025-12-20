"use client";

import { useEffect, useState } from 'react';
import { AudioRecord } from '@/types';
import { MAP_CONFIG } from '@/config/map';

// Simple client-side map using iframe to avoid SSR issues
function ClientMap({
  audioRecords = [],
  onMarkerClick,
  userLocation
}: {
  audioRecords?: AudioRecord[];
  onMarkerClick?: (record: AudioRecord) => void;
  userLocation?: { lat: number; lng: number } | null;
}) {
  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
    // Use OpenStreetMap via iframe - this bypasses all SSR issues
    const center = userLocation
      ? `${userLocation.lat},${userLocation.lng}`
      : `${MAP_CONFIG.DEFAULT_VIEW_STATE.latitude},${MAP_CONFIG.DEFAULT_VIEW_STATE.longitude}`;

    const zoom = MAP_CONFIG.DEFAULT_VIEW_STATE.zoom;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${116.3074},${39.8542},${116.5274},${39.9642}&layer=mapnik&marker=${center}`;

    setMapUrl(url);
  }, [userLocation]);

  return (
    <div className="w-full h-screen relative">
      {/* OpenStreetMap iframe */}
      <iframe
        src={mapUrl || `https://www.openstreetmap.org/export/embed.html?bbox=116.3074,39.8542,116.5274,39.9642&layer=mapnik`}
        className="w-full h-full border-0"
        title="Sound Memory Map"
        loading="lazy"
      />

      {/* Overlay for markers and UI */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Map info overlay */}
        <div className="absolute top-4 left-4 bg-black/70 backdrop-blur p-4 rounded-xl shadow-sm max-w-xs text-white pointer-events-auto">
          <h1 className="text-xl font-bold mb-1">Sound Memory</h1>
          <p className="text-xs text-gray-400">OpenStreetMap View</p>
          <p className="text-xs text-gray-500 mt-2">
            Real map with audio story locations
          </p>
        </div>

        {/* Controls hint */}
        <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur p-3 rounded-lg text-white text-xs pointer-events-auto">
          <p>📍 {audioRecords.length} audio memories</p>
          {userLocation && <p>🎯 Location detected</p>}
          <p className="mt-1">🖱️ Use map controls to navigate</p>
        </div>

        {/* Audio markers overlay (simplified) */}
        {audioRecords.slice(0, 5).map((record, index) => {
          const emotionColor = MAP_CONFIG.MARKER_CONFIG.emotionColors[
            record.emotion as keyof typeof MAP_CONFIG.MARKER_CONFIG.emotionColors
          ] || '#FF6B6B';

          // Position markers in a simple grid pattern for demo
          const positions = [
            { top: '20%', left: '30%' },
            { top: '40%', left: '60%' },
            { top: '60%', left: '40%' },
            { top: '30%', left: '70%' },
            { top: '70%', left: '20%' }
          ];

          const pos = positions[index % positions.length];

          return (
            <div
              key={record.id}
              className="absolute pointer-events-auto cursor-pointer group"
              style={pos}
              onClick={() => onMarkerClick && onMarkerClick(record)}
            >
              {/* Glow effect */}
              <div
                className="absolute inset-0 rounded-full animate-ping"
                style={{
                  width: '30px',
                  height: '30px',
                  backgroundColor: emotionColor,
                  opacity: 0.3,
                  transform: 'translate(-50%, -50%)'
                }}
              />

              {/* Marker */}
              <div
                className="relative w-6 h-6 rounded-full shadow-lg border-2 border-white transition-transform group-hover:scale-125"
                style={{
                  backgroundColor: emotionColor
                }}
              />

              {/* Emotion label on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {record.emotion}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



interface MapComponentProps {
  audioRecords?: AudioRecord[];
  onMarkerClick?: (record: AudioRecord) => void;
  userLocation?: { lat: number; lng: number } | null;
}

export default function MapComponent({
  audioRecords = [],
  onMarkerClick,
  userLocation
}: MapComponentProps) {
  return (
    <ClientMap
      audioRecords={audioRecords}
      onMarkerClick={onMarkerClick}
      userLocation={userLocation}
    />
  );
}