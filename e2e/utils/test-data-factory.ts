let counter = 0

export function createTopicData(
  overrides: Partial<{ name: string; description: string; tags: string[] }> = {}
) {
  counter++
  return {
    name: `Test Topic ${counter}`,
    description: `Test topic description ${counter}`,
    tags: [],
    ...overrides,
  }
}

export function createIdeaData(
  topicId: string,
  overrides: Partial<{ name: string; description: string; tags: string[] }> = {}
) {
  counter++
  return {
    topicId,
    name: `Test Idea ${counter}`,
    description: `Test idea description ${counter}`,
    tags: [],
    ...overrides,
  }
}

export function createTagData(name?: string) {
  counter++
  return name || `tag-${counter}`
}

export function createFeedbackData(overrides: Partial<{ rating: number; notes: string }> = {}) {
  return {
    rating: Math.floor(Math.random() * 5) + 1,
    notes: `Test feedback notes ${counter}`,
    ...overrides,
  }
}
