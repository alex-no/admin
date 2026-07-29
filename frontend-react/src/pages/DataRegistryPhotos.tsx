import { useEffect, useRef, useState } from 'react'
import { apiGet, apiPost, apiPatch, apiDelete, apiUpload } from '@/utils/api'
import { notify } from '@/hooks/useNotify'
import { deleteWithUndo } from '@/hooks/useUndoableDelete'

interface Photo {
  id: number
  url: string
  caption: string | null
  is_cover: boolean
}

interface DataRegistryPhotosProps {
  stoId: number
}

// Збігається з upload_max_filesize на бекенді (docker/php-uploads.ini) і з
// MAX_URL_FETCH_BYTES у AdminStoMediaController. Перевіряємо на клієнті, бо PHP
// відкидає завеликий POST ще до коду застосунку — і замість JSON з поясненням
// повертається HTML-сторінка помилки, з якої нічого не витягнеш.
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

/**
 * Фото картки: аплоад з диска або за URL. Своїх кнопок "Зберегти" немає —
 * кожна дія (аплоад / обкладинка / підпис / видалення) зберігається одразу.
 */
export default function DataRegistryPhotos({ stoId }: DataRegistryPhotosProps) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showUrlUpload, setShowUrlUpload] = useState(false)
  const [photoUrl, setPhotoUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setLoadError('')

    apiGet(`/admin/sto/${stoId}/media`)
      .then(res => {
        if (alive) setPhotos(res.data ?? [])
      })
      .catch(err => {
        if (alive) setLoadError(err instanceof Error ? err.message : 'Не вдалося завантажити фото')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => { alive = false }
  }, [stoId])

  const uploadFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = '' // щоб повторний вибір того самого файлу теж спрацював
    if (!files.length) return

    setUploading(true)
    // Один невдалий файл не має зривати решту пачки.
    for (const file of files) {
      if (file.size > MAX_UPLOAD_BYTES) {
        notify(
          `${file.name}: файл завеликий — ${formatBytes(file.size)}, максимум ${formatBytes(MAX_UPLOAD_BYTES)}`,
          { type: 'error' }
        )
        continue
      }

      const form = new FormData()
      form.append('photo', file)
      try {
        const res = await apiUpload(`/admin/sto/${stoId}/media`, form)
        setPhotos(prev => [...prev, res.data])
      } catch (err) {
        notify(
          `${file.name}: ${err instanceof Error ? err.message : 'помилка завантаження'}`,
          { type: 'error' }
        )
      }
    }
    setUploading(false)
  }

  const uploadFromUrl = async () => {
    const url = photoUrl.trim()
    if (!url) return

    setUploading(true)
    try {
      const res = await apiPost(`/admin/sto/${stoId}/media/from-url`, { url })
      setPhotos(prev => [...prev, res.data])
      setPhotoUrl('')
      setShowUrlUpload(false)
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Помилка завантаження', { type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const setCover = async (photo: Photo) => {
    const prev = photos
    setPhotos(list => list.map(p => ({ ...p, is_cover: p.id === photo.id })))
    try {
      await apiPatch(`/admin/sto/${stoId}/media/${photo.id}`, { is_cover: true })
    } catch (err) {
      setPhotos(prev)
      notify(err instanceof Error ? err.message : 'Не вдалося змінити обкладинку', { type: 'error' })
    }
  }

  const updateCaption = async (photo: Photo, caption: string) => {
    if (caption === (photo.caption ?? '')) return

    const prev = photos
    setPhotos(list => list.map(p => (p.id === photo.id ? { ...p, caption } : p)))
    try {
      await apiPatch(`/admin/sto/${stoId}/media/${photo.id}`, { caption })
    } catch (err) {
      setPhotos(prev)
      notify(err instanceof Error ? err.message : 'Не вдалося зберегти підпис', { type: 'error' })
    }
  }

  const removePhoto = (photo: Photo) => {
    const index = photos.findIndex(p => p.id === photo.id)
    if (index === -1) return

    deleteWithUndo({
      message: 'Фото видалено',
      remove: () => setPhotos(list => list.filter(p => p.id !== photo.id)),
      restore: () => setPhotos(list => {
        const restored = [...list]
        restored.splice(index, 0, photo)
        return restored
      }),
      commit: async () => {
        await apiDelete(`/admin/sto/${stoId}/media/${photo.id}`)
      },
    })
  }

  return (
    <div>
      {/* Панель аплоаду */}
      <div className="mb-3">
        <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            <i className="bi bi-upload me-1" />
            Завантажити фото
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            style={{ display: 'none' }}
            onChange={uploadFiles}
          />
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setShowUrlUpload(v => !v)}
          >
            <i className="bi bi-link-45deg me-1" />
            Завантажити з URL
          </button>
          {uploading && (
            <span className="text-muted small">
              <span className="spinner-border spinner-border-sm me-1" />
              Завантаження...
            </span>
          )}
        </div>

        {showUrlUpload && (
          <div className="card border-secondary" style={{ maxWidth: '600px' }}>
            <div className="card-body p-3">
              <div className="mb-2">
                <label className="form-label small mb-1">URL зображення</label>
                <input
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      uploadFromUrl()
                    }
                  }}
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="https://example.com/image.jpg"
                />
                <div className="text-muted small mt-1">
                  Підтримуються формати: JPG, PNG, WebP. Максимум {formatBytes(MAX_UPLOAD_BYTES)}.
                </div>
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={!photoUrl.trim() || uploading}
                  onClick={uploadFromUrl}
                >
                  <i className="bi bi-download me-1" />
                  Завантажити
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => { setShowUrlUpload(false); setPhotoUrl('') }}
                >
                  Скасувати
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Галерея */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" />
        </div>
      )}

      {!loading && loadError && (
        <div className="alert alert-danger py-2 small">{loadError}</div>
      )}

      {!loading && !loadError && photos.length === 0 && (
        <div className="text-muted text-center py-5">
          <i className="bi bi-images" style={{ fontSize: '2rem' }} />
          <div className="mt-2">Фото відсутні</div>
        </div>
      )}

      {!loading && !loadError && photos.length > 0 && (
        <div className="row g-3">
          {photos.map(photo => (
            <div key={photo.id} className="col-6 col-md-4">
              <div className={`card h-100 shadow-sm ${photo.is_cover ? 'border-primary' : ''}`}>
                <div className="position-relative">
                  <img
                    src={photo.url}
                    alt={photo.caption ?? ''}
                    className="card-img-top"
                    style={{ width: '100%', height: '140px', objectFit: 'cover', cursor: 'pointer' }}
                    onClick={() => window.open(photo.url, '_blank')}
                    loading="lazy"
                  />
                  {photo.is_cover && (
                    <span
                      className="badge bg-primary position-absolute"
                      style={{ top: '6px', left: '6px', fontSize: '.65rem' }}
                    >
                      <i className="bi bi-star-fill me-1" />
                      Обкладинка
                    </span>
                  )}
                </div>
                <div className="card-body p-2">
                  <input
                    defaultValue={photo.caption ?? ''}
                    key={`caption-${photo.id}-${photo.caption ?? ''}`}
                    type="text"
                    className="form-control form-control-sm mb-2"
                    placeholder="Підпис..."
                    onBlur={(e) => updateCaption(photo, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                    }}
                  />
                  <div className="d-flex gap-1">
                    {!photo.is_cover && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary py-0 px-1 flex-fill"
                        title="Зробити обкладинкою"
                        onClick={() => setCover(photo)}
                      >
                        <i className="bi bi-star" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger py-0 px-1 flex-fill"
                      title="Видалити"
                      onClick={() => removePhoto(photo)}
                    >
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
