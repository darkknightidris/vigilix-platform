import { NextRequest, NextResponse } from "next/server"

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(request: NextRequest, limit = 10, windowMs = 60000) {
  const ip = request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") || "unknown"
  const key = `${ip}:${request.nextUrl.pathname}`
  const now = Date.now()

  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  entry.count++
  if (entry.count > limit) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        }
      }
    )
  }
  return null
}