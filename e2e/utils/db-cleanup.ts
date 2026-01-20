const BASE_URL = "http://localhost:3000"

// Test API key - must match what's set in the test environment
const TEST_API_KEY = process.env.API_KEY || "test-api-key-for-e2e"

export async function cleanupDatabase(): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/test/cleanup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": TEST_API_KEY,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to cleanup database: ${response.status} ${error}`)
  }
}
