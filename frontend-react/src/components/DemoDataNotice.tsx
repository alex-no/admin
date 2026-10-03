import { useTranslation } from 'react-i18next'

/**
 * Плашка «демо-дані» над розділами Аналітика / Логи помилок: усі їхні записи генерує
 * backend/data/fake_analytics.php при старті бекенду, справжні запити сюди не пишуться.
 * Дзеркало Vue: components/DemoDataNotice.vue.
 */
export default function DemoDataNotice() {
  const { t } = useTranslation()
  return (
    <div className="alert alert-warning d-flex align-items-start gap-2 py-2 small mb-3" role="note">
      <i className="bi bi-info-circle mt-1" />
      <span>{t('analytics.demoNotice')}</span>
    </div>
  )
}
