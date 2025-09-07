export type ServiceTemplate = {
  service: string
  default_milestones: Array<{
    month: number
    title: string
    tasks: string[]
  }>
}

export const defaultTemplates: ServiceTemplate[] = [
  {
    service: 'Digital Marketing',
    default_milestones: [
      { month: 1, title: 'Campaign Setup', tasks: ['Keyword research', 'Account setup'] },
      { month: 2, title: 'Content Calendar', tasks: ['4 posts/week', 'Ad design'] },
      { month: 3, title: 'Performance Report', tasks: ['Analytics', 'Final report'] },
    ]
  }
]


