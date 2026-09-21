import { useEffect } from 'react';

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalPath?: string;
  ogType?: string;
  jsonLd?: Record<string, any>;
}

export default function SEOHead({
  title,
  description,
  canonicalPath = '',
  ogType = 'website',
  jsonLd
}: SEOHeadProps) {
  // Normalize canonical URL to strictly use the primary https://www.aihireflow.in domain
  const cleanPath = !canonicalPath || canonicalPath === '/'
    ? '/'
    : canonicalPath.startsWith('/')
      ? canonicalPath.replace(/\/+$/, '')
      : `/${canonicalPath.replace(/\/+$/, '')}`;

  const canonicalUrl = `https://www.aihireflow.in${cleanPath}`;

  useEffect(() => {
    // 1. Set document title
    document.title = title;

    // 2. Set Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    // 3. Set Canonical URL
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonicalUrl);

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

    // 4. Open Graph Tags
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:site_name', 'AI HireFlow');

    // 5. Twitter Card Tags
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:url', canonicalUrl);

    // 6. JSON-LD Schema
    const existingScript = document.getElementById('seo-jsonld');
    if (existingScript) {
      existingScript.remove();
    }

    if (jsonLd) {
      const script = document.createElement('script');
      script.id = 'seo-jsonld';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    // Scroll to top on SEO page route transition
    window.scrollTo(0, 0);

    return () => {
      const script = document.getElementById('seo-jsonld');
      if (script) script.remove();
    };
  }, [title, description, canonicalUrl, ogType, jsonLd]);

  return null;
}
