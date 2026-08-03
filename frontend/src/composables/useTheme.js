// Copyright (c) 2026 Oleksandr Nosov. MIT License.

import { ref, watch } from 'vue'

const STORAGE_KEY = 'admin.theme'
const MODES = ['light', 'dark', 'auto']

// Модульний singleton — той самий підхід, що useAuth.js / useNotify.js.
const mode = ref(read())

function read() {
  const v = localStorage.getItem(STORAGE_KEY)
  return MODES.includes(v) ? v : 'auto'
}

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolved() {
  return mode.value === 'auto' ? (systemPrefersDark() ? 'dark' : 'light') : mode.value
}

function apply() {
  document.documentElement.setAttribute('data-bs-theme', resolved())
}

watch(mode, (v) => { localStorage.setItem(STORAGE_KEY, v); apply() })

// У режимі auto слухаємо системну тему — інакше адмін перемкне тему ОС і
// побачить зміну лише після F5.
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (mode.value === 'auto') apply()
})

/**
 * Перемикач тёмної теми (light / dark / auto).
 *
 * ⚠️ STORAGE_KEY ('admin.theme') мусить збігатись з ключем в index.html —
 * там той самий скрипт для анти-блимання.
 */
export function useTheme() {
  function cycle() {
    mode.value = MODES[(MODES.indexOf(mode.value) + 1) % MODES.length]
  }
  return { mode, resolved, cycle, apply }
}
