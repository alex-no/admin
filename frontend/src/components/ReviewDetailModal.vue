<!-- Copyright (c) 2026 Oleksandr Nosov. MIT License. -->
<template>
  <BaseModal
    v-model:visible="visible"
    storage-key="review-detail-modal"
    :default-width="900"
    :min-width="650"
    :max-width="1200"
    :default-height="700"
    :min-height="500"
  >
    <template #title>
      <h6 class="mb-0">{{ t('reviewDetailModal.title', { id: reviewId }) }}</h6>
    </template>

    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
    </div>
    <div v-else-if="error" class="alert alert-danger small">{{ error }}</div>
    <div v-else-if="item">
      <div class="row g-3">
        <!-- СТО -->
        <div class="col-md-6">
          <label class="form-label small fw-semibold text-muted">{{ t('users.stoCol') }}</label>
          <div class="fw-semibold">{{ item.sto_name }}</div>
          <div class="text-muted small">#{{ item.sto_id }}</div>
        </div>

        <!-- Статус -->
        <div class="col-md-6">
          <label class="form-label small fw-semibold text-muted">{{ t('filter.status') }}</label>
          <div><span :class="statusBadge(item.status)">{{ statusLabel(item.status) }}</span></div>
        </div>

        <!-- Автор -->
        <div class="col-md-6">
          <label class="form-label small fw-semibold text-muted">{{ t('reviews.colAuthor') }}</label>
          <div class="d-flex align-items-center gap-2">
            <span class="fw-semibold">{{ item.author_name }}</span>
            <span v-if="item.is_guest" class="badge bg-info text-dark">{{ t('reviewDetailModal.guestBadge') }}</span>
            <span v-if="item.is_verified_purchase" class="badge bg-success">{{ t('reviews.verifiedPurchaseTooltip') }}</span>
          </div>
          <div v-if="item.guest_email" class="text-muted small">{{ item.guest_email }}</div>
          <div v-if="item.user_id" class="text-muted small">User ID: {{ item.user_id }}</div>
        </div>

        <!-- Рейтинг -->
        <div class="col-md-6">
          <label class="form-label small fw-semibold text-muted">{{ t('reviewDetailModal.ratingModeratedLabel') }}</label>
          <div class="d-flex align-items-center gap-2">
            <span class="h4 mb-0 fw-bold text-warning">{{ item.rating_overall.toFixed(1) }}</span>
            <div class="text-warning">
              <i v-for="n in 5" :key="n"
                 :class="n <= Math.round(item.rating_overall) ? 'bi-star-fill' : 'bi-star'"
                 class="bi"></i>
            </div>
          </div>
          <div v-if="!item.rating_moderated" class="badge bg-warning text-dark mt-2">{{ t('reviewDetailModal.ratingNotModeratedBadge') }}</div>
          <div v-else class="badge bg-success mt-2">{{ t('reviewDetailModal.ratingModeratedBadge') }}</div>
        </div>

        <!-- Детальные оценки -->
        <div class="col-12">
          <label class="form-label small fw-semibold text-muted">{{ t('reviewDetailModal.detailedRatingsLabel') }}</label>
          <div class="row g-2">
            <div class="col-6 col-md-3">
              <div class="border rounded p-2 text-center">
                <div class="small text-muted">{{ t('stoList.qualityLabel') }}</div>
                <div class="fw-bold">{{ item.rating_quality }} / 5</div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="border rounded p-2 text-center">
                <div class="small text-muted">{{ t('stoList.speedLabel') }}</div>
                <div class="fw-bold">{{ item.rating_speed }} / 5</div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="border rounded p-2 text-center">
                <div class="small text-muted">{{ t('stoList.priceLabel') }}</div>
                <div class="fw-bold">{{ item.rating_price }} / 5</div>
              </div>
            </div>
            <div class="col-6 col-md-3">
              <div class="border rounded p-2 text-center">
                <div class="small text-muted">{{ t('stoList.serviceLabel') }}</div>
                <div class="fw-bold">{{ item.rating_service }} / 5</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Заголовок -->
        <div v-if="item.title" class="col-12">
          <label class="form-label small fw-semibold text-muted">{{ t('reviewDetailModal.titleLabel') }}</label>
          <div class="fw-semibold">{{ item.title }}</div>
        </div>

        <!-- Текст отзыва -->
        <div class="col-12">
          <label class="form-label small fw-semibold text-muted">{{ t('reviewDetailModal.textLabel') }}</label>
          <div class="border rounded p-3 bg-light" style="white-space: pre-wrap">{{ item.text }}</div>
        </div>

        <hr class="my-2" />

        <!-- Даты -->
        <div class="col-md-4">
          <label class="form-label small fw-semibold text-muted">{{ t('reviewDetailModal.createdAtLabel') }}</label>
          <div class="text-muted small">{{ formatDate(item.created_at) }}</div>
        </div>
        <div class="col-md-4">
          <label class="form-label small fw-semibold text-muted">{{ t('reviewDetailModal.updatedAtLabel') }}</label>
          <div class="text-muted small">{{ formatDate(item.updated_at) }}</div>
        </div>
        <div class="col-md-4">
          <label class="form-label small fw-semibold text-muted">{{ t('reviewDetailModal.publishedAtLabel') }}</label>
          <div class="text-muted small">{{ formatDate(item.published_at) }}</div>
        </div>

        <!-- Booking ID -->
        <div v-if="item.booking_id" class="col-md-6">
          <label class="form-label small fw-semibold text-muted">{{ t('reviewDetailModal.bookingLabel') }}</label>
          <div class="text-muted small">Booking ID: {{ item.booking_id }}</div>
        </div>

        <!-- Helpful count -->
        <div class="col-md-6">
          <label class="form-label small fw-semibold text-muted">{{ t('reviewDetailModal.helpfulnessLabel') }}</label>
          <div class="text-muted small">{{ t('reviewDetailModal.helpfulCountText', { count: item.helpful_count }) }}</div>
        </div>

        <div v-if="actionError" class="alert alert-danger small mb-0 mt-3">{{ actionError }}</div>
        <div v-if="actionSuccess" class="alert alert-success small mb-0 mt-3">{{ actionSuccess }}</div>
      </div>
    </div>

    <template #footer>
      <div>
        <button
          v-if="item && item.status === 'published'"
          class="btn btn-sm btn-warning"
          @click="markAsSpam"
          :disabled="acting"
        >
          {{ t('reviewDetailModal.markAsSpamButton') }}
        </button>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-secondary" @click="close">{{ t('common.close') }}</button>
        <button
          v-if="item && item.status === 'pending'"
          class="btn btn-sm btn-danger"
          @click="reject"
          :disabled="acting"
        >
          <span v-if="acting === 'reject'" class="spinner-border spinner-border-sm me-1"></span>
          {{ t('stoImport.rejectButton') }}
        </button>
        <button
          v-if="item && item.status === 'pending'"
          class="btn btn-sm btn-success"
          @click="approve"
          :disabled="acting"
        >
          <span v-if="acting === 'approve'" class="spinner-border spinner-border-sm me-1"></span>
          {{ t('reviewDetailModal.approveAndPublishButton') }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseModal from './BaseModal.vue'
import { apiGet, apiPost } from '../utils/api'

const { t } = useI18n({ useScope: 'global' })
const visible = ref(false)
const reviewId = ref(null)
const loading = ref(false)
const error = ref(null)
const item = ref(null)
const acting = ref(false)
const actionError = ref(null)
const actionSuccess = ref(null)

// Закриття через хрестик/бекдроп/Escape всередині BaseModal минає close() нижче —
// тому прибирання стану й query-параметра винесені сюди, в один watcher на будь-яке
// закриття (а не дублюються по кожному тригеру закриття окремо).
watch(visible, (val, wasVisible) => {
  if (wasVisible && !val) {
    reviewId.value = null
    item.value = null
    actionError.value = null
    actionSuccess.value = null

    const url = new URL(window.location.href)
    url.searchParams.delete('detail')
    window.history.pushState({}, '', url.toString())
  }
})

async function load() {
  if (!reviewId.value) return

  loading.value = true
  error.value = null

  try {
    const response = await apiGet(`/admin/reviews/${reviewId.value}`)

    if (response.success) {
      item.value = response.data
    } else {
      error.value = response.message || t('reviews.loadDataError')
    }
  } catch (err) {
    console.error('Error loading review:', err)
    error.value = t('reviews.loadDataError')
  } finally {
    loading.value = false
  }
}

async function approve() {
  if (!confirm(t('reviews.confirmApprove'))) return

  acting.value = 'approve'
  actionError.value = null
  actionSuccess.value = null

  try {
    const response = await apiPost(`/admin/reviews/${reviewId.value}/approve`)

    if (response.success) {
      actionSuccess.value = t('reviewDetailModal.reviewApprovedMessage')
      await load()
      window.dispatchEvent(new CustomEvent('review-updated'))
    } else {
      actionError.value = response.message || t('reviews.approveError')
    }
  } catch (err) {
    console.error('Error approving review:', err)
    actionError.value = t('reviews.approveError')
  } finally {
    acting.value = false
  }
}

async function reject() {
  if (!confirm(t('reviews.confirmReject'))) return

  acting.value = 'reject'
  actionError.value = null
  actionSuccess.value = null

  try {
    const response = await apiPost(`/admin/reviews/${reviewId.value}/reject`)

    if (response.success) {
      actionSuccess.value = t('reviewDetailModal.reviewRejectedMessage')
      await load()
      window.dispatchEvent(new CustomEvent('review-updated'))
    } else {
      actionError.value = response.message || t('reviews.rejectError')
    }
  } catch (err) {
    console.error('Error rejecting review:', err)
    actionError.value = t('reviews.rejectError')
  } finally {
    acting.value = false
  }
}

async function markAsSpam() {
  if (!confirm(t('reviewDetailModal.confirmMarkSpam'))) return

  acting.value = 'spam'
  actionError.value = null
  actionSuccess.value = null

  try {
    const response = await apiPost(`/admin/reviews/${reviewId.value}/mark-spam`)

    if (response.success) {
      actionSuccess.value = t('reviewDetailModal.reviewMarkedSpamMessage')
      await load()
      window.dispatchEvent(new CustomEvent('review-updated'))
    } else {
      actionError.value = response.message || t('reviewDetailModal.markSpamError')
    }
  } catch (err) {
    console.error('Error marking as spam:', err)
    actionError.value = t('reviewDetailModal.markSpamError')
  } finally {
    acting.value = false
  }
}

function close() {
  visible.value = false
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleString('uk-UA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function statusBadge(status) {
  const badges = {
    pending: 'badge bg-warning text-dark',
    published: 'badge bg-success',
    rejected: 'badge bg-danger',
    hidden: 'badge bg-secondary',
    spam: 'badge bg-dark'
  }
  return badges[status] || 'badge bg-secondary'
}

function statusLabel(status) {
  const labels = {
    pending: t('reviews.statusPending'),
    published: t('stoList.reviewPublished'),
    rejected: t('stoList.reviewRejected'),
    hidden: t('stoList.reviewHidden'),
    spam: t('stoList.reviewSpam')
  }
  return labels[status] || status
}

function handleOpen(event) {
  const id = event.detail?.id
  if (id) {
    reviewId.value = id
    visible.value = true
    load()

    const url = new URL(window.location.href)
    url.searchParams.set('detail', id)
    window.history.pushState({}, '', url.toString())
  }
}

onMounted(() => {
  window.addEventListener('open-review-detail', handleOpen)
})

onUnmounted(() => {
  window.removeEventListener('open-review-detail', handleOpen)
})
</script>
