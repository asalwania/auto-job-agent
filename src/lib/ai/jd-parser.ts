import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';
import type { JDAnalysis, RoleLevel, RoleType } from '@/types';

// ── Client ────────────────────────────────────────────────────────

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const MODEL = 'claude-sonnet-4-20250514';
const MAX_JD_LENGTH = 6000;

// ── Prompt ────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  'You are an expert job description analyzer. Extract structured information accurately. Return only valid JSON, no markdown fences.';

function buildUserPrompt(jdText: string): string {
  return `Analyze this job description and extract:
1. requiredSkills: string[] — must-have technical and soft skills
2. niceToHaveSkills: string[] — optional/preferred skills
3. experienceYears: number | null — minimum years required
4. roleLevel: "junior" | "mid" | "senior" | "lead" | "unknown"
5. keywords: string[] — top 20 ATS keywords (skills, tools, methodologies)
6. companySummary: string — 1 sentence about the company
7. roleType: "full-time" | "contract" | "remote" | "hybrid" | "onsite"

JD:
${jdText}`;
}

// ── Cache (in-memory, 24h TTL) ────────────────────────────────────

interface CacheEntry {
  data: JDAnalysis;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCached(hash: string): JDAnalysis | null {
  const entry = cache.get(hash);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(hash);
    return null;
  }
  return entry.data;
}

function setCache(hash: string, data: JDAnalysis): void {
  cache.set(hash, { data, expiresAt: Date.now() + TTL_MS });
}

// ── Default fallback ──────────────────────────────────────────────

const DEFAULT_ANALYSIS: JDAnalysis = {
  requiredSkills: [],
  niceToHaveSkills: [],
  experienceYears: null,
  roleLevel: 'unknown',
  keywords: [],
  companySummary: '',
  roleType: 'full-time',
};

// ── Validation ────────────────────────────────────────────────────

const VALID_ROLE_LEVELS: RoleLevel[] = ['junior', 'mid', 'senior', 'lead', 'unknown'];
const VALID_ROLE_TYPES: RoleType[] = ['full-time', 'contract', 'remote', 'hybrid', 'onsite'];

function validateAnalysis(raw: unknown): JDAnalysis {
  const obj = raw as Record<string, unknown>;

  return {
    requiredSkills: toStringArray(obj.requiredSkills),
    niceToHaveSkills: toStringArray(obj.niceToHaveSkills),
    experienceYears:
      typeof obj.experienceYears === 'number' ? obj.experienceYears : null,
    roleLevel: VALID_ROLE_LEVELS.includes(obj.roleLevel as RoleLevel)
      ? (obj.roleLevel as RoleLevel)
      : 'unknown',
    keywords: toStringArray(obj.keywords),
    companySummary:
      typeof obj.companySummary === 'string' ? obj.companySummary : '',
    roleType: VALID_ROLE_TYPES.includes(obj.roleType as RoleType)
      ? (obj.roleType as RoleType)
      : 'full-time',
  };
}

function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === 'string');
}

// ── Core ──────────────────────────────────────────────────────────

async function callClaude(jdText: string): Promise<JDAnalysis> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(jdText) }],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '';

  const parsed = JSON.parse(text);
  return validateAnalysis(parsed);
}

// ── Public API ────────────────────────────────────────────────────

export async function parseJobDescription(
  jdText: string,
): Promise<JDAnalysis> {
  if (!jdText.trim()) return { ...DEFAULT_ANALYSIS };

  // Truncate
  const truncated = jdText.length > MAX_JD_LENGTH
    ? jdText.slice(0, MAX_JD_LENGTH)
    : jdText;

  // Cache check
  const hash = createHash('md5').update(truncated).digest('hex');
  const cached = getCached(hash);
  if (cached) return cached;

  // First attempt
  try {
    const result = await callClaude(truncated);
    setCache(hash, result);
    return result;
  } catch (err) {
    console.error('parseJobDescription attempt 1 failed:', err);
  }

  // Retry once
  try {
    const result = await callClaude(truncated);
    setCache(hash, result);
    return result;
  } catch (err) {
    console.error('parseJobDescription attempt 2 failed:', err);
  }

  return { ...DEFAULT_ANALYSIS };
}
