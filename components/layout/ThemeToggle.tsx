"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setTheme("light")}
        className={`rounded-lg border p-2 ${
          theme === "light"
            ? "bg-blue-600 text-white"
            : ""
        }`}
      >
        <Sun size={16} />
      </button>

      <button
        onClick={() => setTheme("dark")}
        className={`rounded-lg border p-2 ${
          theme === "dark"
            ? "bg-blue-600 text-white"
            : ""
        }`}
      >
        <Moon size={16} />
      </button>

      <button
        onClick={() => setTheme("system")}
        className={`rounded-lg border p-2 ${
          theme === "system"
            ? "bg-blue-600 text-white"
            : ""
        }`}
      >
        <Monitor size={16} />
      </button>
    </div>
  )
}