import Anthropic from '@anthropic-ai/sdk';
import type { BaseResume, JDAnalysis, TailoredResume } from '@/types';

// ── Client ────────────────────────────────────────────────────────

const anthropic = new Anthropic();
const MODEL = 'claude-sonnet-4-20250514';

// ── Prompts ───────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert resume writer and ATS optimization specialist.
Rewrite resume bullets to maximize ATS score for the specific job description.
Rules:
- Keep bullets truthful and based on original content — do NOT invent achievements
- Mirror keywords from the JD naturally within bullets
- Quantify impacts where the original implies it (use original numbers, don't fabricate)
- Each bullet should start with a strong action verb
- Aim for 3-5 bullets per role
Return only valid JSON, no markdown.`;

function buildUserPrompt(
  baseResume: BaseResume,
  jdAnalysis: JDAnalysis,
  jdText: string,
): string {
  const jdSnippet = jdText.length > 4000 ? jdText.slice(0, 4000) : jdText;

  return `Given this job description analysis:
Keywords: ${JSON.stringify(jdAnalysis.keywords)}
Required Skills: ${JSON.stringify(jdAnalysis.requiredSkills)}
Nice-to-Have Skills: ${JSON.stringify(jdAnalysis.niceToHaveSkills)}
Role Level: ${jdAnalysis.roleLevel}

Full JD (for context):
${jdSnippet}

And this base resume:
${JSON.stringify(baseResume, null, 2)}

Rewrite the experience bullets to maximize match with the JD. Also write a tailored summary (2-3 sentences).

Return JSON:
{
  "tailoredBullets": { "COMPANY_NAME": ["bullet1", "bullet2", ...] },
  "tailoredSummary": "...",
  "atsScore": 0-100,
  "coveredKeywords": [...],
  "missingKeywords": [...]
}`;
}

// ── Validation ────────────────────────────────────────────────────

interface ClaudeResponse {
  tailoredBullets: Record<string, string[]>;
  tailoredSummary: string;
  atsScore: number;
  coveredKeywords: string[];
  missingKeywords: string[];
}

function validateResponse(raw: unknown): ClaudeResponse {
  const obj = raw as Record<string, unknown>;

  const tailoredBullets: Record<string, string[]> = {};
  if (obj.tailoredBullets && typeof obj.tailoredBullets === 'object') {
    for (const [key, val] of Object.entries(obj.tailoredBullets as Record<string, unknown>)) {
      tailoredBullets[key] = Array.isArray(val)
        ? val.filter((v): v is string => typeof v === 'string')
        : [];
    }
  }

  return {
    tailoredBullets,
    tailoredSummary:
      typeof obj.tailoredSummary === 'string' ? obj.tailoredSummary : '',
    atsScore:
      typeof obj.atsScore === 'number' ? Math.round(obj.atsScore) : 0,
    coveredKeywords: toStringArray(obj.coveredKeywords),
    missingKeywords: toStringArray(obj.missingKeywords),
  };
}

function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === 'string');
}

// ── ATS Score calculation ─────────────────────────────────────────

export function getAtsScore(
  resume: TailoredResume,
  jdAnalysis: JDAnalysis,
): number {
  const allKeywords = [
    ...jdAnalysis.keywords,
    ...jdAnalysis.requiredSkills,
  ];

  // Deduplicate (case-insensitive)
  const unique = [...new Set(allKeywords.map((k) => k.toLowerCase()))];
  if (unique.length === 0) return resume.atsScore;

  // Check which keywords appear in the tailored content
  const bulletsText = Object.values(resume.tailoredBullets)
    .flat()
    .join(' ')
    .toLowerCase();
  const summaryText = resume.tailoredSummary.toLowerCase();
  const fullText = `${bulletsText} ${summaryText}`;

  let covered = 0;
  for (const keyword of unique) {
    if (fullText.includes(keyword)) covered++;
  }

  const calculatedScore = Math.round((covered / unique.length) * 100);

  // Weighted: 60% Claude's assessment + 40% keyword coverage
  return Math.round(resume.atsScore * 0.6 + calculatedScore * 0.4);
}

// ── Core ──────────────────────────────────────────────────────────

async function callClaude(
  baseResume: BaseResume,
  jdAnalysis: JDAnalysis,
  jdText: string,
): Promise<ClaudeResponse> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: buildUserPrompt(baseResume, jdAnalysis, jdText) },
    ],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '';

  const parsed = JSON.parse(text);
  return validateResponse(parsed);
}

// ── Public API ────────────────────────────────────────────────────

export async function tailorResume(
  baseResume: BaseResume,
  jdAnalysis: JDAnalysis,
  jdText: string,
): Promise<TailoredResume> {
  // First attempt
  let claudeResult: ClaudeResponse | null = null;

  try {
    claudeResult = await callClaude(baseResume, jdAnalysis, jdText);
  } catch (err) {
    console.error('tailorResume attempt 1 failed:', err);

    // Retry once
    try {
      claudeResult = await callClaude(baseResume, jdAnalysis, jdText);
    } catch (retryErr) {
      console.error('tailorResume attempt 2 failed:', retryErr);
    }
  }

  // Build the TailoredResume (fallback to empty if both attempts failed)
  const result: TailoredResume = {
    baseResumeId: baseResume.id,
    jobId: '', // caller sets this
    tailoredBullets: claudeResult?.tailoredBullets ?? {},
    tailoredSummary: claudeResult?.tailoredSummary ?? baseResume.summary,
    atsScore: claudeResult?.atsScore ?? 0,
    coveredKeywords: claudeResult?.coveredKeywords ?? [],
    missingKeywords: claudeResult?.missingKeywords ?? [],
  };

  // Recalculate ATS score with weighted blend
  result.atsScore = getAtsScore(result, jdAnalysis);

  return result;
}
