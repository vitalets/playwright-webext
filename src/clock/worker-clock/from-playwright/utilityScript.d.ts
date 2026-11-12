/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Type-only excerpt from the same Playwright commit as clock.ts.
 * Source: https://github.com/microsoft/playwright/blob/0ea36910324ed8aa2a5f460317cbd35881ee88d4/packages/injected/src/utilityScript.ts
 * Keep this definition in sync when updating clock.ts; no UtilityScript runtime is needed.
 */

export type Builtins = {
  setTimeout: Window['setTimeout'],
  clearTimeout: Window['clearTimeout'],
  setInterval: Window['setInterval'],
  clearInterval: Window['clearInterval'],
  requestAnimationFrame: Window['requestAnimationFrame'],
  cancelAnimationFrame: Window['cancelAnimationFrame'],
  requestIdleCallback: Window['requestIdleCallback'],
  cancelIdleCallback: Window['cancelIdleCallback'],
  performance: Window['performance'],
  Intl: typeof window['Intl'],
  Date: typeof window['Date'],
  AbortSignal: typeof window['AbortSignal'],
  Temporal: typeof window['Temporal'],
};
