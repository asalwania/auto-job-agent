import { BaseApplier, type ApplyResult } from './base';
import type { Job } from '@/types';

const PHONE = () => process.env.MY_PHONE ?? '';

export class LinkedInApplier extends BaseApplier {
  constructor() {
    super('linkedin');
  }

  async apply(job: Job, resumePath: string, coverLetter: string): Promise<ApplyResult> {
    if (!this.page) throw new Error('Browser not initialised — call init() first');

    try {
      // a. Navigate to job URL
      console.log(`[linkedin-apply] navigating to ${job.url}`);
      await this.page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await this.randomDelay(1500, 3000);

      // Handle login wall
      if (this.page.url().includes('/login')) {
        return { success: false, error: 'Login required — not logged in' };
      }

      // b. Check Easy Apply button
      const easyApplyBtn = this.page.locator(
        '.jobs-apply-button, button.jobs-apply-button--top-card, button:has-text("Easy Apply")',
      );

      if ((await easyApplyBtn.count()) === 0) {
        const screenshot = await this.takeScreenshot('no-easy-apply');
        return { success: false, error: 'No Easy Apply button found', screenshot };
      }

      // c. Click Easy Apply
      await easyApplyBtn.first().click();
      await this.randomDelay(1500, 2500);

      // d. Handle multi-step modal
      const maxSteps = 8;
      for (let step = 0; step < maxSteps; step++) {
        // Wait for modal content to settle
        await this.page.waitForTimeout(1000);

        // Check if we're done (success confirmation)
        const successIndicator = this.page.locator(
          '[data-test="post-apply-modal"], .jpac-modal-header, .artdeco-modal:has-text("Application submitted")',
        );
        if (await successIndicator.count()) {
          const screenshot = await this.takeScreenshot('apply-success');
          return { success: true, screenshot };
        }

        // Fill phone number
        await this.fillPhoneIfPresent();

        // Upload resume
        await this.uploadResumeIfPresent(resumePath);

        // Fill cover letter
        await this.fillCoverLetterIfPresent(coverLetter);

        // Answer experience questions
        await this.answerExperienceQuestions();

        // Answer yes/no questions
        await this.answerYesNoQuestions();

        // Fill any remaining text inputs that are empty and required
        await this.fillRemainingInputs();

        await this.randomDelay(500, 1000);

        // Try to advance: Submit > Review > Next
        const submitted = await this.tryClickSubmit();
        if (submitted) {
          await this.page.waitForTimeout(2000);
          const screenshot = await this.takeScreenshot('apply-submitted');
          return { success: true, screenshot };
        }

        const advanced = await this.tryClickNext();
        if (!advanced) {
          // No submit or next button found — might be stuck
          const screenshot = await this.takeScreenshot('apply-stuck');
          return { success: false, error: `Stuck at step ${step + 1}`, screenshot };
        }

        await this.randomDelay(1000, 2000);
      }

      const screenshot = await this.takeScreenshot('apply-max-steps');
      return { success: false, error: 'Exceeded max steps', screenshot };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const screenshot = await this.takeScreenshot('apply-error');
      console.error(`[linkedin-apply] error: ${message}`);
      return { success: false, error: message, screenshot };
    }
  }

  // ── Step helpers ──────────────────────────────────────────────

  private async fillPhoneIfPresent(): Promise<void> {
    if (!this.page) return;
    const phone = PHONE();
    if (!phone) return;

    const phoneInput = this.page.locator(
      'input[name*="phone" i], input[name*="phoneNumber" i], input[id*="phone" i]',
    );
    if ((await phoneInput.count()) > 0) {
      const value = await phoneInput.first().inputValue();
      if (!value.trim()) {
        await phoneInput.first().fill(phone);
      }
    }
  }

  private async uploadResumeIfPresent(resumePath: string): Promise<void> {
    if (!this.page) return;

    const fileInput = this.page.locator('input[type="file"]');
    if ((await fileInput.count()) > 0) {
      await fileInput.first().setInputFiles(resumePath);
      await this.randomDelay(500, 1000);
    }
  }

  private async fillCoverLetterIfPresent(coverLetter: string): Promise<void> {
    if (!this.page) return;
    if (!coverLetter) return;

    const textarea = this.page.locator(
      'textarea[name*="cover" i], textarea[id*="cover" i], textarea[placeholder*="cover" i], textarea[label*="cover" i]',
    );
    if ((await textarea.count()) > 0) {
      const value = await textarea.first().inputValue();
      if (!value.trim()) {
        await textarea.first().fill(coverLetter.slice(0, 1500));
      }
    }
  }

  private async answerExperienceQuestions(): Promise<void> {
    if (!this.page) return;

    // Look for numeric inputs asking about years of experience
    const numericInputs = this.page.locator(
      'input[type="number"], input[id*="experience" i], input[name*="experience" i], input[id*="years" i]',
    );
    const count = await numericInputs.count();
    for (let i = 0; i < count; i++) {
      const input = numericInputs.nth(i);
      const value = await input.inputValue();
      if (!value.trim()) {
        await input.fill('5');
      }
    }
  }

  private async answerYesNoQuestions(): Promise<void> {
    if (!this.page) return;

    // For radio button groups, select "Yes" if available
    const yesRadios = this.page.locator(
      'input[type="radio"][value="Yes"], label:has-text("Yes") input[type="radio"]',
    );
    const count = await yesRadios.count();
    for (let i = 0; i < count; i++) {
      const radio = yesRadios.nth(i);
      if (!(await radio.isChecked())) {
        await radio.check();
      }
    }
  }

  private async fillRemainingInputs(): Promise<void> {
    if (!this.page) return;

    // Fill empty required selects with the first non-empty option
    const selects = this.page.locator('select[required], select[aria-required="true"]');
    const selectCount = await selects.count();
    for (let i = 0; i < selectCount; i++) {
      const select = selects.nth(i);
      const value = await select.inputValue();
      if (!value) {
        const firstOption = select.locator('option:not([value=""])').first();
        if (await firstOption.count()) {
          const optionValue = await firstOption.getAttribute('value');
          if (optionValue) await select.selectOption(optionValue);
        }
      }
    }
  }

  private async tryClickSubmit(): Promise<boolean> {
    if (!this.page) return false;

    const submitBtn = this.page.locator(
      'button:has-text("Submit application"), button:has-text("Submit"):visible, button[aria-label*="Submit" i]:visible',
    );
    if ((await submitBtn.count()) > 0) {
      await submitBtn.first().click();
      return true;
    }
    return false;
  }

  private async tryClickNext(): Promise<boolean> {
    if (!this.page) return false;

    const nextBtn = this.page.locator(
      'button:has-text("Next"):visible, button:has-text("Review"):visible, button:has-text("Continue"):visible, button[aria-label*="next" i]:visible',
    );
    if ((await nextBtn.count()) > 0) {
      await nextBtn.first().click();
      return true;
    }
    return false;
  }
}
