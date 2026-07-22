<template>
  <ListPageWrapper>
    <div>
    <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
      <h5 class="mb-0">Список СТО</h5>
      <div class="d-flex gap-2 flex-wrap">
        <input
          v-model="search"
          type="text"
          class="form-control form-control-sm"
          style="width:200px"
          placeholder="Пошук за назвою..."
          @input="debounceLoad"
        />
        <select v-model="filterType" class="form-select form-select-sm" style="width:auto" @change="load(1)">
          <option value="">Всі типи</option>
          <option v-for="t in STO_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
        <select v-model="filterStatus" class="form-select form-select-sm" style="width:auto" @change="load(1)">
          <option value="">Всі статуси</option>
          <option value="active">Активні</option>
          <option value="inactive">Неактивні</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else>
      <BulkActions
        v-if="selectedIds.size"
        :count="selectedIds.size"
        :actions="bulkActionsAvailable"
        :busy="bulkBusy"
        @action="handleBulkAction"
        @clear="selectedIds = new Set()"
      />

      <div class="card shadow-sm">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0 small">
            <thead class="table-light">
              <tr>
                <th v-if="bulkActionsAvailable.length" style="width:36px">
                  <input
                    type="checkbox"
                    class="form-check-input"
                    :checked="allOnPageSelected"
                    @change="toggleSelectAll"
                  />
                </th>
                <th style="width:55px" class="text-end th-sortable" @click="toggleSort('id')">
                  ID
                  <SortIcon :col="'id'" :sortKey="sortKey" :sortDir="sortDir" />
                </th>
                <th class="th-sortable" @click="toggleSort('name_uk')">
                  Назва (UK)
                  <SortIcon :col="'name_uk'" :sortKey="sortKey" :sortDir="sortDir" />
                </th>
                <th>Тип</th>
                <th>Адреса</th>
                <th>Телефон</th>
                <th class="th-sortable" style="width:90px" @click="toggleSort('rating')">
                  Рейтинг
                  <SortIcon :col="'rating'" :sortKey="sortKey" :sortDir="sortDir" />
                </th>
                <th class="th-sortable" style="width:120px" @click="toggleSort('is_active')">
                  Статус
                  <SortIcon :col="'is_active'" :sortKey="sortKey" :sortDir="sortDir" />
                </th>
                <th style="width:50px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in items" :key="row.id">
                <td v-if="bulkActionsAvailable.length">
                  <input
                    type="checkbox"
                    class="form-check-input"
                    :checked="selectedIds.has(row.id)"
                    @change="toggleSelectRow(row.id)"
                  />
                </td>
                <td class="text-muted text-end">{{ row.id }}</td>

                <!-- ── Inline name edit ── -->
                <td class="name-cell">
                  <template v-if="editingNameId === row.id">
                    <input
                      :ref="el => { if (el) nameInputRef = el }"
                      v-model="editingNameValue"
                      type="text"
                      class="form-control form-control-sm name-input"
                      @keydown.enter.prevent="commitName(row)"
                      @keydown.esc.prevent="cancelName()"
                      @blur="commitName(row)"
                    />
                  </template>
                  <template v-else>
                    <span
                      v-if="canEdit"
                      class="inline-editable"
                      @click="startEditName(row)"
                    >{{ row.name_uk ?? '—' }}</span>
                    <span v-else>{{ row.name_uk ?? '—' }}</span>
                    <span v-if="savingName === row.id" class="ms-1">
                      <span class="spinner-border spinner-border-sm text-secondary" style="width:.7rem;height:.7rem"></span>
                    </span>
                  </template>
                </td>

                <td>
                  <select
                    v-if="canEdit"
                    class="form-select form-select-sm border-0 p-0 fw-medium"
                    :class="typeBadge(row.sto_type)"
                    style="width:auto; background:transparent; font-size:.75rem; cursor:pointer"
                    :disabled="changingTypeId === row.id"
                    :value="row.sto_type"
                    @change="changeType(row, $event.target.value)"
                  >
                    <option v-for="t in STO_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
                  </select>
                  <span v-else class="badge" :class="typeBadge(row.sto_type)">
                    {{ typeLabel(row.sto_type) }}
                  </span>
                </td>

                <td class="text-muted" style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  {{ row.address ?? '—' }}
                </td>
                <td>{{ row.main_phone ?? '—' }}</td>

                <!-- ── Inline rating edit ── -->
                <td style="width:90px">
                  <template v-if="editingRatingId === row.id">
                    <input
                      :ref="el => { if (el) ratingInputRef = el }"
                      v-model.number="editingRatingValue"
                      type="number"
                      min="0" max="5" step="0.01"
                      class="form-control form-control-sm py-0 px-1"
                      style="width:60px; font-size:.8rem"
                      @keydown.enter.prevent="commitRating(row)"
                      @keydown.esc.prevent="cancelRating()"
                      @blur="commitRating(row)"
                    />
                  </template>
                  <template v-else>
                    <span
                      v-if="canEdit"
                      class="inline-editable"
                      @click="startEditRating(row)"
                    >
                      <template v-if="row.rating !== null">
                        <i class="bi bi-star-fill text-warning me-1" style="font-size:.7rem"></i>{{ Number(row.rating).toFixed(2) }}
                      </template>
                      <span v-else class="text-muted">—</span>
                    </span>
                    <span v-else>
                      <template v-if="row.rating !== null">
                        <i class="bi bi-star-fill text-warning me-1" style="font-size:.7rem"></i>{{ Number(row.rating).toFixed(2) }}
                      </template>
                      <span v-else class="text-muted">—</span>
                    </span>
                  </template>
                </td>

                <!-- ── Inline status toggle ── -->
                <td>
                  <button
                    v-if="canEditStatus"
                    class="badge border-0 btn p-1"
                    :class="row.is_active ? 'bg-success' : 'bg-danger'"
                    :disabled="togglingId === row.id"
                    @click="toggleStatus(row)"
                  >
                    <span v-if="togglingId === row.id" class="spinner-border spinner-border-sm"></span>
                    <span v-else>{{ row.is_active ? 'Активне' : 'Неактивне' }}</span>
                  </button>
                  <span v-else class="badge" :class="row.is_active ? 'bg-success' : 'bg-danger'">
                    {{ row.is_active ? 'Активне' : 'Неактивне' }}
                  </span>
                </td>

                <td>
                  <button
                    v-if="canEdit"
                    class="btn btn-sm btn-outline-secondary"
                    title="Редагувати"
                    @click="openModal(row)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                </td>
              </tr>
              <tr v-if="!items.length">
                <td :colspan="bulkActionsAvailable.length ? 9 : 8" class="text-center text-muted py-4">Немає СТО</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="d-flex justify-content-between align-items-center mt-3">
        <span class="text-muted small">Всього: {{ total }}</span>
        <Pagination :current-page="page" :total-pages="totalPages" @change="load" />
      </div>
    </div>

    <!-- Edit Modal -->
    <BaseModal
      v-model:visible="modalOpen"
      storage-key="sto-edit-modal"
      :default-width="1100"
      :min-width="800"
      :max-width="1400"
      :default-height="600"
      :min-height="400"
      :max-height="900"
      :close-on-backdrop="false"
    >
      <template #title>
        <h5 class="mb-0">
          Редагування СТО <span class="text-muted fw-normal fs-6">#{{ modalData.id }}</span>
          <span v-if="modalData.name_uk || modalData.name" class="text-primary fw-normal fs-6 ms-2" style="color: #1e40af !important">
            {{ modalData.name_uk || modalData.name }}
          </span>
        </h5>
      </template>

          <!-- Tab nav -->
          <div class="modal-tabs-sticky border-bottom px-2">
            <ul class="nav nav-tabs border-0">
              <li class="nav-item">
                <button class="nav-link py-2 px-2 small text-nowrap"
                        :class="{ active: activeTab === 'general' }"
                        @click="activeTab = 'general'">
                  <i class="bi bi-info-circle me-1"></i>Основне
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link py-2 px-2 small text-nowrap"
                        :class="{ active: activeTab === 'vehicle-types' }"
                        @click="switchTab('vehicle-types')">
                  <i class="bi bi-truck me-1"></i>Типи ТС
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link py-2 px-2 small text-nowrap"
                        :class="{ active: activeTab === 'services' }"
                        @click="switchTab('services')">
                  <i class="bi bi-wrench me-1"></i>Послуги
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link py-2 px-2 small text-nowrap"
                        :class="{ active: activeTab === 'amenities' }"
                        @click="switchTab('amenities')">
                  <i class="bi bi-stars me-1"></i>Зручності
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link py-2 px-2 small text-nowrap"
                        :class="{ active: activeTab === 'address' }"
                        @click="switchTab('address')">
                  <i class="bi bi-geo-alt me-1"></i>Адреса
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link py-2 px-2 small text-nowrap"
                        :class="{ active: activeTab === 'photos' }"
                        @click="switchTab('photos')">
                  <i class="bi bi-images me-1"></i>Фото
                  <span v-if="photosTotal > 0" class="badge bg-secondary ms-1" style="font-size:.6rem">{{ photosTotal }}</span>
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link py-2 px-2 small text-nowrap"
                        :class="{ active: activeTab === 'employees' }"
                        @click="switchTab('employees')">
                  <i class="bi bi-people me-1"></i>Співробітники
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link py-2 px-2 small text-nowrap"
                        :class="{ active: activeTab === 'bookings' }"
                        @click="switchTab('bookings')">
                  <i class="bi bi-calendar-check me-1"></i>Записи
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link py-2 px-2 small text-nowrap"
                        :class="{ active: activeTab === 'reviews' }"
                        @click="switchTab('reviews')">
                  <i class="bi bi-star me-1"></i>Відгуки
                </button>
              </li>
            </ul>
          </div>

          <!-- Scrollable body -->
          <div style="padding-top: 0.5rem;">

            <!-- ── Tab: General info ─────────────────────────────── -->
            <template v-if="activeTab === 'general'">
              <div class="row g-3 mb-3">
                <div class="col-sm-4">
                  <label class="form-label small mb-1">Тип СТО <span class="text-danger">*</span></label>
                  <select v-model="modalForm.sto_type" class="form-select form-select-sm">
                    <option v-for="t in STO_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
                  </select>
                </div>
                <div class="col-sm-2">
                  <label class="form-label small mb-1">Статус</label>
                  <div class="mt-1">
                    <div class="form-check form-switch">
                      <input
                        id="is_active_toggle"
                        v-model="modalForm.is_active"
                        class="form-check-input"
                        type="checkbox"
                        role="switch"
                      />
                      <label class="form-check-label" for="is_active_toggle">
                        {{ modalForm.is_active ? 'Активне' : 'Неактивне' }}
                      </label>
                    </div>
                  </div>
                </div>
                <div class="col-sm-2">
                  <label class="form-label small mb-1">Рейтинг</label>
                  <input
                    v-model.number="modalForm.rating"
                    type="number" min="0" max="5" step="0.01"
                    class="form-control form-control-sm"
                    placeholder="1.00 – 5.00"
                    readonly
                    title="Рейтинг розраховується автоматично на основі відгуків"
                  />
                  <small class="text-muted">Розраховується автоматично</small>
                </div>
              </div>

              <div class="row g-3 mb-3">
                <div class="col-sm-4">
                  <label class="form-label small mb-1">Назва (UK) <span class="text-danger">*</span></label>
                  <input v-model="modalForm.name_uk" type="text" class="form-control form-control-sm" />
                </div>
                <div class="col-sm-4">
                  <label class="form-label small mb-1">Назва (EN)</label>
                  <input v-model="modalForm.name_en" type="text" class="form-control form-control-sm" />
                </div>
                <div class="col-sm-4">
                  <label class="form-label small mb-1">Назва (RU)</label>
                  <input v-model="modalForm.name_ru" type="text" class="form-control form-control-sm" />
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label small mb-1">Опис (UK)</label>
                <textarea v-model="modalForm.description_uk" class="form-control form-control-sm" rows="2" maxlength="2048"></textarea>
                <div class="text-end text-muted" style="font-size:0.7rem">{{ (modalForm.description_uk ?? '').length }} / 2048</div>
              </div>
              <div class="mb-3">
                <label class="form-label small mb-1">Опис (EN)</label>
                <textarea v-model="modalForm.description_en" class="form-control form-control-sm" rows="2" maxlength="2048"></textarea>
              </div>
              <div class="mb-3">
                <label class="form-label small mb-1">Опис (RU)</label>
                <textarea v-model="modalForm.description_ru" class="form-control form-control-sm" rows="2" maxlength="2048"></textarea>
              </div>

              <!-- Extra fields -->
              <div class="row g-3 mb-3">
                <div class="col-sm-2">
                  <label class="form-label small mb-1">Рік заснування</label>
                  <input v-model.number="modalForm.founded_year" type="number" min="1900" :max="new Date().getFullYear()" class="form-control form-control-sm" placeholder="2010" />
                </div>
                <div class="col-sm-2">
                  <label class="form-label small mb-1">Постів / боксів</label>
                  <input v-model.number="modalForm.posts_count" type="number" min="1" max="255" class="form-control form-control-sm" placeholder="4" />
                </div>
                <div class="col-sm-4">
                  <label class="form-label small mb-1">Email (внутр.)</label>
                  <input v-model="modalForm.email" type="email" class="form-control form-control-sm" placeholder="sto@example.com" />
                </div>
                <div class="col-sm-4">
                  <label class="form-label small mb-1">Сайт</label>
                  <input v-model="modalForm.website" type="url" class="form-control form-control-sm" placeholder="https://sto.com.ua" />
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label small mb-1">Логотип СТО</label>
                <div v-if="modalForm.logo_key" class="mb-2">
                  <img
                    :src="getStorageUrl(modalForm.logo_key)"
                    alt="Логотип СТО"
                    class="img-thumbnail"
                    style="max-width: 300px; max-height: 200px; object-fit: contain;"
                  />
                </div>
                <input v-model="modalForm.logo_key" type="text" class="form-control form-control-sm" placeholder="sto/1/logo/abc123.webp" />
                <div class="text-muted mt-1" style="font-size:0.72rem">
                  Логотип автоматично встановлюється при завантаженні першого фото у вкладці "Фото"
                </div>
              </div>

              <!-- Two-column: Schedule | Phones -->
              <div class="row g-3 mb-2">

                <!-- Left: Working hours -->
                <div class="col-md-6">
                  <label class="form-label small mb-1 fw-semibold">
                    <i class="bi bi-clock me-1"></i>Графік роботи
                  </label>
                  <div class="border rounded p-3">
                    <div class="row g-2 mb-2 align-items-center">
                      <div class="col-4"><span class="small text-muted">Пн–Пт</span></div>
                      <div class="col-8">
                        <div class="d-flex gap-1 align-items-center">
                          <TimeInput v-model="modalForm.weekday_start" />
                          <span class="text-muted small">—</span>
                          <TimeInput v-model="modalForm.weekday_end" />
                          <button type="button" class="btn btn-sm btn-outline-secondary py-0" title="Вихідний"
                                  @click="modalForm.weekday_start = ''; modalForm.weekday_end = ''">✕</button>
                        </div>
                      </div>
                    </div>
                    <div class="row g-2 mb-2 align-items-center">
                      <div class="col-4"><span class="small text-muted">Субота</span></div>
                      <div class="col-8">
                        <div class="d-flex gap-1 align-items-center">
                          <TimeInput v-model="modalForm.saturday_start" />
                          <span class="text-muted small">—</span>
                          <TimeInput v-model="modalForm.saturday_end" />
                          <button type="button" class="btn btn-sm btn-outline-secondary py-0" title="Вихідний"
                                  @click="modalForm.saturday_start = ''; modalForm.saturday_end = ''">✕</button>
                        </div>
                      </div>
                    </div>
                    <div class="row g-2 align-items-center">
                      <div class="col-4"><span class="small text-muted">Неділя</span></div>
                      <div class="col-8">
                        <div class="d-flex gap-1 align-items-center">
                          <TimeInput v-model="modalForm.sunday_start" />
                          <span class="text-muted small">—</span>
                          <TimeInput v-model="modalForm.sunday_end" />
                          <button type="button" class="btn btn-sm btn-outline-secondary py-0" title="Вихідний"
                                  @click="modalForm.sunday_start = ''; modalForm.sunday_end = ''">✕</button>
                        </div>
                      </div>
                    </div>
                    <div class="text-muted mt-2" style="font-size:0.72rem">
                      💡 Порожнє поле = вихідний день. Двоеточие вводити не потрібно — воно вже є. Після введення годин автоматично фокус переходить на хвилини.
                    </div>
                  </div>
                </div>

                <!-- Right: Phones -->
                <div class="col-md-6">
                  <label class="form-label small mb-1 fw-semibold">
                    <i class="bi bi-telephone me-1"></i>Телефонні номери
                  </label>
                  <div class="border rounded p-3" style="min-height:168px">
                    <div v-if="phonesLoading" class="text-center py-3">
                      <div class="spinner-border spinner-border-sm text-secondary"></div>
                    </div>
                    <div v-else-if="phonesError" class="text-danger small">{{ phonesError }}</div>
                    <template v-else>
                      <!-- Existing phones -->
                      <div v-for="(ph, idx) in phonesList" :key="idx"
                           class="d-flex align-items-center gap-2 mb-2">
                        <span
                          class="badge"
                          :class="ph.is_main ? 'bg-success' : 'bg-secondary'"
                          style="cursor:pointer;font-size:.7rem"
                          :title="ph.is_main ? 'Основний' : 'Зробити основним'"
                          @click="setMainPhone(idx)"
                        >{{ ph.is_main ? '★' : '☆' }}</span>
                        <span class="small flex-grow-1">{{ ph.formatted }}</span>
                        <button type="button" class="btn btn-sm btn-outline-danger py-0 px-1"
                                title="Видалити" @click="removePhone(idx)">✕</button>
                      </div>
                      <div v-if="!phonesList.length" class="text-muted small mb-2">Телефони не додано</div>

                      <!-- Add new phone -->
                      <div class="d-flex gap-2 mt-2">
                        <input
                          v-model="newPhoneRaw"
                          type="tel"
                          class="form-control form-control-sm"
                          placeholder="+380XXXXXXXXX"
                          @keydown.enter.prevent="addPhone"
                        />
                        <button type="button" class="btn btn-sm btn-outline-primary text-nowrap"
                                @click="addPhone">+ Додати</button>
                      </div>
                      <div class="text-muted mt-1" style="font-size:0.72rem">
                        ★ — основний номер. Зберігається разом із загальними даними.
                      </div>
                    </template>
                  </div>
                </div>

              </div>

              <div class="row g-3">
                <div class="col-sm-6">
                  <label class="form-label small mb-1">Створено</label>
                  <div class="readonly-field text-muted small">{{ modalData.created_at }}</div>
                </div>
                <div class="col-sm-6">
                  <label class="form-label small mb-1">Оновлено</label>
                  <div class="readonly-field text-muted small">{{ modalData.updated_at }}</div>
                </div>
              </div>
            </template>

            <!-- ── Tab: Vehicle Types ──────────────────────────── -->
            <template v-else-if="activeTab === 'vehicle-types'">
              <div v-if="vtLoading || brandsLoading" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
              </div>
              <div v-else-if="vtError" class="alert alert-danger py-2 small">{{ vtError }}</div>
              <div v-else-if="brandsError" class="alert alert-danger py-2 small">{{ brandsError }}</div>
              <template v-else>
                <!-- Vehicle types block -->
                <p class="text-muted small mb-2">Оберіть типи транспортних засобів, з якими працює це СТО.</p>
                <div class="d-flex flex-wrap gap-2 mb-4">
                  <label
                    v-for="vt in vtList"
                    :key="vt.id"
                    class="svc-chip"
                    :class="{ 'svc-chip--on': checkedVtIds.has(vt.id) }"
                  >
                    <input
                      type="checkbox"
                      class="visually-hidden"
                      :checked="checkedVtIds.has(vt.id)"
                      @change="toggleVt(vt.id)"
                    />
                    {{ vt.name_uk }}
                  </label>
                  <div v-if="!vtList.length" class="text-muted small">Типи ТС не знайдено</div>
                </div>

                <!-- Car brands block -->
                <div class="border-top pt-3">
                  <div class="d-flex align-items-center justify-content-between mb-2 gap-2">
                    <p class="text-muted small mb-0">Оберіть марки автомобілів, з якими працює це СТО.</p>
                    <div class="d-flex align-items-center gap-2 flex-shrink-0">
                      <span class="badge bg-primary">{{ checkedBrandIds.size }}</span>
                      <button v-if="checkedBrandIds.size > 0" type="button" class="btn btn-sm btn-outline-secondary py-0"
                              @click="checkedBrandIds = new Set()">Зняти всі</button>
                    </div>
                  </div>
                  <input
                    v-model="brandSearch"
                    type="text"
                    class="form-control form-control-sm mb-2"
                    placeholder="Фільтр марок..."
                    style="max-width:260px"
                  />
                  <div class="d-flex flex-wrap gap-2">
                    <label
                      v-for="b in filteredBrands"
                      :key="b.id"
                      class="svc-chip"
                      :class="{ 'svc-chip--on': checkedBrandIds.has(b.id) }"
                    >
                      <input
                        type="checkbox"
                        class="visually-hidden"
                        :checked="checkedBrandIds.has(b.id)"
                        @change="toggleBrand(b.id)"
                      />
                      {{ b.name }}
                    </label>
                    <div v-if="!filteredBrands.length" class="text-muted small">Марки не знайдено</div>
                  </div>
                </div>

                <!-- Status badges block -->
                <div class="border-top pt-3 mt-1">
                  <div class="d-flex gap-4">
                    <div class="form-check form-switch">
                      <input id="is_official" v-model="modalForm.is_official" class="form-check-input" type="checkbox" role="switch" />
                      <label class="form-check-label small" for="is_official">Офіційний дилер</label>
                    </div>
                    <div class="form-check form-switch">
                      <input id="is_verified" v-model="modalForm.is_verified" class="form-check-input" type="checkbox" role="switch" />
                      <label class="form-check-label small" for="is_verified">Перевірено платформою</label>
                    </div>
                  </div>
                </div>
              </template>
            </template>

            <!-- ── Tab: Services ────────────────────────────────── -->
            <template v-else-if="activeTab === 'services'">
              <div v-if="servicesLoading" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
              </div>
              <div v-else-if="servicesError" class="alert alert-danger py-2 small">{{ servicesError }}</div>
              <template v-else>
                <div v-for="group in servicesGroups" :key="group.id" class="mb-3">
                  <div class="fw-bold mb-2">{{ group.name }}</div>
                  <div class="d-flex flex-wrap gap-2">
                    <label
                      v-for="svc in group.services"
                      :key="svc.id"
                      class="svc-chip"
                      :class="{ 'svc-chip--on': checkedServiceIds.has(svc.id) }"
                    >
                      <input
                        type="checkbox"
                        class="visually-hidden"
                        :checked="checkedServiceIds.has(svc.id)"
                        @change="toggleService(svc.id)"
                      />
                      {{ svc.name }}
                    </label>
                  </div>
                </div>
                <div v-if="servicesGroups.length === 0" class="text-muted text-center py-4">
                  Послуги не знайдено
                </div>
              </template>
            </template>

            <!-- ── Tab: Amenities ──────────────────────────────── -->
            <template v-else-if="activeTab === 'amenities'">
              <div v-if="amenitiesLoading" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
              </div>
              <div v-else-if="amenitiesError" class="alert alert-danger py-2 small">{{ amenitiesError }}</div>
              <template v-else>
                <p class="text-muted small mb-3">Оберіть зручності, які є в цьому СТО.</p>
                <div class="d-flex flex-wrap gap-2">
                  <label
                    v-for="a in amenitiesList"
                    :key="a.id"
                    class="svc-chip svc-chip--amenity"
                    :class="{ 'svc-chip--on': checkedAmenityIds.has(a.id) }"
                  >
                    <input
                      type="checkbox"
                      class="visually-hidden"
                      :checked="checkedAmenityIds.has(a.id)"
                      @change="toggleAmenity(a.id)"
                    />
                    <svg v-if="AMENITY_ICONS[a.slug]"
                      class="amenity-icon"
                      viewBox="0 0 64 64"
                      fill="none"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      v-html="AMENITY_ICONS[a.slug]"
                    ></svg>
                    {{ a.name }}
                  </label>
                </div>
                <div v-if="!amenitiesList.length" class="text-muted text-center py-4">Зручності не знайдено</div>
              </template>
            </template>

            <!-- ── Tab: Address ─────────────────────────────────── -->
            <template v-else-if="activeTab === 'address'">
              <div v-if="addressLoading" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
              </div>
              <div v-else-if="addressError" class="alert alert-danger py-2 small">{{ addressError }}</div>
              <template v-else>
                <div v-if="addressList.length === 0" class="text-center py-4">
                  <p class="text-muted mb-3">Адреси не знайдено</p>
                  <button class="btn btn-sm btn-primary" @click="createAddress">
                    <i class="bi bi-plus-circle me-1"></i>Додати адресу
                  </button>
                </div>
                <div v-for="addr in addressList" :key="addr.id" class="card mb-3">
                  <div class="card-body p-3">

                    <!-- Formatted address (readonly display) -->
                    <div class="small text-muted mb-3 pb-2 border-bottom">
                      <i class="bi bi-geo-alt me-1"></i>{{ addr.address_uk ?? '—' }}
                    </div>

                    <template v-if="addrForms[addr.id]">

                      <!-- Country -->
                      <div class="mb-2">
                        <label class="form-label small mb-1">Країна</label>
                        <select v-model="addrForms[addr.id].country_id"
                                class="form-select form-select-sm"
                                @change="onCountryChange(addr.id)">
                          <option :value="null">— Оберіть країну —</option>
                          <option v-for="c in countriesList" :key="c.id" :value="c.id">{{ c.name_uk }}</option>
                        </select>
                      </div>

                      <!-- Oblast (only if list non-empty) -->
                      <div v-if="oblastsByAddr[addr.id]?.length" class="mb-2">
                        <label class="form-label small mb-1">Область</label>
                        <select v-model="addrForms[addr.id].oblast_id"
                                class="form-select form-select-sm"
                                @change="onOblastChange(addr.id)">
                          <option :value="null">— Без області —</option>
                          <option v-for="a in oblastsByAddr[addr.id]" :key="a.id" :value="a.id">{{ a.name_uk }}</option>
                        </select>
                      </div>

                      <!-- District (only if list non-empty) -->
                      <div v-if="districtsByAddr[addr.id]?.length" class="mb-2">
                        <label class="form-label small mb-1">Район</label>
                        <select v-model="addrForms[addr.id].district_id"
                                class="form-select form-select-sm"
                                @change="onDistrictChange(addr.id)">
                          <option :value="null">— Без району —</option>
                          <option v-for="d in districtsByAddr[addr.id]" :key="d.id" :value="d.id">{{ d.name_uk }}</option>
                        </select>
                      </div>

                      <!-- City -->
                      <div class="mb-2">
                        <label class="form-label small mb-1">
                          Населений пункт <span class="text-danger">*</span>
                        </label>
                        <div class="d-flex gap-2 align-items-center">
                          <div class="readonly-field flex-grow-1 small">
                            <template v-if="addrForms[addr.id].city_id">
                              <span class="text-muted me-1">{{ addrForms[addr.id].city_type_name }}</span>{{ addrForms[addr.id].city_name }}
                            </template>
                            <span v-else class="text-muted">—</span>
                          </div>
                          <button type="button"
                                  class="btn btn-sm btn-outline-primary flex-shrink-0"
                                  @click="openCityPicker(addr.id)">
                            <i class="bi bi-search me-1"></i>Обрати
                          </button>
                        </div>
                      </div>

                      <!-- address_detail -->
                      <div class="mb-2">
                        <label class="form-label small mb-1">Деталі адреси</label>
                        <input v-model="addrForms[addr.id].address_detail"
                               type="text" class="form-control form-control-sm"
                               placeholder="вул. Шевченка, 10, кв. 5" />
                      </div>

                      <!-- postal_code -->
                      <div class="mb-2">
                        <label class="form-label small mb-1">Поштовий індекс</label>
                        <input v-model="addrForms[addr.id].postal_code"
                               type="text" class="form-control form-control-sm"
                               placeholder="61000" maxlength="10" />
                      </div>

                      <!-- description -->
                      <div class="mb-3">
                        <label class="form-label small mb-1">Опис / Орієнтир</label>
                        <textarea v-model="addrForms[addr.id].description"
                                  class="form-control form-control-sm" rows="2"></textarea>
                      </div>

                      <!-- Coordinates (editable) -->
                      <div class="border-top pt-3 mb-3">
                        <label class="form-label small mb-2 fw-semibold">
                          <i class="bi bi-geo-alt-fill me-1"></i>Координати (GPS)
                        </label>
                        <div class="row g-2">
                          <div class="col-md-6">
                            <label class="form-label small mb-1">Широта (Latitude)</label>
                            <input v-model.number="addrForms[addr.id].latitude"
                                   type="number" step="0.000001" class="form-control form-control-sm"
                                   placeholder="50.450100" />
                            <div class="text-muted" style="font-size:0.7rem">Наприклад: 50.450100</div>
                          </div>
                          <div class="col-md-6">
                            <label class="form-label small mb-1">Довгота (Longitude)</label>
                            <input v-model.number="addrForms[addr.id].longitude"
                                   type="number" step="0.000001" class="form-control form-control-sm"
                                   placeholder="30.523400" />
                            <div class="text-muted" style="font-size:0.7rem">Наприклад: 30.523400</div>
                          </div>
                        </div>
                        <div v-if="addrForms[addr.id].latitude && addrForms[addr.id].longitude" class="mt-2">
                          <a :href="`https://maps.google.com/?q=${addrForms[addr.id].latitude},${addrForms[addr.id].longitude}`"
                             target="_blank" rel="noopener" class="text-primary small">
                            <i class="bi bi-geo-alt-fill me-1"></i>Переглянути на Google Maps
                          </a>
                        </div>
                      </div>

                      <!-- Timezone (readonly) -->
                      <div v-if="addr.timezone" class="text-muted small mt-1">
                        <i class="bi bi-clock me-1"></i>
                        {{ addr.timezone }}
                        <span v-if="addr.timezone_utc_offset" class="font-monospace ms-1">({{ addr.timezone_utc_offset }})</span>
                      </div>

                    </template>
                  </div>
                </div>
              </template>
            </template>

            <!-- ── Tab: Employees ───────────────────────────────────── -->
            <template v-else-if="activeTab === 'employees'">
              <div v-if="employeesLoading" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
              </div>
              <div v-else-if="employeesError" class="alert alert-danger py-2 small">{{ employeesError }}</div>
              <template v-else>

                <!-- ── Співробітники СТО ── -->
                <h6 class="fw-semibold mb-2">
                  <i class="bi bi-person-badge me-1"></i>Співробітники СТО
                </h6>
                <div v-if="!employeesList.length" class="text-muted small mb-4 ps-1">
                  Співробітників не додано
                </div>
                <table v-else class="table table-sm table-hover align-middle small mb-4">
                  <thead class="table-light">
                    <tr>
                      <th class="text-muted" style="width:45px">ID</th>
                      <th style="width:200px">Ім'я / email</th>
                      <th>Посада</th>
                      <th style="width:115px">Статус</th>
                      <th>Опис</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="emp in employeesList" :key="emp.id">
                      <td class="text-muted">{{ emp.id }}</td>
                      <td>
                        <div>{{ emp.user_name ?? '—' }}</div>
                        <div class="text-muted" style="font-size:.75rem">{{ emp.user_email ?? '' }}</div>
                      </td>
                      <td>
                        <select v-if="canEdit"
                                class="form-select form-select-sm"
                                :value="emp.position_id ?? ''"
                                :disabled="updatingEmployeeId === emp.id"
                                @change="changeEmployeePosition(emp, $event.target.value)">
                          <option value="">— Без посади —</option>
                          <optgroup v-for="grp in positionsGrouped" :key="grp.group_id" :label="grp.group_name">
                            <option v-for="pos in grp.positions" :key="pos.id" :value="pos.id">
                              {{ pos.name }}
                            </option>
                          </optgroup>
                        </select>
                        <template v-else>
                          <div class="text-muted" style="font-size:.75rem">{{ emp.group_name ?? '' }}</div>
                          <div>{{ emp.position_name ?? '—' }}</div>
                        </template>
                      </td>
                      <td>
                        <button v-if="canEdit"
                                class="badge border-0 btn p-1"
                                :class="emp.is_active ? 'bg-success' : 'bg-danger'"
                                :disabled="togglingEmployeeId === emp.id"
                                @click="toggleEmployee(emp)">
                          <span v-if="togglingEmployeeId === emp.id" class="spinner-border spinner-border-sm"></span>
                          <span v-else>{{ emp.is_active ? 'Активний' : 'Неактивний' }}</span>
                        </button>
                        <span v-else class="badge" :class="emp.is_active ? 'bg-success' : 'bg-danger'">
                          {{ emp.is_active ? 'Активний' : 'Неактивний' }}
                        </span>
                      </td>
                      <td class="text-muted" style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                        {{ emp.description ?? '—' }}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <!-- ── Менеджери платформи ── -->
                <h6 class="fw-semibold mb-1">
                  <i class="bi bi-shield-lock me-1"></i>Менеджери платформи
                </h6>
                <p class="text-muted small mb-2">
                  Користувачі, які мають доступ до управління даними цього СТО на сайті.
                </p>
                <div v-if="!managersList.length" class="text-muted small ps-1">Менеджерів не призначено</div>
                <table v-else class="table table-sm align-middle small mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>Ім'я / username</th>
                      <th>Email</th>
                      <th style="width:145px">Додано</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="mgr in managersList" :key="mgr.user_id">
                      <td>
                        <div>{{ mgr.user_name ?? '—' }}</div>
                        <div class="text-muted" style="font-size:.75rem">@{{ mgr.username }}</div>
                      </td>
                      <td>{{ mgr.email }}</td>
                      <td class="text-muted" style="font-size:.75rem">{{ mgr.created_at?.slice(0,10) }}</td>
                    </tr>
                  </tbody>
                </table>

              </template>
            </template>

            <!-- ── Tab: Bookings ────────────────────────────────────── -->
            <template v-else-if="activeTab === 'bookings'">
              <div class="d-flex gap-2 mb-3">
                <select v-model="bookingsFilter" class="form-select form-select-sm" style="width:auto"
                        @change="loadBookings(1)">
                  <option value="">Всі статуси</option>
                  <option v-for="s in BOOKING_STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
                </select>
              </div>
              <div v-if="bookingsLoading" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
              </div>
              <div v-else-if="bookingsError" class="alert alert-danger py-2 small">{{ bookingsError }}</div>
              <template v-else>
                <div v-if="!bookingsList.length" class="text-muted text-center py-4">Записи не знайдено</div>
                <table v-else class="table table-sm table-hover align-middle small mb-0">
                  <thead class="table-light">
                    <tr>
                      <th class="text-muted" style="width:45px">ID</th>
                      <th>Дата / Час</th>
                      <th>Клієнт</th>
                      <th>Авто</th>
                      <th style="width:65px">Хв</th>
                      <th style="width:140px">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="b in bookingsList" :key="b.id">
                      <td class="text-muted">{{ b.id }}</td>
                      <td>
                        <div>{{ b.booking_date }}</div>
                        <div class="text-muted">{{ b.booking_time }}</div>
                      </td>
                      <td>
                        <div>{{ b.client_name ?? '—' }}</div>
                        <div v-if="b.client_phone" class="text-muted" style="font-size:.75rem">{{ b.client_phone }}</div>
                      </td>
                      <td>{{ b.car ?? '—' }}</td>
                      <td>{{ b.duration_minutes }}</td>
                      <td>
                        <select v-if="canEditBookings"
                                class="form-select form-select-sm"
                                :value="b.status"
                                @change="changeBookingStatus(b, $event.target.value)">
                          <option v-for="s in BOOKING_STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
                        </select>
                        <span v-else class="badge" :class="bookingStatusBadge(b.status)">
                          {{ bookingStatusLabel(b.status) }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div v-if="bookingsTotalPages > 1" class="d-flex justify-content-between align-items-center mt-2">
                  <span class="text-muted small">Всього: {{ bookingsTotal }}</span>
                  <nav><ul class="pagination pagination-sm mb-0">
                    <li class="page-item" :class="{disabled: bookingsPage===1}">
                      <button class="page-link" @click="loadBookings(bookingsPage-1)">‹</button>
                    </li>
                    <li class="page-item active"><span class="page-link">{{ bookingsPage }}</span></li>
                    <li class="page-item" :class="{disabled: bookingsPage===bookingsTotalPages}">
                      <button class="page-link" @click="loadBookings(bookingsPage+1)">›</button>
                    </li>
                  </ul></nav>
                </div>
              </template>
            </template>

            <!-- ── Tab: Reviews ─────────────────────────────────────── -->
            <template v-else-if="activeTab === 'reviews'">
              <div class="d-flex gap-2 mb-3">
                <select v-model="reviewsFilter" class="form-select form-select-sm" style="width:auto"
                        @change="loadReviews(1)">
                  <option value="">Всі статуси</option>
                  <option v-for="s in REVIEW_STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
                </select>
              </div>
              <div v-if="reviewsLoading" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
              </div>
              <div v-else-if="reviewsError" class="alert alert-danger py-2 small">{{ reviewsError }}</div>
              <template v-else>
                <div v-if="!reviewsList.length" class="text-muted text-center py-4">Відгуків не знайдено</div>
                <div v-for="rv in reviewsList" :key="rv.id" class="card mb-2">
                  <div class="card-body p-3 small">
                    <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <div class="flex-grow-1">
                        <!-- Гостевой отзыв: редактируемое имя и email -->
                        <div v-if="rv.is_guest && canEdit" class="d-flex gap-2 mb-1">
                          <input
                            v-model="rv.guest_name"
                            type="text"
                            class="form-control form-control-sm"
                            style="max-width:200px"
                            placeholder="Ім'я гостя"
                            @input="markReviewChanged(rv.id)"
                          />
                          <input
                            v-model="rv.guest_email"
                            type="email"
                            class="form-control form-control-sm"
                            style="max-width:200px"
                            placeholder="Email (опційно)"
                            @input="markReviewChanged(rv.id)"
                          />
                        </div>
                        <!-- Зарегистрированный пользователь или read-only режим -->
                        <span v-else class="fw-semibold">{{ rv.user_name ?? rv.guest_name ?? rv.user_email ?? rv.guest_email }}</span>

                        <span class="text-muted ms-2" style="font-size:.75rem">{{ formatDateUA(rv.created_at) }}</span>
                        <span v-if="rv.is_verified_purchase" class="badge bg-success ms-1" style="font-size:.65rem">верифіковано</span>
                        <span v-if="rv.booking_id" class="text-muted ms-1" style="font-size:.75rem">#{{ rv.booking_id }}</span>
                      </div>
                      <div class="d-flex align-items-center gap-2 flex-shrink-0">
                        <span class="fw-bold text-warning">★ {{ rv.rating_overall }}</span>
                        <select v-if="canEdit"
                                class="form-select form-select-sm"
                                style="width:auto"
                                :value="rv.status"
                                @change="changeReviewStatus(rv, $event.target.value)">
                          <option
                            v-for="s in REVIEW_STATUSES"
                            :key="s.value"
                            :value="s.value"
                            :disabled="!canTransitionToStatus(rv.status, s.value)">
                            {{ s.label }}
                          </option>
                        </select>
                        <span v-else class="badge" :class="reviewStatusBadge(rv.status)">
                          {{ reviewStatusLabel(rv.status) }}
                        </span>
                      </div>
                    </div>

                    <!-- Редактируемое поле заголовка -->
                    <input
                      v-if="canEdit"
                      v-model="rv.title"
                      type="text"
                      class="form-control form-control-sm mb-2"
                      placeholder="Заголовок відгуку (опційно)"
                      @input="markReviewChanged(rv.id)"
                    />
                    <div v-else-if="rv.title" class="fw-semibold mb-1">{{ rv.title }}</div>

                    <!-- Редактируемое поле текста -->
                    <textarea
                      v-if="canEdit"
                      v-model="rv.text"
                      class="form-control form-control-sm mb-2"
                      rows="3"
                      placeholder="Текст відгуку"
                      @input="markReviewChanged(rv.id)"
                    ></textarea>
                    <div v-else class="text-muted mb-2" style="white-space:pre-wrap">{{ rv.text }}</div>

                    <div class="d-flex flex-wrap gap-3 text-muted mb-2" style="font-size:.75rem">
                      <span><i class="bi bi-tools me-1"></i>Якість: {{ rv.rating_quality }}/5</span>
                      <span><i class="bi bi-lightning me-1"></i>Швидкість: {{ rv.rating_speed }}/5</span>
                      <span><i class="bi bi-cash me-1"></i>Ціна: {{ rv.rating_price }}/5</span>
                      <span><i class="bi bi-person-check me-1"></i>Сервіс: {{ rv.rating_service }}/5</span>
                      <span v-if="rv.helpful_count"><i class="bi bi-hand-thumbs-up me-1"></i>{{ rv.helpful_count }}</span>
                    </div>

                    <!-- Response and Media Row -->
                    <div class="d-flex gap-3 align-items-start" style="margin-top: 6px;">
                      <!-- STO Response (left side) -->
                      <div class="flex-grow-1" style="min-width: 0;">
                        <!-- STO Response - Button and Display -->
                        <div v-if="rv.response" class="p-3 bg-light rounded border-start border-primary border-3">
                          <div class="d-flex align-items-center justify-content-between mb-1">
                            <strong class="text-primary small"><i class="bi bi-reply me-1"></i>Відповідь СТО</strong>
                            <div v-if="canEdit" class="d-flex gap-2">
                              <button
                                type="button"
                                class="btn btn-sm btn-outline-primary"
                                @click="openResponseModal(rv)"
                                title="Редагувати відповідь"
                              >
                                <i class="bi bi-pencil"></i>
                              </button>
                              <button
                                type="button"
                                class="btn btn-sm btn-outline-danger"
                                @click="deleteReviewResponse(rv.id)"
                                title="Видалити відповідь"
                              >
                                <i class="bi bi-trash"></i>
                              </button>
                            </div>
                          </div>
                          <div class="text-muted mt-1" style="white-space: pre-wrap;">{{ rv.response.text }}</div>
                          <div class="text-muted small mt-1">
                            {{ new Date(rv.response.created_at).toLocaleString('uk-UA') }}
                            <span v-if="rv.response.is_edited" class="text-warning ms-1">(редаговано)</span>
                          </div>
                        </div>
                        <div v-else-if="canEdit">
                          <button
                            type="button"
                            class="btn btn-sm btn-outline-primary"
                            @click="openResponseModal(rv)"
                          >
                            <i class="bi bi-reply me-1"></i>Відповісти
                          </button>
                        </div>
                      </div>

                      <!-- Media gallery (right side) -->
                      <div v-if="rv.media && rv.media.length > 0" class="d-flex gap-2 flex-wrap" style="max-width: 200px; margin-top: -1.75rem;">
                        <div
                          v-for="media in rv.media"
                          :key="media.id"
                          class="position-relative"
                          style="border: 1px solid #dee2e6; border-radius: 4px; overflow: hidden;"
                        >
                          <a
                            :href="media.url"
                            target="_blank"
                            class="d-block"
                          >
                            <img
                              :src="media.url"
                              :alt="media.file_name"
                              style="max-width: 180px; max-height: 120px; display: block; object-fit: cover;"
                            />
                          </a>
                          <button
                            v-if="canEdit"
                            type="button"
                            class="btn btn-sm btn-danger position-absolute"
                            style="top: 4px; right: 4px; opacity: 0.9;"
                            @click="deleteReviewMedia(rv.id, media.id)"
                            title="Видалити фото"
                          >
                            <i class="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-if="reviewsTotalPages > 1" class="d-flex justify-content-between align-items-center mt-2">
                  <span class="text-muted small">Всього: {{ reviewsTotal }}</span>
                  <nav><ul class="pagination pagination-sm mb-0">
                    <li class="page-item" :class="{disabled: reviewsPage===1}">
                      <button class="page-link" @click="loadReviews(reviewsPage-1)">‹</button>
                    </li>
                    <li class="page-item active"><span class="page-link">{{ reviewsPage }}</span></li>
                    <li class="page-item" :class="{disabled: reviewsPage===reviewsTotalPages}">
                      <button class="page-link" @click="loadReviews(reviewsPage+1)">›</button>
                    </li>
                  </ul></nav>
                </div>
              </template>
            </template>

            <!-- ── Tab: Photos ─────────────────────────────────────── -->
            <template v-else-if="activeTab === 'photos'">

              <!-- Upload area -->
              <div class="mb-3">
                <div class="d-flex align-items-center gap-2 flex-wrap mb-2">
                  <label class="btn btn-sm btn-outline-primary mb-0" style="cursor:pointer">
                    <i class="bi bi-upload me-1"></i>Завантажити фото
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      style="display:none"
                      @change="uploadPhotos($event)"
                    />
                  </label>
                  <button
                    class="btn btn-sm btn-outline-secondary"
                    @click="showUrlUpload = !showUrlUpload; showBase64Upload = false; photosError = null"
                  >
                    <i class="bi bi-link-45deg me-1"></i>Завантажити з URL
                  </button>
                  <button
                    class="btn btn-sm btn-outline-info"
                    @click="showBase64Upload = !showBase64Upload; showUrlUpload = false; photosError = null"
                  >
                    <i class="bi bi-clipboard-check me-1"></i>Вставити Base64
                  </button>
                  <span v-if="photosUploading" class="text-muted small">
                    <span class="spinner-border spinner-border-sm me-1"></span>Завантаження...
                  </span>
                  <span v-if="photosError" class="text-danger small">{{ photosError }}</span>
                </div>

                <!-- URL upload form -->
                <div v-if="showUrlUpload" class="card border-secondary" style="max-width:600px">
                  <div class="card-body p-3">
                    <div class="mb-2">
                      <label class="form-label small mb-1">URL зображення</label>
                      <input
                        v-model="photoUrl"
                        type="text"
                        class="form-control form-control-sm"
                        placeholder="https://example.com/image.jpg"
                        @keydown.enter.prevent="uploadPhotoFromUrl"
                      />
                      <div class="text-muted small mt-1">
                        Підтримуються формати: JPG, PNG, WebP. Зображення буде автоматично конвертовано в WebP.
                      </div>
                    </div>
                    <div class="d-flex gap-2">
                      <button
                        class="btn btn-sm btn-primary"
                        :disabled="!photoUrl.trim() || photosUploading"
                        @click="uploadPhotoFromUrl"
                      >
                        <i class="bi bi-download me-1"></i>Завантажити
                      </button>
                      <button
                        class="btn btn-sm btn-secondary"
                        @click="showUrlUpload = false; photoUrl = ''; photosError = null"
                      >
                        Скасувати
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Base64 upload form -->
                <div v-if="showBase64Upload" class="card border-info" style="max-width:700px">
                  <div class="card-body p-3">
                    <div class="alert alert-info py-2 px-3 small mb-3">
                      <strong>💡 Швидка інструкція:</strong>
                      <ol class="mb-0 mt-1 ps-3" style="line-height:1.6">
                        <li>Відкрийте <strong>Google Maps</strong> → знайдіть СТО → клацніть на <strong>фото</strong> або <strong>Street View</strong></li>
                        <li>Натисніть <code class="bg-white px-1">F12</code> → вкладка <code class="bg-white px-1">Console</code></li>
                        <li>Виконайте команду (скопіюйте і вставте):
                          <div class="mt-1 bg-white p-2 rounded border font-monospace" style="font-size:.7rem; user-select:all; cursor:pointer"
                               @click="copyCanvasCommand">
                            <div>(function(){const c=document.querySelector('canvas');const ctx=c.getContext('2d');const img=ctx.getImageData(0,0,c.width,c.height);const d=img.data;let t=c.height,b=0,l=c.width,r=0;for(let y=0;y&lt;c.height;y++){for(let x=0;x&lt;c.width;x++){const i=(y*c.width+x)*4;if(d[i]+d[i+1]+d[i+2]>30){t=Math.min(t,y);b=Math.max(b,y);l=Math.min(l,x);r=Math.max(r,x);}}}const w=r-l+1,h=b-t+1;const c2=document.createElement('canvas');c2.width=w;c2.height=h;c2.getContext('2d').drawImage(c,l,t,w,h,0,0,w,h);return c2.toDataURL('image/png');})()</div>
                            <i class="bi bi-clipboard ms-2 text-muted"></i>
                          </div>
                          <div class="text-muted mt-1" style="font-size:.7rem">
                            ✂️ Команда автоматично обріже чорні поля
                          </div>
                        </li>
                        <li>Скопіюйте результат (починається з <code class="bg-white px-1">data:image/png;base64,</code>) і вставте нижче</li>
                      </ol>
                    </div>
                    <div class="mb-2">
                      <label class="form-label small mb-1">
                        <i class="bi bi-code-square me-1"></i>Base64 зображення
                      </label>
                      <textarea
                        v-model="photoBase64"
                        class="form-control form-control-sm font-monospace"
                        rows="4"
                        placeholder="data:image/png;base64,iVBORw0KGgo..."
                        style="font-size:.8rem"
                      ></textarea>
                      <div class="form-check mt-2">
                        <input
                          v-model="autoCropBlackBorders"
                          class="form-check-input"
                          type="checkbox"
                          id="autoCropCheck"
                          checked
                        />
                        <label class="form-check-label small" for="autoCropCheck">
                          ✂️ Автоматично обрізати чорні поля
                        </label>
                      </div>
                    </div>
                    <div class="mb-2">
                      <label class="form-label small mb-1">URL джерела (опціонально)</label>
                      <input
                        v-model="photoSourceUrl"
                        type="text"
                        class="form-control form-control-sm"
                        placeholder="https://www.google.com/maps/place/..."
                      />
                      <div class="text-muted small mt-1">
                        Зазвичай це посилання на Google Maps, звідки скопійоване фото
                      </div>
                    </div>
                    <div class="d-flex gap-2">
                      <button
                        class="btn btn-sm btn-primary"
                        :disabled="!photoBase64.trim() || photosUploading"
                        @click="uploadPhotoFromBase64"
                      >
                        <i class="bi bi-cloud-upload me-1"></i>Завантажити
                      </button>
                      <button
                        class="btn btn-sm btn-secondary"
                        @click="showBase64Upload = false; photoBase64 = ''; photoSourceUrl = ''; photosError = null"
                      >
                        Скасувати
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="photosLoading" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
              </div>

              <div v-else-if="!photosList.length" class="text-muted text-center py-5">
                <i class="bi bi-images" style="font-size:2rem"></i>
                <div class="mt-2">Фото відсутні</div>
              </div>

              <div v-else class="row g-3">
                <div
                  v-for="photo in photosList"
                  :key="photo.id"
                  class="col-6 col-md-4 col-lg-3"
                >
                  <div class="card h-100 shadow-sm" :class="{ 'border-primary': photo.is_cover }">
                    <div class="position-relative">
                      <img
                        :src="photo.url"
                        :alt="photo.caption ?? ''"
                        class="card-img-top"
                        style="width:100%; height:160px; max-width:300px; object-fit:cover; cursor:pointer"
                        @click="openPhotoPreview(photo)"
                        loading="lazy"
                      />
                      <span
                        v-if="photo.is_cover"
                        class="badge bg-primary position-absolute"
                        style="top:6px;left:6px;font-size:.65rem"
                      >
                        <i class="bi bi-star-fill me-1"></i>Обкладинка
                      </span>
                    </div>
                    <div class="card-body p-2">
                      <input
                        :value="photo.caption ?? ''"
                        type="text"
                        class="form-control form-control-sm mb-2"
                        placeholder="Підпис..."
                        @change="updatePhotoCaption(photo, $event.target.value)"
                      />
                      <div class="d-flex gap-1 flex-wrap">
                        <button
                          v-if="!photo.is_cover"
                          class="btn btn-sm btn-outline-primary py-0 px-1 flex-fill"
                          title="Зробити обкладинкою"
                          @click="setCover(photo)"
                        >
                          <i class="bi bi-star"></i>
                        </button>
                        <button
                          class="btn btn-sm btn-outline-danger py-0 px-1 flex-fill"
                          title="Видалити"
                          @click="deletePhoto(photo)"
                        >
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </template>

            <div v-if="saveError" class="alert alert-danger py-2 small mt-3 mb-0">{{ saveError }}</div>
          </div>

      <template #footer>
        <div></div>
        <div class="d-flex gap-2">
          <button class="btn btn-secondary btn-sm" @click="closeModal">Закрити</button>

          <!-- Кнопки для вкладок з формою -->
          <button
            v-if="['general','vehicle-types','services','amenities','address'].includes(activeTab)"
            class="btn btn-outline-primary btn-sm"
            :disabled="saving"
            @click="saveModal(false)"
          >
            <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
            Зберегти
          </button>
          <button
            v-if="['general','vehicle-types','services','amenities','address'].includes(activeTab)"
            class="btn btn-primary btn-sm"
            :disabled="saving"
            @click="saveModal(true)"
          >
            <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
            Зберегти та зачинити
          </button>

          <!-- Кнопка для вкладки відгуків -->
          <button
            v-if="activeTab === 'reviews' && canEdit && changedReviews.size > 0"
            class="btn btn-success btn-sm"
            :disabled="reviewsSaving"
            @click="saveReviews"
          >
            <span v-if="reviewsSaving" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-check-lg me-1"></i>
            Зберегти зміни ({{ changedReviews.size }})
          </button>
        </div>
      </template>
    </BaseModal>

    <!-- Response Modal -->
    <Teleport to="body">
      <div v-if="responseModalOpen" class="modal-backdrop-simple" style="z-index:1070" @click.self="closeResponseModal">
        <div class="card shadow" style="max-width:600px; margin:10vh auto; max-height:75vh; display:flex; flex-direction:column; overflow:hidden">
          <div class="card-header px-4 py-3 d-flex justify-content-between align-items-center">
            <h5 class="mb-0"><i class="bi bi-reply me-2"></i>Відповідь на відгук</h5>
            <button type="button" class="btn-close" @click="closeResponseModal"></button>
          </div>
          <div class="card-body px-4 py-3" style="overflow-y:auto; flex:1">
            <!-- Review preview -->
            <div class="mb-3 p-3 bg-light rounded">
              <div class="small text-muted mb-1">Відгук від {{ responseModalReview?.author_name }}</div>
              <div class="text-muted" style="white-space: pre-wrap;">{{ responseModalReview?.text }}</div>
            </div>
            <!-- Response textarea -->
            <div class="mb-3">
              <label class="form-label">Ваша відповідь</label>
              <textarea
                v-model="responseModalText"
                class="form-control"
                rows="5"
                placeholder="Введіть відповідь на відгук..."
                @input="responseModalChanged = true"
              ></textarea>
            </div>
          </div>
          <div class="card-footer px-4 py-3 d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-sm btn-secondary" @click="closeResponseModal">
              Скасувати
            </button>
            <button
              v-if="responseModalChanged"
              type="button"
              class="btn btn-sm btn-success"
              @click="saveResponseFromModal"
              :disabled="!responseModalText.trim() || responseModalSaving"
            >
              <span v-if="responseModalSaving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-check-lg me-1"></i>
              {{ responseModalSaving ? 'Збереження...' : 'Зберегти' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- City picker popup -->
    <Teleport to="body">
      <div v-if="cityPickerOpen" class="modal-backdrop-simple" style="z-index:1060" @click.self="closeCityPicker">
        <div class="card shadow"
             style="max-width:520px; margin:10vh auto; max-height:75vh; display:flex; flex-direction:column; overflow:hidden">

          <div class="card-header d-flex justify-content-between align-items-center py-2 px-3">
            <h6 class="mb-0">Оберіть населений пункт</h6>
            <button class="btn btn-sm btn-outline-secondary" @click="closeCityPicker">✕</button>
          </div>

          <div class="px-3 py-2" style="flex-shrink:0; border-bottom:1px solid #dee2e6">
            <input
              ref="citySearchInputRef"
              v-model="cityPickerSearch"
              type="text"
              class="form-control form-control-sm"
              placeholder="Введіть назву населеного пункту..."
              @input="debounceCitySearch"
            />
            <div v-if="cityPickerSearch.length > 0 && cityPickerSearch.length < 2"
                 class="text-muted small mt-1">
              Введіть мінімум 2 символи
            </div>
          </div>

          <div style="overflow-y:auto; flex:1">
            <div v-if="cityPickerLoading" class="text-center py-3">
              <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
            </div>
            <div v-else-if="cityPickerResults.length === 0 && cityPickerSearch.length >= 2"
                 class="text-muted text-center py-3 small">
              Нічого не знайдено
            </div>
            <div v-else class="list-group list-group-flush">
              <button
                v-for="city in cityPickerResults"
                :key="city.id"
                type="button"
                class="list-group-item list-group-item-action py-2 px-3 small"
                @click="selectCity(city)"
              >
                <span class="text-muted me-1">{{ city.city_type_name ?? '' }}</span>
                <strong>{{ city.name_uk }}</strong>
                <span v-if="city.area_region_name" class="text-muted ms-1">({{ city.area_region_name }})</span>
                <span v-if="city.country_name" class="text-muted ms-2 fst-italic">{{ city.country_name }}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </Teleport>
    </div>
  </ListPageWrapper>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch, defineComponent, h } from 'vue'
import ListPageWrapper from '@/components/ListPageWrapper.vue'
import BaseModal from '@/components/BaseModal.vue'
import Pagination from '@/components/Pagination.vue'
import BulkActions from '@/components/BulkActions.vue'
import { useAuth } from '@/composables/useAuth'
import { usePageLayout } from '@/composables/usePageLayout'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import { useUrlFilters } from '@/composables/useUrlFilters'
import { AMENITY_ICONS } from '@/utils/amenityIcons.js'

// ── TimeInput Component ───────────────────────────────────────────────────────
const TimeInput = defineComponent({
  props: {
    modelValue: String,
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const hours = ref('')
    const minutes = ref('')
    const hoursInput = ref(null)
    const minutesInput = ref(null)

    // Parse initial value
    watch(() => props.modelValue, (val) => {
      if (val && /^\d{2}:\d{2}$/.test(val)) {
        const [h, m] = val.split(':')
        hours.value = h
        minutes.value = m
      } else {
        hours.value = ''
        minutes.value = ''
      }
    }, { immediate: true })

    function onHoursInput(e) {
      let val = e.target.value.replace(/\D/g, '').slice(0, 2)
      if (val.length === 2) {
        const h = parseInt(val, 10)
        if (h > 23) val = '23'
        hours.value = val
        nextTick(() => minutesInput.value?.focus())
      } else if (val.length === 1 && parseInt(val, 10) > 2) {
        // If first digit > 2, prepend 0 and move to minutes
        hours.value = '0' + val
        nextTick(() => minutesInput.value?.focus())
      } else {
        hours.value = val
      }
      updateValue()
    }

    function onMinutesInput(e) {
      let val = e.target.value.replace(/\D/g, '').slice(0, 2)
      if (val.length === 2) {
        const m = parseInt(val, 10)
        if (m > 59) val = '59'
      } else if (val.length === 1 && parseInt(val, 10) > 5) {
        val = '0' + val
      }
      minutes.value = val
      updateValue()
    }

    function onHoursBlur() {
      if (hours.value.length === 1) {
        hours.value = '0' + hours.value
      }
      updateValue()
    }

    function onMinutesBlur() {
      if (minutes.value.length === 1) {
        minutes.value = minutes.value + '0'
      } else if (minutes.value === '') {
        minutes.value = '00'
      }
      updateValue()
    }

    function updateValue() {
      if (hours.value === '' && minutes.value === '') {
        emit('update:modelValue', '')
      } else if (hours.value.length === 2 && minutes.value.length === 2) {
        emit('update:modelValue', `${hours.value}:${minutes.value}`)
      }
    }

    return () => h('div', { class: 'd-flex align-items-center gap-1', style: 'width:100px' }, [
      h('input', {
        ref: hoursInput,
        value: hours.value,
        type: 'text',
        class: 'form-control form-control-sm text-center p-1',
        style: 'width:35px',
        placeholder: 'ГГ',
        maxlength: 2,
        onInput: onHoursInput,
        onBlur: onHoursBlur,
      }),
      h('span', { class: 'text-muted' }, ':'),
      h('input', {
        ref: minutesInput,
        value: minutes.value,
        type: 'text',
        class: 'form-control form-control-sm text-center p-1',
        style: 'width:35px',
        placeholder: 'ХХ',
        maxlength: 2,
        onInput: onMinutesInput,
        onBlur: onMinutesBlur,
      }),
    ])
  }
})

const { can, authHeaders } = useAuth()

// Page layout для отодвигания контента при docked модалках
const canEdit       = computed(() => can('sto.edit') || can('*'))
const canEditStatus = computed(() => can('sto.edit') || can('sto.edit.status') || can('*'))
const canDelete     = computed(() => can('sto.delete') || can('*'))

// ── Bulk actions ──────────────────────────────────────────────────────────────
const selectedIds = ref(new Set())
const bulkBusy = ref(false)

const bulkActionsAvailable = computed(() => {
  const actions = []
  if (canEditStatus.value) actions.push('activate', 'deactivate')
  if (canDelete.value) actions.push('delete')
  return actions
})

const allOnPageSelected = computed(() =>
  items.value.length > 0 && items.value.every(row => selectedIds.value.has(row.id))
)

function toggleSelectAll() {
  if (allOnPageSelected.value) {
    items.value.forEach(row => selectedIds.value.delete(row.id))
  } else {
    items.value.forEach(row => selectedIds.value.add(row.id))
  }
  selectedIds.value = new Set(selectedIds.value)
}

function toggleSelectRow(id) {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
  selectedIds.value = new Set(selectedIds.value)
}

async function handleBulkAction(action) {
  const ids = Array.from(selectedIds.value)
  if (!ids.length) return

  bulkBusy.value = true
  try {
    const res = await fetch('/api/admin/sto/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ ids, action }),
    })
    const json = await res.json()
    if (json.status !== 'success') {
      alert(json.message || 'Помилка виконання масової дії')
      return
    }
    selectedIds.value = new Set()
    await load(page.value)
  } catch (err) {
    alert(err.message || 'Помилка з\'єднання')
  } finally {
    bulkBusy.value = false
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STO_TYPES = [
  { value: 'individual',  label: 'Індивідуальне' },
  { value: 'company',     label: 'Компанія' },
  { value: 'network',     label: 'Мережа' },
  { value: 'specialized', label: 'Спеціалізоване' },
  { value: 'mobile',      label: 'Мобільне' },
]

function typeLabel(value) {
  return STO_TYPES.find(t => t.value === value)?.label ?? value ?? '—'
}

const TYPE_BADGE = {
  individual:  'bg-info text-dark',
  company:     'bg-primary',
  network:     'bg-warning text-dark',
  specialized: 'bg-danger',
  mobile:      'bg-success',
}
function typeBadge(v) { return TYPE_BADGE[v] ?? 'bg-secondary' }

// ── Sort icon sub-component (inline) ─────────────────────────────────────────
const SortIcon = {
  props: ['col', 'sortKey', 'sortDir'],
  template: `
    <i v-if="sortKey === col && sortDir === 'asc'"  class="bi bi-chevron-up ms-1"></i>
    <i v-else-if="sortKey === col && sortDir === 'desc'" class="bi bi-chevron-down ms-1"></i>
    <i v-else class="bi bi-chevron-expand ms-1 opacity-25"></i>
  `,
}

// ── List state ────────────────────────────────────────────────────────────────
const items        = ref([])
const loading      = ref(true)
const error        = ref(null)
const page         = ref(1)
const total        = ref(0)
const totalPages   = ref(1)
const search       = ref('')
const filterType   = ref('')
const filterStatus = ref('')
const sortKey      = ref('id')
const sortDir      = ref('desc')
const detailId     = ref(null)

// Синхронизация с URL
const { initFromUrl } = useUrlFilters({
  filters: {
    search,
    type: filterType,
    status: filterStatus,
    page
  },
  sorting: {
    sortKey,
    sortDir
  },
  detail: {
    id: detailId,
    onOpen: async (id) => {
      // Находим запись в списке или загружаем её
      let row = items.value.find(r => r.id === id)
      if (!row) {
        try {
          const res = await fetch(`/api/admin/sto/${id}`, { headers: authHeaders() })
          const json = await res.json()
          if (json.data) {
            row = json.data
          }
        } catch (e) {
          console.error('Failed to load STO:', e)
          return
        }
      }
      if (row) {
        await openModal(row)
      }
    }
  }
})

// ── Inline status toggle ──────────────────────────────────────────────────────
const togglingId = ref(null)

async function toggleStatus(row) {
  if (togglingId.value !== null) return
  togglingId.value = row.id
  try {
    const res  = await fetch(`/api/admin/sto/${row.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify({ is_active: row.is_active ? 0 : 1 }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    row.is_active   = json.data.is_active
    row.updated_at  = json.data.updated_at
  } catch (e) {
    alert('Помилка зміни статусу: ' + e.message)
  } finally {
    togglingId.value = null
  }
}

// ── Inline type change ───────────────────────────────────────────────────────
const changingTypeId = ref(null)

async function changeType(row, newType) {
  if (row.sto_type === newType || changingTypeId.value !== null) return
  changingTypeId.value = row.id
  try {
    const res  = await fetch(`/api/admin/sto/${row.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify({ sto_type: newType }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    row.sto_type = json.data.sto_type ?? newType
  } catch (e) {
    alert('Помилка: ' + e.message)
  } finally {
    changingTypeId.value = null
  }
}

// ── Inline rating edit ────────────────────────────────────────────────────────
const editingRatingId    = ref(null)
const editingRatingValue = ref(null)
const editingRatingOrig  = ref(null)
const ratingInputRef     = ref(null)

function startEditRating(row) {
  editingRatingId.value    = row.id
  editingRatingValue.value = row.rating !== null ? Number(row.rating) : null
  editingRatingOrig.value  = row.rating
  nextTick(() => ratingInputRef.value?.focus())
}

function cancelRating() {
  editingRatingId.value = null
}

async function commitRating(row) {
  if (editingRatingId.value !== row.id) return
  const newVal = editingRatingValue.value
  editingRatingId.value = null

  const orig = editingRatingOrig.value
  const same = (newVal === null && orig === null)
    || (newVal !== null && orig !== null && Number(newVal).toFixed(2) === Number(orig).toFixed(2))
  if (same) return

  try {
    const res  = await fetch(`/api/admin/sto/${row.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify({ rating: newVal !== null && newVal !== '' ? Number(newVal) : null }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    row.rating = json.data?.rating ?? newVal
  } catch (e) {
    alert('Помилка: ' + e.message)
    row.rating = orig
  }
}

// ── Inline name edit ──────────────────────────────────────────────────────────
const editingNameId    = ref(null)
const editingNameValue = ref('')
const editingNameOrig  = ref('')
const savingName       = ref(null)
const nameInputRef     = ref(null)

function startEditName(row) {
  editingNameId.value    = row.id
  editingNameValue.value = row.name_uk ?? ''
  editingNameOrig.value  = row.name_uk ?? ''
  nextTick(() => nameInputRef.value?.focus())
}

function cancelName() {
  editingNameId.value = null
}

async function commitName(row) {
  // blur fires after keydown.enter — guard double-call
  if (editingNameId.value !== row.id) return

  const newVal = editingNameValue.value.trim()
  editingNameId.value = null  // hide input immediately

  if (newVal === editingNameOrig.value || newVal === '') return

  savingName.value = row.id
  try {
    const res  = await fetch(`/api/admin/sto/${row.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify({ name_uk: newVal }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    row.name_uk    = json.data.name_uk
    row.updated_at = json.data.updated_at
  } catch (e) {
    alert('Помилка збереження назви: ' + e.message)
    row.name_uk = editingNameOrig.value  // rollback
  } finally {
    savingName.value = null
  }
}

// ── Sorting ───────────────────────────────────────────────────────────────────
function toggleSort(key) {
  if (sortKey.value !== key) { sortKey.value = key; sortDir.value = 'asc' }
  else if (sortDir.value === 'asc') { sortDir.value = 'desc' }
  else { sortKey.value = 'id'; sortDir.value = 'desc' }
  load(1)
}

// ── Load ──────────────────────────────────────────────────────────────────────
let debounceTimer = null
function debounceLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => load(1), 350)
}

async function load(p = 1) {
  page.value    = p
  loading.value = true
  error.value   = null
  selectedIds.value = new Set()
  try {
    const params = new URLSearchParams({ per_page: 50, page: p, sort_by: sortKey.value, sort_dir: sortDir.value })
    if (search.value.trim()) params.set('search',   search.value.trim())
    if (filterType.value)    params.set('sto_type', filterType.value)
    if (filterStatus.value)  params.set('status',   filterStatus.value)

    const res  = await fetch(`/api/admin/sto?${params}`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    items.value      = json.data ?? []
    total.value      = json.pagination?.total ?? 0
    totalPages.value = json.pagination?.total_pages ?? 1
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// ── Modal core ────────────────────────────────────────────────────────────────
const modalOpen  = ref(false)
const modalData  = ref({})
const modalForm  = ref({})
const saving     = ref(false)
const saveError  = ref(null)

// ── Tracking unsaved changes ──────────────────────────────────────────────────
const originalFormState = ref(null)
const originalVtState = ref(null)
const originalBrandsState = ref(null)
const originalServicesState = ref(null)
const originalAmenitiesState = ref(null)

const hasUnsavedChanges = computed(() => {
  if (!modalOpen.value) return false

  // Check general tab changes
  if (originalFormState.value && JSON.stringify(modalForm.value) !== JSON.stringify(originalFormState.value)) {
    return true
  }

  // Check vehicle types tab changes
  if (vtLoaded.value && originalVtState.value) {
    const currentVt = [...checkedVtIds.value].sort().join(',')
    const currentBrands = [...checkedBrandIds.value].sort().join(',')
    if (currentVt !== originalVtState.value || currentBrands !== originalBrandsState.value) {
      return true
    }
  }

  // Check services tab changes
  if (servicesLoaded.value && originalServicesState.value) {
    const currentServices = JSON.stringify(servicesGroups.value)
    if (currentServices !== originalServicesState.value) {
      return true
    }
  }

  // Check amenities tab changes
  if (amenitiesLoaded.value && originalAmenitiesState.value) {
    const currentAmenities = [...checkedAmenityIds.value].sort().join(',')
    if (currentAmenities !== originalAmenitiesState.value) {
      return true
    }
  }

  return false
})

// Enable beforeunload warning when modal is open with unsaved changes
useUnsavedChanges(() => modalOpen.value && hasUnsavedChanges.value)

// ── Tabs ──────────────────────────────────────────────────────────────────────
const activeTab = ref('general')

async function switchTab(tab) {
  activeTab.value = tab
  if (tab === 'vehicle-types' && !vtLoaded.value)       await Promise.all([loadVehicleTypes(), loadCarBrands()])
  if (tab === 'services'      && !servicesLoaded.value)  await loadServices()
  if (tab === 'amenities'     && !amenitiesLoaded.value) await loadAmenities()
  if (tab === 'address'       && !addressLoaded.value)   await loadAddresses()
  if (tab === 'employees'     && !employeesLoaded.value) await loadEmployees()
  if (tab === 'bookings'      && !bookingsLoaded.value)  await loadBookings()
  if (tab === 'reviews'       && !reviewsLoaded.value)   await loadReviews()
  if (tab === 'photos'        && !photosLoaded.value)    await loadPhotos()
}

// ── Tab: Vehicle Types ────────────────────────────────────────────────────────
const vtLoading    = ref(false)
const vtLoaded     = ref(false)
const vtError      = ref(null)
const vtList       = ref([])
const checkedVtIds = ref(new Set())

function toggleVt(id) {
  const s = new Set(checkedVtIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  checkedVtIds.value = s
}

async function loadVehicleTypes() {
  vtLoading.value = true
  vtError.value   = null
  try {
    const res  = await fetch(`/api/admin/sto/${modalData.value.id}/vehicle-types`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    vtList.value       = json.data ?? []
    checkedVtIds.value = new Set(vtList.value.filter(v => v.is_active).map(v => v.id))
    vtLoaded.value     = true
    // Save original state
    originalVtState.value = [...checkedVtIds.value].sort().join(',')
  } catch (e) {
    vtError.value = e.message
  } finally {
    vtLoading.value = false
  }
}

async function saveVehicleTypes(shouldClose = true) {
  saving.value    = true
  saveError.value = null
  try {
    let res  = await fetch(`/api/admin/sto/${modalData.value.id}/vehicle-types`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify({ vehicle_type_ids: [...checkedVtIds.value] }),
    })
    let json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка збереження типів ТС')

    res  = await fetch(`/api/admin/sto/${modalData.value.id}/car-brands`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify({ car_brand_ids: [...checkedBrandIds.value] }),
    })
    json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка збереження марок')

    // Reset original states after successful save
    originalVtState.value = [...checkedVtIds.value].sort().join(',')
    originalBrandsState.value = [...checkedBrandIds.value].sort().join(',')

    if (shouldClose) closeModal()
  } catch (e) {
    saveError.value = e.message
  } finally {
    saving.value = false
  }
}

// ── Tab: Vehicle Types — Car Brands ──────────────────────────────────────────
const brandsLoading   = ref(false)
const brandsLoaded    = ref(false)
const brandsError     = ref(null)
const brandsList      = ref([])
const checkedBrandIds = ref(new Set())
const brandSearch     = ref('')

const filteredBrands = computed(() => {
  const q = brandSearch.value.trim().toLowerCase()
  return q ? brandsList.value.filter(b => b.name.toLowerCase().includes(q)) : brandsList.value
})

function toggleBrand(id) {
  const s = new Set(checkedBrandIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  checkedBrandIds.value = s
}

async function loadCarBrands() {
  brandsLoading.value = true
  brandsError.value   = null
  try {
    const res  = await fetch(`/api/admin/sto/${modalData.value.id}/car-brands`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    brandsList.value      = json.data ?? []
    checkedBrandIds.value = new Set(brandsList.value.filter(b => b.is_active).map(b => b.id))
    brandsLoaded.value    = true
    // Save original state
    originalBrandsState.value = [...checkedBrandIds.value].sort().join(',')
  } catch (e) {
    brandsError.value = e.message
  } finally {
    brandsLoading.value = false
  }
}

// ── Tab: Services ─────────────────────────────────────────────────────────────
const servicesLoading    = ref(false)
const servicesLoaded     = ref(false)
const servicesError      = ref(null)
const servicesGroups     = ref([])          // [{id, name, services:[{id,name,active}]}]
const checkedServiceIds  = ref(new Set())

function toggleService(id) {
  const s = new Set(checkedServiceIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  checkedServiceIds.value = s
}

async function loadServices() {
  servicesLoading.value = true
  servicesError.value   = null
  try {
    const res  = await fetch(`/api/admin/sto/${modalData.value.id}/services`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    servicesGroups.value   = json.data.groups ?? []
    checkedServiceIds.value = new Set(
      servicesGroups.value.flatMap(g => g.services.filter(s => s.active).map(s => s.id))
    )
    servicesLoaded.value = true
    // Save original state
    originalServicesState.value = JSON.stringify(servicesGroups.value)
  } catch (e) {
    servicesError.value = e.message
  } finally {
    servicesLoading.value = false
  }
}

// ── Tab: Amenities ────────────────────────────────────────────────────────────
const amenitiesLoading   = ref(false)
const amenitiesLoaded    = ref(false)
const amenitiesError     = ref(null)
const amenitiesList      = ref([])
const checkedAmenityIds  = ref(new Set())

function toggleAmenity(id) {
  const s = new Set(checkedAmenityIds.value)
  s.has(id) ? s.delete(id) : s.add(id)
  checkedAmenityIds.value = s
}

async function loadAmenities() {
  amenitiesLoading.value = true
  amenitiesError.value   = null
  try {
    const res  = await fetch(`/api/admin/sto/${modalData.value.id}/amenities`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    amenitiesList.value     = json.data ?? []
    checkedAmenityIds.value = new Set(amenitiesList.value.filter(a => a.active).map(a => a.id))
    amenitiesLoaded.value   = true
    // Save original state
    originalAmenitiesState.value = [...checkedAmenityIds.value].sort().join(',')
  } catch (e) {
    amenitiesError.value = e.message
  } finally {
    amenitiesLoading.value = false
  }
}

async function saveAmenities(shouldClose = true) {
  saving.value    = true
  saveError.value = null
  try {
    const res  = await fetch(`/api/admin/sto/${modalData.value.id}/amenities`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify({ amenity_ids: [...checkedAmenityIds.value] }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка збереження')

    // Reset original state after successful save
    originalAmenitiesState.value = [...checkedAmenityIds.value].sort().join(',')

    if (shouldClose) closeModal()
  } catch (e) {
    saveError.value = e.message
  } finally {
    saving.value = false
  }
}

// ── Tab: Address ──────────────────────────────────────────────────────────────
const addressLoading = ref(false)
const addressLoaded  = ref(false)
const addressError   = ref(null)
const addressList    = ref([])

// Per-address edit state
const addrForms = ref({})   // addrId → { country_id, oblast_id, district_id, city_id, city_name, city_type_name, address_detail, description }

// Geographic lists
const countriesList   = ref([])
const countriesLoaded = ref(false)
const oblastsByAddr   = ref({})    // addrId → []
const districtsByAddr = ref({})    // addrId → []

// City picker
const cityPickerOpen    = ref(false)
const cityPickerAddrId  = ref(null)
const cityPickerSearch  = ref('')
const cityPickerLoading = ref(false)
const cityPickerResults = ref([])
const citySearchInputRef = ref(null)
let cityPickerTimer = null

function initAddrForm(addr) {
  addrForms.value[addr.id] = {
    country_id:     addr.country_id    ?? null,
    oblast_id:      addr.oblast_id     ?? null,
    district_id:    addr.district_id   ?? null,
    city_id:        addr.city_id       ?? null,
    city_name:      addr.city_name     ?? '',
    city_type_name: addr.city_type_name ?? '',
    address_detail: addr.address_detail ?? '',
    postal_code:    addr.postal_code   ?? '',
    description:    addr.description   ?? '',
    latitude:       addr.latitude      ?? null,
    longitude:      addr.longitude     ?? null,
  }
}

async function createAddress() {
  addressLoading.value = true
  try {
    const res = await fetch(`/api/admin/sto/${modalData.value.id}/addresses`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify({}),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка створення адреси')

    // Reload addresses list
    await loadAddresses()
  } catch (e) {
    alert('Помилка: ' + e.message)
  } finally {
    addressLoading.value = false
  }
}

async function loadAddresses() {
  addressLoading.value = true
  addressError.value   = null
  try {
    const res  = await fetch(`/api/admin/sto/${modalData.value.id}/addresses`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    addressList.value = json.data ?? []
    addrForms.value   = {}
    for (const addr of addressList.value) initAddrForm(addr)
    addressLoaded.value = true

    // Load countries (once per session)
    if (!countriesLoaded.value) await loadCountries()

    // Pre-load oblasts/districts for each address
    for (const addr of addressList.value) {
      if (addrForms.value[addr.id].country_id) {
        await loadOblasts(addr.id)
        if (addrForms.value[addr.id].oblast_id) await loadDistricts(addr.id)
      }
    }
  } catch (e) {
    addressError.value = e.message
  } finally {
    addressLoading.value = false
  }
}

async function loadCountries() {
  try {
    const res  = await fetch('/api/admin/geography/countries?per_page=200', { headers: authHeaders() })
    const json = await res.json()
    if (res.ok) { countriesList.value = json.data ?? []; countriesLoaded.value = true }
  } catch {}
}

async function loadOblasts(addrId) {
  const cid = addrForms.value[addrId]?.country_id
  if (!cid) { oblastsByAddr.value[addrId] = []; return }
  try {
    const res  = await fetch(`/api/admin/geography/areas?country_id=${cid}&per_page=500&sort_by=name_uk`, { headers: authHeaders() })
    const json = await res.json()
    oblastsByAddr.value[addrId] = res.ok ? (json.data ?? []) : []
  } catch { oblastsByAddr.value[addrId] = [] }
}

async function loadDistricts(addrId) {
  const oid = addrForms.value[addrId]?.oblast_id
  if (!oid) { districtsByAddr.value[addrId] = []; return }
  try {
    const res  = await fetch(`/api/admin/geography/districts?area_id=${oid}&per_page=500&sort_by=name_uk`, { headers: authHeaders() })
    const json = await res.json()
    districtsByAddr.value[addrId] = res.ok ? (json.data ?? []) : []
  } catch { districtsByAddr.value[addrId] = [] }
}

async function onCountryChange(addrId) {
  const f = addrForms.value[addrId]
  f.oblast_id = null; f.district_id = null; f.city_id = null; f.city_name = ''; f.city_type_name = ''
  oblastsByAddr.value[addrId] = []; districtsByAddr.value[addrId] = []
  await loadOblasts(addrId)
}

async function onOblastChange(addrId) {
  const f = addrForms.value[addrId]
  f.district_id = null; f.city_id = null; f.city_name = ''; f.city_type_name = ''
  districtsByAddr.value[addrId] = []
  await loadDistricts(addrId)
}

function onDistrictChange(addrId) {
  const f = addrForms.value[addrId]
  f.city_id = null; f.city_name = ''; f.city_type_name = ''
}

function openCityPicker(addrId) {
  cityPickerAddrId.value  = addrId
  cityPickerSearch.value  = ''
  cityPickerResults.value = []
  cityPickerOpen.value    = true
  nextTick(() => citySearchInputRef.value?.focus())
}

function closeCityPicker() {
  cityPickerOpen.value    = false
  cityPickerAddrId.value  = null
  cityPickerResults.value = []
}

function debounceCitySearch() {
  clearTimeout(cityPickerTimer)
  if (cityPickerSearch.value.length < 2) { cityPickerResults.value = []; return }
  cityPickerTimer = setTimeout(fetchCities, 300)
}

async function fetchCities() {
  if (cityPickerSearch.value.length < 2) return
  cityPickerLoading.value = true
  try {
    const addrId = cityPickerAddrId.value
    const form   = addrForms.value[addrId]
    const p      = new URLSearchParams({ search: cityPickerSearch.value, per_page: 50, status: 'active', sort_by: 'name_uk' })
    const areaId = form?.district_id ?? form?.oblast_id
    if (form?.country_id) p.set('country_id', form.country_id)
    if (areaId)           p.set('area_region_id', areaId)
    const res  = await fetch(`/api/admin/geography/cities?${p}`, { headers: authHeaders() })
    const json = await res.json()
    cityPickerResults.value = res.ok ? (json.data ?? []) : []
  } catch { cityPickerResults.value = [] }
  finally { cityPickerLoading.value = false }
}

function selectCity(city) {
  const addrId = cityPickerAddrId.value
  if (!addrId || !addrForms.value[addrId]) return
  const f = addrForms.value[addrId]
  f.city_id       = city.id
  f.city_name     = city.name_uk
  f.city_type_name = city.city_type_name ?? ''
  closeCityPicker()
}

async function saveAddresses(shouldClose = true) {
  // Validate all addresses
  for (const addr of addressList.value) {
    if (!addrForms.value[addr.id]?.city_id) {
      saveError.value = addressList.value.length > 1
        ? `Адреса #${addr.id}: оберіть населений пункт`
        : "Оберіть населений пункт"
      return
    }
  }

  saving.value    = true
  saveError.value = null
  try {
    for (const addr of addressList.value) {
      const form = addrForms.value[addr.id]
      const res  = await fetch(`/api/admin/sto/${modalData.value.id}/addresses/${addr.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body:    JSON.stringify({
          city_id:        form.city_id,
          address_detail: form.address_detail?.trim() || null,
          postal_code:    form.postal_code?.trim()    || null,
          description:    form.description?.trim()    || null,
          latitude:       form.latitude !== null && form.latitude !== '' ? Number(form.latitude) : null,
          longitude:      form.longitude !== null && form.longitude !== '' ? Number(form.longitude) : null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message ?? 'Помилка збереження')

      // Update address in list and reinit form
      const idx = addressList.value.findIndex(a => a.id === addr.id)
      if (idx !== -1) { Object.assign(addressList.value[idx], json.data); initAddrForm(json.data) }

      // Update address text in main table row (use last address's text)
      const stoIdx = items.value.findIndex(r => r.id === modalData.value.id)
      if (stoIdx !== -1 && json.data.address_uk != null) items.value[stoIdx].address = json.data.address_uk
    }
    if (shouldClose) closeModal()
  } catch (e) {
    saveError.value = e.message
  } finally {
    saving.value = false
  }
}

// ── Open / Close ──────────────────────────────────────────────────────────────
async function openModal(row) {
  // Fetch fresh data so inline edits (type, rating, etc.) are always reflected
  try {
    const res  = await fetch(`/api/admin/sto/${row.id}`, { headers: authHeaders() })
    const json = await res.json()
    if (json.data) Object.assign(row, json.data)
  } catch { /* use existing row on error */ }

  modalData.value = { ...row }
  modalForm.value = {
    sto_type:       row.sto_type,
    is_active:      row.is_active,
    is_verified:    !!row.is_verified,
    is_official:    !!row.is_official,
    name_uk:        row.name_uk ?? '',
    name_en:        row.name_en ?? '',
    name_ru:        row.name_ru ?? '',
    description_uk: row.description_uk ?? '',
    description_en: row.description_en ?? '',
    description_ru: row.description_ru ?? '',
    rating:         row.rating,
    founded_year:   row.founded_year   ?? null,
    posts_count:    row.posts_count    ?? null,
    email:          row.email          ?? '',
    website:        row.website        ?? '',
    logo_key:       row.logo_key       ?? '',
    weekday_start:  row.weekday_start  ?? '',
    weekday_end:    row.weekday_end    ?? '',
    saturday_start: row.saturday_start ?? '',
    saturday_end:   row.saturday_end   ?? '',
    sunday_start:   row.sunday_start   ?? '',
    sunday_end:     row.sunday_end     ?? '',
  }
  saveError.value       = null
  activeTab.value       = 'general'
  phonesList.value      = []
  phonesError.value     = null
  phonesLoading.value   = false
  newPhoneRaw.value     = ''
  vtLoaded.value        = false
  vtList.value          = []
  checkedVtIds.value    = new Set()
  brandsLoaded.value    = false
  brandsList.value      = []
  checkedBrandIds.value = new Set()
  brandSearch.value     = ''
  servicesLoaded.value  = false
  servicesGroups.value  = []
  amenitiesLoaded.value = false
  amenitiesList.value   = []
  checkedAmenityIds.value = new Set()
  addressLoaded.value   = false
  addressList.value     = []
  addrForms.value       = {}
  oblastsByAddr.value   = {}
  districtsByAddr.value = {}
  cityPickerOpen.value  = false
  employeesLoaded.value = false
  employeesList.value   = []
  managersList.value    = []
  positionsList.value   = []
  bookingsLoaded.value  = false
  bookingsList.value    = []
  bookingsFilter.value  = ''
  bookingsPage.value    = 1
  reviewsLoaded.value   = false
  reviewsList.value     = []
  reviewsFilter.value   = ''
  reviewsPage.value     = 1
  photosLoaded.value    = false
  photosList.value      = []
  photosError.value     = null
  showUrlUpload.value   = false
  photoUrl.value        = ''

  // Save original state for change tracking
  originalFormState.value = JSON.parse(JSON.stringify(modalForm.value))

  modalOpen.value = true
  detailId.value = row.id
  loadPhones()
}

function closeModal() {
  // The watcher will handle unsaved changes check
  modalOpen.value = false
  detailId.value = null
}

// ── Save (routes to active tab handler) ──────────────────────────────────────
async function saveModal(shouldClose = true) {
  if (shouldClose) {
    // "Зберегти та закрити" - save ALL tabs with changes
    saving.value = true
    saveError.value = null

    try {
      // Save general tab if has changes
      if (originalFormState.value && JSON.stringify(modalForm.value) !== JSON.stringify(originalFormState.value)) {
        await saveGeneral(false)
        if (saveError.value) return // stop on error
      }

      // Save vehicle types if has changes
      if (vtLoaded.value && originalVtState.value) {
        const currentVt = [...checkedVtIds.value].sort().join(',')
        const currentBrands = [...checkedBrandIds.value].sort().join(',')
        if (currentVt !== originalVtState.value || currentBrands !== originalBrandsState.value) {
          await saveVehicleTypes(false)
          if (saveError.value) return
        }
      }

      // Save services if has changes
      if (servicesLoaded.value && originalServicesState.value) {
        const currentServices = JSON.stringify(servicesGroups.value)
        if (currentServices !== originalServicesState.value) {
          await saveServices(false)
          if (saveError.value) return
        }
      }

      // Save amenities if has changes
      if (amenitiesLoaded.value && originalAmenitiesState.value) {
        const currentAmenities = [...checkedAmenityIds.value].sort().join(',')
        if (currentAmenities !== originalAmenitiesState.value) {
          await saveAmenities(false)
          if (saveError.value) return
        }
      }

      // Reset all flags and close
      originalFormState.value = null
      originalVtState.value = null
      originalBrandsState.value = null
      originalServicesState.value = null
      originalAmenitiesState.value = null
      closeModal()
    } finally {
      saving.value = false
    }
  } else {
    // Regular save (only active tab)
    if (activeTab.value === 'general')       return saveGeneral(false)
    if (activeTab.value === 'vehicle-types') return saveVehicleTypes(false)
    if (activeTab.value === 'services')      return saveServices(false)
    if (activeTab.value === 'amenities')     return saveAmenities(false)
    if (activeTab.value === 'address')       return saveAddresses(false)
  }
}

// ── Phones ────────────────────────────────────────────────────────────────────
const phonesLoading = ref(false)
const phonesError   = ref(null)
const phonesList    = ref([])
const newPhoneRaw   = ref('')

async function loadPhones() {
  phonesLoading.value = true
  phonesError.value   = null
  try {
    const res  = await fetch(`/api/admin/sto/${modalData.value.id}/phones`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    // Normalize: add `raw` = e164 for existing phones (used when saving)
    phonesList.value = (json.data ?? []).map(p => ({ ...p, raw: p.e164 }))
  } catch (e) {
    phonesError.value = e.message
  } finally {
    phonesLoading.value = false
  }
}

function addPhone() {
  const raw = newPhoneRaw.value.trim()
  if (!raw) return
  phonesList.value.push({ phone_id: null, e164: null, formatted: raw, raw, is_main: phonesList.value.length === 0 })
  newPhoneRaw.value = ''
}

function removePhone(idx) {
  phonesList.value.splice(idx, 1)
  if (phonesList.value.length > 0 && !phonesList.value.some(p => p.is_main)) {
    phonesList.value[0].is_main = true
  }
}

function setMainPhone(idx) {
  phonesList.value.forEach((p, i) => { p.is_main = (i === idx) })
}

async function savePhones() {
  const payload = phonesList.value.map(p => ({ raw: p.raw ?? p.formatted, is_main: !!p.is_main }))
  const res  = await fetch(`/api/admin/sto/${modalData.value.id}/phones`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body:    JSON.stringify({ phones: payload }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? 'Помилка збереження телефонів')
  phonesList.value = (json.data ?? []).map(p => ({ ...p, raw: p.e164 }))
  if (json.main_phone !== undefined) {
    const idx = items.value.findIndex(r => r.id === modalData.value.id)
    if (idx !== -1) items.value[idx].main_phone = json.main_phone
  }
}

/**
 * Normalize time input: if only hours entered (e.g., "9"), append ":00" → "09:00"
 * Always use 2-digit format for hours
 */
function normalizeTime(value) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  // If only digits (hours without minutes), append ":00" with leading zero
  if (/^\d{1,2}$/.test(trimmed)) {
    const hours = parseInt(trimmed, 10)
    return hours < 10 ? `0${hours}:00` : `${hours}:00`
  }

  // If format is H:MM or HH:MM, ensure leading zero for hours
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (match) {
    const hours = parseInt(match[1], 10)
    return hours < 10 ? `0${hours}:${match[2]}` : `${hours}:${match[2]}`
  }

  return trimmed
}

async function saveGeneral(shouldClose = true) {
  if (!modalForm.value.name_uk?.trim()) {
    saveError.value = "Поле «Назва (UK)» обов'язкове"
    return
  }
  saving.value    = true
  saveError.value = null
  try {
    const payload = {
      sto_type:       modalForm.value.sto_type,
      is_active:      modalForm.value.is_active   ? 1 : 0,
      is_verified:    modalForm.value.is_verified  ? 1 : 0,
      is_official:    modalForm.value.is_official  ? 1 : 0,
      name_uk:        modalForm.value.name_uk.trim(),
      name_en:        modalForm.value.name_en?.trim()    || null,
      name_ru:        modalForm.value.name_ru?.trim()    || null,
      description_uk: modalForm.value.description_uk?.trim() || null,
      description_en: modalForm.value.description_en?.trim() || null,
      description_ru: modalForm.value.description_ru?.trim() || null,
      rating:         modalForm.value.rating !== null && modalForm.value.rating !== ''
                        ? Number(modalForm.value.rating) : null,
      founded_year:   modalForm.value.founded_year  || null,
      posts_count:    modalForm.value.posts_count   || null,
      email:          modalForm.value.email?.trim() || null,
      website:        modalForm.value.website?.trim() || null,
      logo_key:       modalForm.value.logo_key?.trim() || null,
      weekday_start:  normalizeTime(modalForm.value.weekday_start),
      weekday_end:    normalizeTime(modalForm.value.weekday_end),
      saturday_start: normalizeTime(modalForm.value.saturday_start),
      saturday_end:   normalizeTime(modalForm.value.saturday_end),
      sunday_start:   normalizeTime(modalForm.value.sunday_start),
      sunday_end:     normalizeTime(modalForm.value.sunday_end),
    }
    const res  = await fetch(`/api/admin/sto/${modalData.value.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:   JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка збереження')

    const idx = items.value.findIndex(r => r.id === modalData.value.id)
    if (idx !== -1) Object.assign(items.value[idx], json.data)
    Object.assign(modalData.value, json.data)
    if (newPhoneRaw.value.trim()) addPhone()
    await savePhones()

    // Reset original state after successful save
    originalFormState.value = JSON.parse(JSON.stringify(modalForm.value))

    if (shouldClose) closeModal()
  } catch (e) {
    saveError.value = e.message
  } finally {
    saving.value = false
  }
}

async function saveServices(shouldClose = true) {
  saving.value    = true
  saveError.value = null
  try {
    const res  = await fetch(`/api/admin/sto/${modalData.value.id}/services`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:   JSON.stringify({ service_ids: [...checkedServiceIds.value] }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка збереження')

    // Reset original state after successful save
    originalServicesState.value = JSON.stringify(servicesGroups.value)

    if (shouldClose) closeModal()
  } catch (e) {
    saveError.value = e.message
  } finally {
    saving.value = false
  }
}

// ── Tab: Employees ────────────────────────────────────────────────────────────
const employeesLoading    = ref(false)
const employeesLoaded     = ref(false)
const employeesError      = ref(null)
const employeesList       = ref([])
const managersList        = ref([])
const positionsList       = ref([])
const togglingEmployeeId  = ref(null)
const updatingEmployeeId  = ref(null)

const positionsGrouped = computed(() => {
  const map = {}
  for (const p of positionsList.value) {
    if (!map[p.group_id]) map[p.group_id] = { group_id: p.group_id, group_name: p.group_name, positions: [] }
    map[p.group_id].positions.push(p)
  }
  return Object.values(map)
})

async function loadEmployees() {
  employeesLoading.value = true
  employeesError.value   = null
  try {
    const res  = await fetch(`/api/admin/sto/${modalData.value.id}/employees`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    employeesList.value  = json.data.employees ?? []
    managersList.value   = json.data.managers  ?? []
    positionsList.value  = json.data.positions ?? []
    employeesLoaded.value = true
  } catch (e) { employeesError.value = e.message }
  finally { employeesLoading.value = false }
}

async function toggleEmployee(emp) {
  if (togglingEmployeeId.value !== null) return
  togglingEmployeeId.value = emp.id
  try {
    const res  = await fetch(`/api/admin/sto/${modalData.value.id}/employees/${emp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:   JSON.stringify({ is_active: emp.is_active ? 0 : 1 }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    emp.is_active = json.data.is_active
  } catch (e) { alert(e.message) }
  finally { togglingEmployeeId.value = null }
}

async function changeEmployeePosition(emp, newPositionId) {
  updatingEmployeeId.value = emp.id
  try {
    const posId = newPositionId !== '' ? parseInt(newPositionId) : null
    const res   = await fetch(`/api/admin/sto/${modalData.value.id}/employees/${emp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:   JSON.stringify({ employee_position_id: posId }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    emp.position_id   = json.data.position_id
    emp.position_name = json.data.position_name
    emp.group_name    = json.data.group_name
  } catch (e) { alert(e.message) }
  finally { updatingEmployeeId.value = null }
}

// ── Tab: Bookings ─────────────────────────────────────────────────────────────
const BOOKING_STATUSES = [
  { value: 'pending',     label: 'Очікує' },
  { value: 'confirmed',   label: 'Підтверджено' },
  { value: 'in_progress', label: 'Виконується' },
  { value: 'completed',   label: 'Завершено' },
  { value: 'cancelled',   label: 'Скасовано' },
  { value: 'no_show',     label: 'Не з\'явився' },
]

const canEditBookings = computed(() => can('bookings.edit') || can('bookings.edit.status') || can('*'))

const bookingsLoading    = ref(false)
const bookingsLoaded     = ref(false)
const bookingsError      = ref(null)
const bookingsList       = ref([])
const bookingsPage       = ref(1)
const bookingsTotal      = ref(0)
const bookingsTotalPages = ref(1)
const bookingsFilter     = ref('')

async function loadBookings(p = 1) {
  bookingsPage.value    = p
  bookingsLoading.value = true
  bookingsError.value   = null
  try {
    const params = new URLSearchParams({ page: p, per_page: 20 })
    if (bookingsFilter.value) params.set('status', bookingsFilter.value)
    const res  = await fetch(`/api/admin/sto/${modalData.value.id}/bookings?${params}`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    bookingsList.value       = json.data ?? []
    bookingsTotal.value      = json.pagination?.total ?? 0
    bookingsTotalPages.value = json.pagination?.total_pages ?? 1
    bookingsLoaded.value     = true
  } catch (e) { bookingsError.value = e.message }
  finally { bookingsLoading.value = false }
}

async function changeBookingStatus(booking, newStatus) {
  try {
    const res  = await fetch(`/api/admin/sto/${modalData.value.id}/bookings/${booking.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:   JSON.stringify({ status: newStatus }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    booking.status = json.data.status
  } catch (e) { alert(e.message) }
}

function bookingStatusLabel(s) { return BOOKING_STATUSES.find(x => x.value === s)?.label ?? s }
function bookingStatusBadge(s) {
  const map = { pending:'bg-secondary', confirmed:'bg-primary', in_progress:'bg-info text-dark',
                completed:'bg-success', cancelled:'bg-danger', no_show:'bg-warning text-dark' }
  return map[s] ?? 'bg-secondary'
}

// ── Tab: Reviews ──────────────────────────────────────────────────────────────
const REVIEW_STATUSES = [
  { value: 'pending',   label: 'На розгляді' },
  { value: 'published', label: 'Опубліковано' },
  { value: 'rejected',  label: 'Відхилено' },
  { value: 'hidden',    label: 'Приховано' },
  { value: 'spam',      label: 'Спам' },
]

const reviewsLoading    = ref(false)
const reviewsLoaded     = ref(false)
const reviewsError      = ref(null)
const reviewsList       = ref([])
const reviewsPage       = ref(1)
const reviewsTotal      = ref(0)
const reviewsTotalPages = ref(1)
const reviewsFilter     = ref('')
const changedReviews    = ref(new Set()) // ID измененных отзывов
const reviewsSaving     = ref(false) // Защита от дребезга

// Response modal
const responseModalOpen = ref(false)
const responseModalReview = ref(null)
const responseModalText = ref('')
const responseModalChanged = ref(false)
const responseModalSaving = ref(false)

async function loadReviews(p = 1) {
  reviewsPage.value    = p
  reviewsLoading.value = true
  reviewsError.value   = null
  try {
    const params = new URLSearchParams({ page: p, per_page: 20 })
    if (reviewsFilter.value) params.set('status', reviewsFilter.value)
    const res  = await fetch(`/api/admin/sto/${modalData.value.id}/reviews?${params}`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    reviewsList.value       = json.data ?? []
    reviewsTotal.value      = json.pagination?.total ?? 0
    reviewsTotalPages.value = json.pagination?.total_pages ?? 1
    reviewsLoaded.value     = true
  } catch (e) { reviewsError.value = e.message }
  finally { reviewsLoading.value = false }
}

async function changeReviewStatus(review, newStatus) {
  try {
    const res  = await fetch(`/api/reviews/${review.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:   JSON.stringify({ status: newStatus }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    review.status          = json.data.status
    review.published_at    = json.data.published_at
    review.rating_moderated = json.data.rating_moderated

    // Показываем новый рейтинг СТО если он был пересчитан
    if (json.data.sto_rating !== null && json.data.sto_rating !== undefined) {
      console.log(`Рейтинг СТО оновлено: ${json.data.sto_rating}`)
      // Обновляем рейтинг в модальном окне если он там есть
      if (modalData.value?.rating !== undefined) {
        modalData.value.rating = json.data.sto_rating
      }
    }
  } catch (e) { alert(e.message) }
}

function reviewStatusLabel(s) { return REVIEW_STATUSES.find(x => x.value === s)?.label ?? s }
function reviewStatusBadge(s) {
  const map = { pending:'bg-secondary', published:'bg-success', rejected:'bg-danger',
                hidden:'bg-warning text-dark', spam:'bg-dark' }
  return map[s] ?? 'bg-secondary'
}

// Форматирует дату в украинский формат DD.MM.YYYY
function formatDateUA(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

// Проверяет можно ли перейти из currentStatus в targetStatus
function canTransitionToStatus(currentStatus, targetStatus) {
  if (currentStatus === targetStatus) return true // Текущий статус всегда доступен

  const transitions = {
    pending:   ['published', 'rejected', 'hidden', 'spam'], // Все доступны
    published: ['rejected', 'hidden', 'spam'],              // Нельзя обратно на pending
    rejected:  ['pending', 'published', 'hidden', 'spam'],  // Можно пересмотреть
    hidden:    ['pending', 'published', 'rejected', 'spam'], // Можно вернуть
    spam:      ['pending', 'rejected'],                     // На случай ошибки
  }

  return transitions[currentStatus]?.includes(targetStatus) ?? true
}

// Отмечает отзыв как измененный
function markReviewChanged(reviewId) {
  changedReviews.value.add(reviewId)
  hasUnsavedChanges.value = true
}

// Сохраняет измененные отзывы
async function saveReviews() {
  if (changedReviews.value.size === 0) return
  if (reviewsSaving.value) return // Защита от дребезга

  reviewsSaving.value = true

  try {
    const promises = []
    for (const reviewId of changedReviews.value) {
      const review = reviewsList.value.find(r => r.id === reviewId)
      if (!review) continue

      const payload = {
        title: review.title || null,
        text: review.text,
      }

      // Для гостевых отзывов добавляем имя и email
      if (review.is_guest) {
        payload.guest_name = review.guest_name
        payload.guest_email = review.guest_email || null
      }

      promises.push(
        fetch(`/api/reviews/${reviewId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify(payload),
        })
      )
    }

    const results = await Promise.all(promises)
    const allOk = results.every(r => r.ok)

    if (allOk) {
      changedReviews.value.clear()
      hasUnsavedChanges.value = false
      alert('Відгуки збережено успішно')
    } else {
      throw new Error('Деякі відгуки не вдалося зберегти')
    }
  } catch (e) {
    alert(`Помилка збереження відгуків: ${e.message}`)
  } finally {
    reviewsSaving.value = false
  }
}

async function deleteReviewMedia(reviewId, mediaId) {
  if (!confirm('Видалити це фото?')) return

  try {
    const response = await fetch(`/api/admin/reviews/media/${mediaId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Помилка видалення')
    }

    // Удаляем из локального списка
    const review = reviewsList.value.find(r => r.id === reviewId)
    if (review && review.media) {
      review.media = review.media.filter(m => m.id !== mediaId)
    }

    alert('Фото видалено')
  } catch (e) {
    alert(`Помилка: ${e.message}`)
  }
}

// ── Review Responses ──────────────────────────────────────────────────
function openResponseModal(review) {
  responseModalReview.value = review
  responseModalText.value = review.response?.text || ''
  responseModalChanged.value = false
  responseModalOpen.value = true
}

function closeResponseModal() {
  if (responseModalChanged.value && !confirm('Є незбережені зміни. Закрити без збереження?')) {
    return
  }
  responseModalOpen.value = false
  responseModalReview.value = null
  responseModalText.value = ''
  responseModalChanged.value = false
  responseModalSaving.value = false
}

async function saveResponseFromModal() {
  if (!responseModalReview.value || responseModalSaving.value) return

  const reviewId = responseModalReview.value.id
  responseModalSaving.value = true

  try {
    const response = await fetch(`/api/admin/reviews/${reviewId}/response`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({ text: responseModalText.value.trim() })
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Помилка збереження')
    }

    const data = await response.json()

    // Обновляем локальные данные
    const review = reviewsList.value.find(r => r.id === reviewId)
    if (review) {
      if (!review.response) {
        review.response = {}
      }
      review.response.text = data.data.text
      review.response.created_at = data.data.created_at
      review.response.is_edited = data.data.is_edited
    }

    // Сбрасываем флаг изменений перед закрытием
    responseModalChanged.value = false
    closeResponseModal()
    alert('Відповідь збережено')
  } catch (e) {
    alert(`Помилка: ${e.message}`)
  } finally {
    responseModalSaving.value = false
  }
}

async function deleteReviewResponse(reviewId) {
  if (!confirm('Видалити відповідь СТО?')) return

  try {
    const response = await fetch(`/api/admin/reviews/${reviewId}/response`, {
      method: 'DELETE',
      headers: authHeaders()
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Помилка видалення')
    }

    // Удаляем из локальных данных
    const review = reviewsList.value.find(r => r.id === reviewId)
    if (review) {
      review.response = null
    }

    alert('Відповідь видалено')
  } catch (e) {
    alert(`Помилка: ${e.message}`)
  }
}

// Watch modalOpen to handle close via BaseModal (X button or ESC)
watch(() => modalOpen.value, (newVal, oldVal) => {
  // Only check when closing (true -> false)
  if (oldVal === true && newVal === false) {
    if (hasUnsavedChanges.value) {
      const confirmed = confirm('Є незбережені зміни. Ви впевнені, що хочете закрити вікно?')
      if (!confirmed) {
        // Revert closing
        nextTick(() => { modalOpen.value = true })
        return
      }
    }
    // Clear states on confirmed close
    originalFormState.value = null
    originalVtState.value = null
    originalBrandsState.value = null
    originalServicesState.value = null
    originalAmenitiesState.value = null
    document.body.classList.remove('modal-open')
  }
  if (newVal === true) {
    document.body.classList.add('modal-open')
  }
})

onMounted(() => {
  initFromUrl()
  load(page.value)  // Используем текущее значение page из URL
})

// ── Tab: Photos ───────────────────────────────────────────────────────────────
const photosLoading   = ref(false)
const photosLoaded    = ref(false)
const photosError     = ref(null)
const photosList      = ref([])
const photosUploading = ref(false)
const photosTotal     = computed(() => photosList.value.length)
const showUrlUpload      = ref(false)
const photoUrl           = ref('')
const showBase64Upload   = ref(false)
const photoBase64        = ref('')
const photoSourceUrl     = ref('')
const autoCropBlackBorders = ref(true) // За замовчуванням увімкнено

async function loadPhotos() {
  photosLoading.value = true
  photosError.value   = null
  try {
    const res  = await fetch(`/api/admin/sto/${modalData.value.id}/media`, { headers: authHeaders() })
    const json = await res.json()
    photosList.value  = json.data ?? []
    photosLoaded.value = true
  } catch (e) {
    photosError.value = e.message
  } finally {
    photosLoading.value = false
  }
}

async function uploadPhotos(event) {
  const files = Array.from(event.target.files ?? [])
  event.target.value = ''
  if (!files.length) return

  photosUploading.value = true
  photosError.value     = null
  try {
    for (const file of files) {
      const fd = new FormData()
      fd.append('photo', file)
      const res  = await fetch(`/api/admin/sto/${modalData.value.id}/media`, {
        method:  'POST',
        headers: authHeaders(),
        body:    fd,
      })
      const json = await res.json()
      if (json.status === 'error') throw new Error(json.message)
      photosList.value.push(json.data)
    }
  } catch (e) {
    photosError.value = e.message
  } finally {
    photosUploading.value = false
  }
}

async function uploadPhotoFromUrl() {
  const url = photoUrl.value.trim()
  if (!url) return

  photosUploading.value = true
  photosError.value     = null
  try {
    const res = await fetch(`/api/admin/sto/${modalData.value.id}/media/from-url`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify({ url }),
    })
    const json = await res.json()
    if (json.status === 'error') throw new Error(json.message ?? 'Помилка завантаження')

    photosList.value.push(json.data)
    photoUrl.value = ''
    showUrlUpload.value = false
  } catch (e) {
    photosError.value = e.message
  } finally {
    photosUploading.value = false
  }
}

async function uploadPhotoFromBase64() {
  const base64 = photoBase64.value.trim()
  if (!base64) return

  // Validate base64 format
  if (!base64.startsWith('data:image/')) {
    photosError.value = 'Невірний формат. Очікується: data:image/png;base64,...'
    return
  }

  photosUploading.value = true
  photosError.value     = null
  try {
    const res = await fetch(`/api/admin/sto/${modalData.value.id}/media/from-base64`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify({
        image_data: base64,
        source_url: photoSourceUrl.value.trim() || null,
      }),
    })
    const json = await res.json()
    if (json.status === 'error') throw new Error(json.message ?? 'Помилка завантаження')
    if (!json.data) throw new Error('Відповідь сервера не містить даних')

    photosList.value.push(json.data)
    photoBase64.value = ''
    photoSourceUrl.value = ''
    showBase64Upload.value = false
  } catch (e) {
    photosError.value = e.message
  } finally {
    photosUploading.value = false
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Success feedback (optional: можна додати toast notification)
  }).catch(err => {
    console.error('Failed to copy:', err)
  })
}

function copyCanvasCommand() {
  // Команда для Console, яка обрізає чорні поля
  const command = `(function(){
    const c = document.querySelector('canvas');
    const ctx = c.getContext('2d');
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    let top = c.height, bottom = 0, left = c.width, right = 0;

    // Знаходимо межі непрозорого контенту (не чорного)
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        const brightness = d[i] + d[i+1] + d[i+2];
        if (brightness > 30) { // не чорний піксель
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
          left = Math.min(left, x);
          right = Math.max(right, x);
        }
      }
    }

    const w = right - left + 1;
    const h = bottom - top + 1;
    const c2 = document.createElement('canvas');
    c2.width = w;
    c2.height = h;
    c2.getContext('2d').drawImage(c, left, top, w, h, 0, 0, w, h);
    return c2.toDataURL('image/png');
  })()`;

  copyToClipboard(command)
}

async function deletePhoto(photo) {
  if (!confirm('Видалити фото?')) return
  await fetch(`/api/admin/sto/${modalData.value.id}/media/${photo.id}`, {
    method:  'DELETE',
    headers: authHeaders(),
  })
  photosList.value = photosList.value.filter(p => p.id !== photo.id)
}

async function setCover(photo) {
  await fetch(`/api/admin/sto/${modalData.value.id}/media/${photo.id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body:    JSON.stringify({ is_cover: true }),
  })

  photosList.value.forEach(p => { p.is_cover = p.id === photo.id })

  // Завантажуємо оновлені дані СТО, щоб отримати новий logo_key
  try {
    const res = await fetch(`/api/admin/sto/${modalData.value.id}`, { headers: authHeaders() })
    const json = await res.json()
    if (json.data?.logo_key) {
      modalForm.value.logo_key = json.data.logo_key
      modalData.value.logo_key = json.data.logo_key
    }
  } catch (e) {
    console.error('Помилка оновлення logo_key:', e)
  }
}

async function updatePhotoCaption(photo, caption) {
  await fetch(`/api/admin/sto/${modalData.value.id}/media/${photo.id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body:    JSON.stringify({ caption }),
  })
  photo.caption = caption
}

function openPhotoPreview(photo) {
  window.open(photo.url, '_blank')
}

function getStorageUrl(key) {
  // Формуємо URL для MinIO (localhost/allsto.loc або production storage)
  const isLocal = ['localhost', 'allsto.loc'].includes(window.location.hostname)
  const baseUrl = isLocal
    ? 'https://allsto.loc/storage'
    : 'https://sto.4n.com.ua/storage'
  return `${baseUrl}/${key}`
}
</script>

<style scoped>
.amenity-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-right: 3px;
}
.svc-chip--amenity { display: inline-flex; align-items: center; }

.th-sortable { cursor: pointer; user-select: none; white-space: nowrap; }
.th-sortable:hover { background: #e9ecef; }

/* Active tab highlight */
.nav-tabs .nav-link.active {
  background-color: #f8f9fa !important;
}

.inline-editable {
  display: block;
  cursor: text;
  min-width: 80px;
  padding: 2px 4px;
  border-radius: 4px;
  border: 1px solid transparent;
  transition: border-color .15s;
}
.inline-editable:hover {
  border-color: #86b7fe;
  background: #f8f9fa;
}

.name-input { min-width: 160px; }

.readonly-field {
  padding: 4px 8px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  min-height: 31px;
  line-height: 1.4;
}

/* Sticky tabs in modal */
.modal-tabs-sticky {
  position: sticky;
  top: -16px;
  left: 0;
  right: 0;
  z-index: 100;
  background: #ffffff;
  margin: -0.75rem -1rem 0.5rem -1rem; /* Выходим за padding card-body */
  padding: 0.25rem 1rem 0.5rem;  /* Добавил padding-bottom для зазора */
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

/* Дополнительный отступ для контента после табов */
.modal-tabs-sticky + div {
  padding-top: 0.75rem;
}

/* Уменьшенные отступы для табов в модалке */
.modal-tabs-sticky .nav-link {
  padding: 0.375rem 0.5rem !important;
  font-size: 0.8rem;
}

/* City picker backdrop (nested modal) */
.modal-backdrop-simple {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .45);
  z-index: 1050;
  overflow-y: auto;
}

/* Service chips */
.svc-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
  font-size: 0.8rem;
  cursor: pointer;
  user-select: none;
  transition: background .12s, border-color .12s;
  background: #f8f9fa;
  color: #495057;
}
.svc-chip:hover { border-color: #adb5bd; background: #e9ecef; }
.svc-chip--on {
  background: #e8f0fe;
  border-color: #86b7fe;
  color: #0d47a1;
}
.svc-chip--on:hover { background: #d6e4fd; border-color: #6ea8fe; }
</style>
