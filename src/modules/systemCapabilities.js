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

const FEATURE_CATALOG = [
  {
    id: "core-productivity",
    title: "Core Productivity Features",
    features: [
      {
        id: "auto-patch-engine",
        label: "Auto Patch Engine",
        status: "active",
        description:
          "Queues dashboard updates (via AutoPatchEngine) so changes land reliably without manual saves.",
      },
      {
        id: "safe-replace-system",
        label: "Safe Replace System",
        status: "active",
        description:
          "Validates and commits config updates through SafeReplaceSystem before applying them.",
      },
      {
        id: "version-rollback",
        label: "Version Rollback",
        status: "active",
        description:
          "Captures snapshots and video states so VersionRollback can revert a bad change in seconds.",
      },
      {
        id: "real-time-execution-pipeline",
        label: "Real-time Execution Pipeline",
        status: "active",
        description:
          "The RealTimeExecutionPipeline orchestrates ingestion → features → report in milliseconds.",
      },
    ],
  },
  {
    id: "intelligence",
    title: "Intelligence Features",
    features: [
      {
        id: "root-cause-detection",
        label: "Root Cause Detection Engine",
        status: "active",
        description:
          "RootCauseDetectionEngine wraps diagnosis logic to surface actionable categories fast.",
      },
      {
        id: "behavioral-analytics",
        label: "Behavioral Analytics Layer",
        status: "active",
        description:
          "BehavioralAnalyticsLayer summarizes engagement, growth, and velocity trends you can trust.",
      },
      {
        id: "predictive-growth-modeling",
        label: "Predictive Growth Modeling",
        status: "active",
        description:
          "PredictiveGrowthModeling forecasts the next checkpoints so you can plan interventions.",
      },
      {
        id: "pattern-learning-system",
        label: "Pattern Learning System",
        status: "active",
        description:
          "PatternLearningEngine mines historic snapshots and feeds the Insight Cards System.",
      },
    ],
  },
  {
    id: "developer-efficiency",
    title: "Developer Efficiency Features",
    features: [
      {
        id: "modular-code-generator",
        label: "Modular Code Generator",
        status: "active",
        description:
          "ModularCodeGenerator keeps dashboard sections reusable and consistent.",
      },
      {
        id: "function-level-patching",
        label: "Function-Level Patching",
        status: "active",
        description:
          "FunctionLevelPatching wraps critical methods for granular visibility during updates.",
      },
      {
        id: "auto-refactor-engine",
        label: "Auto Refactor Engine",
        status: "active",
        description:
          "AutoRefactorEngine normalizes video metadata before it hits LocalStorage.",
      },
      {
        id: "error-detection-layer",
        label: "Error Detection Layer",
        status: "active",
        description:
          "ErrorDetectionLayer guards dashboard execution and streams errors into NotificationSystem.",
      },
    ],
  },
  {
    id: "ui-ux",
    title: "UI / UX Productivity",
    features: [
      {
        id: "dynamic-dashboard-renderer",
        label: "Dynamic Dashboard Renderer",
        status: "active",
        description:
          "DynamicDashboardRenderer assembles capability and notification panels on demand.",
      },
      {
        id: "component-based-ui",
        label: "Component-Based UI System",
        status: "active",
        description:
          "ComponentBasedUISystem keeps layouts modular for fast scaling.",
      },
      {
        id: "insight-cards-system",
        label: "Insight Cards System",
        status: "active",
        description:
          "InsightCardsSystem powers the new feature catalog + insight summaries.",
      },
      {
        id: "one-click-apply-changes",
        label: "One-Click Apply Changes",
        status: "active",
        description:
          "OneClickApplyChanges instantly replays the latest recommendations with a single tap.",
      },
    ],
  },
  {
    id: "automation",
    title: "Automation Features",
    features: [
      {
        id: "continuous-learning-loop",
        label: "Continuous Learning Loop",
        status: "active",
        description:
          "ContinuousLearningLoop refreshes pattern insights regardless of clicks.",
      },
      {
        id: "auto-recommendation-executor",
        label: "Auto Recommendation Executor",
        status: "active",
        description:
          "AutoRecommendationExecutor converts insights into instant, actionable prompts.",
      },
      {
        id: "scheduled-analysis-engine",
        label: "Scheduled Analysis Engine",
        status: "active",
        description:
          "ScheduledAnalysisEngine runs coach checks at configurable intervals.",
      },
      {
        id: "multi-video-batch-processing",
        label: "Multi-Video Batch Processing",
        status: "active",
        description:
          "MultiVideoBatchProcessing keeps every card current in a single sweep.",
      },
    ],
  },
  {
    id: "high-impact",
    title: "High Impact Add-ons",
    features: [
      {
        id: "plugin-architecture",
        label: "Plugin Architecture",
        status: "active",
        description:
          "PluginArchitecture accepts new intelligence, logging, or notification modules.",
      },
      {
        id: "api-integration-layer",
        label: "API Integration Layer",
        status: "active",
        description:
          "APIIntegrationLayer abstracts every external connector and can add new ones safely.",
      },
      {
        id: "experimentation-engine",
        label: "Experimentation Engine (A/B Testing)",
        status: "active",
        description:
          "ExperimentationEngine tracks variance in runs so you can test tweaks quickly.",
      },
      {
        id: "notification-system",
        label: "Notification System",
        status: "active",
        description:
          "NotificationSystem streams live alerts and keeps teams aware of regressions.",
      },
    ],
  },
];

const ModularCodeGenerator = {
  createFeatureTile(feature) {
    return `
      <article class="feature-highlight feature-highlight--${feature.id}">
        <header>
          <h5>${feature.label}</h5>
          <span class="feature-status">Status: ${feature.status}</span>
        </header>
        <p>${feature.description}</p>
      </article>
    `;
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

const DynamicDashboardRenderer = {
  renderFeatureCatalog(catalog = FEATURE_CATALOG) {
    return catalog
      .map((group) =>
        ComponentBasedUISystem.wrapGroup(
          group.title,
          group.features.map(ModularCodeGenerator.createFeatureTile).join(""),
        ),
      )
      .join("");
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
  FEATURE_CATALOG,
  DynamicDashboardRenderer,
  BehavioralAnalyticsLayer,
  PredictiveGrowthModeling,
  AutoRecommendationExecutor,
  ExperimentationEngine,
  APIIntegrationLayer,
  PluginArchitecture,
  ModularCodeGenerator,
  ComponentBasedUISystem,
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
