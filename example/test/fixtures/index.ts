/**
 * Provides extension page and background fixtures for the example tests.
 */

import { test as base } from 'playwright-webext';
import { Bg } from './bg';
import { Popup } from './popup';
import { Welcome } from './welcome';

type Fixtures = {
  popup: Popup;
  welcome: Welcome;
  bg: Bg;
};

export const test = base.extend<Fixtures>({
  popup: async ({ extension }, use) => {
    await use(new Popup(extension));
  },
  welcome: async ({ extension }, use) => {
    await use(new Welcome(extension));
  },
  bg: async ({ extension }, use) => {
    await use(new Bg(extension));
  },
});
