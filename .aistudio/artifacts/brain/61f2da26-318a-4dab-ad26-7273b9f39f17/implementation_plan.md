# User Profile Shared Contents & Net Reputation Score

Integrate a dedicated **User Shared Contents** section inside the Profile modal and user profile views, displaying a list of all contents published or submitted by the user alongside their calculated **Net Reputation Score** (Total Likes minus Total Dislikes).

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during the Phase 1 interview:

- **Net Reputation Score Calculation**: Computed as **Total Likes minus Total Dislikes** (`∑ Likes - ∑ Dislikes`) across all content items authored by the user.
- **Profile Layout Structure**: A **compact list view** displaying rich inline metadata, including current approval status (`منتشر شده`, `در انتظار تأیید`, `رد شده`), exact counts for likes, dislikes, and comments, and a quick preview/read action.
- **Filter & Search Controls**: Interactive filter bar inside the profile allowing users to filter their shared contents by **Publication Status** (`همه`, `منتشر شده`, `در انتظار بررسی`, `رد شده`) and **Platform** (`همه`, `یوتیوب`, `اینستاگرام`, `مقاله`, `آپارات`).

---

## 1. Overview & Core Concept

### What It Does
1. **Net Reputation Rating Badge**: Displays an prominent score badge in the user profile header showing `امتیاز خالص اعتبار` (Total Likes - Total Dislikes) with dynamic color accents (Emerald for positive score, Slate for zero, Rose for negative).
2. **User Shared Contents Tab / Section**: Renders a compact, filterable list of all contents uploaded by the current profile user.
3. **Status-Aware Items**: Highlights the approval status of guest and member submissions (`منتشر شده`, `در انتظار بررسی ادمین`, `رد شده`) with direct status badges.
4. **Interactive Actions**: Enables authors to quickly view comments, read article preview, or open their content items directly from their profile view.

---

## 2. User Experience & Visual Design

### User Flow
1. **Accessing Profile**: User opens their Profile modal or views another member's profile.
2. **Viewing Reputation Metrics**: The header displays total published posts, total comments, and the **Net Score Badge** (`امتیاز خالص: +142`).
3. **Browsing Shared Contents**: Under the "محتواهای من" (My Contents) tab or section, the user sees a compact list of their submitted posts.
4. **Filtering**: User switches filters between "همه" (All), "منتشر شده" (Published), "در انتظار بررسی" (Pending), or specific platforms.
5. **Item Interaction**: Clicking an item in the compact list opens the reader modal or comments sheet.

### Visual Styling & Theme
- **Reputation Badge**: High-legibility score pill with tabular numbers (`tabular-nums font-mono font-bold`) and subtle background glow.
- **Compact List Items**: Clean 1-line or 2-line row layout with platform icon, thumbnail preview, post title, creation time, status indicator, and metric chips (likes, dislikes, comments).
- **Filter Controls**: Segmented tab control with smooth active state transitions.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Real-time Firestore & Local Sync for User Metrics**:
  - *Chosen Approach*: Derive user net score dynamically from the global `contents` state and Firestore database documents filtered by `authorUid` or `author.name`.
  - *Why*: Ensures that whenever an item receives a new like or dislike from any user, the author's net score updates instantly across the app.
- **Decision 2: Compact List View Over Heavy Grid Cards in Profile**:
  - *Chosen Approach*: Dense, scannable list rows with metric badges instead of repeating giant grid cards.
  - *Why*: Allows users with 10+ shared items to quickly audit and filter their contributions without excessive vertical scrolling inside the profile modal.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                      Firestore Database                         │
│                    collection('contents')                       │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       App State (React)                         │
│   contents: ContentItem[]  <-->  user: UserProfile              │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ProfileModal Component                       │
│  ├── Profile Header: Net Score = ∑(Likes - Dislikes)             │
│  ├── Filter Bar: Status ('all' | 'approved' | 'pending')         │
│  │               Platform ('all' | 'youtube' | 'instagram'...)  │
│  └── Compact Content List: Rendered rows with metrics           │
└─────────────────────────────────────────────────────────────────┘
```

### Data Mutations & Handlers
- **Net Score Computation**:
  ```ts
  const userContents = contents.filter(c => c.authorUid === user.uid || c.author.name === user.displayName);
  const netScore = userContents.reduce((acc, item) => acc + ((item.likesCount || 0) - (item.dislikesCount || 0)), 0);
  ```
- **Filter State**: `filterStatus` (`all`, `approved`, `pending`, `rejected`) and `filterPlatform`.

---

## 5. Implementation Steps

1. **Update `ProfileModal.tsx`**:
   - Add Net Score calculation and visual badge in profile stats header.
   - Implement `filterStatus` and `filterPlatform` state hooks inside `ProfileModal`.
   - Render a compact, styled list of `userContents` with status tags, likes/dislikes counts, comments count, and action buttons.
2. **Update `App.tsx`**:
   - Pass the global `contents` list to `ProfileModal`.
3. **Verify Build & Test**:
   - Run `compile_applet` and `lint_applet` to confirm build succeeds without errors.
