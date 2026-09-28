/**
 * Configures the public documentation site independently of the package build.
 */

import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

/**
 * Uses the publishing branch for edit links in deployed documentation.
 */
const sourceBranch = process.env.GITHUB_REF_NAME === 'docs' ? 'docs' : 'main';

/**
 * Serves guides and API reference at the repository's GitHub Pages URL.
 */
const config: Config = {
  title: 'playwright-webext',
  favicon: 'img/brand/logo.svg',
  tagline: 'Test your browser extension with Playwright',
  url: 'https://vitalets.github.io',
  baseUrl: '/playwright-webext/',
  organizationName: 'vitalets',
  projectName: 'playwright-webext',
  trailingSlash: true,
  onBrokenLinks: 'throw',
  markdown: { hooks: { onBrokenMarkdownLinks: 'throw' } },
  i18n: { defaultLocale: 'en', locales: ['en'] },
  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        docsDir: 'content',
        docsRouteBasePath: '/',
        language: 'en',
        hashed: 'filename',
        indexBlog: false,
        indexPages: false,
        searchBarPosition: 'right',
      },
    ],
  ],
  presets: [
    [
      'classic',
      {
        docs: {
          path: 'content',
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: `https://github.com/vitalets/playwright-webext/edit/${sourceBranch}/website/`,
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    colorMode: { respectPrefersColorScheme: true },
    navbar: {
      title: 'playwright-webext',
      logo: { alt: 'playwright-webext logo', src: 'img/brand/logo.svg' },
      items: [
        { type: 'docSidebar', sidebarId: 'guides', label: 'Docs', position: 'left' },
        { type: 'docSidebar', sidebarId: 'api', label: 'API', position: 'left' },
        { type: 'search', position: 'right' },
        {
          href: 'https://www.npmjs.com/package/playwright-webext',
          label: 'npm',
          position: 'right',
        },
        {
          href: 'https://github.com/vitalets/playwright-webext',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} <a href="https://vitalets.github.io/">Vitaliy Potapov</a>. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
