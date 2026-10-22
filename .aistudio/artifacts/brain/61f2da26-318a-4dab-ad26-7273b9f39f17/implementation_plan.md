# System Policy & Technical Enhancement Plan

This implementation plan establishes the foundational governance, data persistence, and security policies for the platform based on confirmed user requirements.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following key decisions were confirmed by the user in Phase 1:

- **Confirmed Decision 1: Seed & Sync Staging Policy**: Technical code updates will not overwrite existing database records. New default seed content will be stored in a pending "Staging / Pending Seeds" queue requiring explicit Super Admin approval before merging into the main library.
- **Confirmed Decision 2: Multi-Tiered Access Control (RBAC)**: Implementation of 3 explicit role levels: Super Admin (`admin`), Content Editor (`editor`), and Standard User (`user`), with dynamic UI control visibility and permission guards.
- **Confirmed Decision 3: Automated 12-Hour Google Drive & JSON Backup**: Automated 12-hour background backup scheduler to export snapshot archives to local storage and Drive exports.
- **Confirmed Decision 4: Soft Delete & Archiving Policy**: Content and user profile deletion in Admin Panel will soft-delete items by hiding them from standard users while preserving them in a dedicated Admin Archive for restoration or permanent purge.
- **Confirmed Decision 5: Dual Firestore & Local JSON Persistence**: Simultaneous persistence and bi-directional background sync between Cloud Firestore and local `/database.json`.

---

## 1. Overview & Core Concept

- **What It Does**: Upgrades the platform with enterprise-grade data management, staged seed updates, RBAC role enforcement, soft-delete archiving, and automated 12-hour backup integration.
- **Target Audience**: Super Admins managing site configuration, Content Editors curating media/articles, and Standard Users accessing the site.
- **Key Value**: Guarantees zero data loss during code updates, provides safe content deletion with recovery, and keeps full auditability across all admin operations.

---

## 2. User Experience & Visual Design

- **Admin Control Center**:
  - **RBAC Role Switcher & User Management**: Admins can view user list, promote/demote roles (`Super Admin`, `Content Editor`, `Normal User`), and manage active sessions.
  - **Pending Seed Updates Tab**: A dedicated tab in Admin Panel showing new seed items from code updates. Admins can preview, accept, or reject individual incoming seeds.
  - **Content & User Archive (Soft Delete)**: An "Archived Items" view showing deleted posts, media, and user profiles with one-click "Restore" or "Delete Permanently" options.
  - **Automated Backup & Drive Configuration**: Displays next backup countdown (12h cycle), manual "Backup Now" trigger, and backup status.
- **Visual Identity & Theme**:
  - Consistent Dark Slate theme (`#0f172a` canvas, `#1e293b` containers, emerald accents) matching the main site aesthetic.
  - Clean unboxed metadata tags and WCAG AA contrast buttons with zero-pill discipline.

---

## 3. Key Product Decisions & Trade-Offs

- **Staging Queue vs Auto-Overwrite**:
  - *Chosen*: Staging Queue for incoming code seeds.
  - *Why*: Protects custom user edits and deleted items from reappearing when developer code syncs.
- **Soft Delete vs Hard Delete**:
  - *Chosen*: Soft Delete (`isArchived: true` flag in Firestore & database.json).
  - *Why*: Allows instant recovery from accidental deletions while satisfying user policy requirements.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   React Frontend App                   │
│   (Role Guards: Admin / Content Editor / Normal User)   │
└───────────────────────────┬────────────────────────────┘
                            │
              REST API / Dual-Sync Channel
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Express Server                      │
│   (/api/backup, /api/seeds/pending, /api/archive)      │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
┌─────────────▼──────────────┐  ┌──────────▼──────────────┐
│  Cloud Firestore Database  │  │   Local database.json   │
│  (Realtime & Cloud Storage)│  │   (Local Disk Sync)     │
└────────────────────────────┘  └─────────────────────────┘
```

### Data Schema & Soft Delete Attributes
Each entity (Post, User Profile, Admin Setting) will feature:
- `isArchived?: boolean`
- `archivedAt?: string`
- `archivedBy?: string`
- `seedStatus?: 'active' | 'pending_approval' | 'rejected'`

---

## Proposed Execution Steps

1. **Role-Based Access Control (RBAC)**: Update User interfaces and Server Auth middleware to enforce Super Admin, Editor, and Normal User permissions.
2. **Pending Seeds Approval Queue**: Modify `/server.ts` seed merge endpoint to place new code seeds into `pending_approval` state for Admin review.
3. **Soft Delete System**: Add archiving middleware and update content queries to exclude `isArchived: true` items from public view while displaying them in Admin Archive.
4. **12-Hour Automated Backup Routine**: Set up a background server interval and Admin UI controls to trigger database exports every 12 hours.
5. **UI & Verification**: Compile applet, run lint checks, and test all user flows.
