import { useEffect, useState } from 'react'

/**
 * Hook для отримання margin від docked модальних вікон
 * Слухає custom events від BaseModal
 */
export function usePageLayout() {
  const [contentMargin, setContentMargin] = useState<React.CSSProperties>({})

  useEffect(() => {
    const handleMarginChange = (event: Event) => {
      const customEvent = event as CustomEvent<React.CSSProperties>
      setContentMargin(customEvent.detail || {})
    }

    window.addEventListener('modal-margin-change', handleMarginChange)

    return () => {
      window.removeEventListener('modal-margin-change', handleMarginChange)
    }
  }, [])

  return { contentMargin }
}
