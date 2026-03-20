import Anthropic from '@anthropic-ai/sdk';
import type { BaseResume, Job, JDAnalysis } from '@/types';

// ── Client ────────────────────────────────────────────────────────

const anthropic = new Anthropic();
const MODEL = 'claude-sonnet-4-20250514';

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
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: buildUserPrompt(baseResume, job, jdAnalysis) },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return text.trim();
  } catch (err) {
    console.error('generateCoverLetter failed:', err);
    return '';
  }
}
