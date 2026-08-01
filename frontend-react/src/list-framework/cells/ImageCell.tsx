import type { CellProps } from '../types'

// Адреса приходить з БД/сховища. Пропускаємо лише http(s), протокол-відносні,
// корене-відносні (`/storage/...`) і data:image — щоб у src не поїхало щось
// стороннє з імпортованих даних.
const SAFE_SRC = /^(https?:\/\/|\/\/|\/|data:image\/)/i

/**
 * Мініатюра за URL у полі рядка. Редагування немає: завантаження файлу — це
 * форма, а не комірка таблиці. Дзеркало Vue: cells/ImageCell.vue.
 */
export default function ImageCell({ field, value }: CellProps) {
  const src = String(value ?? '').trim()

  if (!src || !SAFE_SRC.test(src)) {
    return <span className="text-muted">{field.emptyLabel ?? '—'}</span>
  }

  const size = field.imageSize ?? '40px'

  return (
    <img
      src={src}
      alt={field.label ?? ''}
      loading="lazy"
      style={{ width: size, height: size, objectFit: 'cover', borderRadius: '4px' }}
    />
  )
}
