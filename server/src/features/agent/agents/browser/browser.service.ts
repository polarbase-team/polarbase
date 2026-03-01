import { Browser, Page } from 'playwright';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';

chromium.use(stealth());

class BrowserService {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async getPage() {
    if (!this.page || this.page.isClosed()) {
      const browser = await this.launch();
      this.page = await browser.newPage();
    }
    return this.page;
  }

  async closePage() {
    if (this.page && !this.page.isClosed()) {
      await this.page.close();
    }
    this.page = null;
  }

  async close() {
    await this.closePage();
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async launch() {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });

      const cleanup = async () => {
        await this.close();
      };
      process.on('exit', () => void cleanup());
      process.on('SIGINT', () => void cleanup());
      process.on('SIGTERM', () => void cleanup());
    }
    return this.browser;
  }
}

export const browserService = new BrowserService();
