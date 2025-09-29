export const messages = {
  required: 'This field is required.',
  email: 'Please enter a valid email address.',
  minLength: (n: number) => `Must be at least ${n} characters.`,
  maxLength: (n: number) => `Must be at most ${n} characters.`,
  number: 'Please enter a valid number.',
}

export function applyStatus(error?: string, touched?: boolean) {
  if (!touched) return undefined
  if (error) return 'error'
  return 'success'
}


