/**
 * Comprehensive signup validation utilities
 */

export interface SignupFormData {
  email: string
  password: string
  confirmPassword: string
  fullName: string
  phone: string
  companyName: string
  role: 'client' | 'provider'
}

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
  warnings: Record<string, string>
}

/**
 * Validates email format and common issues
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email.trim()) {
    return { isValid: false, error: 'Email is required' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' }
  }

  // Check for common typos in popular domains
  const commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com']
  const domain = email.split('@')[1]?.toLowerCase()
  
  if (domain) {
    const typos: Record<string, string> = {
      'gmial.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'gmail.co': 'gmail.com',
      'yahooo.com': 'yahoo.com',
      'yaho.com': 'yahoo.com',
      'outlok.com': 'outlook.com',
      'hotmial.com': 'hotmail.com'
    }
    
    if (typos[domain]) {
      return { isValid: false, error: `Did you mean ${email.replace(domain, typos[domain])}?` }
    }
  }

  return { isValid: true }
}

/**
 * Validates password strength and requirements
 */
export function validatePassword(password: string): { 
  isValid: boolean; 
  error?: string; 
  score: number; 
  feedback: string;
  meetsRequirements: boolean;
} {
  if (!password) {
    return { 
      isValid: false, 
      error: 'Password is required',
      score: 0,
      feedback: 'Very weak',
      meetsRequirements: false
    }
  }

  let score = 0
  let feedback = ''
  
  // Length check
  if (password.length >= 8) score += 1
  else if (password.length < 6) {
    return { 
      isValid: false, 
      error: 'Password must be at least 8 characters long',
      score: 0,
      feedback: 'Very weak',
      meetsRequirements: false
    }
  }
  
  // Character variety checks
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  
  // Common password check
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123', 
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ]
  
  if (commonPasswords.includes(password.toLowerCase())) {
    return { 
      isValid: false, 
      error: 'This password is too common. Please choose a more secure password.',
      score: 0,
      feedback: 'Very weak',
      meetsRequirements: false
    }
  }
  
  const meetsRequirements = score >= 4 && password.length >= 8
  
  if (score === 0) feedback = 'Very weak'
  else if (score === 1) feedback = 'Weak'
  else if (score === 2) feedback = 'Fair'
  else if (score === 3) feedback = 'Good'
  else if (score === 4) feedback = 'Strong'
  else feedback = 'Very strong'
  
  return {
    isValid: meetsRequirements,
    error: meetsRequirements ? undefined : 'Password does not meet security requirements',
    score,
    feedback,
    meetsRequirements
  }
}

/**
 * Validates phone number format
 */
export function validatePhone(phone: string): { isValid: boolean; error?: string } {
  if (!phone.trim()) {
    return { isValid: false, error: 'Phone number is required' }
  }

  // Remove all non-digit characters except +
  const cleanPhone = phone.replace(/[^\d+]/g, '')
  
  // Check for valid international format
  const phoneRegex = /^[\+]?[1-9][\d]{7,14}$/
  if (!phoneRegex.test(cleanPhone)) {
    return { isValid: false, error: 'Please enter a valid phone number (7-15 digits)' }
  }

  // Check for obviously fake numbers
  const fakePatterns = [
    /^(\d)\1{6,}$/, // All same digits
    /^123456789/, // Sequential
    /^000000000/, // All zeros
  ]
  
  if (fakePatterns.some(pattern => pattern.test(cleanPhone))) {
    return { isValid: false, error: 'Please enter a valid phone number' }
  }

  return { isValid: true }
}

/**
 * Validates full name format
 */
export function validateFullName(fullName: string): { isValid: boolean; error?: string } {
  if (!fullName.trim()) {
    return { isValid: false, error: 'Full name is required' }
  }

  const trimmed = fullName.trim()
  
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Full name must be at least 2 characters' }
  }

  if (trimmed.length > 100) {
    return { isValid: false, error: 'Full name must be less than 100 characters' }
  }

  // Check for valid name characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s\-']+$/
  if (!nameRegex.test(trimmed)) {
    return { isValid: false, error: 'Full name can only contain letters, spaces, hyphens, and apostrophes' }
  }

  // Check for at least one space (first and last name)
  if (!trimmed.includes(' ')) {
    return { isValid: false, error: 'Please enter your full name (first and last name)' }
  }

  return { isValid: true }
}

/**
 * Validates company name
 */
export function validateCompanyName(companyName: string): { isValid: boolean; error?: string } {
  if (!companyName.trim()) {
    return { isValid: false, error: 'Company name is required' }
  }

  const trimmed = companyName.trim()
  
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Company name must be at least 2 characters' }
  }

  if (trimmed.length > 200) {
    return { isValid: false, error: 'Company name must be less than 200 characters' }
  }

  // Check for valid company name characters
  const companyRegex = /^[a-zA-Z0-9\s\-'&.,()]+$/
  if (!companyRegex.test(trimmed)) {
    return { isValid: false, error: 'Company name contains invalid characters' }
  }

  return { isValid: true }
}

/**
 * Validates password confirmation
 */
export function validatePasswordConfirmation(password: string, confirmPassword: string): { isValid: boolean; error?: string } {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password' }
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' }
  }

  return { isValid: true }
}

/**
 * Validates captcha token
 */
export function validateCaptcha(captchaToken: string): { isValid: boolean; error?: string } {
  if (!captchaToken) {
    return { isValid: false, error: 'Please complete the captcha verification' }
  }

  // Basic token format validation
  if (captchaToken.length < 10) {
    return { isValid: false, error: 'Invalid captcha token' }
  }

  return { isValid: true }
}

/**
 * Checks if email already exists in the database
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/check-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })
    
    if (!response.ok) {
      console.error('Failed to check email existence:', response.statusText)
      return false // Assume email doesn't exist if check fails
    }
    
    const data = await response.json()
    return data.exists || false
  } catch (error) {
    console.error('Error checking email existence:', error)
    return false // Assume email doesn't exist if check fails
  }
}

/**
 * Comprehensive form validation
 */
export function validateSignupForm(formData: SignupFormData, captchaToken: string): ValidationResult {
  const errors: Record<string, string> = {}
  const warnings: Record<string, string> = {}

  // Email validation
  const emailValidation = validateEmail(formData.email)
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error!
  }

  // Password validation
  const passwordValidation = validatePassword(formData.password)
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error!
  }

  // Password confirmation validation
  const confirmPasswordValidation = validatePasswordConfirmation(formData.password, formData.confirmPassword)
  if (!confirmPasswordValidation.isValid) {
    errors.confirmPassword = confirmPasswordValidation.error!
  }

  // Full name validation
  const fullNameValidation = validateFullName(formData.fullName)
  if (!fullNameValidation.isValid) {
    errors.fullName = fullNameValidation.error!
  }

  // Phone validation
  const phoneValidation = validatePhone(formData.phone)
  if (!phoneValidation.isValid) {
    errors.phone = phoneValidation.error!
  }

  // Company name validation
  const companyNameValidation = validateCompanyName(formData.companyName)
  if (!companyNameValidation.isValid) {
    errors.companyName = companyNameValidation.error!
  }

  // Captcha validation (only required if site key is configured)
  const hasCaptchaKey = typeof window !== 'undefined' 
    ? !!process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY 
    : false
    
  if (hasCaptchaKey && captchaToken) {
    const captchaValidation = validateCaptcha(captchaToken)
    if (!captchaValidation.isValid) {
      errors.captcha = captchaValidation.error!
    }
  } else if (hasCaptchaKey && !captchaToken) {
    // Only show error if captcha is configured but not completed
    errors.captcha = 'Please complete the security verification'
  }

  // Additional warnings
  if (formData.email && formData.email.includes('+')) {
    warnings.email = 'Email aliases (with +) may not work with all email providers'
  }

  if (formData.password && passwordValidation.score < 4) {
    warnings.password = 'Consider using a stronger password for better security'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings
  }
}

/**
 * Sanitizes form data
 */
export function sanitizeSignupForm(formData: SignupFormData): SignupFormData {
  return {
    email: formData.email.trim().toLowerCase(),
    password: formData.password,
    confirmPassword: formData.confirmPassword,
    fullName: formData.fullName.trim(),
    phone: formData.phone.trim(),
    companyName: formData.companyName.trim(),
    role: formData.role
  }
}
