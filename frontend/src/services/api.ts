import { AudioRecord } from "@/types";

// 使用相对路径，利用 Next.js 的 rewrites 转发到后端
const API_BASE_URL = "";

// Helper to map backend response to frontend type
const mapRecord = (record: any): AudioRecord => {
  // Handle both Windows (\) and Unix (/) path separators
  const filename = record.file_path.split(/[/\\]/).pop();
  return {
    id: record.id,
    latitude: record.latitude,
    longitude: record.longitude,
    emotion: record.emotion_tag || "Unknown",
    tags: record.scene_tags || [],
    story: record.generated_story || "No story generated yet.",
    // 直接使用 /static 路径，利用 rewrites
    audioUrl: `/static/uploads/${filename}`,
    createdAt: record.created_at,
    likeCount: record.like_count || 0,
    questionCount: record.question_count || 0,
    city: record.city,
    district: record.district,
  };
};

export const api = {
  // User
  createUser: async (username: string, email: string) => {
    const response = await fetch(`${API_BASE_URL}/users/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password: "password" }), // Default password for guest
    });
    if (!response.ok) throw new Error("Failed to create user");
    return response.json();
  },

  getUser: async (userId: string) => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`);
    if (!response.ok) throw new Error("User not found");
    return response.json();
  },

  // Records
  getMapRecords: async (): Promise<AudioRecord[]> => {
    // Use latest records to ensure we see the most recent uploads
    // 修正路径为 /api/audios/map (后端路由)
    const response = await fetch(`${API_BASE_URL}/api/audios/map?limit=100`);
    if (!response.ok) throw new Error("Failed to fetch records");
    const data = await response.json();
    return data.map(mapRecord);
  },

  uploadRecord: async (file: Blob, lat: number, lng: number, userId?: string) => {
    const formData = new FormData();
    formData.append("file", file, "recording.webm");
    formData.append("latitude", lat.toString());
    formData.append("longitude", lng.toString());
    if (userId) {
      formData.append("user_id", userId);
    }

    // 修正路径为 /api/audios/upload (后端路由)
    const response = await fetch(`${API_BASE_URL}/api/audios/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Upload failed");
    const data = await response.json();
    return mapRecord(data);
  },

  updateRecord: async (recordId: string, data: { emotion_tag?: string; scene_tags?: string[]; generated_story?: string }) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/records/${recordId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Update failed");
    const resData = await response.json();
    return mapRecord(resData);
  },

  regenerateRecord: async (recordId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/v1/records/${recordId}/regenerate`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Regeneration failed");
    const data = await response.json();
    return mapRecord(data);
  },

  likeRecord: async (recordId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/audios/${recordId}/like`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to like record");
    const data = await response.json();
    return mapRecord(data);
  },

  unlikeRecord: async (recordId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/audios/${recordId}/like`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to unlike record");
    const data = await response.json();
    return mapRecord(data);
  },

  questionRecord: async (recordId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/audios/${recordId}/question`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to question record");
    const data = await response.json();
    return mapRecord(data);
  },

  unquestionRecord: async (recordId: string) => {
    const response = await fetch(`${API_BASE_URL}/api/audios/${recordId}/question`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to unquestion record");
    const data = await response.json();
    return mapRecord(data);
  },

  // New Strategy APIs
  getResonanceAudio: async (city: string, currentHour: number): Promise<AudioRecord[]> => {
    const response = await fetch(`${API_BASE_URL}/audio/resonance?city=${encodeURIComponent(city)}&current_hour=${currentHour}`);
    if (!response.ok) throw new Error("Failed to fetch resonance audio");
    const data = await response.json();
    return data.map(mapRecord);
  },

  getCultureAudio: async (city: string): Promise<AudioRecord[]> => {
    const response = await fetch(`${API_BASE_URL}/audio/culture?city=${encodeURIComponent(city)}`);
    if (!response.ok) throw new Error("Failed to fetch culture audio");
    const data = await response.json();
    return data.map(mapRecord);
  },

  getRoamingAudio: async (city: string, lat: number, lng: number): Promise<AudioRecord[]> => {
    const response = await fetch(`${API_BASE_URL}/audio/roaming?city=${encodeURIComponent(city)}&lat=${lat}&lng=${lng}`);
    if (!response.ok) throw new Error("Failed to fetch roaming audio");
    const data = await response.json();
    return data.map(mapRecord);
  }
};
