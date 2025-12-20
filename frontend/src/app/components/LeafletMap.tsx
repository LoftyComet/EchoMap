"use client";

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToStaticMarkup } from 'react-dom/server';
import { AudioRecord } from '@/types';
import { MAP_CONFIG } from '@/config/map';

// Fix for default marker icons in Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface LeafletMapProps {
  audioRecords: AudioRecord[];
  onMarkerClick?: (record: AudioRecord) => void;
  userLocation?: { lat: number; lng: number } | null;
}

// Component to handle map view updates and animations
function MapController({ 
  userLocation, 
  hasAnimated, 
  setHasAnimated 
}: { 
  userLocation: { lat: number; lng: number } | null,
  hasAnimated: boolean,
  setHasAnimated: (v: boolean) => void
}) {
  const map = useMap();
  
  useEffect(() => {
    if (userLocation && !hasAnimated) {
      // 1. Start at user location, zoomed in
      map.setView([userLocation.lat, userLocation.lng], 16, { animate: false });
      
      // 2. Wait a bit, then zoom out to show context (Cinematic Pull-back)
      const timer = setTimeout(() => {
        map.flyTo([userLocation.lat, userLocation.lng], 13, {
          duration: 3, // Slow, cinematic duration
          easeLinearity: 0.25
        });
        setHasAnimated(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [userLocation, hasAnimated, map, setHasAnimated]);

  return null;
}

// Custom Marker Component (for rendering to HTML string)
const CustomMarker = ({ color, emotion }: { color: string; emotion: string }) => (
  <div className="relative w-[60px] h-[60px] flex items-center justify-center group">
    {/* Outer Glow Ring */}
    <div
      className="absolute inset-0 rounded-full animate-[pulse-glow_3s_infinite]"
      style={{
        border: `1px solid ${color}`,
        opacity: 0.4,
      }}
    />
    
    {/* Inner Glow */}
    <div
      className="absolute inset-0 rounded-full blur-md transition-all duration-500 group-hover:scale-150 group-hover:opacity-80"
      style={{
        backgroundColor: color,
        opacity: 0.6,
        transform: 'scale(0.5)'
      }}
    />

    {/* Core Particle */}
    <div
      className="relative w-3 h-3 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-transform duration-300 group-hover:scale-125"
    />
  </div>
);

export default function LeafletMap({ audioRecords, onMarkerClick, userLocation }: LeafletMapProps) {
  const [hasAnimated, setHasAnimated] = useState(false);
  
  const defaultCenter: [number, number] = [
    MAP_CONFIG.DEFAULT_VIEW_STATE.latitude,
    MAP_CONFIG.DEFAULT_VIEW_STATE.longitude
  ];

  // Calculate connections (simple mesh for demo)
  const connections = audioRecords.slice(0, 10).map((record, i) => {
    if (i === audioRecords.length - 1) return null;
    // Connect to next record for a "constellation" look
    const nextRecord = audioRecords[i + 1];
    return (
      <Polyline
        key={`line-${i}`}
        positions={[
          [record.latitude, record.longitude],
          [nextRecord.latitude, nextRecord.longitude]
        ]}
        pathOptions={{
          color: 'rgba(255, 255, 255, 0.1)',
          weight: 1,
          dashArray: '5, 10',
          className: 'animate-pulse' 
        }}
      />
    );
  });

  return (
    <MapContainer
      center={defaultCenter}
      zoom={MAP_CONFIG.DEFAULT_VIEW_STATE.zoom}
      className="w-full h-full z-10"
      style={{ background: 'transparent' }}
      zoomControl={false}
    >
      <MapController 
        userLocation={userLocation} 
        hasAnimated={hasAnimated} 
        setHasAnimated={setHasAnimated} 
      />
      
      {/* Dark Mode Tiles */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="map-tiles-dark"
      />

      {/* Connection Lines */}
      {connections}

      {/* Markers */}
      {audioRecords.map((record) => {
        const emotionColor = MAP_CONFIG.MARKER_CONFIG.emotionColors[
          record.emotion as keyof typeof MAP_CONFIG.MARKER_CONFIG.emotionColors
        ] || '#00f3ff';

        const iconHtml = renderToStaticMarkup(
          <CustomMarker color={emotionColor} emotion={record.emotion} />
        );

        const customIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: iconHtml,
          iconSize: [60, 60],
          iconAnchor: [30, 30],
        });

        return (
          <Marker
            key={record.id}
            position={[record.latitude, record.longitude]}
            icon={customIcon}
            eventHandlers={{
              click: () => onMarkerClick && onMarkerClick(record),
            }}
          />
        );
      })}
    </MapContainer>
  );
}
