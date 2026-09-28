/**
 * Keeps task-oriented guides and the hand-written API reference in separate navigation trees.
 */

import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

/**
 * Defines the reading order for the documentation and API navbar entries.
 */
const sidebars: SidebarsConfig = {
  guides: [
    'getting-started/introduction',
    {
      type: 'category',
      label: 'Getting started',
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/configuration',
        'getting-started/writing-tests',
        'getting-started/running-tests',
      ],
    },
    {
      type: 'category',
      label: 'Basics',
      collapsed: false,
      items: ['basics/setup-fixtures', 'basics/using-context', 'basics/configuration'],
    },
    {
      type: 'category',
      label: 'Testing Guides',
      collapsed: false,
      items: [
        'guides/storage',
        'guides/popup',
        'guides/options',
        'guides/welcome-page',
        'guides/side-panel',
        'guides/i18n',
        'guides/migration',
        'guides/uninstall',
      ],
    },
    {
      type: 'category',
      label: 'Advanced',
      collapsed: false,
      items: ['advanced/shared-context', 'advanced/performance'],
    },
  ],
  api: ['api/extension', 'api/storage'],
};

export default sidebars;
