import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface NotificationPayload {
  jobTitle: string;
  company: string;
  atsScore: number;
  coveredKeywords: string[];
  missingKeywords: string[];
  jobUrl: string;
}

export async function sendNotificationEmail(payload: NotificationPayload): Promise<void> {
  const to = process.env.MY_EMAIL;
  if (!to) {
    console.warn('[notify] MY_EMAIL not set — skipping notification');
    return;
  }

  try {
    await resend.emails.send({
      from: 'Job Agent <onboarding@resend.dev>',
      to,
      subject: `✅ High match: ${payload.jobTitle} at ${payload.company} (ATS ${payload.atsScore}%)`,
      html: `
        <h2>${payload.jobTitle} at ${payload.company}</h2>
        <p><strong>ATS Score:</strong> ${payload.atsScore}%</p>
        <p><strong>Covered Keywords:</strong> ${payload.coveredKeywords.join(', ') || 'None'}</p>
        <p><strong>Missing Keywords:</strong> ${payload.missingKeywords.join(', ') || 'None'}</p>
        <p><a href="${payload.jobUrl}">View Job Posting</a></p>
      `,
    });

    console.log(`[notify] email sent for ${payload.company} — ${payload.jobTitle}`);
  } catch (err) {
    console.error('[notify] failed to send email:', err);
  }
}
