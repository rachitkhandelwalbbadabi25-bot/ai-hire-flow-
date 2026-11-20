import { useEffect } from 'react';

const DEFAULT_OG_IMAGE = 'https://www.aihireflow.in/og-image.png';
const DEFAULT_OG_IMAGE_ALT = 'AI HireFlow — Free ATS Resume Checker, Job Finder & Interview Prep';
const DEFAULT_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalPath?: string;
  ogType?: string;
  ogImage?: string;
  ogImageAlt?: string;
  robots?: string;
  jsonLd?: Record<string, any>;
}

export default function SEOHead({
  title,
  description,
  canonicalPath = '',
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE,
  ogImageAlt = DEFAULT_OG_IMAGE_ALT,
  robots = DEFAULT_ROBOTS,
  jsonLd
}: SEOHeadProps) {
  // Normalize canonical URL to strictly use the primary https://www.aihireflow.in domain
  const cleanPath = !canonicalPath || canonicalPath === '/'
    ? '/'
    : canonicalPath.startsWith('/')
      ? canonicalPath.replace(/\/+$/, '')
      : `/${canonicalPath.replace(/\/+$/, '')}`;

  const canonicalUrl = `https://www.aihireflow.in${cleanPath}`;
  const jsonLdString = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    // Scroll to top ONLY on actual route/canonical URL changes, never on local state re-renders
    window.scrollTo(0, 0);
  }, [canonicalUrl]);

  useEffect(() => {
    // 1. Set document title
    document.title = title;

    // Helper for setting meta tags by property or name
    const setMetaTag = (attr: 'property' | 'name', key: string, content: string) => {
      let tag = document.querySelector(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    // 2. Meta Description & Robots
    setMetaTag('name', 'description', description);
    setMetaTag('name', 'robots', robots);

    // 3. Canonical URL
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonicalUrl);

    // 4. Open Graph Tags (including 1200x630 social preview image)
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:site_name', 'AI HireFlow');
    setMetaTag('property', 'og:locale', 'en_US');
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('property', 'og:image:width', '1200');
    setMetaTag('property', 'og:image:height', '630');
    setMetaTag('property', 'og:image:type', 'image/png');
    setMetaTag('property', 'og:image:alt', ogImageAlt);

    // 5. Twitter Card Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:url', canonicalUrl);
    setMetaTag('name', 'twitter:image', ogImage);
    setMetaTag('name', 'twitter:image:alt', ogImageAlt);

    // 6. JSON-LD Schema (replace any previous or pre-rendered JSON-LD cleanly to avoid duplicates)
    if (jsonLdString) {
      document.querySelectorAll('script[type="application/ld+json"]').forEach((node) => {
        if (node.id !== 'seo-jsonld') {
          node.remove();
        }
      });

      let script = document.getElementById('seo-jsonld') as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = 'seo-jsonld';
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = jsonLdString;
    }

    return () => {
      const script = document.getElementById('seo-jsonld');
      if (script) script.remove();
    };
  }, [title, description, canonicalUrl, ogType, ogImage, ogImageAlt, robots, jsonLdString]);

  return null;
}
