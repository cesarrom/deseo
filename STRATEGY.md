# Deseo Strategy: Content Lifecycle & Performance

## 🎯 Refined Focus
Deseo is evolving from a simple content generator into an end-to-end **Content ROI Engine**. The primary loop is:
**Discovery (Trends) -> Creation (AI + Images) -> Delivery (Multi-CMS) -> Measurement (Analytics) -> Evolution (Remixes).**

## 🏗 Architecture Gaps & Solutions

### 1. Intelligence & Suggestions
*   **Gap**: No persistent storage for AI suggestions based on keyword data.
*   **Solution**: Create a `suggestions` table.
*   **Flow**: `keywordResearchWorkflow` (Temporal) -> Analyzes GSC data -> Generates "Ideas" (New, Remix, Update) -> User approves -> Triggers `generateArticleWorkflow`.

### 2. Multi-Media Content Generation
*   **Gap**: AI package only generates text.
*   **Solution**: 
    *   Add `generateImage` activity to `packages/ai`.
    *   Update `ArticleAST` to include `ImageNode` with generated URLs.
    *   Support for "Remixing" existing articles by feeding old AST + new context.

### 3. Performance Measurement (The Feedback Loop)
*   **Gap**: No historical tracking of how articles perform after publishing.
*   **Solution**:
    *   `performance_metrics` table: Stores `article_id`, `date`, `clicks`, `impressions`, `position`.
    *   `trackPerformanceWorkflow`: A cron job that polls all `feature:analytics` connectors for data.
    *   Correlate article changes (updates) with performance spikes.

### 4. Multi-Platform Delivery
*   **Gap**: Publishing is currently manual/single-app.
*   **Solution**: `publishToAllWorkflow` that iterates through all `active` CMS installations for a client.

## 📅 Technical Roadmap

### Phase 7.1: The Suggestion Engine
- [ ] DB: Create `suggestions` table.
- [ ] AI: Implement "Idea Generator" prompt based on keyword gaps.
- [ ] UI: Build "Intelligence" tab showing actionable suggestions with "Generate" buttons.

### Phase 7.2: Visual Content
- [ ] AI: Integrate Image Generation (DALL-E 3 or Flux).
- [ ] AST: Enhance converters to handle remote image hosting/uploading to CMS.
- [ ] UI: Image prompt customization in the editor.

### Phase 7.3: Performance Analytics
- [ ] DB: Create `performance_metrics` table.
- [ ] Connector: Standardize `GET /analytics/performance` across providers.
- [ ] Temporal: Implement `trackPerformanceWorkflow` (Daily Cron).
- [ ] UI: "Performance" tab in Article detail view (Charts).

### Phase 7.4: Content Evolution (Remixes)
- [ ] AI: Implement "Article Updater" and "Remixer" logic.
- [ ] Workflow: "Auto-Optimize" workflow that detects falling performance and suggests an update.
