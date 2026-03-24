'use client'

import { useState, useEffect } from 'react'

type DarkMode = 'light' | 'auto' | 'dark'

const MODES: DarkMode[] = ['light', 'auto', 'dark']
const MODE_LABELS: Record<DarkMode, string> = {
  light: 'ライト',
  auto:  '自動',
  dark:  'ダーク',
}
const MODE_ICONS: Record<DarkMode, string> = {
  light: '☀️',
  auto:  '🌗',
  dark:  '🌙',
}

function applyDarkMode(mode: DarkMode) {
  const html = document.documentElement
  if (mode === 'dark') {
    html.classList.add('dark')
  } else if (mode === 'light') {
    html.classList.remove('dark')
  } else {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }
}

export default function DarkModeSwitcher() {
  const [mode, setMode] = useState<DarkMode>('auto')

  useEffect(() => {
    const stored = localStorage.getItem('hama-dark-mode') as DarkMode | null
    if (stored && MODES.includes(stored)) setMode(stored)
  }, [])

  const handleClick = () => {
    const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length]
    setMode(next)
    localStorage.setItem('hama-dark-mode', next)
    applyDarkMode(next)
  }

  return (
    <button
      onClick={handleClick}
      className="card hover:shadow-md transition-shadow active:scale-95 text-left w-full"
    >
      <div className="inline-flex p-2 rounded-lg bg-slate-100 text-slate-600 mb-2">
        <span className="text-base leading-none w-5 h-5 flex items-center justify-center">
          {MODE_ICONS[mode]}
        </span>
      </div>
      <p className="font-semibold text-gray-800 text-sm">ダークモード</p>
      <p className="text-xs text-gray-500 mt-0.5">
        現在：{MODE_LABELS[mode]}
        <span className="ml-1 text-indigo-400">（タップで切替）</span>
      </p>
    </button>
  )
}
