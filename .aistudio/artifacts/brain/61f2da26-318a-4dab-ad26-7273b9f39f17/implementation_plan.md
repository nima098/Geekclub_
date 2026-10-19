# H1/H2 Header Analysis for Article Titles Implementation Plan

This plan details implementing fallback heuristics that check page header tags (`H1` and `H2`), filtering out any header matching the site name, and adopting the remaining valid header as the article title.

## User Review & Critical Decisions

> [!IMPORTANT]
> The user requested inspecting H1/H2 tags, filtering out site name headings, and selecting the relevant article header.

- **Confirmed Decision 1**: Inspect page header tags (`H1`, `H2`) when standard meta tags are unavailable.
- **Confirmed Decision 2**: Filter out headings containing the site name or domain name, and pick the true article header.

---

## 1. Overview & Core Concept

- **What It Does**: Enhances `urlHelper.ts` metadata extraction fallback to analyze heading tags while excluding brand/site name headers.
- **Target Audience / Persona**: Users sharing web articles.
- **Key Value**: Precise automated article titles derived from main heading tags.

---

## 2. Technical Implementation

- **File**: `src/utils/urlHelper.ts`
- **Logic**: Add heading filtering logic in `fetchMetadataFromUrl` for articles.
