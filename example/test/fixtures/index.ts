/**
 * Provides extension page and background fixtures for the example tests.
 */

import { test as base } from 'playwright-webext';
import { Bg } from './bg';
import { Options } from './options';
import { Popup } from './popup';
import { Welcome } from './welcome';

type Fixtures = {
  options: Options;
  popup: Popup;
  welcome: Welcome;
  bg: Bg;
};

export const test = base.extend<Fixtures>({
  bg: async ({ extension }, use) => use(new Bg(extension)),
  welcome: async ({ extension }, use) => use(new Welcome(extension)),
  popup: async ({ extension }, use) => use(new Popup(extension)),
  options: async ({ extension }, use) => use(new Options(extension)),
});
