/**
 * Displays the approved project identity as the introduction heading.
 */

import useBaseUrl from '@docusaurus/useBaseUrl';

/**
 * Pairs the project name with its logo on the page background.
 */
export default function ProjectBrand() {
  const logoUrl = useBaseUrl('/img/brand/logo.svg');

  return (
    <h1 className="brand-lockup">
      <img src={logoUrl} alt="" width="88" height="88" />
      <span className="brand-wordmark">playwright-webext</span>
    </h1>
  );
}
