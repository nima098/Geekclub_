import { SiteAdminSettings } from '../types/content';

export interface ModerationResult {
  isFlagged: boolean;
  detectedKeywords: string[];
  detectedDomains: string[];
  reasons: string[];
}

export const DEFAULT_BANNED_KEYWORDS: string[] = [
  'شرط‌بندی',
  'شرطبندی',
  'قمار',
  'کازینو',
  'بیت‌کوین رایگان',
  'هک تلگرام',
  'کلاهبرداری',
  'محتوای غیرمجاز',
  'قرص ماهواره‌ای',
  'فروش فالوور فیک'
];

export const DEFAULT_BANNED_DOMAINS: string[] = [
  'bet365.com',
  '1xbet.com',
  'gambling-site.com',
  'spam-link.net',
  'fake-followers.ir',
  'phishing-link.org'
];

/**
 * Checks content title, description, and URL against banned keywords and blocked domains.
 */
export function checkContentModeration(
  title: string,
  description: string,
  url: string,
  settings?: SiteAdminSettings
): ModerationResult {
  const keywords = settings?.bannedKeywords && settings.bannedKeywords.length > 0
    ? settings.bannedKeywords
    : DEFAULT_BANNED_KEYWORDS;

  const domains = settings?.bannedDomains && settings.bannedDomains.length > 0
    ? settings.bannedDomains
    : DEFAULT_BANNED_DOMAINS;

  const combinedText = `${title} ${description} ${url}`.toLowerCase();
  
  const detectedKeywords: string[] = [];
  const detectedDomains: string[] = [];
  const reasons: string[] = [];

  // 1. Check Keywords
  for (const keyword of keywords) {
    if (keyword.trim() && combinedText.includes(keyword.trim().toLowerCase())) {
      if (!detectedKeywords.includes(keyword)) {
        detectedKeywords.push(keyword);
      }
    }
  }

  // 2. Check Blocked Domains
  let normalizedUrl = url.toLowerCase();
  try {
    const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    normalizedUrl = parsedUrl.hostname.toLowerCase();
  } catch {
    // If URL parsing fails, check raw text
  }

  for (const domain of domains) {
    if (domain.trim() && (normalizedUrl.includes(domain.trim().toLowerCase()) || combinedText.includes(domain.trim().toLowerCase()))) {
      if (!detectedDomains.includes(domain)) {
        detectedDomains.push(domain);
      }
    }
  }

  if (detectedKeywords.length > 0) {
    reasons.push(`کلمات ممنوعه کشف شد: ${detectedKeywords.join('، ')}`);
  }

  if (detectedDomains.length > 0) {
    reasons.push(`دامنه یا لینک غیرمجاز کشف شد: ${detectedDomains.join('، ')}`);
  }

  return {
    isFlagged: detectedKeywords.length > 0 || detectedDomains.length > 0,
    detectedKeywords,
    detectedDomains,
    reasons
  };
}
