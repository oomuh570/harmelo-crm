export type Tag = {
  id: string
  name: string
  contactCount: number
}

export const SAMPLE_TAGS: Tag[] = [
  { id: 't1', name: 'VIP', contactCount: 42 },
  { id: 't2', name: 'Lead', contactCount: 18 },
  { id: 't3', name: 'Strategic', contactCount: 7 },
  { id: 't4', name: 'Inactive', contactCount: 3 },
]
