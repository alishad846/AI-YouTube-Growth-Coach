import { LocalStorageManager } from "./localStorageManager.js";
import { DataIngestion } from "./dataIngestion.js";
import {
  calculateEngagementRate,
  calculateGrowthRate,
  calculatePerformanceScore,
} from "./featureEngineering.js";
import { buildGrowthDelta } from "./growthSnapshotEngine.js";
import { analyzeDiagnosis } from "./analysisEngine.js";
import { detectAlerts } from "./alertEngine.js";
import { generateRecommendations } from "./recommendationEngine.js";
import { learnPatterns } from "./patternLearningEngine.js";
import { formatReport } from "./formatter.js";
import { addCustomRecommendation, getAppConfig } from "./appConfig.js";

const NotificationSystem = {
  history: [],
  listeners: new Set(),
  notify(message) {
    const entry = {
      id: `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      message,
      timestamp: new Date().toISOString(),
    };
    this.history = [entry, ...this.history].slice(0, 6);
    this.listeners.forEach((listener) => {
      try {
        listener(this.history);
      } catch (error) {
        console.warn("Notification listener crashed", error);
      }
    });
    return entry;
  },
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },
  getHistory() {
    return [...this.history];
  },
  clear() {
    this.history = [];
    this.listeners.forEach((listener) => listener(this.history));
  },
};

const patchQueue = [];
let patchInFlight = false;

async function processPatchQueue() {
  if (patchInFlight || !patchQueue.length) {
    return;
  }
  patchInFlight = true;
  const nextPatch = patchQueue.shift();
  NotificationSystem.notify(`Auto patch "${nextPatch.label}" is running.`);
  try {
    const result = await nextPatch.fn();
    NotificationSystem.notify(`Auto patch "${nextPatch.label}" finished.`);
    nextPatch.resolve(result);
  } catch (error) {
    NotificationSystem.notify(
      `Auto patch "${nextPatch.label}" failed: ${error.message}`,
    );
    nextPatch.reject(error);
  } finally {
    patchInFlight = false;
    processPatchQueue();
  }
}

const AutoPatchEngine = {
  applyPatch(label, patchFn) {
    return new Promise((resolve, reject) => {
      patchQueue.push({
        label,
        fn: patchFn,
        resolve,
        reject,
      });
      processPatchQueue();
    });
  },
  queueLength() {
    return patchQueue.length;
  },
};

const SafeReplaceSystem = {
  replace(targetName, updater, validator = () => true) {
    const updateResult = updater();
    if (!validator(updateResult)) {
      throw new Error(`Safe replace validation failed for ${targetName}.`);
    }
    NotificationSystem.notify(`${targetName} replaced safely.`);
    return updateResult;
  },
};

function safeAddCustomRecommendation(rule) {
  return SafeReplaceSystem.replace(
    "Custom recommendation",
    () => addCustomRecommendation(rule),
    Array.isArray,
  );
}

const VersionRollbackManager = {
  capture(videoId, videoState, snapshot, context = {}) {
    return LocalStorageManager.recordVersion(
      videoId,
      { videoState, snapshot },
      context,
    );
  },
  history(videoId) {
    return LocalStorageManager.getVersionHistory(videoId);
  },
  rollback(versionId) {
    return LocalStorageManager.rollbackVersion(versionId);
  },
};

const ComponentBasedUISystem = {
  wrapGroup(title, content) {
    return `
      <div class="feature-group">
        <h4>${title}</h4>
        <div class="feature-group__body">
          ${content}
        </div>
      </div>
    `;
  },
};

const APIIntegrationLayer = {
  connectors: new Map(),
  register(name, fn) {
    this.connectors.set(name, fn);
  },
  async fetchVideo(videoId, source = "youtube") {
    const connector = this.connectors.get(source);
    if (!connector) {
      throw new Error(`No connector for ${source}`);
    }
    return connector(videoId);
  },
};

APIIntegrationLayer.register(
  "youtube",
  DataIngestion.fetchVideo.bind(DataIngestion),
);

const RootCauseDetectionEngine = {
  diagnose(payload) {
    return analyzeDiagnosis(payload);
  },
};

const BehavioralAnalyticsLayer = {
  summarize(snapshots = []) {
    if (!snapshots.length) {
      return {
        engagementAverage: 0,
        growthMomentum: 0,
        velocityTrend: 0,
      };
    }
    const valid = snapshots.filter((snap) => snap.features);
    const engagement =
      valid.reduce(
        (sum, snap) => sum + (snap.features.engagementRate || 0),
        0,
      ) / valid.length || 0;
    const growth =
      valid.reduce((sum, snap) => sum + (snap.features.growthRate || 0), 0) /
        valid.length || 0;
    const velocity =
      valid.reduce((sum, snap) => sum + (snap.features.velocity || 0), 0) /
        valid.length || 0;
    return {
      engagementAverage: engagement,
      growthMomentum: growth,
      velocityTrend: velocity,
    };
  },
};

const PredictiveGrowthModeling = {
  project(snapshots = [], lastSnapshot) {
    const base =
      lastSnapshot?.views ||
      (snapshots.length && snapshots[snapshots.length - 1].views) ||
      0;
    const velocities = snapshots
      .map((snap, index) => {
        const prev = snapshots[index - 1];
        if (!prev) return null;
        return (
          (snap.views - prev.views) /
          Math.max(
            1,
            (new Date(snap.timestamp) - new Date(prev.timestamp)) / 3600000,
          )
        );
      })
      .filter((value) => typeof value === "number");
    const medianVelocity = velocities.length
      ? velocities.sort()[Math.floor(velocities.length / 2)]
      : lastSnapshot?.features?.velocity || 0;
    const projection = Math.round(base + medianVelocity);
    return {
      projection,
      velocity: medianVelocity,
      base,
    };
  },
};

const AutoRecommendationExecutor = {
  execute(recommendations = [], context = {}) {
    const items = Array.isArray(recommendations) ? recommendations : [];
    items.forEach((item) => {
      NotificationSystem.notify(`Auto recommendation queued: ${item}`);
    });
    if (context.videoId) {
      NotificationSystem.notify(
        `Auto recommendation executor applied for ${context.videoId}`,
      );
    }
    return items;
  },
};

const ExperimentationEngine = {
  experiments: [],
  log(name, payload = {}) {
    const entry = {
      id: `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      payload,
      recordedAt: new Date().toISOString(),
    };
    this.experiments.push(entry);
    NotificationSystem.notify(`Experiment logged: ${name}`);
    return entry;
  },
  list() {
    return [...this.experiments];
  },
};

const PluginArchitecture = {
  plugins: [],
  register(plugin) {
    this.plugins.push(plugin);
    return plugin;
  },
  init(context = {}) {
    this.plugins.forEach((plugin) => {
      plugin.init?.(context);
    });
  },
  emit(hook, payload) {
    this.plugins.forEach((plugin) => {
      plugin[hook]?.(payload);
    });
  },
};

PluginArchitecture.register({
  name: "notification-lens",
  init: () => NotificationSystem.notify("Plugin architecture ready"),
  afterAnalysis: ({ videoId, report }) => {
    const score = report?.scoreBreakdown?.performanceScore ?? "N/A";
    NotificationSystem.notify(`Plugin saw ${videoId} score ${score}`);
  },
});

const FunctionLevelPatching = {
  active: new Set(),
  wrap(label, fn) {
    return async (...args) => {
      this.active.add(label);
      const start = Date.now();
      NotificationSystem.notify(`Function ${label} started.`);
      try {
        return await fn(...args);
      } finally {
        this.active.delete(label);
        NotificationSystem.notify(
          `Function ${label} completed in ${Date.now() - start}ms.`,
        );
      }
    };
  },
};

const AutoRefactorEngine = {
  normalizeVideo(video = {}) {
    return {
      videoId: String(video.videoId || "").trim(),
      title: (video.title || "").trim() || undefined,
      duration:
        typeof video.duration === "number"
          ? Math.max(0, video.duration)
          : undefined,
      snapshots: Array.isArray(video.snapshots) ? video.snapshots : [],
    };
  },
};

const ErrorDetectionLayer = {
  guard(fn, label = "operation") {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        NotificationSystem.notify(`${label} failed: ${error.message}`);
        throw error;
      }
    };
  },
};

class ContinuousLearningLoop {
  constructor(callback, intervalMs = 120000) {
    this.callback = callback;
    this.intervalMs = intervalMs;
    this.timer = null;
  }
  start() {
    if (this.timer) return;
    this.callback();
    this.timer = setInterval(() => {
      this.callback();
    }, this.intervalMs);
    NotificationSystem.notify("Continuous learning loop started.");
  }
  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    NotificationSystem.notify("Continuous learning loop stopped.");
  }
  isRunning() {
    return Boolean(this.timer);
  }
}

class ScheduledAnalysisEngine {
  constructor(executor, intervalMs = 180000) {
    this.executor = executor;
    this.intervalMs = intervalMs;
    this.timer = null;
  }
  start(intervalMs) {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.executor();
    }, intervalMs || this.intervalMs);
    NotificationSystem.notify(
      `Scheduled analysis every ${(intervalMs || this.intervalMs) / 1000}s.`,
    );
  }
  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    NotificationSystem.notify("Scheduled analysis stopped.");
  }
  toggle() {
    if (this.timer) {
      this.stop();
      return false;
    }
    this.start();
    return true;
  }
  isRunning() {
    return Boolean(this.timer);
  }
}

class MultiVideoBatchProcessing {
  constructor(executor) {
    this.executor = executor;
    this.running = false;
  }
  async runAll(videos = []) {
    if (this.running) {
      NotificationSystem.notify("Batch processing already running.");
      return;
    }
    this.running = true;
    NotificationSystem.notify(
      `Batch processing started for ${videos.length} videos.`,
    );
    for (const video of videos) {
      await this.executor(video.videoId);
    }
    this.running = false;
    NotificationSystem.notify("Batch processing completed.");
  }
}

const OneClickApplyChanges = {
  attach(button, executor) {
    if (!button) {
      return;
    }
    button.addEventListener("click", async () => {
      NotificationSystem.notify("One-click apply triggered.");
      await executor();
    });
  },
};

class RealTimeExecutionPipeline {
  constructor({ apiLayer = APIIntegrationLayer } = {}) {
    this.apiLayer = apiLayer;
  }
  async run(videoId) {
    const raw = await this.apiLayer.fetchVideo(videoId);
    if (!raw) {
      throw new Error("No data returned by the ingestion layer.");
    }
    const previousSnapshot = LocalStorageManager.getLatestSnapshot(videoId);
    LocalStorageManager.saveVideo({
      videoId,
      title: raw.meta.title,
      duration: raw.meta.duration,
      publishedAt: raw.meta.publishedAt,
    });
    const baseline = {
      views: raw.stats.viewCount,
      likes: raw.stats.likeCount,
      comments: raw.stats.commentCount,
      timestamp: new Date().toISOString(),
    };
    const growth = buildGrowthDelta(baseline, previousSnapshot);
    const engagementRate = calculateEngagementRate(baseline);
    const growthRate = calculateGrowthRate(
      baseline.views,
      previousSnapshot?.views,
    );
    const features = {
      engagementRate,
      growthRate,
      velocity: growth.velocity || 0,
    };
    const performanceScore = calculatePerformanceScore(features);
    features.performanceScore = performanceScore;
    const snapshot = {
      ...baseline,
      features,
      performanceScore,
      context: { source: "pipeline" },
    };
    LocalStorageManager.addSnapshot(videoId, snapshot);
    const updatedVideo = LocalStorageManager.getVideos().find(
      (item) => item.videoId === videoId,
    );
    const videos = LocalStorageManager.getVideos();
    const config = getAppConfig();
    const patterns = learnPatterns(videos);
    const snapshots = LocalStorageManager.getSnapshots(videoId);
    const diagnosis = RootCauseDetectionEngine.diagnose({
      features,
      growth,
      config,
      snapshots,
      video: updatedVideo,
    });
    const recommendations = generateRecommendations({
      diagnosis,
      patterns,
      customRecommendations: config.customRecommendations,
    });
    const alerts = detectAlerts({
      features,
      growth,
      config,
      snapshots,
      source: raw.analytics ? "analytics" : "live",
    });
    const rangeStart = previousSnapshot?.timestamp;
    const rangeEnd = snapshot.timestamp;
    const report = formatReport({
      video: updatedVideo,
      features,
      growth,
      diagnosis,
      patterns,
      recommendations,
      analytics: raw.analytics,
      rangeStart,
      rangeEnd,
    });
    NotificationSystem.notify(`Pipeline completed for ${videoId}.`);
    VersionRollbackManager.capture(videoId, updatedVideo, snapshot, {
      reason: "analysis",
      diagnosis: diagnosis.category,
    });
    AutoRecommendationExecutor.execute(recommendations, { videoId });
    ExperimentationEngine.log("analysis-run", {
      videoId,
      score: performanceScore,
      snapshotCount: snapshots.length,
    });
    PluginArchitecture.emit("afterAnalysis", { videoId, report, features });
    return {
      report,
      alerts,
      patterns,
      updatedVideo,
      features,
      growth,
      recommendations,
      snapshots,
      config,
      projection: PredictiveGrowthModeling.project(snapshots, snapshot),
      behaviorSummary: BehavioralAnalyticsLayer.summarize(snapshots),
    };
  }
}

PluginArchitecture.init({ NotificationSystem, AutoRecommendationExecutor });

export {
  NotificationSystem,
  AutoPatchEngine,
  VersionRollbackManager,
  BehavioralAnalyticsLayer,
  PredictiveGrowthModeling,
  AutoRecommendationExecutor,
  ExperimentationEngine,
  APIIntegrationLayer,
  PluginArchitecture,
  FunctionLevelPatching,
  AutoRefactorEngine,
  ErrorDetectionLayer,
  RealTimeExecutionPipeline,
  ScheduledAnalysisEngine,
  MultiVideoBatchProcessing,
  ContinuousLearningLoop,
  OneClickApplyChanges,
  safeAddCustomRecommendation,
};
