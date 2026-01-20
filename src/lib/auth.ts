/**
 * Authentication middleware for API key validation
 *
 * This middleware validates the X-API-Key header for all protected API endpoints.
 * The API key is stored in the API_KEY environment variable.
 */

export function validateApiKey(req: Request): Response | null {
  // Get the API key from the X-API-Key header
  const apiKey = req.headers.get("X-API-Key")

  // Get the valid API key from environment variable
  const validApiKey = process.env.API_KEY

  // If no API key is configured in env, allow requests (development mode)
  // This allows the app to work without auth in development
  if (!validApiKey) {
    return null
  }

  // If API key is missing, return 401
  if (!apiKey) {
    return Response.json(
      { error: "Unauthorized: API key is required. Provide X-API-Key header." },
      { status: 401 }
    )
  }

  // If API key is invalid, return 401
  if (apiKey !== validApiKey) {
    return Response.json(
      { error: "Unauthorized: Invalid API key." },
      { status: 401 }
    )
  }

  // API key is valid, allow request to proceed
  return null
}
