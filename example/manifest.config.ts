import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  name: '__MSG_extensionName__',
  description: '__MSG_extensionDescription__',
  version: '1.0.0',
  manifest_version: 3,
  default_locale: 'en',
  permissions: ['storage'],
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  action: {
    default_popup: 'src/popup.html',
    default_title: '__MSG_popupTitle__',
  },
  options_ui: {
    page: 'src/options.html',
    open_in_tab: true,
  },
});
