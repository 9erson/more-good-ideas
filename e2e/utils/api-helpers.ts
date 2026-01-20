const BASE_URL = "http://localhost:3000"

export type Topic = {
  id: string
  name: string
  description: string | null
  isArchived: boolean
  ideaCount?: number
  tags: string[]
  createdAt: string
  updatedAt: string
  ideas?: Idea[]
}

export type Idea = {
  id: string
  topicId: string
  topicName?: string
  name: string
  description: string | null
  isArchived: boolean
  tags: string[]
  feedback?: { rating: number; notes: string | null }
  createdAt: string
  updatedAt: string
}

export type TopicInput = {
  name: string
  description?: string
  tags?: string[]
}

export type IdeaInput = {
  topicId: string
  name: string
  description?: string
  tags?: string[]
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Request failed: ${response.status} ${error}`)
  }

  return response.json() as Promise<T>
}

export async function fetchTopics(): Promise<Topic[]> {
  return request<Topic[]>("/api/topics")
}

export async function createTopic(data: TopicInput): Promise<Topic> {
  return request<Topic>("/api/topics", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function fetchTopic(id: string): Promise<Topic & { ideas: Idea[] }> {
  return request<Topic & { ideas: Idea[] }>(`/api/topics/${id}`)
}

export async function updateTopic(id: string, data: TopicInput): Promise<Topic> {
  return request<Topic>(`/api/topics/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export async function deleteTopic(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/api/topics/${id}`, {
    method: "DELETE",
  })
}

export async function createIdea(data: IdeaInput): Promise<Idea> {
  return request<Idea>("/api/ideas", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function fetchIdea(id: string): Promise<Idea> {
  return request<Idea>(`/api/ideas/${id}`)
}

export async function fetchTags(): Promise<string[]> {
  return request<string[]>("/api/tags")
}
