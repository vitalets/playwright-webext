/**
 * Records extension-context pages and retains videos according to Playwright Test settings.
 * The `recordVideo` context option enables recording; this module handles `use.video` modes,
 * retries, retention, report attachments, and cleanup for our separately created context.
 * Playwright handles the same lifecycle in its built-in context fixture:
 * https://github.com/microsoft/playwright/blob/v1.62.1/packages/playwright/src/index.ts
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  BrowserContext,
  Page,
  TestInfo,
  PlaywrightWorkerOptions,
  VideoMode,
} from '@playwright/test';

type VideoOptions = PlaywrightWorkerOptions['video'];

/**
 * Prepares video recording for the current test attempt, when enabled.
 */
export async function createVideoRecording(video: VideoOptions, testInfo: TestInfo) {
  const mode = normalizeVideoMode(video);
  if (!shouldRecordVideo(mode, testInfo.retry)) return;

  const dir = await mkdtemp(join(tmpdir(), 'playwright-webext-video-'));
  const pages = new Set<Page>();

  return {
    options: buildRecordingOptions(video, dir),
    track(context: BrowserContext) {
      trackPages(context, pages);
    },
    async finish() {
      try {
        if (shouldRetainVideo(mode, testInfo)) await attachVideos(pages, testInfo);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  };
}

function normalizeVideoMode(video: VideoOptions): VideoMode {
  const mode = typeof video === 'string' ? video : video.mode;
  return mode === 'retry-with-video' ? 'on-first-retry' : mode;
}

function shouldRecordVideo(mode: VideoMode, retry: number) {
  switch (mode) {
    case 'on-first-retry':
      return retry === 1;
    case 'on-all-retries':
      return retry > 0;
    case 'retain-on-first-failure':
      return retry === 0;
    default:
      return ['on', 'retain-on-failure', 'retain-on-failure-and-retries'].includes(mode);
  }
}

function buildRecordingOptions(video: VideoOptions, dir: string) {
  return {
    dir,
    size: typeof video === 'string' ? undefined : video.size,
    showActions: typeof video === 'string' ? undefined : video.show?.actions,
  };
}

function trackPages(context: BrowserContext, pages: Set<Page>) {
  context.pages().forEach((page) => pages.add(page));
  context.on('page', (page) => pages.add(page));
}

function shouldRetainVideo(mode: VideoMode, testInfo: TestInfo) {
  const failed = testInfo.status !== testInfo.expectedStatus;
  return (
    ['on', 'on-first-retry', 'on-all-retries'].includes(mode) ||
    failed ||
    (mode === 'retain-on-failure-and-retries' && testInfo.retry > 0)
  );
}

async function attachVideos(pages: Set<Page>, testInfo: TestInfo) {
  for (const page of pages) {
    const recording = page.video();
    if (recording) {
      await testInfo.attach('video', {
        path: await recording.path(),
        contentType: 'video/webm',
      });
    }
  }
}
