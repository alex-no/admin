import { useEffect, useRef } from 'react'

/**
 * Попередження про незбережені зміни.
 *
 * Дві частини:
 *  - beforeunload: браузер питає при закритті/перезавантаженні вкладки
 *  - confirmClose(): підтвердження при закритті картки всередині застосунку
 *
 * hasChanges тримаємо в ref, щоб обробник beforeunload завжди бачив свіже
 * значення і при цьому не перевішувався на кожен рендер.
 */
export function useUnsavedChanges(hasChanges: boolean) {
  const hasChangesRef = useRef(hasChanges)
  hasChangesRef.current = hasChanges

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasChangesRef.current) return
      e.preventDefault()
      e.returnValue = '' // Chrome вимагає саме це
      return ''
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  /** true — можна закривати (змін немає або користувач підтвердив) */
  const confirmClose = (
    message = 'Є незбережені зміни. Закрити без збереження?'
  ): boolean => !hasChangesRef.current || confirm(message)

  return { confirmClose }
}
