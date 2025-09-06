export interface Service {
  id: string
  provider_id: string
  company_id?: string
  title: string
  description: string
  category: string
  status: 'active' | 'draft' | 'archived' | 'pending_approval'
  base_price: number
  currency: string
  cover_image_url?: string
  duration?: string
  deliverables?: string[]
  created_at: string
  updated_at: string
}

export interface ServiceRequirement {
  id: string
  service_id: string
  requirement: string
  is_required: boolean
  order_index: number
  created_at: string
}

export interface ServiceMilestone {
  id: string
  service_id: string
  milestone_title: string
  description: string
  estimated_duration: number // in days
  order_index: number
  is_required: boolean
  created_at: string
  updated_at: string
}

export interface ServicePackage {
  id: string
  service_id: string
  name: string
  price: number
  delivery_days: number
  revisions: number
  features: string[]
  created_at: string
}

export interface CreateServiceFormData {
  // Step 1: Basic Information
  title: string
  description: string
  category: string
  duration: string
  price: string
  deliverables: string[]
  
  // Step 2: Requirements
  requirements: string[]
  
  // Step 3: Milestones Template
  milestones: {
    milestone_title: string
    description: string
    estimated_duration: number
    order_index: number
  }[]
  
  // Step 4: Review & Publish
  status: 'draft' | 'pending_approval'
}

export interface ServiceFormStep {
  id: number
  title: string
  description: string
  isCompleted: boolean
  isActive: boolean
}
