import { BaseApplier, type ApplyResult } from './base';
import type { Job } from '@/types';

const EMAIL = () => process.env.MY_EMAIL ?? '';
const PHONE = () => process.env.MY_PHONE ?? '';

/**
 * Handles Greenhouse / Lever / generic ATS direct apply pages.
 * These portals share a similar form structure.
 */
export class DirectPortalApplier extends BaseApplier {
  constructor(source: string) {
    super(source);
  }

  async apply(job: Job, resumePath: string, coverLetter: string): Promise<ApplyResult> {
    if (!this.page) throw new Error('Browser not initialised — call init() first');

    try {
      console.log(`[${this.source}-apply] navigating to ${job.url}`);
      await this.page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await this.randomDelay(1500, 3000);

      // Look for an apply button on the job page and click it
      const applyBtn = this.page.locator(
        'a:has-text("Apply"):visible, button:has-text("Apply"):visible',
      );
      if ((await applyBtn.count()) > 0) {
        await applyBtn.first().click();
        await this.randomDelay(1500, 2500);
      }

      // Fill name fields
      await this.fillNameFields(job);

      // Fill email
      await this.fillField(
        'input[name*="email" i], input[id*="email" i], input[type="email"]',
        EMAIL(),
      );

      // Fill phone
      await this.fillField(
        'input[name*="phone" i], input[id*="phone" i], input[type="tel"]',
        PHONE(),
      );

      // Upload resume
      await this.uploadResume(resumePath);

      // Fill cover letter
      await this.fillCoverLetter(coverLetter);

      // Fill LinkedIn URL if field exists
      await this.fillField(
        'input[name*="linkedin" i], input[id*="linkedin" i], input[placeholder*="linkedin" i]',
        process.env.MY_LINKEDIN_EMAIL ? `https://linkedin.com/in/${process.env.MY_LINKEDIN_EMAIL}` : '',
      );

      await this.randomDelay(500, 1000);

      // Submit
      const submitted = await this.submitForm();
      if (!submitted) {
        const screenshot = await this.takeScreenshot(`${this.source}-no-submit`);
        return { success: false, error: 'Could not find submit button', screenshot };
      }

      // Wait for success indicator
      await this.page.waitForTimeout(3000);

      const isSuccess = await this.checkForSuccess();
      const screenshot = await this.takeScreenshot(
        `${this.source}-${isSuccess ? 'success' : 'unknown'}`,
      );

      return {
        success: isSuccess,
        error: isSuccess ? undefined : 'Submit clicked but could not confirm success',
        screenshot,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const screenshot = await this.takeScreenshot(`${this.source}-error`);
      console.error(`[${this.source}-apply] error: ${message}`);
      return { success: false, error: message, screenshot };
    }
  }

  // ── Helpers ───────────────────────────────────────────────────

  private async fillNameFields(job: Job): Promise<void> {
    if (!this.page) return;

    // Try split first/last name fields
    const firstName = this.page.locator(
      'input[name*="first_name" i], input[name*="firstName" i], input[id*="first_name" i]',
    );
    const lastName = this.page.locator(
      'input[name*="last_name" i], input[name*="lastName" i], input[id*="last_name" i]',
    );

    const fullName = process.env.MY_EMAIL?.split('@')[0] ?? 'Applicant';
    const [first = fullName, ...rest] = fullName.split(/[.\-_]/);
    const last = rest.join(' ') || first;

    if ((await firstName.count()) > 0) {
      await this.fillIfEmpty(firstName.first(), first);
    }
    if ((await lastName.count()) > 0) {
      await this.fillIfEmpty(lastName.first(), last);
    }

    // Full name field
    const nameField = this.page.locator(
      'input[name*="name" i]:not([name*="first"]):not([name*="last"]):not([name*="email"]):not([name*="phone"]):not([name*="company"])',
    );
    if ((await nameField.count()) > 0) {
      await this.fillIfEmpty(nameField.first(), `${first} ${last}`);
    }
  }

  private async fillField(selector: string, value: string): Promise<void> {
    if (!this.page || !value) return;
    const field = this.page.locator(selector);
    if ((await field.count()) > 0) {
      await this.fillIfEmpty(field.first(), value);
    }
  }

  private async fillIfEmpty(
    locator: import('playwright').Locator,
    value: string,
  ): Promise<void> {
    if (!this.page) return;
    try {
      const current = await locator.inputValue();
      if (!current.trim()) {
        await locator.fill(value);
      }
    } catch {
      // Field might not be an input — ignore
    }
  }

  private async uploadResume(resumePath: string): Promise<void> {
    if (!this.page) return;
    const fileInput = this.page.locator(
      'input[type="file"][name*="resume" i], input[type="file"][name*="cv" i], input[type="file"]',
    );
    if ((await fileInput.count()) > 0) {
      await fileInput.first().setInputFiles(resumePath);
      await this.randomDelay(500, 1000);
    }
  }

  private async fillCoverLetter(coverLetter: string): Promise<void> {
    if (!this.page || !coverLetter) return;
    const textarea = this.page.locator(
      'textarea[name*="cover" i], textarea[id*="cover" i], textarea[placeholder*="cover" i], textarea[name*="letter" i]',
    );
    if ((await textarea.count()) > 0) {
      await this.fillIfEmpty(textarea.first(), coverLetter.slice(0, 2000));
    }
  }

  private async submitForm(): Promise<boolean> {
    if (!this.page) return false;

    const submitBtn = this.page.locator(
      'button[type="submit"]:visible, input[type="submit"]:visible, button:has-text("Submit"):visible, button:has-text("Apply"):visible',
    );
    if ((await submitBtn.count()) > 0) {
      await submitBtn.first().click();
      return true;
    }
    return false;
  }

  private async checkForSuccess(): Promise<boolean> {
    if (!this.page) return false;
    return this.page.evaluate(() => {
      const body = document.body.innerText.toLowerCase();
      return (
        body.includes('thank you') ||
        body.includes('application submitted') ||
        body.includes('successfully') ||
        body.includes('received your application') ||
        body.includes('we will review')
      );
    });
  }
}
