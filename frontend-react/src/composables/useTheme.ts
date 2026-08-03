// Copyright (c) 2026 Oleksandr Nosov. MIT License.

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'admin.theme'
const MODES = ['light', 'dark', 'auto'] as const

type ThemeMode = typeof MODES[number]

function read(): ThemeMode {
  const v = localStorage.getItem(STORAGE_KEY)
  return MODES.includes(v as ThemeMode) ? (v as ThemeMode) : 'auto'
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolved(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'auto' ? (systemPrefersDark() ? 'dark' : 'light') : mode
}

function apply(mode: ThemeMode): void {
  document.documentElement.setAttribute('data-bs-theme', resolved(mode))
}

/**
 * Перемикач тёмної теми (light / dark / auto).
 *
 * ⚠️ STORAGE_KEY ('admin.theme') мусить збігатись з ключем в index.html —
 * там той самий скрипт для анти-блимання.
 */
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(read)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode)
    apply(mode)
  }, [mode])

  // У режимі auto слухаємо системну тему
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (mode === 'auto') apply(mode)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  function cycle() {
    setMode((prev) => MODES[(MODES.indexOf(prev) + 1) % MODES.length])
  }

  return { mode, resolved: resolved(mode), cycle }
}
