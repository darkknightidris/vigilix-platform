"use client"
import { useEffect } from "react"

export default function KeepAlive() {
  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL
    if (!API) return
    const ping = () => fetch(`${API}/`).catch(() => {})
    ping()
    const interval = setInterval(ping, 8 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])
  return null
}