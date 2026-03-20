import OpenAI from 'openai';
import type { BaseResume, Job, JDAnalysis } from '@/types';

// ── Client ────────────────────────────────────────────────────────

const openai = new OpenAI();
const MODEL = 'gpt-4o';

// ── Prompts ───────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a professional cover letter writer. Write concise, genuine cover letters that don't sound AI-generated.
Avoid: "I am writing to express my interest", "I would be a great fit", generic openers.
Use a direct, confident, human voice. Max 3 short paragraphs.`;

function buildUserPrompt(
  baseResume: BaseResume,
  job: Job,
  jdAnalysis: JDAnalysis,
): string {
  const topExperiences = baseResume.experience
    .slice(0, 2)
    .map((exp) => `${exp.title} at ${exp.company} (${exp.startDate}–${exp.endDate}): ${exp.bullets.slice(0, 2).join('; ')}`)
    .join('\n');

  return `Write a cover letter for this application:

Candidate: ${baseResume.fullName}
Applying for: ${job.title} at ${job.company}
Company summary: ${jdAnalysis.companySummary}
Key role requirements: ${jdAnalysis.requiredSkills.slice(0, 5).join(', ')}

Candidate's most relevant experience:
${topExperiences}

Keep it under 200 words. Do not use a formal header/address. Start directly with a strong opening line.

Return plain text, no markdown.`;
}

// ── Public API ────────────────────────────────────────────────────

export async function generateCoverLetter(
  baseResume: BaseResume,
  job: Job,
  jdAnalysis: JDAnalysis,
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 800,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(baseResume, job, jdAnalysis) },
      ],
    });

    return (response.choices[0]?.message?.content ?? '').trim();
  } catch (err) {
    console.error('generateCoverLetter failed:', err);
    return '';
  }
}
