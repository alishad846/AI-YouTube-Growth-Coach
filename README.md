# AI YouTube Growth Coach (Local-First Intelligence System)

## Vision
A privacy-first personal coach that runs entirely in the browser, stores every insight inside `localStorage`, and uses the YouTube Data API v3 for the live signal. It explains why a video performs, what to do next, and tracks improvement over time without sending data to a server.

## System Architecture (modules & flow)
1. **Data Ingestion Layer**  hits YouTubes `/videos` endpoint (statistics/snippet/contentDetails) and falls back to a synthetic payload when no `YOUTUBE_API_KEY` is supplied.
2. **Local Storage Manager**  encapsulates the `ai-youtube-growth-coach` namespace, persists video metadata, snapshots, and preferences, and exposes getters/setters that stay alive after restarts.
3. **Feature Engineering**  turns raw stats into `engagementRate`, `growthRate`, `velocity`, `performanceScore`, and a **pre-upload score** so you can simulate performance before publishing.
4. **Growth & Snapshot Engine**  compares the incoming snapshot to the last one to compute deltas, velocity, and expected vs actual views (the growth curve).
5. **Analysis & Diagnosis Engine**  blends features, growth deltas, and benchmarks to surface root causes with confidence scores.
6. **Pattern Learning Engine**  mines every locally stored snapshot to recommend best timing, optimal duration, repeated mistakes, and improvement tracking.
7. **Recommendation Engine**  turns diagnoses + patterns into actionable, context-aware fixes.
8. **Formatter**  packages every run into the required report sections (performance summary, score breakdown, evidence, root cause, recommendations, growth comparison).
9. **Frontend Dashboard**  React-less, module-based UI that shows saved videos, `Analyze Now`, last-checked time, growth change, and a coaching narrative instead of a dashboard.

## LocalStorage Schema
```json
{
  "videos": [
    {
      "videoId": "abc123",
      "title": "AI Journal",
      "duration": 7.4,
      "lastCheck": "2026-03-30T05:15:00Z",
      "snapshots": [
        {
          "views": 10200,
          "likes": 430,
          "comments": 38,
          "timestamp": "2026-03-30T04:50:00Z",
          "features": {
            "engagementRate": 0.045,
            "growthRate": 0.12,
            "velocity": 120,
            "performanceScore": 76
          }
        }
      ]
    }
  ],
  "preferences": {
    "thresholds": {
      "engagement": 0.06,
      "growth": 0.02
    }
  }
}
```

## Setup & Running Locally
1. Clone or unzip this repo and ensure the directory contains `index.html` + `src/`.
2. Open `index.html` in any modern browser or serve it using a simple static server: `npx http-server` or `python -m http.server 4173`.
3. Before you hit ?Analyze Now?, set your API key in the browser console or via a small script block such as:
   ```html
   <script>
     window.YOUTUBE_API_KEY = 'YOUR_API_KEY';
   </script>
   ```
   Without a key, the ingestion layer falls back to synthetic data. You can also place your key inside the local-only `.venv/credentials.js` file (it loads before the app) so the dashboard sees it without risking commits.
4. Optionally assign `window.YOUTUBE_ANALYTICS_TOKEN` (a refresh-token-enabled credential) and toggle the analytics connector in the UI to let the coach read impressions/CTR data; the system reverts to basic stats if the token or scopes are unavailable.
5. Add a video via its ID (e.g., `dQw4w9WgXcQ`). The coach auto-saves the entry and keeps it in localStorage.
6. Press **Analyze Now** to fetch live stats, compare snapshots, and surface diagnostics/recommendations.


## Core UX Narrative
- Every video card shows Last checked and the growth since the last check.
- The Analyze Now button triggers ingestion, feature engineering, diagnosis, and new snapshots.
- Reports are structured with sections: performance summary, score breakdown, evidence, root cause + confidence, actionable recommendations, and growth comparison.
- Pattern highlights surface the best time, best duration, and improvement tracking per session.
- Pre-upload scoring lets you simulate performance expectations before recording.



## Advanced Coaching Surface
- Each video card now includes a growth story timeline that plots the most recent snapshots; it keeps you honest about momentum between runs.
- The alert stream and per-card alerts flag engagement/growth/velocity anomalies plus analytics connector health so you can react fast.
- Custom recommendations let you write a title, trigger (engagement, growth, velocity, healthy, or any alert), and a message that surfaces inside the report when that diagnosis matches.
- The what-if simulator lets you dial projected engagement, growth, and velocity to preview a new performance score without running a live check.
- Configuration, thresholds, analytics toggles, and custom rules persist inside `localStorage` (`appConfig.js` / `localStorageManager.js`); clear the storage or revisit the forms to adjust them later.


## Productivity & Intelligence Surface
- A dedicated feature catalog now enumerates every capability from the Auto Patch Engine, Safe Replace System, Version Rollback, and Real-time Execution Pipeline through the Root Cause Detection Engine, Behavioral Analytics Layer, Predictive Growth Modeling, and Pattern Learning System. The catalog is rendered from `systemCapabilities.js` so the dashboard can explain itself as it runs.
- The automation controls panel wires up Modular Code Generation, Function-Level Patching, Auto Refactor, Error Detection, and the One-Click Apply Changes flow. It also exposes buttons for Multi-Video Batch Processing, a Scheduled Analysis Engine, and Continuous Learning Loop toggles so the coach can keep training without manual clicks.
- A lightweight notification stream captures Auto Recommendation Executor events, plugin architecture notes, API integration handshakes, and Experimentation Engine logs, keeping you aware of the Notification System's output.
- Pattern highlights now include behavioral analytics (engagement, growth, velocity averages) and the predictive growth projection so you can see the coach's forecasts alongside the configured release window.
- Under the hood, `LocalStorageManager` stores version history so the Version Rollback helpers can rewind bad snapshots, while API Integration Layer and Plugin Architecture make it easy to extend with new diagnostics or connectors without touching the UI directly.


## Testing Implementation
1. **Unit Testing** (engagement & growth formulas)
   - `tests/run-tests.mjs` imports `calculateEngagementRate`, `calculateGrowthRate`, `calculatePerformanceScore`, and the growth delta helper.
   - Run `node tests/run-tests.mjs` (Node 18+). It asserts edge cases like zero views and viral spikes.
2. **Snapshot Testing**
   - The test script simulates multiple snapshots in memory and verifies `deltaViews`, `deltaLikes`, and velocity calculations.
3. **Integration Testing**
   - The UI flow `Add video ? Analyze Now ? snapshot stored ? reload ? re-analyze` is described in the README and supported by the Local Storage Managers persistence.
4. **Real Testing**
   - Use real YouTube IDs (low vs high performance) to validate reports, ensure `growthComparison` variance makes sense, and confirm recommendations differentiate.
5. **Edge Cases**
   - The code handles no prior snapshot (growth rate defaults to 0), zero views (engagement stays 0), and viral spikes (velocity captures large deltas without divide-by-zero errors).

## Example Output (after analyzing one video)
```
Performance Summary: Video AI Journal sits at 78/100. Engagement is 0.053 and growth delta 320 views.
Score Breakdown: engagement 0.053, growth 0.018, velocity 120 views/hr.
Evidence: Views gained 320 since last snapshot. Growth curve modeling: expected 2,400 vs actual 2,720 (variance +320).
Root Cause: Growth stagnating (confidence 72%). Detail: Views are rising slower than the latest benchmark.
Recommendations: test new hooks, refresh CTAs, promote the series, publish near the best timing window.
Growth Comparison: delta 320 views, velocity 120 views/hr, last check 2026-03-30T12:15:00Z.
Patterns: Best timing 20:0021:00, Best duration 6.5 mins, Improvement: +0.004 engagement, +0.03 growth, Hotspot: video ABC at 2026-03-30T11:00:00Z.
```

## Next Steps & Maintenance
1. Host `index.html` on any static server or integrate into your favorite bundler (Vite, Astro, etc.).
2. Add more heuristics inside `analysisEngine.js` for category-aware benchmarks.
3. Extend the pattern engine with sentiment from comments once you pull `commentThreads`.
4. Hook this into a browser extension if you want the coach to run alongside YouTube Studio.

## Notes
- No data leaves the browser; every snapshot and preference is stored in `localStorage`.
- The system simulates snapshots via `growthSnapshotEngine` and summarizes them through `formatter.js` so the UI always feels like a coach narrative rather than a dashboard.
