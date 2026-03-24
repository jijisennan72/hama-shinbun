'use client'

import { useState, useEffect } from 'react'

type FontSize = 'standard' | 'large' | 'xlarge'

const SIZES: FontSize[] = ['standard', 'large', 'xlarge']
const SIZE_LABELS: Record<FontSize, string> = {
  standard: '標準',
  large: '大',
  xlarge: '特大',
}
const SIZE_CLASSES: Record<FontSize, string> = {
  standard: '',
  large: 'font-large',
  xlarge: 'font-xlarge',
}

function applyFontSize(size: FontSize) {
  const html = document.documentElement
  html.classList.remove('font-large', 'font-xlarge')
  if (SIZE_CLASSES[size]) html.classList.add(SIZE_CLASSES[size])
}

export default function FontSizeSwitcher() {
  const [size, setSize] = useState<FontSize>('standard')

  useEffect(() => {
    const stored = localStorage.getItem('hama-font-size') as FontSize | null
    if (stored && SIZES.includes(stored)) setSize(stored)
  }, [])

  const handleClick = () => {
    const next = SIZES[(SIZES.indexOf(size) + 1) % SIZES.length]
    setSize(next)
    localStorage.setItem('hama-font-size', next)
    applyFontSize(next)
  }

  return (
    <button
      onClick={handleClick}
      className="card hover:shadow-md transition-shadow active:scale-95 text-left w-full"
    >
      <div className="inline-flex p-2 rounded-lg bg-indigo-100 text-indigo-600 mb-2">
        <span className="text-base font-bold leading-none w-5 h-5 flex items-center justify-center">あ</span>
      </div>
      <p className="font-semibold text-gray-800 text-sm">文字サイズ</p>
      <p className="text-xs text-gray-500 mt-0.5">
        現在：{SIZE_LABELS[size]}
        <span className="ml-1 text-indigo-400">（タップで切替）</span>
      </p>
    </button>
  )
}
