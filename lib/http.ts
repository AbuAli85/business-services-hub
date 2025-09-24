export function jsonError(
  status: 400 | 401 | 403 | 404 | 422 | 429 | 500,
  code: string,
  message: string,
  details?: unknown
) {
  return Response.json({ error: { code, message, details } }, { status })
}


