import { LanguageModel, ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';

import { browserService } from './browser.service';

export const browserAgentTools = {
  navigate: tool({
    description:
      'Navigate the browser to a URL. Returns the page title and final URL after load.',
    inputSchema: z.object({
      url: z.string().describe('The URL to navigate to.'),
    }),
    inputExamples: [
      { input: { url: 'https://example.com' } },
      { input: { url: 'https://news.ycombinator.com' } },
    ],
    strict: true,
    execute: async ({ url }) => {
      const page = await browserService.getPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      return {
        title: await page.title(),
        url: page.url(),
      };
    },
  }),

  click: tool({
    description: 'Click an element on the page using a CSS selector.',
    inputSchema: z.object({
      selector: z.string().describe('CSS selector of the element to click.'),
    }),
    inputExamples: [
      { input: { selector: 'button#submit' } },
      { input: { selector: 'a[href="/about"]' } },
    ],
    strict: true,
    execute: async ({ selector }) => {
      const page = await browserService.getPage();
      await page.click(selector, { timeout: 10_000 });
      await page.waitForTimeout(500);
      return {
        clicked: selector,
        title: await page.title(),
        url: page.url(),
      };
    },
  }),

  type: tool({
    description:
      'Type text into an input field identified by CSS selector, then optionally press Enter.',
    inputSchema: z.object({
      selector: z.string().describe('CSS selector of the input element.'),
      text: z.string().describe('The text to type into the field.'),
      pressEnter: z.boolean().describe('Whether to press Enter after typing.'),
    }),
    inputExamples: [
      {
        input: {
          selector: 'input[name="q"]',
          text: 'playwright',
          pressEnter: true,
        },
      },
    ],
    strict: true,
    execute: async ({ selector, text, pressEnter }) => {
      const page = await browserService.getPage();
      await page.fill(selector, text, { timeout: 10_000 });
      if (pressEnter) {
        await page.press(selector, 'Enter');
        await page.waitForTimeout(1000);
      }
      return {
        typed: text,
        selector,
        title: await page.title(),
        url: page.url(),
      };
    },
  }),

  screenshot: tool({
    description:
      'Take a full-page screenshot of the current page. Returns a base64 PNG.',
    inputSchema: z.object({}),
    inputExamples: [{ input: {} }],
    strict: true,
    execute: async () => {
      const page = await browserService.getPage();
      const buffer = await page.screenshot({ type: 'png', fullPage: true });
      return {
        image: buffer.toString('base64'),
        mimeType: 'image/png',
        title: await page.title(),
        url: page.url(),
      };
    },
  }),

  extractText: tool({
    description:
      'Extract text content from all elements matching a CSS selector.',
    inputSchema: z.object({
      selector: z
        .string()
        .describe('CSS selector to target elements for text extraction.'),
    }),
    inputExamples: [
      { input: { selector: 'h1' } },
      { input: { selector: 'article p' } },
      { input: { selector: 'table tr' } },
    ],
    strict: true,
    execute: async ({ selector }) => {
      const page = await browserService.getPage();
      const texts = await page.locator(selector).allTextContents();
      return {
        count: texts.length,
        texts,
        url: page.url(),
      };
    },
  }),

  evaluateJs: tool({
    description:
      'Execute arbitrary JavaScript in the page context and return the result. Use for advanced extraction or interaction.',
    inputSchema: z.object({
      expression: z
        .string()
        .describe('JavaScript expression to evaluate in the page context.'),
    }),
    inputExamples: [
      { input: { expression: 'document.title' } },
      {
        input: {
          expression:
            'Array.from(document.querySelectorAll("a")).map(a => ({text: a.textContent, href: a.href})).slice(0, 20)',
        },
      },
    ],
    strict: true,
    execute: async ({ expression }) => {
      const page = await browserService.getPage();
      const result = await page.evaluate(expression);
      return {
        result,
        url: page.url(),
      };
    },
  }),

  getPageInfo: tool({
    description:
      'Get current page metadata: title, URL, and a list of all links on the page.',
    inputSchema: z.object({}),
    inputExamples: [{ input: {} }],
    strict: true,
    execute: async () => {
      const page = await browserService.getPage();
      const links = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]'))
          .map((a) => ({
            text: (a as HTMLAnchorElement).textContent?.trim() || '',
            href: (a as HTMLAnchorElement).href,
          }))
          .filter((l) => l.text && l.href)
          .slice(0, 50)
      );

      return {
        title: await page.title(),
        url: page.url(),
        linkCount: links.length,
        links,
      };
    },
  }),
};

export function createBrowserAgent(
  model: LanguageModel,
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  }
) {
  return new ToolLoopAgent({
    id: 'browser-agent',
    model,
    temperature: generationConfig?.temperature,
    topK: generationConfig?.topK,
    topP: generationConfig?.topP,
    maxOutputTokens: generationConfig?.maxOutputTokens,
    instructions: `You are a Browser Automation Agent powered by Playwright.
  You can navigate web pages, click elements, fill forms, take screenshots, extract text, and run JavaScript in the page context.

  ### OPERATIONAL GUIDELINES:
  1. ALWAYS start by navigating to the target URL before performing any other action.
  2. Use \`getPageInfo\` to understand the page structure (links, title) before clicking or extracting.
  3. Use \`extractText\` for focused content extraction and \`evaluateJs\` for complex DOM queries.
  4. Use \`screenshot\` to capture visual evidence when the user needs to see the page state.
  5. If a click triggers navigation, verify the new page with \`getPageInfo\` before proceeding.
  6. When scraping data, return it in a structured format (tables, lists).

  ### SAFETY GUARDRAILS:
  - NEVER submit forms that create accounts, make purchases, or perform irreversible actions without explicit user confirmation.
  - NEVER enter passwords or sensitive credentials.
  - If a page requires authentication, inform the user and stop.
  
  IMPORTANT: When you have finished, write a clear summary of your findings as your final response.
  This summary will be returned to the main agent, so include all relevant information.`,
    tools: browserAgentTools,
  });
}
