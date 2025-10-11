/**
 * Service Image Utility
 * Provides professional, high-quality images for different service categories
 */

export interface ServiceImageConfig {
  url: string
  alt: string
  category: string
  description: string
}

export const SERVICE_IMAGES: Record<string, ServiceImageConfig> = {
  'Digital Marketing': {
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=225&fit=crop&crop=center',
    alt: 'Digital Marketing Services - Social media management, SEO, and online advertising',
    category: 'Digital Marketing',
    description: 'Professional digital marketing services including social media management, SEO optimization, and online advertising campaigns'
  },
  'Legal Services': {
    url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=225&fit=crop&crop=center',
    alt: 'Legal Services - Business law, contracts, and legal consultation',
    category: 'Legal Services',
    description: 'Comprehensive legal services for businesses including contract review, legal consultation, and compliance support'
  },
  'Accounting': {
    url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=225&fit=crop&crop=center',
    alt: 'Accounting Services - Bookkeeping, tax preparation, and financial consulting',
    category: 'Accounting',
    description: 'Professional accounting services including bookkeeping, tax preparation, and financial consulting for businesses'
  },
  'IT Services': {
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=225&fit=crop&crop=center',
    alt: 'IT Services - Technical support, system administration, and cybersecurity',
    category: 'IT Services',
    description: 'Comprehensive IT services including technical support, system administration, and cybersecurity solutions'
  },
  'Design & Branding': {
    url: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&h=225&fit=crop&crop=center',
    alt: 'Design & Branding - Logo design, graphic design, and brand identity',
    category: 'Design & Branding',
    description: 'Creative design services including logo design, graphic design, and comprehensive brand identity development'
  },
  'Consulting': {
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=225&fit=crop&crop=center',
    alt: 'Business Consulting - Strategic planning, process optimization, and growth consulting',
    category: 'Consulting',
    description: 'Strategic business consulting services including process optimization, growth planning, and operational efficiency'
  },
  'Translation': {
    url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=225&fit=crop&crop=center',
    alt: 'Translation Services - Document translation, interpretation, and localization',
    category: 'Translation',
    description: 'Professional translation services including document translation, interpretation, and business localization'
  },
  'HR Services': {
    url: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=225&fit=crop&crop=center',
    alt: 'HR Services - Recruitment, training, and human resources management',
    category: 'HR Services',
    description: 'Comprehensive HR services including recruitment, employee training, and human resources management'
  },
  'Web Development': {
    url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=225&fit=crop&crop=center',
    alt: 'Web Development - Custom websites, e-commerce, and web applications',
    category: 'Web Development',
    description: 'Professional web development services including custom websites, e-commerce solutions, and web applications'
  },
  'Content Creation': {
    url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=225&fit=crop&crop=center',
    alt: 'Content Creation - Blog writing, copywriting, and content marketing',
    category: 'Content Creation',
    description: 'Creative content services including blog writing, copywriting, and comprehensive content marketing strategies'
  },
  'Marketing': {
    url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=225&fit=crop&crop=center',
    alt: 'Marketing Services - Campaign development, market research, and brand promotion',
    category: 'Marketing',
    description: 'Comprehensive marketing services including campaign development, market research, and brand promotion strategies'
  },
  'Finance': {
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=225&fit=crop&crop=center',
    alt: 'Financial Services - Investment advice, financial planning, and wealth management',
    category: 'Finance',
    description: 'Professional financial services including investment advice, financial planning, and wealth management solutions'
  },
  'Real Estate': {
    url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=225&fit=crop&crop=center',
    alt: 'Real Estate Services - Property management, sales, and investment consulting',
    category: 'Real Estate',
    description: 'Comprehensive real estate services including property management, sales, and investment consulting'
  },
  'Healthcare': {
    url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=225&fit=crop&crop=center',
    alt: 'Healthcare Services - Medical consulting, health management, and wellness programs',
    category: 'Healthcare',
    description: 'Professional healthcare services including medical consulting, health management, and wellness programs'
  },
  'Education': {
    url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=225&fit=crop&crop=center',
    alt: 'Education Services - Training programs, educational consulting, and skill development',
    category: 'Education',
    description: 'Educational services including training programs, educational consulting, and professional skill development'
  }
}

/**
 * Get a professional service image for a given category
 */
export function getServiceImage(category: string, title?: string): ServiceImageConfig {
  // Try to find exact category match
  if (SERVICE_IMAGES[category]) {
    return SERVICE_IMAGES[category]
  }

  // Try to find partial match
  const normalizedCategory = (category || '').toLowerCase()
  for (const [key, config] of Object.entries(SERVICE_IMAGES)) {
    if (key.toLowerCase().includes(normalizedCategory) || normalizedCategory.includes(key.toLowerCase())) {
      return config
    }
  }

  // Try to match based on title keywords
  if (title) {
    const titleLower = (title || '').toLowerCase()
    for (const [key, config] of Object.entries(SERVICE_IMAGES)) {
      const keywords = key.toLowerCase().split(' ')
      if (keywords.some(keyword => titleLower.includes(keyword))) {
        return config
      }
    }
  }

  // Default fallback
  return {
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=225&fit=crop&crop=center',
    alt: `${category} Services - Professional business services in Oman`,
    category: category,
    description: `Professional ${category.toLowerCase()} services for businesses in Oman`
  }
}

/**
 * Get all available service categories with their images
 */
export function getAllServiceCategories(): ServiceImageConfig[] {
  return Object.values(SERVICE_IMAGES)
}

/**
 * Get service image with fallback handling
 */
export function getServiceImageWithFallback(
  category: string, 
  title?: string, 
  customImageUrl?: string
): ServiceImageConfig {
  // If custom image is provided, use it
  if (customImageUrl) {
    return {
      url: customImageUrl,
      alt: `${title || category} - ${category} service`,
      category: category,
      description: `Professional ${category.toLowerCase()} services`
    }
  }

  // Otherwise, get the appropriate service image
  return getServiceImage(category, title)
}

/**
 * Generate a service card image URL with proper sizing
 */
export function getServiceCardImageUrl(
  category: string, 
  title?: string, 
  customImageUrl?: string,
  width: number = 400,
  height: number = 225
): string {
  const config = getServiceImageWithFallback(category, title, customImageUrl)
  
  // Add size parameters to Unsplash URLs
  if (config.url.includes('unsplash.com')) {
    try {
      const url = new URL(config.url)
      url.searchParams.set('w', width.toString())
      url.searchParams.set('h', height.toString())
      url.searchParams.set('fit', 'crop')
      url.searchParams.set('crop', 'center')
      url.searchParams.set('q', '80') // Add quality parameter
      url.searchParams.set('auto', 'format') // Auto format optimization
      return url.toString()
    } catch (error) {
      console.warn('Failed to construct Unsplash URL:', error)
      // Fallback to a reliable default image
      return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=225&fit=crop&crop=center&q=80&auto=format'
    }
  }
  
  return config.url
}
