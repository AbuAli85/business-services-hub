import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://marketing.thedigitalmorph.com'
  const staticPaths = [
    '',
    '/services',
    '/contact',
    '/privacy',
    '/terms',
    '/about',
    '/press',
    '/careers',
    '/blog',
  ]

  const now = new Date().toISOString()
  return staticPaths.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: path === '' ? 1 : 0.7,
  }))
}


