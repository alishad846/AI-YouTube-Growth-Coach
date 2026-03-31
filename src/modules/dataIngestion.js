import { getAppConfig } from './appConfig.js';

const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/videos';
const YOUTUBE_ANALYTICS_URL = 'https://youtubeanalytics.googleapis.com/v2/reports';

function buildUrl(videoId, apiKey) {
  const params = new URLSearchParams({
    part: 'snippet,statistics,contentDetails',
    id: videoId,
    key: apiKey
  });
  return `${YOUTUBE_API_URL}?${params.toString()}`;
}

function fakePayload(videoId) {
  const now = Date.now();
  return {
    videoId,
    stats: {
      viewCount: 1000 + Math.floor(Math.random() * 3000),
      likeCount: 80 + Math.floor(Math.random() * 200),
      commentCount: 5 + Math.floor(Math.random() * 40)
    },
    meta: {
      title: `Offline sample ${videoId}`,
      publishedAt: new Date(now - 86400000).toISOString(),
      duration: 6
    }
  };
}

async function fetchFromYouTube(videoId, apiKey) {
  const url = buildUrl(videoId, apiKey);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`YouTube API error ${response.status}`);
  }
  const payload = await response.json();
  const item = payload.items && payload.items[0];
  if (!item) {
    throw new Error('Video not found');
  }
  return {
    videoId,
    stats: {
      viewCount: Number(item.statistics.viewCount || 0),
      likeCount: Number(item.statistics.likeCount || 0),
      commentCount: Number(item.statistics.commentCount || 0)
    },
    meta: {
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
      duration: convertDuration(item.contentDetails?.duration)
    }
  };
}

function convertDuration(isoString = 'PT0S') {
  const match = isoString.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  return hours * 60 + minutes + seconds / 60;
}

async function fetchAnalyticsInsights(videoId, config) {
  const token = globalThis.YOUTUBE_ANALYTICS_TOKEN;
  if (!token) {
    throw new Error('Missing YOUTUBE_ANALYTICS_TOKEN for analytics reports.');
  }
  const rangeDays = config.analytics?.insightWindowDays || 30;
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const params = new URLSearchParams({
    ids: 'channel==MINE',
    startDate,
    endDate,
    metrics: 'views,estimatedMinutesWatched,impressions,annotationClickThroughRate',
    dimensions: 'video',
    filters: `video==${videoId}`
  });

  const response = await fetch(`${YOUTUBE_ANALYTICS_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Analytics API responded with ${response.status}`);
  }

  const body = await response.json();
  const headers = Array.isArray(body.columnHeaders) ? body.columnHeaders : [];
  const row = (Array.isArray(body.rows) && body.rows[0]) || [];
  const values = headers.reduce((acc, header, index) => {
    acc[header.name] = Number(row[index] || 0);
    return acc;
  }, {});

  return {
    views: values.views || 0,
    impressions: values.impressions || 0,
    watchMinutes: values.estimatedMinutesWatched || 0,
    ctr: values.annotationClickThroughRate || 0
  };
}

function attachAnalytics(videoId, payload, config) {
  if (!config.analytics?.enableReports) {
    return Promise.resolve(payload);
  }
  return fetchAnalyticsInsights(videoId, config)
    .then((analytics) => ({ ...payload, analytics }))
    .catch((error) => {
      console.warn('Analytics connector failed; continuing without analytics.', error);
      return payload;
    });
}

export const DataIngestion = {
  async fetchVideo(videoId) {
    const apiKey = globalThis.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.warn('No YOUTUBE_API_KEY provided; using offline simulation.');
      return fakePayload(videoId);
    }
    try {
      const payload = await fetchFromYouTube(videoId, apiKey);
      const config = getAppConfig();
      return await attachAnalytics(videoId, payload, config);
    } catch (error) {
      console.warn('YouTube fetch failed, falling back to cached simulation', error);
      return fakePayload(videoId);
    }
  }
};
