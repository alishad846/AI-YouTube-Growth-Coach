const STORAGE_KEY = 'ai-youtube-growth-coach';
const NODE_FALLBACK = { data: {} };
const DEFAULT_PREFERENCES = {
  thresholds: {
    engagement: 0.06,
    growth: 0.02
  },
  timingWindow: {
    start: '18:00',
    end: '22:00'
  },
  analytics: {
    enableReports: false,
    insightWindowDays: 30
  },
  anomalies: {
    velocityDrop: 40,
    engagementDrop: 0.045,
    growthDrop: 0.015
  },
  customRecommendations: []
};

const VERSION_RETENTION_LIMIT = 40;

function clonePayload(payload) {
  try {
    return JSON.parse(JSON.stringify(payload || {}));
  } catch (error) {
    console.warn('Unable to clone payload for versioning', error);
    return payload || {};
  }
}

function createVersionEntry(videoId, payload, context) {
  return {
    id: `version-${videoId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    videoId,
    payload: clonePayload(payload),
    context,
    recordedAt: new Date().toISOString()
  };
}
function getStorageArea() {
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  // simple in-memory fallback for Node.js test harnesses
  return {
    getItem: (key) => NODE_FALLBACK.data[key] || null,
    setItem: (key, value) => {
      NODE_FALLBACK.data[key] = value;
    }
  };
}

function readStore() {
  const storage = getStorageArea();
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return { videos: [], preferences: { thresholds: {} } };
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Corrupt local storage; reinitializing', error);
    return { videos: [], preferences: { thresholds: {} } };
  }
}

function writeStore(payload) {
  const storage = getStorageArea();
  storage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function mergePreferences(base = {}, overrides = {}) {
  const result = { ...base };
  Object.entries(overrides || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      result[key] = [...value];
    } else if (value && typeof value === 'object') {
      result[key] = mergePreferences(result[key], value);
    } else {
      result[key] = value;
    }
  });
  return result;
}

function ensureStructure(store) {
  return {
    videos: Array.isArray(store.videos) ? store.videos : [],
    preferences: mergePreferences(DEFAULT_PREFERENCES, store.preferences || {}),
    versions: Array.isArray(store.versions) ? store.versions : []
  };
}

function findVideo(store, videoId) {
  return store.videos.find((video) => video.videoId === videoId);
}

function persist(store) {
  writeStore(store);
}

export const LocalStorageManager = {
  getAll() {
    return ensureStructure(readStore());
  },
  getVideos() {
    return ensureStructure(readStore()).videos;
  },
  saveVideo(video) {
    const store = ensureStructure(readStore());
    const existingIndex = store.videos.findIndex((item) => item.videoId === video.videoId);
    if (existingIndex >= 0) {
      store.videos[existingIndex] = { ...store.videos[existingIndex], ...video };
    } else {
      store.videos.push({ ...video, snapshots: video.snapshots || [] });
    }
    persist(store);
  },
  addSnapshot(videoId, snapshot) {
    const store = ensureStructure(readStore());
    let record = findVideo(store, videoId);
    if (!record) {
      record = { videoId, title: 'Unknown video', snapshots: [] };
      store.videos.push(record);
    }
    record.snapshots = record.snapshots || [];
    record.snapshots.push(snapshot);
    record.lastCheck = snapshot.timestamp;
    persist(store);
    return record;
  },
  getLatestSnapshot(videoId) {
    const store = ensureStructure(readStore());
    const record = findVideo(store, videoId);
    if (!record || !Array.isArray(record.snapshots) || record.snapshots.length === 0) {
      return null;
    }
    return record.snapshots[record.snapshots.length - 1];
  },
  getSnapshots(videoId) {
    const store = ensureStructure(readStore());
    const record = findVideo(store, videoId);
    return record && Array.isArray(record.snapshots) ? record.snapshots : [];
  },
  deleteVideo(videoId) {
    const store = ensureStructure(readStore());
    store.videos = store.videos.filter((item) => item.videoId !== videoId);
    persist(store);
  },
  getPreferences() {
    return ensureStructure(readStore()).preferences;
  },
  setPreferences(prefs) {
    const store = ensureStructure(readStore());
    store.preferences = mergePreferences(store.preferences, prefs);
    persist(store);
  },
  recordVersion(videoId, payload = {}, context = {}) {
    const store = ensureStructure(readStore());
    store.versions = store.versions || [];
    const entry = createVersionEntry(videoId, payload, context);
    store.versions.push(entry);
    if (store.versions.length > VERSION_RETENTION_LIMIT) {
      store.versions = store.versions.slice(-VERSION_RETENTION_LIMIT);
    }
    persist(store);
    return entry;
  },
  getVersionHistory(videoId) {
    const store = ensureStructure(readStore());
    return (store.versions || []).filter((entry) => entry.videoId === videoId).slice(-10).reverse();
  },
  rollbackVersion(versionId) {
    const store = ensureStructure(readStore());
    const index = (store.versions || []).findIndex((entry) => entry.id === versionId);
    if (index < 0) {
      return null;
    }
    const entry = store.versions[index];
    const videoState = entry.payload.videoState;
    if (videoState) {
      const recordIndex = store.videos.findIndex((video) => video.videoId === entry.videoId);
      if (recordIndex >= 0) {
        store.videos[recordIndex] = { ...videoState };
        persist(store);
      }
    }
    return entry;
  }
};

export { DEFAULT_PREFERENCES };
