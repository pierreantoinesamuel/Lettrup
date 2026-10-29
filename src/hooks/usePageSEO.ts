import { useEffect } from 'react';

/**
 * Keeps document.title, the description meta tag, and the canonical link
 * in sync on client-side navigation. server.ts's renderHtmlWithSeo already
 * produces correct tags for the initial SSR response, but React Router
 * navigations after hydration never re-run it, so without this every public
 * page keeps whichever page's title/meta the user first landed on
 * (security/SEO audit 3.5).
 */
export interface PageSEOOptions {
  title: string;
  description?: string;
  /** Path only, e.g. "/templates" — origin is read from window.location. */
  canonicalPath?: string;
}

function setMetaByAttr(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function usePageSEO({ title, description, canonicalPath }: PageSEOOptions): void {
  useEffect(() => {
    document.title = title;
    setMetaByAttr('property', 'og:title', title);

    if (description) {
      setMetaByAttr('name', 'description', description);
      setMetaByAttr('property', 'og:description', description);
    }

    if (canonicalPath) {
      const href = `${window.location.origin}${canonicalPath}`;
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
      setMetaByAttr('property', 'og:url', href);
    }
  }, [title, description, canonicalPath]);
}
