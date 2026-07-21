<template>
  <BaseLayout>
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-3 gap-2 flex-wrap">
      <h5 class="mb-0">Імпорт СТО</h5>
      <span class="text-muted small">Результати скрапінгу зовнішніх джерел</span>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <template v-else>
      <!-- Batches table -->
      <div class="card shadow-sm mb-3">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0 small">
            <thead class="table-light">
              <tr>
                <th style="width:50px" class="text-end">ID</th>
                <th>Регіон</th>
                <th style="width:80px" class="text-center">Статус</th>
                <th style="width:90px" class="text-center">Знайдено</th>
                <th style="width:90px" class="text-center">Конфліктів</th>
                <th style="width:90px" class="text-center">Очікують</th>
                <th style="width:90px" class="text-center">Прийнято</th>
                <th style="width:90px" class="text-center">Відхилено</th>
                <th style="width:150px">Створено</th>
                <th style="width:80px"></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="batch in batches" :key="batch.id">
                <tr
                  :class="{ 'table-active': selectedBatch?.id === batch.id }"
                  style="cursor:pointer"
                  @click="selectBatch(batch)"
                >
                  <td class="text-end text-muted">{{ batch.id }}</td>
                  <td>
                    <span class="fw-medium">{{ batch.region_query }}</span>
                    <span class="text-muted ms-1">(ліміт: {{ batch.batch_size }})</span>
                  </td>
                  <td class="text-center">
                    <span class="badge" :class="statusBadge(batch.status)">
                      {{ statusLabel(batch.status) }}
                    </span>
                  </td>
                  <td class="text-center">{{ batch.total_found }}</td>
                  <td class="text-center">
                    <span v-if="batch.total_conflicts > 0" class="text-danger fw-medium">
                      {{ batch.total_conflicts }}
                    </span>
                    <span v-else class="text-muted">0</span>
                  </td>
                  <td class="text-center text-warning fw-medium">{{ batch.pending_count }}</td>
                  <td class="text-center text-success">{{ batch.accepted_count }}</td>
                  <td class="text-center text-muted">{{ batch.rejected_count }}</td>
                  <td class="text-muted">{{ formatDate(batch.created_at) }}</td>
                  <td class="text-end">
                    <button
                      class="btn btn-sm btn-outline-danger py-0 px-1"
                      title="Видалити батч"
                      @click.stop="deleteBatch(batch)"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>

                <!-- Candidates sub-table (expanded when batch selected) -->
                <tr v-if="selectedBatch?.id === batch.id">
                  <td colspan="10" class="p-0 bg-light">
                    <div v-if="candidatesLoading" class="text-center py-3">
                      <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                    </div>
                    <table v-else class="table table-sm align-middle mb-0 small">
                      <thead>
                        <tr class="table-secondary">
                          <th class="ps-4" style="width:50px">ID</th>
                          <th>Назва</th>
                          <th>Адреса</th>
                          <th style="width:80px" class="text-center">Статус</th>
                          <th style="width:80px" class="text-center">Конфл.</th>
                          <th style="width:90px" class="text-center">Джерела</th>
                          <th style="width:80px"></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="c in candidates"
                          :key="c.id"
                          :class="candidateRowClass(c)"
                        >
                          <td class="ps-4 text-muted">{{ c.id }}</td>
                          <td>
                            <span class="fw-medium">{{ c.name || '—' }}</span>
                          </td>
                          <td class="text-muted" style="max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">
                            {{ c.address || '—' }}
                          </td>
                          <td class="text-center">
                            <span class="badge" :class="candidateStatusBadge(c.status)">
                              {{ candidateStatusLabel(c.status) }}
                            </span>
                          </td>
                          <td class="text-center">
                            <span v-if="c.conflicts_count > 0" class="text-danger">{{ c.conflicts_count }}</span>
                            <span v-else class="text-muted">0</span>
                          </td>
                          <td class="text-center">
                            <div class="d-flex flex-wrap gap-1 justify-content-center">
                              <span v-if="c.has_google" class="badge bg-primary" style="font-size:.6rem" title="Google Maps (SerpAPI)">G</span>
                              <span v-if="c.has_osm" class="badge bg-info" style="font-size:.6rem" title="OpenStreetMap">OSM</span>
                              <span v-if="c.has_autoria" class="badge bg-danger" style="font-size:.6rem" title="AUTO.RIA">AR</span>
                              <span v-if="c.has_vsesto" class="badge bg-secondary" style="font-size:.6rem" title="VseSTO.ua">VS</span>
                              <span v-if="c.has_twogis" class="badge bg-success" style="font-size:.6rem" title="2GIS">2G</span>
                              <span v-if="c.has_stoua" class="badge bg-warning text-dark" style="font-size:.6rem" title="Sto.ua">SU</span>
                            </div>
                          </td>
                          <td class="text-end pe-3">
                            <button
                              v-if="c.status === 'pending'"
                              class="btn btn-sm btn-outline-primary py-0 px-1"
                              @click="openCandidate(c)"
                            >
                              Огляд
                            </button>
                            <span v-else class="text-muted">—</span>
                          </td>
                        </tr>
                        <tr v-if="candidates.length === 0">
                          <td colspan="7" class="text-center text-muted py-3">Немає кандидатів</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </template>

              <tr v-if="batches.length === 0">
                <td colspan="10" class="text-center text-muted py-4">
                  Немає батчів. Запустіть <code>php yii sto:scrape -l 20 -o 10</code> щоб зібрати дані.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Candidate detail modal -->
    <Teleport to="body">
      <div v-if="modalCandidate" class="modal-backdrop-simple" @click.self="closeModal">
        <div class="card shadow-lg" style="width:900px; max-width:96vw; margin:6vh auto; max-height:88vh; display:flex; flex-direction:column; overflow:hidden">

        <div class="card-header d-flex align-items-center justify-content-between py-2 px-4">
          <span class="fw-semibold">{{ modalData?.name || 'Кандидат #' + modalCandidate.id }}</span>
          <button class="btn-close btn-sm" @click="closeModal"></button>
        </div>

        <div class="px-4 py-3 overflow-auto flex-grow-1">
          <div v-if="modalLoading" class="text-center py-4">
            <div class="spinner-border text-primary" role="status"></div>
          </div>
          <template v-else>

            <!-- Source summary badges (always visible) -->
            <div class="mb-2">
              <div class="d-flex gap-2 flex-wrap align-items-center mb-1">
                <span class="text-muted small fw-semibold">Джерела даних:</span>
              </div>
              <div class="d-flex gap-2 flex-wrap">
                <div v-if="modalData?.google_data" class="d-inline-flex align-items-center gap-1">
                  <span class="badge bg-primary">Google Maps</span>
                  <button
                    class="btn btn-sm btn-outline-warning py-0 px-1"
                    style="font-size:.7rem; line-height:1"
                    title="Розділити: створити окремий кандидат з цих даних"
                    @click="splitSource('google_data')"
                  ><i class="bi bi-scissors"></i></button>
                </div>
                <div v-if="modalData?.osm_data" class="d-inline-flex align-items-center gap-1">
                  <span class="badge bg-info">OpenStreetMap</span>
                  <button
                    class="btn btn-sm btn-outline-warning py-0 px-1"
                    style="font-size:.7rem; line-height:1"
                    title="Розділити: створити окремий кандидат з цих даних"
                    @click="splitSource('osm_data')"
                  ><i class="bi bi-scissors"></i></button>
                </div>
                <div v-if="modalData?.autoria_data" class="d-inline-flex align-items-center gap-1">
                  <span class="badge bg-danger">AUTO.RIA</span>
                  <button
                    class="btn btn-sm btn-outline-warning py-0 px-1"
                    style="font-size:.7rem; line-height:1"
                    title="Розділити: створити окремий кандидат з цих даних"
                    @click="splitSource('autoria_data')"
                  ><i class="bi bi-scissors"></i></button>
                </div>
                <div v-if="modalData?.vsesto_data" class="d-inline-flex align-items-center gap-1">
                  <span class="badge bg-secondary">VseSTO.ua</span>
                  <button
                    class="btn btn-sm btn-outline-warning py-0 px-1"
                    style="font-size:.7rem; line-height:1"
                    title="Розділити: створити окремий кандидат з цих даних"
                    @click="splitSource('vsesto_data')"
                  ><i class="bi bi-scissors"></i></button>
                </div>
                <div v-if="modalData?.twogis_data" class="d-inline-flex align-items-center gap-1">
                  <span class="badge bg-success">2GIS</span>
                  <button
                    class="btn btn-sm btn-outline-warning py-0 px-1"
                    style="font-size:.7rem; line-height:1"
                    title="Розділити: створити окремий кандидат з цих даних"
                    @click="splitSource('twogis_data')"
                  ><i class="bi bi-scissors"></i></button>
                </div>
                <div v-if="modalData?.stoua_data" class="d-inline-flex align-items-center gap-1">
                  <span class="badge bg-warning text-dark">Sto.ua</span>
                  <button
                    class="btn btn-sm btn-outline-warning py-0 px-1"
                    style="font-size:.7rem; line-height:1"
                    title="Розділити: створити окремий кандидат з цих даних"
                    @click="splitSource('stoua_data')"
                  ><i class="bi bi-scissors"></i></button>
                </div>
              </div>
            </div>

            <!-- Source comparison table (collapsible) -->
            <details class="mb-3">
              <summary class="text-muted mb-2" style="font-size:.8rem; cursor:pointer; user-select:none">
                <strong>Детальне порівняння джерел</strong>
                <span class="text-muted ms-1">(клікніть щоб розгорнути)</span>
              </summary>
            <div class="table-responsive mt-2">
              <table class="table table-bordered table-sm small align-middle">
                <thead class="table-light">
                  <tr>
                    <th style="width:110px">Поле</th>
                    <th v-if="modalData?.google_data">
                      <span class="badge bg-primary">Google Maps</span>
                    </th>
                    <th v-if="modalData?.osm_data">
                      <span class="badge bg-info">OpenStreetMap</span>
                    </th>
                    <th v-if="modalData?.autoria_data">
                      <span class="badge bg-danger">AUTO.RIA</span>
                    </th>
                    <th v-if="modalData?.vsesto_data">
                      <span class="badge bg-secondary">VseSTO.ua</span>
                    </th>
                    <th v-if="modalData?.twogis_data">
                      <span class="badge bg-success">2GIS</span>
                    </th>
                    <th v-if="modalData?.stoua_data">
                      <span class="badge bg-warning text-dark">Sto.ua</span>
                    </th>
                    <th style="width:180px">
                      <span class="badge bg-dark">Прийняте значення</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="field in DISPLAY_FIELDS" :key="field.key" :class="conflictClass(field.key)">
                    <td class="text-muted fw-medium">{{ field.label }}</td>
                    <td v-if="modalData?.google_data">
                      <button
                        v-if="hasValue(modalData.google_data, field.key)"
                        class="btn btn-link btn-sm p-0 text-start"
                        style="font-size:.8rem; line-height:1.3"
                        :class="{ 'fw-bold text-primary': isSelected(field.key, 'google') }"
                        @click="selectValue(field.key, 'google', getValue(modalData.google_data, field.key))"
                      >
                        {{ formatValue(getValue(modalData.google_data, field.key)) }}
                      </button>
                      <span v-else class="text-muted">—</span>
                    </td>
                    <td v-if="modalData?.osm_data">
                      <button
                        v-if="hasValue(modalData.osm_data, field.key)"
                        class="btn btn-link btn-sm p-0 text-start text-info"
                        style="font-size:.8rem; line-height:1.3"
                        :class="{ 'fw-bold': isSelected(field.key, 'osm') }"
                        @click="selectValue(field.key, 'osm', getValue(modalData.osm_data, field.key))"
                      >
                        {{ formatValue(getValue(modalData.osm_data, field.key)) }}
                      </button>
                      <span v-else class="text-muted">—</span>
                    </td>
                    <td v-if="modalData?.autoria_data">
                      <button
                        v-if="hasValue(modalData.autoria_data, field.key)"
                        class="btn btn-link btn-sm p-0 text-start text-danger"
                        style="font-size:.8rem; line-height:1.3"
                        :class="{ 'fw-bold': isSelected(field.key, 'autoria') }"
                        @click="selectValue(field.key, 'autoria', getValue(modalData.autoria_data, field.key))"
                      >
                        {{ formatValue(getValue(modalData.autoria_data, field.key)) }}
                      </button>
                      <span v-else class="text-muted">—</span>
                    </td>
                    <td v-if="modalData?.vsesto_data">
                      <button
                        v-if="hasValue(modalData.vsesto_data, field.key)"
                        class="btn btn-link btn-sm p-0 text-start text-secondary"
                        style="font-size:.8rem; line-height:1.3"
                        :class="{ 'fw-bold': isSelected(field.key, 'vsesto') }"
                        @click="selectValue(field.key, 'vsesto', getValue(modalData.vsesto_data, field.key))"
                      >
                        {{ formatValue(getValue(modalData.vsesto_data, field.key)) }}
                      </button>
                      <span v-else class="text-muted">—</span>
                    </td>
                    <td v-if="modalData?.twogis_data">
                      <button
                        v-if="hasValue(modalData.twogis_data, field.key)"
                        class="btn btn-link btn-sm p-0 text-start text-success"
                        style="font-size:.8rem; line-height:1.3"
                        :class="{ 'fw-bold': isSelected(field.key, 'twogis') }"
                        @click="selectValue(field.key, 'twogis', getValue(modalData.twogis_data, field.key))"
                      >
                        {{ formatValue(getValue(modalData.twogis_data, field.key)) }}
                      </button>
                      <span v-else class="text-muted">—</span>
                    </td>
                    <td v-if="modalData?.stoua_data">
                      <button
                        v-if="hasValue(modalData.stoua_data, field.key)"
                        class="btn btn-link btn-sm p-0 text-start text-warning"
                        style="font-size:.8rem; line-height:1.3"
                        :class="{ 'fw-bold': isSelected(field.key, 'stoua') }"
                        @click="selectValue(field.key, 'stoua', getValue(modalData.stoua_data, field.key))"
                      >
                        {{ formatValue(getValue(modalData.stoua_data, field.key)) }}
                      </button>
                      <span v-else class="text-muted">—</span>
                    </td>
                    <td>
                      <input
                        :value="resolvedValues[field.key] ?? ''"
                        class="form-control form-control-sm"
                        style="font-size:.8rem"
                        @input="onResolvedInput(field.key, $event.target.value)"
                      />
                    </td>
                  </tr>

                  <!-- Map links row — shown when any source has coordinates -->
                  <tr v-if="anySourceHasCoords">
                    <td class="text-muted fw-medium">На карті</td>
                    <td v-if="modalData?.google_data">
                      <a
                        v-if="mapUrl(modalData.google_data)"
                        :href="mapUrl(modalData.google_data)"
                        target="_blank"
                        class="text-primary"
                        style="font-size:.8rem"
                        title="Відкрити в Google Maps"
                      >
                        <i class="bi bi-geo-alt-fill me-1"></i>Maps
                      </a>
                      <span v-else class="text-muted">—</span>
                    </td>
                    <td v-if="modalData?.osm_data">
                      <a
                        v-if="mapUrl(modalData.osm_data)"
                        :href="mapUrl(modalData.osm_data)"
                        target="_blank"
                        class="text-info"
                        style="font-size:.8rem"
                        title="Відкрити в Google Maps"
                      >
                        <i class="bi bi-geo-alt-fill me-1"></i>Maps
                      </a>
                      <span v-else class="text-muted">—</span>
                    </td>
                    <td v-if="modalData?.autoria_data">
                      <a
                        v-if="mapUrl(modalData.autoria_data)"
                        :href="mapUrl(modalData.autoria_data)"
                        target="_blank"
                        class="text-danger"
                        style="font-size:.8rem"
                        title="Відкрити в Google Maps"
                      >
                        <i class="bi bi-geo-alt-fill me-1"></i>Maps
                      </a>
                      <span v-else class="text-muted">—</span>
                    </td>
                    <td v-if="modalData?.vsesto_data">
                      <a
                        v-if="mapUrl(modalData.vsesto_data)"
                        :href="mapUrl(modalData.vsesto_data)"
                        target="_blank"
                        class="text-secondary"
                        style="font-size:.8rem"
                        title="Відкрити в Google Maps"
                      >
                        <i class="bi bi-geo-alt-fill me-1"></i>Maps
                      </a>
                      <span v-else class="text-muted">—</span>
                    </td>
                    <td v-if="modalData?.twogis_data">
                      <a
                        v-if="mapUrl(modalData.twogis_data)"
                        :href="mapUrl(modalData.twogis_data)"
                        target="_blank"
                        class="text-success"
                        style="font-size:.8rem"
                        title="Відкрити в Google Maps"
                      >
                        <i class="bi bi-geo-alt-fill me-1"></i>Maps
                      </a>
                      <span v-else class="text-muted">—</span>
                    </td>
                    <td v-if="modalData?.stoua_data">
                      <a
                        v-if="mapUrl(modalData.stoua_data)"
                        :href="mapUrl(modalData.stoua_data)"
                        target="_blank"
                        class="text-warning"
                        style="font-size:.8rem"
                        title="Відкрити в Google Maps"
                      >
                        <i class="bi bi-geo-alt-fill me-1"></i>Maps
                      </a>
                      <span v-else class="text-muted">—</span>
                    </td>
                    <td>
                      <!-- map link from resolved lat/lng -->
                      <a
                        v-if="resolvedMapUrl"
                        :href="resolvedMapUrl"
                        target="_blank"
                        class="text-dark"
                        style="font-size:.8rem"
                        title="Відкрити прийняті координати в Google Maps"
                      >
                        <i class="bi bi-geo-alt-fill me-1"></i>Google Maps
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            </details>

            <!-- Photos -->
            <div v-if="allPhotos.length > 0" class="mb-3">
              <h6 class="text-muted mb-2" style="font-size:.8rem">Фото з Google Maps</h6>
              <div class="d-flex flex-wrap gap-2">
                <div v-for="(url, i) in allPhotos" :key="i" class="position-relative">
                  <a :href="url" target="_blank" title="Відкрити фото">
                    <img
                      :src="url"
                      :alt="'Фото ' + (i+1)"
                      style="width:120px; height:90px; object-fit:cover; border-radius:4px; border:1px solid #dee2e6"
                    />
                  </a>
                </div>
              </div>
            </div>

            <!-- Conflicts summary -->
            <div v-if="modalConflicts.length > 0" class="alert alert-warning py-2 small mb-2">
              <i class="bi bi-exclamation-triangle me-1"></i>
              <strong>{{ modalConflicts.length }}</strong> конфлікт(и) між джерелами.
              Клацніть на значення щоб обрати правильне, або відредагуйте в колонці «Прийняте».
            </div>

            <!-- City picker (required before accept) -->
            <div class="border rounded p-3 mb-2">
              <label class="form-label small fw-semibold mb-2">
                <i class="bi bi-geo-alt-fill me-1"></i>Місто (обов'язково) <span class="text-danger">*</span>
              </label>
              <div class="d-flex gap-2 align-items-center">
                <div class="readonly-field flex-grow-1 small">
                  <template v-if="selectedCity">
                    <span class="text-muted me-1">{{ selectedCity.city_type_name }}</span>{{ selectedCity.name_uk }}
                    <span v-if="selectedCity.area_region_name" class="text-muted ms-1">({{ selectedCity.area_region_name }})</span>
                  </template>
                  <span v-else class="text-muted">— Оберіть місто —</span>
                </div>
                <button type="button"
                        class="btn btn-sm btn-outline-primary flex-shrink-0"
                        @click="openImportCityPicker">
                  <i class="bi bi-search me-1"></i>Обрати місто
                </button>
              </div>
              <div class="text-muted mt-1" style="font-size:0.72rem">
                Автоматичне визначення міста не завжди працює — краще обрати вручну.
              </div>
            </div>

          </template>
        </div>

        <div class="card-footer d-flex justify-content-between align-items-center px-4 py-2">
          <button class="btn btn-sm btn-outline-danger" :disabled="saving" @click="rejectCandidate">
            <i class="bi bi-x-circle me-1"></i>Відхилити
          </button>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-secondary" @click="closeModal">Скасувати</button>
            <button class="btn btn-sm btn-primary" :disabled="saving" @click="acceptCandidate">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-check-circle me-1"></i>Прийняти
            </button>
          </div>
        </div>

      </div>
    </div>
    </Teleport>

    <!-- City picker for import -->
    <Teleport to="body">
      <div v-if="importCityPickerOpen" class="modal-backdrop-simple" style="z-index:1060" @click.self="closeImportCityPicker">
        <div class="card shadow"
             style="max-width:520px; margin:10vh auto; max-height:75vh; display:flex; flex-direction:column; overflow:hidden">

          <div class="card-header d-flex justify-content-between align-items-center py-2 px-3">
            <h6 class="mb-0">Оберіть місто</h6>
            <button class="btn btn-sm btn-outline-secondary" @click="closeImportCityPicker">✕</button>
          </div>

          <div class="px-3 py-2" style="flex-shrink:0; border-bottom:1px solid #dee2e6">
            <input
              ref="importCitySearchInputRef"
              v-model="importCityPickerSearch"
              type="text"
              class="form-control form-control-sm"
              placeholder="Введіть назву міста..."
              @input="debounceImportCitySearch"
            />
            <div v-if="importCityPickerSearch.length > 0 && importCityPickerSearch.length < 2"
                 class="text-muted small mt-1">
              Введіть мінімум 2 символи
            </div>
          </div>

          <div style="overflow-y:auto; flex:1">
            <div v-if="importCityPickerLoading" class="text-center py-3">
              <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
            </div>
            <div v-else-if="importCityPickerResults.length === 0 && importCityPickerSearch.length >= 2"
                 class="text-muted text-center py-3 small">
              Нічого не знайдено
            </div>
            <div v-else class="list-group list-group-flush">
              <button
                v-for="city in importCityPickerResults"
                :key="city.id"
                type="button"
                class="list-group-item list-group-item-action py-2 px-3 small"
                @click="selectImportCity(city)"
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

  </BaseLayout>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import BaseLayout from '../layouts/BaseLayout.vue'
import { useAuth } from '@/composables/useAuth'
import { formatDate } from '@/utils/date'

const { authHeaders } = useAuth()
const headers = () => ({ ...authHeaders(), 'Content-Type': 'application/json' })

const DISPLAY_FIELDS = [
  { key: 'name',            label: 'Назва (UK)' },
  { key: 'name_ru',         label: 'Назва (RU)' },
  { key: 'name_en',         label: 'Назва (EN)' },
  { key: 'address',         label: 'Адреса (UK)' },
  { key: 'address_ru',      label: 'Адреса (RU)' },
  { key: 'address_en',      label: 'Адреса (EN)' },
  { key: 'postal_code',     label: 'Індекс' },
  { key: 'phone',           label: 'Телефон' },
  { key: 'website',         label: 'Сайт' },
  { key: 'email',           label: 'Email' },
  { key: 'latitude',        label: 'Широта' },
  { key: 'longitude',       label: 'Довгота' },
  { key: 'rating',          label: 'Рейтинг' },
  { key: 'reviews_count',   label: 'Відгуків' },
  { key: 'description',     label: 'Опис (UK)' },
  { key: 'description_ru',  label: 'Опис (RU)' },
  { key: 'description_en',  label: 'Опис (EN)' },
  { key: 'specializations', label: 'Спеціалізація' },
  { key: 'city_id',         label: 'Місто (ID)' },
]

const loading          = ref(true)
const error            = ref(null)
const batches          = ref([])
const selectedBatch    = ref(null)
const candidatesLoading = ref(false)
const candidates       = ref([])

const modalCandidate   = ref(null)
const modalData        = ref(null)
const modalConflicts   = ref([])
const modalLoading     = ref(false)
const saving           = ref(false)
const resolvedValues   = ref({})
const selectedSources  = ref({})  // field → 'google' | 'twogis' | 'stoua'
const selectedCity     = ref(null) // { id, name_uk, city_type_name, area_region_name }

// City picker for import
const importCityPickerOpen    = ref(false)
const importCityPickerSearch  = ref('')
const importCityPickerLoading = ref(false)
const importCityPickerResults = ref([])
const importCitySearchInputRef = ref(null)
let importCityPickerTimer = null

onMounted(() => loadBatches())

async function loadBatches() {
  loading.value = true
  error.value   = null
  try {
    const r = await fetch(`/api/admin/import/batches`, { headers: headers() })
    const j = await r.json()
    batches.value = j.data || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function selectBatch(batch) {
  if (selectedBatch.value?.id === batch.id) {
    selectedBatch.value = null
    candidates.value    = []
    return
  }
  selectedBatch.value    = batch
  candidatesLoading.value = true
  candidates.value        = []
  try {
    const r = await fetch(`/api/admin/import/batches/${batch.id}/candidates`, { headers: headers() })
    const j = await r.json()
    candidates.value = j.data || []
  } finally {
    candidatesLoading.value = false
  }
}

async function reloadBatch() {
  if (!selectedBatch.value) return
  candidatesLoading.value = true
  try {
    const r = await fetch(`/api/admin/import/batches/${selectedBatch.value.id}/candidates`, { headers: headers() })
    const j = await r.json()
    candidates.value = j.data || []
  } finally {
    candidatesLoading.value = false
  }
}

async function deleteBatch(batch) {
  if (!confirm(`Видалити батч #${batch.id} (${batch.region_query})? Всі кандидати будуть видалені.`)) return
  await fetch(`/api/admin/import/batches/${batch.id}`, { method: 'DELETE', headers: headers() })
  if (selectedBatch.value?.id === batch.id) {
    selectedBatch.value = null
    candidates.value    = []
  }
  await loadBatches()
}

async function openCandidate(c) {
  modalCandidate.value  = c
  modalLoading.value    = true
  modalData.value       = null
  modalConflicts.value  = []
  resolvedValues.value  = {}
  selectedSources.value = {}
  selectedCity.value    = null
  try {
    const r = await fetch(`/api/admin/import/candidates/${c.id}`, { headers: headers() })
    const j = await r.json()
    modalData.value      = j.data
    modalConflicts.value = j.conflicts || []

    // Pre-fill resolved values with best available data (prefer Google → OSM → AUTO.RIA → VseSTO → 2GIS → StoUA)
    const sources = ['google_data', 'osm_data', 'autoria_data', 'vsesto_data', 'twogis_data', 'stoua_data']
    for (const field of DISPLAY_FIELDS) {
      for (const src of sources) {
        const val = getValue(j.data?.[src], field.key)
        if (val !== null && val !== '' && val !== undefined) {
          resolvedValues.value[field.key] = formatValue(val)
          break
        }
      }
    }

    // Auto-detect city from address
    await autoDetectCity(j.data)
  } finally {
    modalLoading.value = false
  }
}

/**
 * Auto-detect city from address string and set selectedCity.
 * Mimics backend resolveCityId logic: parse address by comma, try positions [2,3,0,1,4+]
 */
async function autoDetectCity(candidateData) {
  if (!candidateData) return

  // Get address from best available source (prefer google → osm → autoria → vsesto → twogis → stoua)
  const sources = ['google_data', 'osm_data', 'autoria_data', 'vsesto_data', 'twogis_data', 'stoua_data']
  let address = null
  for (const src of sources) {
    address = candidateData[src]?.address ?? candidateData[src]?.address_en
    if (address) break
  }

  if (!address) return

  // Parse address: "вулиця, номер, МІСТО, область, країна" → try positions [2,3,0,1,4+]
  const parts = address.split(',').map(p => p.trim())
  const tryOrder = [2, 3, 0, 1]
  for (let i = 4; i < parts.length; i++) {
    tryOrder.push(i)
  }

  for (const index of tryOrder) {
    if (!parts[index]) continue

    // Remove digits (postal codes like "61000")
    const cityName = parts[index].replace(/\d+/g, '').trim()

    if (cityName.length < 3) continue

    // Search for city in database
    try {
      const p = new URLSearchParams({
        search:   cityName,
        per_page: 1,
        status:   'active',
        sort_by:  'name_uk',
      })
      const res  = await fetch(`/api/admin/geography/cities?${p}`, { headers: headers() })
      const json = await res.json()

      if (res.ok && json.data?.length > 0) {
        const city = json.data[0]
        // Exact match check (case-insensitive)
        if (
          city.name_uk?.toLowerCase() === cityName.toLowerCase() ||
          city.name_ru?.toLowerCase() === cityName.toLowerCase() ||
          city.name_en?.toLowerCase() === cityName.toLowerCase()
        ) {
          selectedCity.value = {
            id:               city.id,
            name_uk:          city.name_uk,
            city_type_name:   city.city_type_name ?? '',
            area_region_name: city.area_region_name ?? '',
          }
          resolvedValues.value['city_id'] = String(city.id)
          return // Found!
        }
      }
    } catch {
      // continue trying other positions
    }
  }
}

function closeModal() {
  modalCandidate.value = null
}

function getValue(sourceData, fieldKey) {
  if (!sourceData) return null
  if (fieldKey === 'phone') return sourceData.phones?.[0] ?? null
  // map Vue field key to JSON key (phone already handled above)
  const jsonKey = fieldKey   // keys match StoRawResult.toArray() snake_case keys
  return sourceData[jsonKey] ?? null
}

function hasValue(sourceData, fieldKey) {
  const v = getValue(sourceData, fieldKey)
  return v !== null && v !== '' && v !== undefined && !(Array.isArray(v) && v.length === 0)
}

function formatValue(val) {
  if (Array.isArray(val)) return val.join(', ')
  if (val === null || val === undefined) return ''
  return String(val)
}

function selectValue(fieldKey, source, val) {
  if (selectedSources.value[fieldKey] === source) {
    // click on already-selected → deselect and clear
    delete selectedSources.value[fieldKey]
    resolvedValues.value[fieldKey] = ''
  } else {
    resolvedValues.value[fieldKey]  = formatValue(val)
    selectedSources.value[fieldKey] = source
  }
}

function isSelected(fieldKey, source) {
  return selectedSources.value[fieldKey] === source
}

function onResolvedInput(fieldKey, value) {
  resolvedValues.value[fieldKey] = value
  // if manually cleared — remove bold from source
  if (value === '') {
    delete selectedSources.value[fieldKey]
  }
}

function conflictClass(fieldKey) {
  const isConflicted = modalConflicts.value.some(c => c.field === fieldKey)
  return isConflicted ? 'table-warning' : ''
}

function mapUrl(sourceData) {
  const lat = sourceData?.latitude
  const lng = sourceData?.longitude
  if (!lat || !lng) return null
  return `https://www.google.com/maps?q=${lat},${lng}&z=17`
}

const anySourceHasCoords = computed(() => {
  const allSources = [
    modalData.value?.google_data,
    modalData.value?.osm_data,
    modalData.value?.autoria_data,
    modalData.value?.vsesto_data,
    modalData.value?.twogis_data,
    modalData.value?.stoua_data
  ]
  return allSources.some(s => s?.latitude && s?.longitude)
})

const resolvedMapUrl = computed(() => {
  const lat = resolvedValues.value['latitude']
  const lng = resolvedValues.value['longitude']
  if (!lat || !lng) return null
  return `https://www.google.com/maps?q=${lat},${lng}&z=17`
})

const allPhotos = computed(() => {
  const seen = new Set()
  const result = []
  const allSources = [
    modalData.value?.google_data,
    modalData.value?.osm_data,
    modalData.value?.autoria_data,
    modalData.value?.vsesto_data,
    modalData.value?.twogis_data,
    modalData.value?.stoua_data
  ]
  for (const src of allSources) {
    for (const url of src?.photos ?? []) {
      if (url && !seen.has(url)) {
        seen.add(url)
        result.push(url)
      }
    }
  }
  return result
})

async function acceptCandidate() {
  // Validate city selection
  if (!selectedCity.value) {
    alert('Будь ласка, оберіть місто перед прийняттям кандидата.')
    return
  }

  saving.value = true
  try {
    const resolvedData = {}
    for (const field of DISPLAY_FIELDS) {
      if (resolvedValues.value[field.key]) {
        resolvedData[field.key] = resolvedValues.value[field.key]
      }
    }

    // Add city_id from selected city
    resolvedData['city_id'] = selectedCity.value.id
    const r = await fetch(`/api/admin/import/candidates/${modalCandidate.value.id}/accept`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        resolved_data: resolvedData,
        google_data:   modalData.value?.google_data   ?? null,
        osm_data:      modalData.value?.osm_data      ?? null,
        autoria_data:  modalData.value?.autoria_data  ?? null,
        vsesto_data:   modalData.value?.vsesto_data   ?? null,
        twogis_data:   modalData.value?.twogis_data   ?? null,
        stoua_data:    modalData.value?.stoua_data    ?? null,
      }),
    })
    const j = await r.json()
    if (j.status === 'error') {
      alert('Помилка: ' + j.message)
      return
    }
    // Закрити модалку та оновити список
    closeModal()
    await reloadBatch()
    await loadBatches()
    if (j.warnings?.length) {
      alert('СТО створено (#' + j.sto_id + '), але:\n' + j.warnings.join('\n'))
    }
  } finally {
    saving.value = false
  }
}

async function rejectCandidate() {
  if (!confirm('Відхилити цього кандидата?')) return
  saving.value = true
  try {
    await fetch(`/api/admin/import/candidates/${modalCandidate.value.id}/reject`, {
      method: 'POST',
      headers: headers(),
    })
    closeModal()
    await reloadBatch()
    await loadBatches()
  } finally {
    saving.value = false
  }
}

function statusBadge(status) {
  return {
    pending:   'bg-secondary',
    running:   'bg-info text-dark',
    completed: 'bg-success',
    failed:    'bg-danger',
  }[status] || 'bg-secondary'
}

function statusLabel(status) {
  return { pending: 'Очікує', running: 'Виконується', completed: 'Завершено', failed: 'Помилка' }[status] || status
}

function candidateStatusBadge(status) {
  return { pending: 'bg-warning text-dark', accepted: 'bg-success', rejected: 'bg-secondary' }[status] || 'bg-secondary'
}

function candidateStatusLabel(status) {
  return { pending: 'Очікує', accepted: 'Прийнято', rejected: 'Відхилено' }[status] || status
}

function candidateRowClass(c) {
  if (c.status === 'accepted') return 'table-success opacity-75'
  if (c.status === 'rejected') return 'text-muted opacity-50'
  return ''
}

async function splitSource(sourceKey) {
  const sourceLabels = {
    google_data:  'Google Maps',
    osm_data:     'OpenStreetMap',
    autoria_data: 'AUTO.RIA',
    vsesto_data:  'VseSTO.ua',
    twogis_data:  '2GIS',
    stoua_data:   'Sto.ua',
  }
  const label = sourceLabels[sourceKey] || sourceKey

  if (!confirm(
    `Розділити джерело "${label}"?\n\n` +
    `• З цього кандидата видаляться дані ${label}\n` +
    `• Створиться новий окремий кандидат тільки з даними ${label}\n` +
    `• Обидва кандидати можна буде окремо прийняти або відхилити`
  )) return

  saving.value = true
  try {
    const res = await fetch(`/api/admin/import/candidates/${modalCandidate.value.id}/split-source`, {
      method:  'POST',
      headers: headers(),
      body:    JSON.stringify({ source: sourceKey }),
    })
    const json = await res.json()

    if (json.status === 'error') {
      alert('Помилка: ' + json.message)
      return
    }

    if (json.merged) {
      alert(
        `Джерело "${label}" розділено та об'єднано!\n\n` +
        `• Поточний кандидат #${json.original_id}\n` +
        `• Об'єднано з існуючим кандидатом #${json.merged_into}\n\n` +
        `Знайдено схожий СТО, тому джерело додано до існуючого кандидата.`
      )
    } else {
      alert(
        `Джерело "${label}" розділено!\n\n` +
        `• Поточний кандидат #${json.original_id}\n` +
        `• Новий кандидат #${json.new_candidate_id}`
      )
    }

    closeModal()
    await reloadBatch()
    await loadBatches()
  } catch (e) {
    alert('Помилка: ' + e.message)
  } finally {
    saving.value = false
  }
}

function openImportCityPicker() {
  importCityPickerOpen.value    = true
  importCityPickerSearch.value  = ''
  importCityPickerResults.value = []
  nextTick(() => importCitySearchInputRef.value?.focus())
}

function closeImportCityPicker() {
  importCityPickerOpen.value = false
}

function debounceImportCitySearch() {
  clearTimeout(importCityPickerTimer)
  if (importCityPickerSearch.value.length < 2) {
    importCityPickerResults.value = []
    return
  }
  importCityPickerTimer = setTimeout(fetchImportCities, 300)
}

async function fetchImportCities() {
  if (importCityPickerSearch.value.length < 2) return
  importCityPickerLoading.value = true
  try {
    const p = new URLSearchParams({
      search:   importCityPickerSearch.value,
      per_page: 50,
      status:   'active',
      sort_by:  'name_uk',
    })
    const res  = await fetch(`/api/admin/geography/cities?${p}`, { headers: headers() })
    const json = await res.json()
    importCityPickerResults.value = res.ok ? (json.data ?? []) : []
  } catch {
    importCityPickerResults.value = []
  } finally {
    importCityPickerLoading.value = false
  }
}

function selectImportCity(city) {
  selectedCity.value = {
    id:                city.id,
    name_uk:           city.name_uk,
    city_type_name:    city.city_type_name ?? '',
    area_region_name:  city.area_region_name ?? '',
  }
  resolvedValues.value['city_id'] = String(city.id)
  closeImportCityPicker()
}
</script>

<style scoped>
.modal-backdrop-simple {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .45);
  z-index: 1050;
  overflow-y: auto;
}

.readonly-field {
  padding: 4px 8px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  min-height: 31px;
  line-height: 1.4;
}
</style>
