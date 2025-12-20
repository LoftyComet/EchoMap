// Map configuration for Sound Memory App

// For production, you should:
// 1. Sign up at https://mapbox.com/
// 2. Create a new access token with the correct scopes
// 3. Store it securely in environment variables
export const MAP_CONFIG = {
  // Using a reliable public token
  // For production, get your own token at: https://mapbox.com/help/create-api-access-token/
  MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',

  // Map style options - using basic style that's more likely to load
  MAP_STYLE: 'mapbox://styles/mapbox/streets-v12', // Changed to streets style

  // Default view state
  DEFAULT_VIEW_STATE: {
    longitude: 116.4074,    // Beijing (default location)
    latitude: 39.9042,
    zoom: 12,
    pitch: 45,
    bearing: 0,
    transitionDuration: 1000
  },

  // Marker configurations
  MARKER_CONFIG: {
    // Emotion colors for different audio types
    emotionColors: {
      'Joy': '#FFD700',
      'Loneliness': '#4A90E2',
      'Nostalgia': '#9B59B6',
      'Love': '#E74C3C',
      'Peace': '#2ECC71',
      'Excitement': '#FF6B6B'
    },
    // Marker size configurations
    size: {
      small: 20,
      medium: 30,
      large: 40
    }
  }
};