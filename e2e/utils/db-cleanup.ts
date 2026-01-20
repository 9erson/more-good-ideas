const BASE_URL = "http://localhost:3000"

export async function cleanupDatabase(): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/test/cleanup`, {
    method: "POST",
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to cleanup database: ${response.status} ${error}`)
  }
}
