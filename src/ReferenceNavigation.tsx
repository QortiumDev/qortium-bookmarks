import { useEffect, type MouseEvent } from 'react';

export const REFERENCE_SECTIONS = [
  ['contract', 'Contract and privacy'],
  ['snapshot', 'Snapshot schema'],
  ['mutations', 'Edits and revisions'],
  ['opening', 'Accounts and links'],
  ['examples', 'Bridge examples'],
] as const;
type SectionId = typeof REFERENCE_SECTIONS[number][0];

/** Keep the hash for the manager collection, even under Core's injected base. */
export function referenceSectionUrl(input: string, id: SectionId) {
  const url = new URL(input, 'http://localhost');
  url.searchParams.set('view', 'developers');
  url.searchParams.set('section', id);
  return `${url.pathname}${url.search}${url.hash}`;
}

function scrollSection() {
  const id = new URL(window.location.href).searchParams.get('section');
  if (!REFERENCE_SECTIONS.some(([section]) => section === id)) return;
  const section = document.getElementById(`reference-${id}`);
  const container = section?.closest<HTMLElement>('.reference-scroll');
  if (section && container) {
    container.scrollTop += section.getBoundingClientRect().top - container.getBoundingClientRect().top
      - (Number.parseFloat(getComputedStyle(section).scrollMarginTop) || 0);
    section.focus({ preventScroll: true });
  }
}

export function ReferenceNavigation() {
  useEffect(() => {
    scrollSection();
    window.addEventListener('popstate', scrollSection);
    return () => window.removeEventListener('popstate', scrollSection);
  }, []);
  function visit(event: MouseEvent<HTMLAnchorElement>, id: SectionId) {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const next = referenceSectionUrl(window.location.href, id);
    if (new URL(window.location.href).searchParams.get('section') !== id) window.history.pushState(window.history.state, '', next);
    scrollSection();
  }
  return <nav aria-label="Developer reference sections" className="reference-toc">
    {REFERENCE_SECTIONS.map(([id, label]) => <a key={id}
      href={referenceSectionUrl(typeof window === 'undefined' ? '/?view=developers' : window.location.href, id)}
      onClick={event => visit(event, id)}>{label}</a>)}
  </nav>;
}
