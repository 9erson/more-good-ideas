export type Topic = {
  id: string
  name: string
  description: string | null
  isArchived: boolean
  ideaCount: number
  tags: string[]
  createdAt: string
  updatedAt: string
}

export type Idea = {
  id: string
  topicId: string
  name: string
  description: string | null
  isArchived: boolean
  tags: string[]
  feedback?: {
    rating: number
    notes: string | null
  }
  createdAt: string
  updatedAt: string
}
