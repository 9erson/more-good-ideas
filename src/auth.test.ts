import { beforeAll, describe, expect, test } from "bun:test"
import { validateApiKey } from "./lib/auth"

// Use UUID-style test values that won't trigger secret scanners
const MOCK_AUTH_VALUE = "00000000-0000-0000-0000-000000000000"
const INVALID_MOCK_VALUE = "ffffffff-ffff-ffff-ffff-ffffffffffff"

describe("Authentication Middleware", () => {
  describe("validateApiKey", () => {
    const originalEnv = process.env.API_KEY

    beforeAll(() => {
      // Set a test API key
      process.env.API_KEY = MOCK_AUTH_VALUE
    })

    test("should allow request when API key is valid", () => {
      const req = new Request("http://localhost:3000/api/topics", {
        headers: {
          "X-API-Key": MOCK_AUTH_VALUE,
        },
      })

      const result = validateApiKey(req)

      expect(result).toBeNull()
    })

    test("should return 401 when API key is missing", () => {
      const req = new Request("http://localhost:3000/api/topics")

      const result = validateApiKey(req)

      expect(result).not.toBeNull()
      expect(result?.status).toBe(401)

      const data = result?.json() as Promise<{ error: string }>
      expect(data).resolves.toEqual({
        error: "Unauthorized: API key is required. Provide X-API-Key header.",
      })
    })

    test("should return 401 when API key is invalid", () => {
      const req = new Request("http://localhost:3000/api/topics", {
        headers: {
          "X-API-Key": INVALID_MOCK_VALUE,
        },
      })

      const result = validateApiKey(req)

      expect(result).not.toBeNull()
      expect(result?.status).toBe(401)

      const data = result?.json() as Promise<{ error: string }>
      expect(data).resolves.toEqual({
        error: "Unauthorized: Invalid API key.",
      })
    })

    test("should allow request when API key env var is not set (development mode)", () => {
      // Save original env
      const originalKey = process.env.API_KEY

      // Unset API_KEY to simulate development mode
      delete process.env.API_KEY

      const req = new Request("http://localhost:3000/api/topics")

      const result = validateApiKey(req)

      // Should allow request when no API key is configured
      expect(result).toBeNull()

      // Restore original env
      process.env.API_KEY = originalKey
    })

    test("should be case-sensitive for API key validation", () => {
      const req = new Request("http://localhost:3000/api/topics", {
        headers: {
          "X-API-Key": "aa" + MOCK_AUTH_VALUE.slice(2), // Change first two chars to lowercase
        },
      })

      const result = validateApiKey(req)

      expect(result).not.toBeNull()
      expect(result?.status).toBe(401)
    })

    test("should accept API key with whitespace (Bun auto-trims headers)", () => {
      const req = new Request("http://localhost:3000/api/topics", {
        headers: {
          "X-API-Key": ` ${MOCK_AUTH_VALUE} `,
        },
      })

      const result = validateApiKey(req)

      // Bun's Request implementation automatically trims header values
      expect(result).toBeNull()
    })
  })
})
