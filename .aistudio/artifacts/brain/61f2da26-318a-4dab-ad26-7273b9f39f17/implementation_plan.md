# Implementation Plan - Apify Instagram Scraper & CDN Media Pipeline

This plan outlines the architecture and steps to integrate Apify.com Instagram scraping API when a user publishes an Instagram link, downloading video and photo assets to the Vercel backend, transferring them to CDN/storage, and serving them seamlessly in the web app.

## Proposed Changes

### 1. Backend API & Apify Integration (`server.ts` / `src/services/api.ts`)
- **Apify Client Service**: Implement an API helper function in the backend (`server.ts`) to trigger or call Apify's Instagram Scraper actor (or REST run dataset endpoint) when an Instagram URL is submitted.
- **Media Download & CDN Pipeline**:
  - Fetch post details (media URLs, videos, images, captions, author info) from Apify dataset results.
  - Download video/photo binaries to temporary server storage (`/tmp` or buffer).
  - Upload/transfer downloaded assets to CDN storage or serve via local cached server endpoint (`/api/media/...` or public CDN assets folder) ensuring reliable playback and display without external CORS/expiry blocks.
- **Background Async Enrichment**:
  - Update `enrichDatabaseContent` to handle Instagram links using Apify when `needsEnrichment` is true.
  - Update content item in Firestore with permanent CDN media URLs (`videoUrl`, `thumbnail`, `mediaType`, etc.) and set `needsEnrichment: false`.

### 2. Frontend UX & Status Tracking (`src/components/AddContentModal.tsx`, `src/components/ContentCard.tsx`, `src/App.tsx`)
- **Quick Submission**: When user pastes an Instagram link and clicks publish, immediately create the item with `needsEnrichment: true` and show a live processing state badge ("در حال پردازش رسانه از اینستاگرام...").
- **Polling / Realtime Updates**: Listen to Firestore snapshots via `onSnapshot` so that once the backend completes Apify scraping and CDN transfer, the card updates automatically with the playable video and high-res image.
- **Video & Media Player**: Ensure `ContentCard` supports playing downloaded MP4 videos and viewing photos served from CDN.

## Verification Plan

### Automated Tests
- Run `compile_applet` and `lint_applet` to ensure TypeScript compilation and zero build errors.

### Manual Verification
- Simulate submitting an Instagram link via the UI.
- Verify backend logs show Apify request, media download, and CDN processing.
- Verify feed updates with processing badge and subsequently shows playable video and cached image.
