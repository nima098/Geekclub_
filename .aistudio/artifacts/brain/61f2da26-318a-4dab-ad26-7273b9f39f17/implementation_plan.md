# Refined Light Theme Styling Implementation Plan

This plan outlines the refinement of the light mode theme to match a clean, modern forum aesthetic with soft neutral backgrounds, crisp cards, and refined contrast tokens.

## User Review & Critical Decisions

> [!IMPORTANT]
> The user requested a light theme inspired by modern forums (clean white/off-white background, subtle borders, high legibility).

- **Confirmed Decision 1**: Use a clean light background (`bg-slate-100` / `bg-slate-50`) paired with crisp white cards (`bg-white`), soft subtle gray borders (`border-slate-200`), and dark scannable text (`text-slate-900` / `text-slate-700`).
- **Confirmed Decision 2**: Ensure that switching to light mode updates all card surfaces, modals, top bar, and filter controls instantly and smoothly.

---

## 1. Overview & Core Concept

- **What It Does**: Enhances light mode styling across the entire app with a clean forum-inspired palette (soft neutral background, high contrast cards, crisp typography).
- **Target Audience / Persona**: Users who prefer light/day mode with professional forum ergonomics.
- **Key Value**: Enhanced daytime readability and refined aesthetics matching modern discussion forums.

---

## 2. User Experience & Visual Design

- **Visual Palette in Light Mode**:
  - Background: `bg-slate-50`
  - Cards & Containers: `bg-white border border-slate-200 shadow-sm`
  - Text: `text-slate-900` for headings, `text-slate-600` for metadata and descriptions.
  - Accent: Vibrant indigo and platform colors (`bg-red-600`, `bg-pink-500`, `bg-emerald-600`).

---

## 3. Technical Architecture & Component Styling

- Update component background and text utility classes where necessary in `App.tsx`, `Navbar.tsx`, `ContentCard.tsx`, `FilterBar.tsx`, and modals to ensure pristine light mode rendering.
