<template>
  <div class="container-fluid">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h5 class="mb-0">{{ t('language.selectLanguage') }} — i18n тест</h5>
      <LanguageSwitcher />
    </div>

    <div class="card mb-4">
      <div class="card-header">
        <h6 class="mb-0">Common translations</h6>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-3">
            <button class="btn btn-primary w-100">{{ t('common.save') }}</button>
          </div>
          <div class="col-md-3">
            <button class="btn btn-secondary w-100">{{ t('common.cancel') }}</button>
          </div>
          <div class="col-md-3">
            <button class="btn btn-danger w-100">{{ t('common.delete') }}</button>
          </div>
          <div class="col-md-3">
            <button class="btn btn-success w-100">{{ t('common.create') }}</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-header">
        <h6 class="mb-0">{{ t('nav.dashboard') }}</h6>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table class="table table-bordered">
            <thead>
              <tr>
                <th>{{ t('table.id') }}</th>
                <th>{{ t('table.name') }}</th>
                <th>{{ t('table.status') }}</th>
                <th>{{ t('common.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>Test record</td>
                <td><span class="badge bg-success">{{ t('common.active') }}</span></td>
                <td>
                  <button class="btn btn-sm btn-outline-primary me-1">{{ t('common.edit') }}</button>
                  <button class="btn btn-sm btn-outline-danger">{{ t('common.delete') }}</button>
                </td>
              </tr>
              <tr>
                <td>2</td>
                <td>Another record</td>
                <td><span class="badge bg-secondary">{{ t('common.inactive') }}</span></td>
                <td>
                  <button class="btn btn-sm btn-outline-primary me-1">{{ t('common.edit') }}</button>
                  <button class="btn btn-sm btn-outline-danger">{{ t('common.delete') }}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-header">
        <h6 class="mb-0">{{ t('filters.savedFilters') }}</h6>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">{{ t('filters.filterName') }}</label>
            <input type="text" class="form-control" :placeholder="t('filters.filterName')" />
          </div>
          <div class="col-md-6 d-flex align-items-end gap-2">
            <button class="btn btn-primary">{{ t('filters.saveFilter') }}</button>
            <button class="btn btn-outline-secondary">{{ t('filters.resetFilters') }}</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h6 class="mb-0">Messages</h6>
      </div>
      <div class="card-body">
        <div class="alert alert-success">{{ t('messages.saved') }}</div>
        <div class="alert alert-danger">{{ t('messages.error') }}</div>
        <div class="alert alert-warning">{{ t('messages.unsavedChanges') }}</div>
      </div>
    </div>

    <div class="mt-4">
      <p><strong>Current locale:</strong> {{ locale }}</p>
      <p><strong>Available locales:</strong> {{ availableLocales.map(l => l.name).join(', ') }}</p>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { availableLocales } from '@/locales'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

const { t, locale } = useI18n()
</script>
