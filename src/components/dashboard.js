import { LocalStorageManager } from "../modules/localStorageManager.js";
import {
  calculatePerformanceScore,
  calculatePreUploadScore,
} from "../modules/featureEngineering.js";
import { learnPatterns } from "../modules/patternLearningEngine.js";
import {
  deriveTimingWindowLabel,
  getAppConfig,
  removeCustomRecommendation,
  toggleAnalyticsReports,
} from "../modules/appConfig.js";
import {
  NotificationSystem,
  AutoPatchEngine,
  BehavioralAnalyticsLayer,
  PredictiveGrowthModeling,
  MultiVideoBatchProcessing,
  ScheduledAnalysisEngine,
  ContinuousLearningLoop,
  OneClickApplyChanges,
  RealTimeExecutionPipeline,
  safeAddCustomRecommendation,
  AutoRefactorEngine,
  VersionRollbackManager,
  ErrorDetectionLayer,
  FunctionLevelPatching,
  AutoRecommendationExecutor,
} from "../modules/systemCapabilities.js";
import {
  getStoredUserKey,
  hasDefaultApiLimitReached,
  hasUserApiLimitReached,
  isApiKeyFormatValid,
  removeStoredUserKey,
  setStoredUserKey,
  shouldShowApiKeyInput,
} from "../modules/apiUsageAssistant.js";

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export class Dashboard {
  constructor({ rootId = "app" } = {}) {
    this.root = document.getElementById(rootId);
    if (!this.root) {
      throw new Error("Root element not found");
    }
    this.statusEl = null;
    this.hasAnalyticsToken = Boolean(globalThis?.YOUTUBE_ANALYTICS_TOKEN);
    this.pipeline = new RealTimeExecutionPipeline();
    this.lastRecommendations = [];
    this.lastAnalyzedVideoId = null;
    const boundHandleAnalyze = this.handleAnalyze.bind(this);
    this.handleAnalyze = ErrorDetectionLayer.guard(
      boundHandleAnalyze,
      "dashboard-analysis",
    );
    this.batchProcessor = new MultiVideoBatchProcessing((videoId) => {
      const card = this.findCardForVideo(videoId);
      if (!card) {
        return Promise.resolve();
      }
      return this.handleAnalyze(videoId, card);
    });
    this.safeBatchAnalyze = FunctionLevelPatching.wrap(
      "batch-analysis",
      this.batchProcessAll.bind(this),
    );
    this.scheduleEngine = new ScheduledAnalysisEngine(() =>
      this.safeBatchAnalyze(),
    );
    this.learningLoop = new ContinuousLearningLoop(() =>
      this.refreshPatterns(),
    );
  }

  init() {
    this.config = getAppConfig();
    this.root.innerHTML = `
      <div class="coach-shell">
        <header class="coach-header">
          <div>
            <h1>AI YouTube Growth Coach</h1>
            <p>Your local-first intelligence system that explains performance, diagnoses friction, and tells you what to do next.</p>
          </div>
          <div id="status-line" class="status-line"></div>
        </header>
        <section class="hero">
          <form id="video-form" class="video-form">
            <label>Video ID
              <input name="videoId" placeholder="YouTube ID (e.g. dQw4w9WgXcQ)" required />
            </label>
            <label>Friendly title (optional)
              <input name="title" placeholder="Channel naming" />
            </label>
            <label>Duration (min)
              <input name="duration" type="number" min="0" step="0.1" />
            </label>
            <button type="submit" class="primary">Save + Auto-track</button>
          </form>
          <div id="pattern-highlights" class="pattern-highlights">
            <p class="muted">Patterns will surface after you analyze videos.</p>
            <p class="muted timing-note">${deriveTimingWindowLabel(this.config)}</p>
          </div>
          <div class="analytics-toggle">
            <label>
              <input id="analytics-toggle" type="checkbox" ${this.config.analytics?.enableReports ? "checked" : ""} />
              Enable analytics connector
            </label>
            <p id="analytics-hint" class="muted">${this.computeAnalyticsHint()}</p>
          </div>
          <div id="api-key-status" class="api-key-status">
            <div class="api-key-status__header">
              <p class="api-key-status__label">Using default API</p>
              <button id="api-key-default-reset" type="button" class="secondary api-key-status__button">
                Use default API
              </button>
            </div>
            <p class="api-key-status__summary muted"></p>
            <div
              class="api-key-status__alert api-key-status__alert--default is-hidden"
              data-default-alert
            >
              <strong>⚠️ Default API usage limit reached</strong>
              <p>You have exhausted your current default API limit.</p>
              <p>To continue using the service, you need to provide your own YouTube API key.</p>
              <ul>
                <li>Request access from the admin to continue using the default API</li>
                <li>Add your own API key to proceed</li>
              </ul>
              <p>Click below to add your API key and continue.</p>
              <p class="muted">
                Download the provided
                <a href="./docs/api-setup-guide.pdf" target="_blank" rel="noopener">
                  API setup guide (PDF)
                </a>
                and follow the step-by-step instructions inside the PDF to obtain and enter your credentials. Once added, the service will activate immediately without errors.
              </p>
            </div>
            <div
              class="api-key-status__alert api-key-status__alert--user is-hidden"
              data-user-alert
            >
              <strong>⚠️ User API limit reached</strong>
              <p>You have exhausted your API usage limit.</p>
              <p>You are currently unable to make further requests.</p>
              <ul>
                <li>Add a new API key</li>
                <li>Or wait for your quota to reset</li>
              </ul>
              <p>Click below to add a new API key.</p>
            </div>
            <div class="api-key-input is-hidden" data-api-input>
              <p class="api-key-input__title">Enter your YouTube API key to continue.</p>
              <div class="api-key-input__row">
                <input
                  id="api-key-input"
                  type="text"
                  class="api-key-input__field"
                  placeholder="AIza... (Your API key)"
                  autocomplete="off"
                />
                <button
                  id="api-key-add-button"
                  type="button"
                  class="primary api-key-input__button"
                  disabled
                >
                  Add API key
                </button>
              </div>
              <p class="api-key-input__hint">To generate your API key:</p>
              <ol class="api-key-input__steps">
                <li>Go to Google Cloud Console</li>
                <li>Create or select a project</li>
                <li>Enable YouTube Data API v3</li>
                <li>Go to Credentials</li>
                <li>Create an API key</li>
                <li>Copy and paste it here</li>
              </ol>
              <p class="api-key-input__hint">After adding your API key, the service will resume immediately.</p>
              <p class="api-key-input__error error is-hidden" data-api-error>
                Invalid API key. Please check and try again.
              </p>
            </div>
          </div>
        </section>
        <section class="insight-grid">
          <article class="insight-card">
            <header>
              <h3>What-if simulator</h3>
              <p class="muted">Preview how different engagement, growth, and velocity inputs influence the score.</p>
            </header>
            <form id="what-if-form" class="what-if-form">
              <label>Projected engagement rate
                <input name="engagement" type="number" step="0.001" min="0" max="1" value="0.05" />
              </label>
              <label>Projected growth rate
                <input name="growth" type="number" step="0.01" min="-1" max="2" value="0.02" />
              </label>
              <label>Projected velocity (views/hr)
                <input name="velocity" type="number" step="1" min="0" value="60" />
              </label>
            </form>
            <div id="what-if-result" class="what-if-result">Adjust the sliders above to preview a new performance score.</div>
          </article>
          <article class="insight-card">
            <header>
              <h3>Custom recommendations</h3>
              <p class="muted">Create tailored cues the coach will surface when specific alerts trigger.</p>
            </header>
            <form id="custom-rule-form" class="rule-form">
              <label>Trigger
                <select name="trigger">
                  <option value="any">Any alert</option>
                  <option value="engagement">Engagement</option>
                  <option value="growth">Growth</option>
                  <option value="velocity">Velocity</option>
                  <option value="healthy">Healthy</option>
                </select>
              </label>
              <label>Title
                <input name="title" placeholder="Brief label" required />
              </label>
              <label>Message
                <textarea name="message" rows="2" placeholder="Advice to show (max 140 chars)" required></textarea>
              </label>
              <button type="submit" class="primary">Save custom rule</button>
            </form>
          <ul id="custom-rule-list" class="rule-list"></ul>
        </article>
      </section>
        <section id="automation-controls" class="automation-controls">
          <h3>Automation & Controls</h3>
          <div class="automation-actions">
            <button id="batch-analyze" class="primary">Analyze all videos</button>
            <button id="one-click-apply" class="primary">One-click apply recommendations</button>
            <button id="rollback-latest" class="secondary">Rollback latest change</button>
          </div>
          <div class="automation-toggles">
            <label>
              <input id="continuous-learning-toggle" type="checkbox" checked />
              Continuous learning loop
            </label>
            <label>
              <input id="scheduled-analysis-toggle" type="checkbox" />
              Scheduled analysis every 3 min
            </label>
          </div>
        </section>
        <section id="notification-panel" class="notification-panel">
          <h4>System notifications</h4>
          <ul class="notification-list"><li class="muted">Notifications will appear here.</li></ul>
        </section>
        <section id="alert-stream" class="alert-stream"></section>
        <section id="video-list" class="video-list"></section>
      </div>
    `;
    this.statusEl = this.root.querySelector("#status-line");
    this.attachForm();
    this.attachWhatIfSimulator();
    this.attachCustomRules();
    this.attachAnalyticsToggle();
    this.initApiKeyIndicator();
    this.refreshVideoCards();
    this.attachAutomationControls();
    this.renderNotifications();
    NotificationSystem.subscribe(() => this.renderNotifications());
    this.learningLoop.start();
    this.renderAlertStream([]);
  }

  setStatus(message) {
    if (this.statusEl) {
      this.statusEl.textContent = message;
    }
  }

  attachForm() {
    const form = this.root.querySelector("#video-form");
    if (!form) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const videoId = form.videoId.value.trim();
      if (!videoId) {
        this.setStatus("Please provide a YouTube video ID.");
        return;
      }
      const payload = AutoRefactorEngine.normalizeVideo({
        videoId,
        title: form.title.value.trim() || undefined,
        duration: form.duration.value ? Number(form.duration.value) : undefined,
      });
      LocalStorageManager.saveVideo(payload);
      form.reset();
      this.refreshVideoCards();
      this.refreshPatterns();
      this.setStatus("Video registered locally. Press Analyze Now when ready.");
    });
  }

  refreshVideoCards() {
    const list = this.root.querySelector("#video-list");
    if (!list) return;
    list.innerHTML = "";
    const videos = LocalStorageManager.getVideos();
    if (!videos.length) {
      list.innerHTML =
        '<p class="muted">No videos yet. Add one and keep the coach locally.</p>';
      return;
    }
    videos.forEach((video) => {
      const card = this.createVideoCard(video);
      list.appendChild(card);
      const snapshots = LocalStorageManager.getSnapshots(video.videoId);
      this.renderTimeline(card, snapshots);
      this.renderCardAlerts(card, []);
    });
  }

  findCardForVideo(videoId) {
    return this.root
      .querySelector(`.analyze-btn[data-video-id="${videoId}"]`)
      ?.closest(".video-card");
  }

  initApiKeyIndicator() {
    this.apiKeyStatusContainer = this.root.querySelector("#api-key-status");
    if (!this.apiKeyStatusContainer) return;
    this.apiKeyStatusLabel = this.apiKeyStatusContainer.querySelector(
      ".api-key-status__label",
    );
    this.apiKeyStatusSummary = this.apiKeyStatusContainer.querySelector(
      ".api-key-status__summary",
    );
    this.apiKeyStatusButton = this.apiKeyStatusContainer.querySelector(
      "#api-key-default-reset",
    );
    this.apiKeyStatusDefaultAlert = this.apiKeyStatusContainer.querySelector(
      "[data-default-alert]",
    );
    this.apiKeyStatusUserAlert = this.apiKeyStatusContainer.querySelector(
      "[data-user-alert]",
    );
    this.apiKeyInputSection = this.apiKeyStatusContainer.querySelector(
      "[data-api-input]",
    );
    this.apiKeyInput = this.apiKeyStatusContainer.querySelector("#api-key-input");
    this.apiKeyAddButton = this.apiKeyStatusContainer.querySelector(
      "#api-key-add-button",
    );
    this.apiKeyInputError = this.apiKeyStatusContainer.querySelector(
      "[data-api-error]",
    );

    this.apiKeyStatusButton?.addEventListener("click", () => {
      if (hasDefaultApiLimitReached()) {
        this.setStatus("Default API usage limit has already been reached.");
        return;
      }
      removeStoredUserKey();
      this.renderApiKeyStatus({
        usingUserKey: false,
        fallback: false,
      });
      window.dispatchEvent(
        new CustomEvent("api-key-status", {
          detail: { usingUserKey: false, fallback: false },
        }),
      );
      this.setStatus("Switched to the default API key.");
    });

    this.apiKeyAddButton?.addEventListener("click", () => {
      const candidate = this.apiKeyInput?.value?.trim() || "";
      if (!candidate) {
        if (this.apiKeyInputError) {
          this.apiKeyInputError.textContent = "Enter your YouTube API key to continue.";
          this.apiKeyInputError.classList.remove("is-hidden");
        }
        return;
      }
      if (!isApiKeyFormatValid(candidate)) {
        if (this.apiKeyInputError) {
          this.apiKeyInputError.textContent =
            "Invalid API key. Please check and try again.";
          this.apiKeyInputError.classList.remove("is-hidden");
        }
        this.renderApiKeyStatus({
          usingUserKey: false,
          invalidKey: true,
        });
        return;
      }
      setStoredUserKey(candidate);
      if (this.apiKeyInput) {
        this.apiKeyInput.value = "";
      }
      if (this.apiKeyInputError) {
        this.apiKeyInputError.classList.add("is-hidden");
      }
      const successMessage =
        "Your API key has been successfully added. The service is now active and running using your API.";
      this.renderApiKeyStatus({
        usingUserKey: true,
        userLimitReached: false,
        successMessage,
      });
      window.dispatchEvent(
        new CustomEvent("api-key-status", {
          detail: {
            usingUserKey: true,
            successMessage,
          },
        }),
      );
      this.setStatus("Custom API key stored. Continue analyzing with your key.");
    });

    window.addEventListener("api-key-status", (event) => {
      this.renderApiKeyStatus(event.detail);
    });
    this.renderApiKeyStatus();
  }

  renderApiKeyStatus(detail = {}) {
    if (!this.apiKeyStatusLabel) return;
    const storedKey = getStoredUserKey();
    const userLimit =
      detail.userLimitReached ?? hasUserApiLimitReached();
    const defaultLimit =
      detail.defaultLimitReached ?? hasDefaultApiLimitReached();
    const usingUser =
      detail.usingUserKey ?? (Boolean(storedKey) && !userLimit);
    const showInput =
      Boolean(detail.showInput) ||
      detail.defaultLimitReached ||
      detail.userLimitReached ||
      shouldShowApiKeyInput();
    this.apiKeyStatusLabel.textContent = usingUser
      ? "Using your API key"
      : defaultLimit
      ? "Default API locked"
      : "Using default API";
    const summary =
      detail.successMessage ||
      (usingUser
        ? "Your API key is live and powering requests."
        : defaultLimit
        ? "Default API is locked after the free request; add a key to stay connected."
        : "Default API is active; the next successful analysis will exhaust the free quota.");
    if (this.apiKeyStatusSummary) {
      this.apiKeyStatusSummary.textContent = summary;
    }
    if (this.apiKeyStatusDefaultAlert) {
      this.apiKeyStatusDefaultAlert.classList.toggle(
        "is-hidden",
        !(defaultLimit && !usingUser),
      );
    }
    if (this.apiKeyStatusUserAlert) {
      this.apiKeyStatusUserAlert.classList.toggle("is-hidden", !userLimit);
    }
    if (this.apiKeyInputSection) {
      this.apiKeyInputSection.classList.toggle("is-hidden", !showInput);
    }
    if (this.apiKeyAddButton) {
      this.apiKeyAddButton.disabled = !showInput;
    }
    if (this.apiKeyInputError) {
      this.apiKeyInputError.classList.toggle("is-hidden", !detail.invalidKey);
    }
    if (this.apiKeyStatusButton) {
      this.apiKeyStatusButton.disabled = defaultLimit;
    }
  }

  renderNotifications() {
    const list = this.root.querySelector(
      "#notification-panel .notification-list",
    );
    if (!list) return;
    const history = NotificationSystem.getHistory();
    if (!history.length) {
      list.innerHTML = '<li class="muted">No notifications yet.</li>';
      return;
    }
    list.innerHTML = history
      .map(
        (note) =>
          `<li><strong>${new Date(note.timestamp).toLocaleTimeString()}</strong> ${note.message}</li>`,
      )
      .join("");
  }

  attachAutomationControls() {
    const analyzeAllBtn = this.root.querySelector("#batch-analyze");
    analyzeAllBtn?.addEventListener("click", () => this.safeBatchAnalyze());
    const rollbackBtn = this.root.querySelector("#rollback-latest");
    rollbackBtn?.addEventListener("click", () => this.applyRollback());
    const continuousToggle = this.root.querySelector(
      "#continuous-learning-toggle",
    );
    if (continuousToggle) {
      continuousToggle.addEventListener("change", (event) => {
        if (event.target.checked) {
          this.learningLoop.start();
        } else {
          this.learningLoop.stop();
        }
      });
    }
    const scheduleToggle = this.root.querySelector(
      "#scheduled-analysis-toggle",
    );
    if (scheduleToggle) {
      scheduleToggle.checked = this.scheduleEngine.isRunning();
      scheduleToggle.addEventListener("change", (event) => {
        if (event.target.checked) {
          this.scheduleEngine.start();
        } else {
          this.scheduleEngine.stop();
        }
      });
    }
    const oneClickButton = this.root.querySelector("#one-click-apply");
    OneClickApplyChanges.attach(oneClickButton, () =>
      this.applyRecommendations(),
    );
  }

  applyRollback() {
    const videoId = this.lastAnalyzedVideoId;
    if (!videoId) {
      this.setStatus("Run an analysis before rolling back.");
      return;
    }
    const history = VersionRollbackManager.history(videoId);
    if (!history.length) {
      this.setStatus("No rollback points yet.");
      return;
    }
    const target = history[1] || history[0];
    VersionRollbackManager.rollback(target.id);
    this.refreshVideoCards();
    this.refreshPatterns();
    this.setStatus("Rolled back to the previous version.");
  }

  async applyRecommendations() {
    if (!this.lastRecommendations.length) {
      this.setStatus("No recommendations to reapply yet.");
      return;
    }
    AutoRecommendationExecutor.execute(this.lastRecommendations, {
      videoId: this.lastAnalyzedVideoId,
    });
    this.setStatus("Reapplied the latest recommendations.");
  }

  async batchProcessAll() {
    const videos = LocalStorageManager.getVideos();
    await this.batchProcessor.runAll(videos);
  }

  refreshPatterns() {
    const videos = LocalStorageManager.getVideos();
    const snapshots = videos.flatMap((video) => video.snapshots || []);
    const patterns = learnPatterns(videos);
    const behaviorSummary = BehavioralAnalyticsLayer.summarize(snapshots);
    const projection = PredictiveGrowthModeling.project(
      snapshots,
      snapshots[snapshots.length - 1],
    );
    this.renderPatternHighlights(patterns, behaviorSummary, projection);
  }

  createVideoCard(video) {
    const card = document.createElement("article");
    card.className = "video-card";
    const snapshots = Array.isArray(video.snapshots) ? video.snapshots : [];
    const lastSnapshot = snapshots[snapshots.length - 1];
    const prevSnapshot = snapshots[snapshots.length - 2];
    const growthSince = prevSnapshot
      ? lastSnapshot.views - prevSnapshot.views
      : 0;
    const preUploadScore = lastSnapshot?.features
      ? calculatePreUploadScore(lastSnapshot.features)
      : "Awaiting first analysis";
    const displayTitle = video.title?.trim() || "This video";
    const encodedTitle = escapeHtml(displayTitle);
    const videoId = video.videoId || "unknown";
    card.innerHTML = `
      <header class="video-card__header">
        <div>
          <h3
            class="video-card__title"
            title="${encodedTitle}"
          >
            ${encodedTitle}
          </h3>
          <p class="meta" data-last-check>Last checked: ${video.lastCheck || "Never"}</p>
          <p class="meta" data-growth>Growth since last check: ${snapshots.length > 1 ? `${growthSince} views` : "No prior data"}</p>
        </div>
        <button class="primary analyze-btn" data-video-id="${video.videoId}">Analyze Now</button>
      </header>
      <div class="card-alerts" data-alerts><p class="muted">No alerts yet.</p></div>
      <div class="pre-upload" data-pre-upload>Pre-upload score: <strong>${preUploadScore}</strong></div>
      <div class="timeline" data-timeline></div>
      <div class="report-area"><small>Tap Analyze Now to refresh insights.</small></div>
    `;
    const button = card.querySelector(".analyze-btn");
    if (button) {
      button.addEventListener("click", () =>
        this.handleAnalyze(video.videoId, card),
      );
    }
    return card;
  }

  updateCardMetadata(card, video) {
    const snapshots = Array.isArray(video.snapshots) ? video.snapshots : [];
    const lastSnapshot = snapshots[snapshots.length - 1];
    const prevSnapshot = snapshots[snapshots.length - 2];
    const growthSince = prevSnapshot
      ? lastSnapshot.views - prevSnapshot.views
      : 0;
    const preUploadScore = lastSnapshot?.features
      ? calculatePreUploadScore(lastSnapshot.features)
      : "Awaiting first analysis";
    const lastCheckEl = card.querySelector("[data-last-check]");
    const growthEl = card.querySelector("[data-growth]");
    const preUploadEl = card.querySelector("[data-pre-upload]");
    if (lastCheckEl) {
      lastCheckEl.textContent = `Last checked: ${video.lastCheck || "Never"}`;
    }
    if (growthEl) {
      growthEl.textContent = `Growth since last check: ${snapshots.length > 1 ? `${growthSince} views` : "No prior data"}`;
    }
    if (preUploadEl) {
      preUploadEl.innerHTML = `Pre-upload score: <strong>${preUploadScore}</strong>`;
    }
    this.renderTimeline(card, snapshots);
  }

  async handleAnalyze(videoId, card) {
    const target = card?.querySelector(".report-area");
    if (!target) {
      return;
    }
    target.innerHTML = '<p class="muted">Running live coach analysis...</p>';
    const videoRecord = LocalStorageManager.getVideos().find(
      (item) => item.videoId === videoId,
    );
    const displayTitle = videoRecord?.title?.trim() || "This video";
    this.setStatus(`Analyzing ${displayTitle} via YouTube Data API...`);
    try {
      const result = await AutoPatchEngine.applyPatch("analysis", () =>
        this.pipeline.run(videoId),
      );
      const {
        report,
        alerts,
        patterns,
        updatedVideo,
        recommendations,
        snapshots,
        projection,
        behaviorSummary,
      } = result;
      this.lastRecommendations = recommendations || [];
      this.lastAnalyzedVideoId = videoId;
      this.config = result.config;
      this.renderReport(report, target, projection);
      if (updatedVideo) {
        this.updateCardMetadata(card, updatedVideo);
      }
      this.renderPatternHighlights(patterns, behaviorSummary, projection);
      this.renderCardAlerts(card, alerts);
      this.renderAlertStream(alerts);
      this.setStatus("Analysis complete. The coach saved a new snapshot.");
      } catch (error) {
        target.innerHTML = `<p class="muted error">Coach hiccup: ${error.message}</p>`;
        NotificationSystem.notify(
          `Analysis failed for ${displayTitle}: ${error.message}`,
        );
        this.renderAlertStream([
          `Analysis failed for ${displayTitle}: ${error.message}`,
        ]);
        this.setStatus("Unable to fetch live data. Check console for details.");
      }
  }

﻿  renderReport(report, target, projection = {}) {
    const scoreBreakdown = report.scoreBreakdown || {};
    const growthComparison = report.growthComparison || {};
    const deltaViews = growthComparison.deltaViews ?? 0;
    const velocity = scoreBreakdown.velocity ?? 0;
    const engagementRate = scoreBreakdown.engagementRate ?? 0;
    const growthRate = scoreBreakdown.growthRate ?? 0;
    const severityLabel =
      velocity <= 0
        ? "Critical"
        : growthRate < 0
        ? "Warning"
        : "Good";
    const severityClass = severityLabel.toLowerCase();
    const biggestProblem = velocity <= 0
      ? {
          title: "Velocity flattened at 0",
          detail: "No new viewers arrived during the last check; you need a decisive move.",
        }
      : growthRate < 0
      ? {
          title: "Growth slipping below break-even",
          detail: "Views are declining faster than playlists can recover; alert your channel crew.",
        }
      : {
          title: "Momentum steady, but watchful",
          detail: "Growth is positive yet fragile - keep the cadence tight.",
        };
    const nextAction = velocity <= 0
      ? {
          summary: "Upload a Short in the next 2 hours to jolt velocity.",
          detail: "Short-form content spikes discovery and can reset watch-hour momentum.",
        }
      : growthRate < 0.01
      ? {
          summary: "Refresh CTAs/playlists over the next 3 uploads.",
          detail: "Double-down on hooks and playlist pushes to regain velocity traction.",
        }
      : {
          summary: "Keep the current cadence and monitor the next check.",
          detail: "Momentum is stable; let the coach re-evaluate shortly.",
        };
    const recoveryDifficulty =
      velocity <= 0 ? "High" : velocity < 400 ? "Medium" : "Low";
    const optimizationOpportunity =
      engagementRate > 0.12
        ? "High"
        : growthRate > 0.02
        ? "Medium"
        : "Moderate";
    const alerts = [];
    if (velocity <= 0) {
      alerts.push({
        icon: "🚨",
        title: "Velocity = 0",
        detail: "New views have flatlined; act now.",
        severity: "critical",
      });
    } else {
      alerts.push({
        icon: "🔥",
        title: "Velocity rallying",
        detail: `Running at ${velocity.toFixed(0)} views/hr; stay aggressive!`,
        severity: "good",
      });
    }
    if (growthRate < 0) {
      alerts.push({
        icon: "⚠️",
        title: "Growth slowing",
        detail: "Playlist cadence is not keeping up with competition.",
        severity: "warning",
      });
    } else {
      alerts.push({
        icon: "📈",
        title: "Growth holding",
        detail: `Variance ${growthComparison.varianceFormatted || "0"}; trend looks ${(growthComparison.variance || 0) >= 0 ? "positive" : "negative"}.`,
        severity: "good",
      });
    }
    if (engagementRate >= 0.1) {
      alerts.push({
        icon: "✅",
        title: "Engagement healthy",
        detail: "Hooks are resonating; leverage that confidence.",
        severity: "good",
      });
    } else {
      alerts.push({
        icon: "🧭",
        title: "Engagement needs work",
        detail: "Try new hook variants to lift interest.",
        severity: "warning",
      });
    }
    const predictionHours = 3;
    const projectedVelocity = projection.velocity ?? velocity;
    const predictedChange = Math.round(projectedVelocity * predictionHours);
    const projectionVerb = predictedChange >= 0 ? "gain" : "drop";
    const projectionText = projectedVelocity
      ? `If no action is taken → expect a ${Math.abs(predictedChange).toLocaleString()} view ${projectionVerb} over the next ${predictionHours}h.`
      : "Projection warming up; run another analysis soon.";
    const projectionTarget = projection.projection
      ? `Projection target: ${projection.projection.toLocaleString()} views.`
      : "Projection target warming up.";
    const rangeInfo = growthComparison.range || {};
    const rangeLabel =
      rangeInfo.start && rangeInfo.end
        ? `Range: ${new Date(rangeInfo.start).toLocaleString()} \u2192 ${new Date(
            rangeInfo.end,
          ).toLocaleString()}`
        : growthComparison.timestamp
        ? `Last checked: ${new Date(growthComparison.timestamp).toLocaleString()}`
        : "Range not available yet.";
    const trendDescriptor =
      deltaViews > 0 && velocity < 200
        ? "Momentum rising but velocity stalled \u2192 mismatch detected"
        : deltaViews > 0
        ? "Momentum rising steadily"
        : deltaViews < 0
        ? "Momentum dipping; needs intervention"
        : "Momentum steady";
    const engagementContext =
      engagementRate >= 0.12
        ? "Above average (+20%) but not converting into velocity yet."
        : engagementRate >= 0.08
        ? "Comfortable engagement; keep amplifying the series."
        : "Engagement trails; test hooks and retention cues.";
    const growthContext =
      growthRate >= 0.02
        ? "Growth outpacing baseline."
        : growthRate >= 0
        ? "Holding steady vs recent history."
        : "Growth is negative; deploy a burst campaign.";
    const trendArrow = deltaViews >= 0 ? "↑" : "↓";
    const alertMarkup = alerts
      .map(
        (alert) => `
          <article class="alert-card alert-card--${alert.severity}">
            <span class="alert-card__icon">${alert.icon}</span>
            <div>
              <strong>${alert.title}</strong>
              <p>${alert.detail}</p>
            </div>
          </article>
        `,
      )
      .join("");

    target.innerHTML = `
      <div class="report-highlight-grid">
        <article class="report-highlight ${deltaViews > 0 ? "report-highlight--positive" : deltaViews < 0 ? "report-highlight--negative" : "report-highlight--neutral"}">
          <header>
            <h4>Performance score</h4>
            <span class="trend-indicator">${trendArrow} ${trendDescriptor}</span>
          </header>
          <p class="report-highlight__value">${Math.round(
            scoreBreakdown.performanceScore || 0,
          )}/100</p>
          <p class="report-highlight__context">${report.performanceSummary}</p>
        </article>
        <article class="report-highlight">
          <h4>Engagement</h4>
          <p class="report-highlight__value">${(engagementRate || 0).toFixed(3)}</p>
          <p class="report-highlight__context">${engagementContext}</p>
        </article>
        <article class="report-highlight">
          <h4>Growth rate</h4>
          <p class="report-highlight__value">${(growthRate || 0).toFixed(3)}</p>
          <p class="report-highlight__context">${growthContext}</p>
        </article>
        <article class="report-highlight">
          <h4>Velocity</h4>
          <p class="report-highlight__value">${velocity.toFixed(1)} views/hr</p>
          <p class="report-highlight__context">${deltaViews >= 0 ? "Velocity is supporting current growth." : "Velocity is trending below expectation."}</p>
        </article>
      </div>
      <div class="priority-area">
        <article class="priority-card priority-card--${severityClass}">
          <p class="priority-card__label">Biggest problem right now</p>
          <span class="severity-label severity-label--${severityClass}">${severityLabel}</span>
          <h4>${biggestProblem.title}</h4>
          <p>${biggestProblem.detail}</p>
        </article>
        <article class="next-action-card">
          <p class="next-action-card__label">Next best action</p>
          <p class="next-action-card__action">${nextAction.summary}</p>
          <p class="muted">${nextAction.detail}</p>
        </article>
        <article class="decision-score-card">
          <p>Recovery Difficulty: <strong>${recoveryDifficulty}</strong></p>
          <p>Optimization Opportunity: <strong>${optimizationOpportunity}</strong></p>
        </article>
      </div>
      <div class="alert-row">
        ${alertMarkup}
      </div>
      <div class="analysis-summary">
        <p class="analysis-summary__heading">${report.performanceSummary}</p>
        <p>${report.evidence}</p>
        <p class="muted">${rangeLabel}</p>
        <p class="muted">${projectionText}</p>
        <p class="muted">${projectionTarget}</p>
        <p class="muted">${report.analyticsSummary}</p>
      </div>
      <section class="report-section">
        <h4>Growth comparison</h4>
        <div class="growth-grid">
          <div class="growth-grid__item">
            <span>Delta views</span>
            <strong>${deltaViews}</strong>
          </div>
          <div class="growth-grid__item">
            <span>Expected vs actual</span>
            <strong>${
              report.growthComparison.expectedViewsFormatted || "N/A"
            } \u2192 ${report.growthComparison.actualViewsFormatted || "N/A"}</strong>
          </div>
          <div class="growth-grid__item">
            <span>Variance</span>
            <strong>${report.growthComparison.varianceFormatted || "N/A"}</strong>
          </div>
          <div class="growth-grid__item">
            <span>Velocity</span>
            <strong>${(velocity || 0).toFixed(1)} views/hr</strong>
          </div>
        </div>
      </section>
      <section class="report-section">
        <h4>Actionable recommendations</h4>
        <ul class="recommendations">
          ${(report.actionableRecommendations || [])
            .map((item) => `<li>${item}</li>`)
            .join("") || '<li class="muted">No recommendations available yet.</li>'}
        </ul>
      </section>
      <section class="report-section">
        <h4>Pattern learnings</h4>
        <div class="pattern-grid">
          <div class="pattern-grid__item">
            <strong>Best timing</strong>
            <p>${(report.patterns?.bestTiming?.label || "Not enough data")}</p>
            <p class="muted">${report.patterns?.bestTiming?.evidence || ""}</p>
          </div>
          <div class="pattern-grid__item">
            <strong>Best duration</strong>
            <p>${(report.patterns?.bestDuration?.label || "Undetermined")}</p>
            <p class="muted">${report.patterns?.bestDuration?.evidence || ""}</p>
          </div>
          <div class="pattern-grid__item">
            <strong>Hotspot</strong>
            <p>${report.patterns?.hotSpot || "No hotspot identified yet."}</p>
          </div>
          <div class="pattern-grid__item">
            <strong>Repeated mistakes</strong>
            <ul class="mistake-list">
              ${(report.patterns?.repeatedMistakes || [])
                .map((item) => `<li>${item}</li>`)
                .join("") || '<li class="muted">No repeated mistakes detected yet.</li>'}
            </ul>
          </div>
        </div>
      </section>
    `;
  }
  renderPatternHighlights(patterns, behaviorSummary = {}, projection = {}) {
    const section = this.root.querySelector("#pattern-highlights");
    if (!section) return;
    const engagementAvg = Number(
      behaviorSummary.engagementAverage || 0,
    ).toFixed(3);
    const growthMomentum = Number(behaviorSummary.growthMomentum || 0).toFixed(
      3,
    );
    const velocityTrend = Number(behaviorSummary.velocityTrend || 0).toFixed(1);
    const projectedViews =
      projection.projection != null ? projection.projection : "N/A";
    const projectedVelocity = Number(projection.velocity || 0).toFixed(1);
    const baselineViews = projection.base != null ? projection.base : "N/A";
    section.innerHTML = `
      <article>
        <h4>Best release time</h4>
        <p>${patterns.bestTiming.label} — ${patterns.bestTiming.evidence}</p>
      </article>
      <article>
        <h4>Runtime sweet spot</h4>
        <p>${patterns.bestDuration.label} — ${patterns.bestDuration.evidence}</p>
      </article>
      <article>
        <h4>Improvement tracking</h4>
        <p>Engagement delta: ${patterns.improvementTracking.engagement}</p>
        <p>Growth delta: ${patterns.improvementTracking.growth}</p>
      </article>
      <article>
        <h4>Behavior summary</h4>
        <p>Engagement avg: ${engagementAvg}</p>
        <p>Growth momentum: ${growthMomentum}</p>
        <p>Velocity trend: ${velocityTrend} views/hr</p>
      </article>
      <article>
        <h4>Projection</h4>
        <p>Next checkpoint: ${projectedViews} views</p>
        <p>Projected momentum: ${projectedVelocity} views/hr</p>
        <p class="muted">Baseline: ${baselineViews} views</p>
      </article>
      <article>
        <h4>Configured release window</h4>
        <p class="muted">${deriveTimingWindowLabel(this.config)}</p>
      </article>
    `;
  }

  attachWhatIfSimulator() {
    const form = this.root.querySelector("#what-if-form");
    if (!form) return;
    form.addEventListener("input", () => this.renderWhatIfResult(form));
    this.renderWhatIfResult(form);
  }

  renderWhatIfResult(form) {
    const result = this.root.querySelector("#what-if-result");
    if (!result || !form) return;
    const engagementRate = Number(form.engagement.value) || 0;
    const growthRate = Number(form.growth.value) || 0;
    const velocity = Number(form.velocity.value) || 0;
    const projectedScore = calculatePerformanceScore({
      engagementRate,
      growthRate,
      velocity,
    });
    const timingLabel = deriveTimingWindowLabel(this.config);
    const guidance =
      projectedScore > 85
        ? "You are simulating a very healthy trajectory; keep iterating on this cadence."
        : "Lift engagement via hooks or growth via playlists to get closer to the simulated score.";
    result.innerHTML = `
      <p><strong>Projected score:</strong> ${projectedScore}/100</p>
      <p class="muted">${timingLabel}</p>
      <p class="muted">${guidance}</p>
    `;
  }

  attachCustomRules() {
    const form = this.root.querySelector("#custom-rule-form");
    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        try {
          safeAddCustomRecommendation({
            trigger: form.trigger.value,
            title: form.title.value,
            message: form.message.value,
          });
          this.config = getAppConfig();
          this.renderCustomRules();
          this.setStatus("Custom recommendation saved.");
          form.reset();
        } catch (error) {
          this.setStatus(error.message);
        }
      });
    }
    const list = this.root.querySelector("#custom-rule-list");
    if (list) {
      list.addEventListener("click", (event) => {
        const target = event.target;
        if (target && target.dataset.remove) {
          removeCustomRecommendation(target.dataset.remove);
          this.config = getAppConfig();
          this.renderCustomRules();
          this.setStatus("Custom recommendation removed.");
        }
      });
    }
    this.renderCustomRules();
  }

  renderCustomRules() {
    const list = this.root.querySelector("#custom-rule-list");
    if (!list) return;
    const rules = this.config.customRecommendations || [];
    if (!rules.length) {
      list.innerHTML = '<li class="muted">No custom recommendations yet.</li>';
      return;
    }
    list.innerHTML = rules
      .map(
        (rule) => `
          <li>
            <strong>${rule.title}</strong> <span class="muted">[${rule.trigger}]</span>
            <p>${rule.message}</p>
            <button type="button" class="rule-remove" data-remove="${rule.id}">Remove</button>
          </li>
        `,
      )
      .join("");
  }

  attachAnalyticsToggle() {
    const toggle = this.root.querySelector("#analytics-toggle");
    if (!toggle) return;
    toggle.addEventListener("change", (event) => {
      toggleAnalyticsReports(event.target.checked);
      this.config = getAppConfig();
      this.renderAnalyticsHint();
      this.setStatus(
        `Analytics connector ${event.target.checked ? "enabled" : "disabled"}. Re-run an analysis to refresh data.`,
      );
    });
  }

  computeAnalyticsHint() {
    if (!this.hasAnalyticsToken) {
      return "Requires a refresh token in window.YOUTUBE_ANALYTICS_TOKEN for reach/CTR insights.";
    }
    if (this.config.analytics?.enableReports) {
      return "Analytics connector enabled; reach/CTR details will be merged into reports when the next analysis runs.";
    }
    return "Refresh token detected; toggle the connector to surface impressions, CTR, and watch minute context.";
  }

  renderAnalyticsHint() {
    const hint = this.root.querySelector("#analytics-hint");
    if (!hint) return;
    hint.textContent = this.computeAnalyticsHint();
  }

  renderAlertStream(alerts = []) {
    const container = this.root.querySelector("#alert-stream");
    if (!container) return;
    if (!alerts.length) {
      container.innerHTML =
        '<h4>Alerts</h4><p class="muted">No urgent alerts—everything looks green.</p>';
      return;
    }
    const unique = Array.from(new Set(alerts));
    container.innerHTML = `
      <h4>Alerts</h4>
      <ul>
        ${unique.map((alert) => `<li>${alert}</li>`).join("")}
      </ul>
    `;
  }

  renderCardAlerts(card, alerts = []) {
    const container = card.querySelector("[data-alerts]");
    if (!container) return;
    if (!alerts.length) {
      container.innerHTML = '<p class="muted">No alerts for this video.</p>';
      return;
    }
    container.innerHTML = `
      <ul class="card-alerts-list">
        ${alerts.map((alert) => `<li>${alert}</li>`).join("")}
      </ul>
    `;
  }

  renderTimeline(card, snapshots) {
    const timeline = card.querySelector("[data-timeline]");
    if (!timeline) return;
    if (!snapshots.length) {
      timeline.innerHTML =
        '<p class="muted">Timeline will appear after the first analysis.</p>';
      return;
    }
    const history = snapshots.slice(-4);
    const maxViews = Math.max(...history.map((snap) => snap.views || 0), 1);
    const lines = history
      .map((snapshot, index) => {
        const prev = history[index - 1];
        const delta = prev ? snapshot.views - prev.views : snapshot.views;
        const barWidth = Math.min(
          100,
          Math.round(((snapshot.views || 0) / maxViews) * 100),
        );
        const timestamp = snapshot.timestamp
          ? new Date(snapshot.timestamp)
          : null;
        const label = timestamp
          ? `${timestamp.toISOString().split("T").join(" ").slice(0, 16)}`
          : "Snapshot";
        const trendArrow = delta >= 0 ? "↑" : "↓";
        const trendClass =
          delta > 0
            ? "trend-summary--positive"
            : delta < 0
            ? "trend-summary--negative"
            : "trend-summary--neutral";
        const trendLabel = delta >= 0 ? "Up" : "Down";
        return `
          <div class="timeline-entry">
            <div class="timeline-entry__header">
              <span>${label}</span>
              <span>${snapshot.views} views</span>
            </div>
            <div class="timeline-bar">
              <span style="width:${barWidth}%;"></span>
            </div>
            <p class="muted">Δ ${delta >= 0 ? "+" : ""}${delta} vs prev</p>
          </div>
        `;
      })
      .join("");
    timeline.innerHTML = `<h4>Growth story</h4>${lines}`;
  }
}
