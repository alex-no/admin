<template>
  <ListPageWrapper>
    <div>
    <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
      <h5 class="mb-0">Користувачі</h5>
      <div class="d-flex gap-2">
        <input
          v-model="search"
          type="text"
          class="form-control form-control-sm"
          style="width:220px"
          placeholder="Пошук за ім'ям, email..."
          @input="debounceLoad"
        />
        <select v-model="filterStatus" class="form-select form-select-sm" style="width:auto" @change="load(1)">
          <option value="">Всі статуси</option>
          <option value="active">Активні</option>
          <option value="pending">Очікують</option>
          <option value="incomplete">Незавершені</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else>
      <div class="card shadow-sm">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0 small">
            <thead class="table-light">
              <tr>
                <th style="width:50px" class="text-end">ID</th>
                <th class="th-sortable" @click="toggleSort('username')">
                  Username <SortIcon col="username" :sortKey :sortDir />
                </th>
                <th class="th-sortable" @click="toggleSort('email')">
                  Email <SortIcon col="email" :sortKey :sortDir />
                </th>
                <th>Ім'я</th>
                <th>Телефон</th>
                <th class="th-sortable" @click="toggleSort('created_at')">
                  Зареєстровано <SortIcon col="created_at" :sortKey :sortDir />
                </th>
                <th class="th-sortable" @click="toggleSort('status')">
                  Статус <SortIcon col="status" :sortKey :sortDir />
                </th>
                <th style="width:50px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in items" :key="row.id">
                <td class="text-muted text-end">{{ row.id }}</td>
                <td>{{ row.username }}</td>
                <td>
                  {{ row.email }}
                  <i v-if="row.email_verified_at" class="bi bi-check-circle-fill text-success ms-1" title="Email підтверджено"></i>
                </td>
                <td class="text-muted">{{ fullName(row) || '—' }}</td>
                <td class="text-muted">{{ row.phone ?? '—' }}</td>
                <td class="text-muted" style="white-space:nowrap">{{ row.created_at?.slice(0, 10) ?? '—' }}</td>
                <td><span :class="statusBadge(row.status)">{{ statusLabel(row.status) }}</span></td>
                <td>
                  <button class="btn btn-sm btn-outline-secondary" @click="openModal(row)">
                    <i class="bi bi-pencil"></i>
                  </button>
                </td>
              </tr>
              <tr v-if="!items.length">
                <td colspan="8" class="text-center text-muted py-4">Немає даних</td>
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

    <!-- ── Edit Modal ──────────────────────────────────────────────────────── -->
    <BaseModal
      v-model:visible="modalOpen"
      storage-key="users-edit-modal"
      :default-width="900"
      :min-width="700"
      :max-width="1200"
    >
      <template #title>
        <h5 class="mb-0">
          Користувач
          <span class="text-muted fw-normal fs-6">#{{ modalData.id }} — {{ modalData.username }}</span>
        </h5>
      </template>

      <!-- Tab nav -->
      <div class="border-bottom px-3 pt-1 mx-n4 mt-n3" style="flex-shrink:0; background:#fff">
            <ul class="nav nav-tabs border-0">
              <li class="nav-item">
                <button class="nav-link py-2 small text-nowrap"
                        :class="{ active: activeTab === 'general' }"
                        @click="activeTab = 'general'">
                  <i class="bi bi-person me-1"></i>Загальна інформація
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link py-2 small text-nowrap"
                        :class="{ active: activeTab === 'cars' }"
                        @click="switchTab('cars')">
                  <i class="bi bi-car-front me-1"></i>Авто
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link py-2 small text-nowrap"
                        :class="{ active: activeTab === 'managed-stos' }"
                        @click="switchTab('managed-stos')">
                  <i class="bi bi-shield-lock me-1"></i>Доступ до СТО
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link py-2 small text-nowrap"
                        :class="{ active: activeTab === 'employments' }"
                        @click="switchTab('employments')">
                  <i class="bi bi-briefcase me-1"></i>Робота в СТО
                </button>
              </li>
              <li class="nav-item">
                <button class="nav-link py-2 small text-nowrap"
                        :class="{ active: activeTab === 'admin' }"
                        @click="switchTab('admin')">
                  <i class="bi bi-shield-check me-1"></i>Адміністрування
                </button>
              </li>
            </ul>
          </div>

      <!-- Scrollable body -->
      <div>

            <!-- ── Tab: General ─────────────────────────────────────────── -->
            <template v-if="activeTab === 'general'">
              <div class="row g-3 mb-3">
                <div class="col-sm-2">
                  <label class="form-label small mb-1">ID</label>
                  <div class="readonly-field">{{ modalData.id }}</div>
                </div>
                <div class="col-sm-4">
                  <label class="form-label small mb-1">Username</label>
                  <div class="readonly-field">{{ modalData.username }}</div>
                </div>
                <div class="col-sm-3">
                  <label class="form-label small mb-1">Мова інтерфейсу</label>
                  <div class="readonly-field text-muted">{{ langLabel(modalData.language_code) }}</div>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label small mb-1">Email</label>
                <div class="readonly-field">
                  {{ modalData.email }}
                  <span v-if="modalData.email_verified_at" class="text-success ms-1 small">
                    <i class="bi bi-check-circle-fill"></i> підтверджено {{ modalData.email_verified_at?.slice(0, 10) }}
                  </span>
                  <span v-else class="text-warning ms-1 small">
                    <i class="bi bi-exclamation-circle"></i> не підтверджено
                  </span>
                </div>
              </div>

              <div class="row g-3 mb-3">
                <div class="col-sm-4">
                  <label class="form-label small mb-1">Ім'я</label>
                  <input v-model="modalForm.firstname" type="text" class="form-control form-control-sm" />
                </div>
                <div class="col-sm-4">
                  <label class="form-label small mb-1">По батькові</label>
                  <input v-model="modalForm.secondname" type="text" class="form-control form-control-sm" />
                </div>
                <div class="col-sm-4">
                  <label class="form-label small mb-1">Прізвище</label>
                  <input v-model="modalForm.lastname" type="text" class="form-control form-control-sm" />
                </div>
              </div>

              <!-- Two columns: Status | Phones -->
              <div class="row g-3 mb-3">
                <div class="col-md-4">
                  <label class="form-label small mb-1">Статус</label>
                  <select v-model="modalForm.status" class="form-select form-select-sm">
                    <option value="pending">pending — очікує</option>
                    <option value="incomplete">incomplete — незавершений</option>
                    <option value="active">active — активний</option>
                  </select>
                </div>
                <div class="col-md-8">
                  <label class="form-label small mb-1 fw-semibold">
                    <i class="bi bi-telephone me-1"></i>Телефонні номери
                  </label>
                  <div class="border rounded p-2">
                    <div v-if="phonesLoading" class="text-center py-2">
                      <div class="spinner-border spinner-border-sm text-secondary"></div>
                    </div>
                    <div v-else-if="phonesError" class="text-danger small">{{ phonesError }}</div>
                    <template v-else>
                      <div v-for="(ph, idx) in phonesList" :key="idx"
                           class="d-flex align-items-center gap-2 mb-1">
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
                      <div v-if="!phonesList.length" class="text-muted small mb-1">Телефони не додано</div>
                      <div class="d-flex gap-2 mt-1">
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

              <!-- Created / Updated -->
              <div class="row g-3">
                <div class="col-sm-6">
                  <label class="form-label small mb-1">Зареєстровано</label>
                  <div class="readonly-field text-muted small">{{ modalData.created_at }}</div>
                </div>
                <div class="col-sm-6">
                  <label class="form-label small mb-1">Оновлено</label>
                  <div class="readonly-field text-muted small">{{ modalData.updated_at }}</div>
                </div>
              </div>
            </template>

            <!-- ── Tab: Cars ────────────────────────────────────────────── -->
            <template v-else-if="activeTab === 'cars'">
              <div v-if="carsLoading" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
              </div>
              <div v-else-if="carsError" class="alert alert-danger py-2 small">{{ carsError }}</div>
              <template v-else>
                <div v-if="!carsList.length" class="text-muted text-center py-4">Авто не знайдено</div>
                <table v-else class="table table-sm align-middle small mb-0">
                  <thead class="table-light">
                    <tr>
                      <th style="width:30px"></th>
                      <th>Авто</th>
                      <th style="width:80px">Рік</th>
                      <th>VIN</th>
                      <th>Держ. номер</th>
                      <th style="width:100px">Власн. з</th>
                      <th style="width:100px">по</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="car in carsList" :key="car.id">
                      <td>
                        <i v-if="car.is_main" class="bi bi-star-fill text-warning" title="Основне авто"></i>
                      </td>
                      <td>
                        <strong>{{ car.brand_name }}</strong> {{ car.model_name }}
                      </td>
                      <td class="text-muted">{{ car.year ?? '—' }}</td>
                      <td class="text-muted font-monospace" style="font-size:.75rem">{{ car.vin ?? '—' }}</td>
                      <td class="text-muted">{{ car.license_plate ?? '—' }}</td>
                      <td class="text-muted">{{ car.ownership_start ?? '—' }}</td>
                      <td class="text-muted">{{ car.ownership_end ?? '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </template>
            </template>

            <!-- ── Tab: Managed STOs ────────────────────────────────────── -->
            <template v-else-if="activeTab === 'managed-stos'">
              <div v-if="msLoading" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
              </div>
              <div v-else-if="msError" class="alert alert-danger py-2 small">{{ msError }}</div>
              <template v-else>
                <p class="text-muted small mb-2">
                  СТО, до управління якими користувач має доступ на платформі.
                </p>

                <table v-if="msList.length" class="table table-sm align-middle small mb-3">
                  <thead class="table-light">
                    <tr>
                      <th>СТО</th>
                      <th style="width:110px">Тип</th>
                      <th style="width:100px">Додано</th>
                      <th style="width:40px"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="ms in msList" :key="ms.sto_id">
                      <td>
                        {{ ms.sto_name }}
                        <span v-if="!ms.sto_is_active" class="badge bg-danger ms-1" style="font-size:.65rem">неакт.</span>
                      </td>
                      <td><span class="badge" :class="stoBadge(ms.sto_type)">{{ stoTypeLabel(ms.sto_type) }}</span></td>
                      <td class="text-muted">{{ ms.created_at?.slice(0,10) }}</td>
                      <td>
                        <button v-if="canEdit"
                                class="btn btn-sm btn-outline-danger p-0 px-1"
                                :disabled="msDeletingId === ms.sto_id"
                                @click="removeManagedSto(ms)">
                          <span v-if="msDeletingId === ms.sto_id" class="spinner-border spinner-border-sm"></span>
                          <i v-else class="bi bi-trash3"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="text-muted small mb-3">Доступ до СТО не надано</div>

                <!-- Add -->
                <div v-if="canEdit" class="border-top pt-3">
                  <div class="fw-semibold small mb-2">Надати доступ до СТО</div>
                  <div class="d-flex gap-2 align-items-start">
                    <div class="flex-grow-1 position-relative">
                      <input
                        v-model="msSearchTerm"
                        type="text"
                        class="form-control form-control-sm"
                        placeholder="Введіть назву СТО..."
                        @input="debounceStoSearch('ms')"
                        @focus="msStoDropdown = true"
                      />
                      <div v-if="msStoDropdown && (msStoResults.length || msStoLoading)"
                           class="dropdown-menu show w-100 p-0"
                           style="top:100%;max-height:180px;overflow-y:auto;z-index:1060">
                        <div v-if="msStoLoading" class="text-center py-2">
                          <span class="spinner-border spinner-border-sm text-secondary"></span>
                        </div>
                        <button v-for="s in msStoResults" :key="s.id"
                                type="button"
                                class="dropdown-item py-1 small"
                                @mousedown.prevent="selectStoFor('ms', s)">
                          <strong>{{ s.name_uk }}</strong>
                          <span class="text-muted ms-1">#{{ s.id }}</span>
                        </button>
                      </div>
                    </div>
                    <button class="btn btn-primary btn-sm flex-shrink-0"
                            :disabled="!msSelectedSto || msAdding"
                            @click="addManagedSto">
                      <span v-if="msAdding" class="spinner-border spinner-border-sm"></span>
                      <span v-else>Додати</span>
                    </button>
                  </div>
                  <div v-if="msAddError" class="text-danger small mt-1">{{ msAddError }}</div>
                </div>
              </template>
            </template>

            <!-- ── Tab: Employments ─────────────────────────────────────── -->
            <template v-else-if="activeTab === 'employments'">
              <div v-if="empLoading" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
              </div>
              <div v-else-if="empError" class="alert alert-danger py-2 small">{{ empError }}</div>
              <template v-else>
                <p class="text-muted small mb-2">СТО, в яких зареєстрований користувач як співробітник.</p>

                <table v-if="empList.length" class="table table-sm align-middle small mb-3">
                  <thead class="table-light">
                    <tr>
                      <th>СТО</th>
                      <th style="width:200px">Посада</th>
                      <th style="width:110px">Статус</th>
                      <th style="width:40px"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="emp in empList" :key="emp.id">
                      <td>{{ emp.sto_name }}</td>
                      <td>
                        <select v-if="canEdit"
                                class="form-select form-select-sm"
                                :value="emp.position_id ?? ''"
                                :disabled="empUpdatingId === emp.id"
                                @change="changeEmpPosition(emp, $event.target.value)">
                          <option value="">— Без посади —</option>
                          <optgroup v-for="grp in positionsGrouped" :key="grp.group_id" :label="grp.group_name">
                            <option v-for="pos in grp.positions" :key="pos.id" :value="pos.id">{{ pos.name }}</option>
                          </optgroup>
                        </select>
                        <span v-else>
                          <span v-if="emp.group_name" class="text-muted" style="font-size:.75rem">{{ emp.group_name }} / </span>
                          {{ emp.position_name ?? '—' }}
                        </span>
                      </td>
                      <td>
                        <button v-if="canEdit"
                                class="badge border-0 btn p-1"
                                :class="emp.is_active ? 'bg-success' : 'bg-danger'"
                                :disabled="empTogglingId === emp.id"
                                @click="toggleEmpActive(emp)">
                          <span v-if="empTogglingId === emp.id" class="spinner-border spinner-border-sm"></span>
                          <span v-else>{{ emp.is_active ? 'Активний' : 'Неактивний' }}</span>
                        </button>
                        <span v-else class="badge" :class="emp.is_active ? 'bg-success' : 'bg-danger'">
                          {{ emp.is_active ? 'Активний' : 'Неактивний' }}
                        </span>
                      </td>
                      <td>
                        <button v-if="canEdit"
                                class="btn btn-sm btn-outline-danger p-0 px-1"
                                :disabled="empDeletingId === emp.id"
                                @click="removeEmployment(emp)">
                          <span v-if="empDeletingId === emp.id" class="spinner-border spinner-border-sm"></span>
                          <i v-else class="bi bi-trash3"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div v-else class="text-muted small mb-3">Посад не знайдено</div>

                <!-- Add employment -->
                <div v-if="canEdit" class="border-top pt-3">
                  <div class="fw-semibold small mb-2">Додати посаду в СТО</div>
                  <div class="row g-2 align-items-end">
                    <div class="col-sm-5">
                      <label class="form-label small mb-1">СТО</label>
                      <div class="position-relative">
                        <input
                          v-model="empSearchTerm"
                          type="text"
                          class="form-control form-control-sm"
                          placeholder="Введіть назву СТО..."
                          @input="debounceStoSearch('emp')"
                          @focus="empStoDropdown = true"
                        />
                        <div v-if="empStoDropdown && (empStoResults.length || empStoLoading)"
                             class="dropdown-menu show w-100 p-0"
                             style="top:100%;max-height:180px;overflow-y:auto;z-index:1060">
                          <div v-if="empStoLoading" class="text-center py-2">
                            <span class="spinner-border spinner-border-sm text-secondary"></span>
                          </div>
                          <button v-for="s in empStoResults" :key="s.id"
                                  type="button"
                                  class="dropdown-item py-1 small"
                                  @mousedown.prevent="selectStoFor('emp', s)">
                            <strong>{{ s.name_uk }}</strong>
                            <span class="text-muted ms-1">#{{ s.id }}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div class="col-sm-5">
                      <label class="form-label small mb-1">Посада</label>
                      <select v-model="empAddPositionId" class="form-select form-select-sm">
                        <option :value="null">— Без посади —</option>
                        <optgroup v-for="grp in positionsGrouped" :key="grp.group_id" :label="grp.group_name">
                          <option v-for="pos in grp.positions" :key="pos.id" :value="pos.id">{{ pos.name }}</option>
                        </optgroup>
                      </select>
                    </div>
                    <div class="col-sm-2">
                      <button class="btn btn-primary btn-sm w-100"
                              :disabled="!empSelectedSto || empAdding"
                              @click="addEmployment">
                        <span v-if="empAdding" class="spinner-border spinner-border-sm"></span>
                        <span v-else>Додати</span>
                      </button>
                    </div>
                  </div>
                  <div v-if="empAddError" class="text-danger small mt-1">{{ empAddError }}</div>
                </div>
              </template>
            </template>

            <!-- ── Tab: Admin ───────────────────────────────────────────── -->
            <template v-else-if="activeTab === 'admin'">
              <div v-if="adminLoading" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
              </div>
              <template v-else>
                <div class="alert alert-info small">
                  <i class="bi bi-info-circle me-1"></i>
                  Керування доступом до адмін-панелі. Повне управління доступне в
                  <router-link to="/admin-management">Адміністратори</router-link>
                </div>

                <!-- Admin credential status -->
                <div class="card mb-3">
                  <div class="card-body">
                    <h6 class="card-title mb-3">Доступ до адмін-панелі</h6>

                    <div v-if="adminData.access_granted">
                      <div class="d-flex align-items-center gap-2 mb-2">
                        <i class="bi bi-check-circle-fill text-success"></i>
                        <span class="fw-bold">Доступ надано</span>
                      </div>

                      <table class="table table-sm table-borderless mb-0">
                        <tr>
                          <td class="text-muted" style="width: 180px">Статус:</td>
                          <td>
                            <span v-if="adminData.is_enabled" class="badge bg-success">Активний</span>
                            <span v-else class="badge bg-warning">Відключено</span>
                          </td>
                        </tr>
                        <tr>
                          <td class="text-muted">Пароль встановлено:</td>
                          <td>
                            <span v-if="adminData.has_password" class="text-success">✓ Так</span>
                            <span v-else class="text-warning">✗ Ні</span>
                          </td>
                        </tr>
                        <tr v-if="adminData.last_login_at">
                          <td class="text-muted">Останній вхід:</td>
                          <td>{{ formatDate(adminData.last_login_at) }}</td>
                        </tr>
                        <tr v-if="adminData.roles && adminData.roles.length > 0">
                          <td class="text-muted">Ролі:</td>
                          <td>
                            <span v-for="role in adminData.roles" :key="role.id" class="badge bg-primary me-1">
                              {{ role.name }}
                            </span>
                          </td>
                        </tr>
                      </table>

                      <div class="mt-3">
                        <button
                          v-if="!adminData.has_password"
                          class="btn btn-sm btn-outline-primary me-2"
                          @click="copyFirstLoginLink"
                        >
                          <i class="bi bi-link me-1"></i>Скопіювати посилання для першого входу
                        </button>
                        <button
                          v-if="!adminData.is_enabled"
                          class="btn btn-sm btn-success"
                          @click="enableAdminAccess"
                          :disabled="adminActionLoading"
                        >
                          <span v-if="adminActionLoading" class="spinner-border spinner-border-sm me-1"></span>
                          Активувати
                        </button>
                        <button
                          v-else
                          class="btn btn-sm btn-danger"
                          @click="revokeAdminAccess"
                          :disabled="adminActionLoading"
                        >
                          <span v-if="adminActionLoading" class="spinner-border spinner-border-sm me-1"></span>
                          Відкликати доступ
                        </button>
                      </div>
                    </div>

                    <div v-else>
                      <div class="text-muted mb-3">
                        <i class="bi bi-x-circle me-1"></i>
                        Доступ до адмін-панелі не надано
                      </div>
                      <button
                        class="btn btn-sm btn-success"
                        @click="grantAdminAccess"
                        :disabled="adminActionLoading"
                      >
                        <span v-if="adminActionLoading" class="spinner-border spinner-border-sm me-1"></span>
                        <i class="bi bi-shield-check me-1"></i>Надати доступ
                      </button>
                    </div>

                    <div v-if="adminActionError" class="alert alert-danger py-2 small mt-3 mb-0">
                      {{ adminActionError }}
                    </div>
                    <div v-if="adminActionSuccess" class="alert alert-success py-2 small mt-3 mb-0">
                      {{ adminActionSuccess }}
                    </div>
                  </div>
                </div>

                <div class="text-muted small">
                  Для детального керування ролями та правами користуйтесь сторінкою
                  <router-link to="/admin-management">Адміністратори</router-link>
                </div>
              </template>
            </template>

            <div v-if="saveError" class="alert alert-danger py-2 small mt-3 mb-0">{{ saveError }}</div>
          </div>

      <template #footer>
        <div></div>
        <div class="d-flex gap-2">
          <button class="btn btn-secondary btn-sm" @click="modalOpen = false">Закрити</button>
          <button v-if="activeTab === 'general' && canEdit"
                  class="btn btn-primary btn-sm"
                  :disabled="saving"
                  @click="saveModal">
            <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
            Зберегти
          </button>
        </div>
      </template>
    </BaseModal>
    </div>
    </ListPageWrapper>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import ListPageWrapper from '@/components/ListPageWrapper.vue'
import BaseModal from '@/components/BaseModal.vue'
import Pagination from '@/components/Pagination.vue'
import { useAuth } from '@/composables/useAuth'
import { useUrlFilters } from '@/composables/useUrlFilters'
import cfg from './users.config.json'

const { can, authHeaders } = useAuth()
const canEdit = computed(() => can(cfg.editPermission) || can('*'))

// Page layout для сдвига контента при docked модалках
// ── Sort icon ─────────────────────────────────────────────────────────────────
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
const sortKey      = ref('created_at')
const sortDir      = ref('desc')
const search       = ref('')
const filterStatus = ref('')

// Синхронизация фильтров с URL
const { initFromUrl } = useUrlFilters({
  filters: {
    search,
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
          const res = await fetch(`${cfg.apiGet}/${id}`, { headers: authHeaders() })
          const json = await res.json()
          if (json.data) {
            row = json.data
          }
        } catch (e) {
          console.error('Failed to load user:', e)
          return
        }
      }
      if (row) {
        openModal(row)
      }
    }
  }
})

let debounceTimer = null
function debounceLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => load(1), 350)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fullName(row) {
  return [row.lastname, row.firstname, row.secondname].filter(Boolean).join(' ')
}
function statusLabel(s) {
  return { active: 'Активний', pending: 'Очікує', incomplete: 'Незавершений' }[s] ?? s
}
function statusBadge(s) {
  return { active: 'badge bg-success', pending: 'badge bg-warning text-dark', incomplete: 'badge bg-secondary' }[s] ?? 'badge bg-light text-dark'
}
function langLabel(code) {
  return { uk: 'Українська', en: 'English', ru: 'Русский' }[code] ?? (code ? code : '—')
}
const STO_TYPES = { individual: 'Індивід.', company: 'Компанія', network: 'Мережа', specialized: 'Спец.', mobile: 'Мобільне' }
function stoTypeLabel(v) { return STO_TYPES[v] ?? v ?? '—' }
function stoBadge(v) {
  return { individual: 'bg-info text-dark', company: 'bg-primary', network: 'bg-warning text-dark', specialized: 'bg-danger', mobile: 'bg-success' }[v] ?? 'bg-secondary'
}

// ── List ──────────────────────────────────────────────────────────────────────
function toggleSort(key) {
  if (sortKey.value !== key) { sortKey.value = key; sortDir.value = 'asc' }
  else if (sortDir.value === 'asc') { sortDir.value = 'desc' }
  else { sortKey.value = 'created_at'; sortDir.value = 'desc' }
  load(1)
}

async function load(p = 1) {
  page.value    = p
  loading.value = true
  error.value   = null
  try {
    const params = new URLSearchParams({ per_page: 50, page: p, sort_by: sortKey.value, sort_dir: sortDir.value })
    if (search.value.trim())  params.set('search', search.value.trim())
    if (filterStatus.value)   params.set('status', filterStatus.value)
    const res  = await fetch(`${cfg.apiList}?${params}`, { headers: authHeaders() })
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
const modalOpen = ref(false)
const modalData = ref({})
const modalForm = ref({})
const saving    = ref(false)
const saveError = ref(null)
const activeTab = ref('general')
const detailId  = ref(null)

function openModal(row) {
  modalData.value = { ...row }
  modalForm.value = {
    firstname:  row.firstname  ?? '',
    secondname: row.secondname ?? '',
    lastname:   row.lastname   ?? '',
    status:     row.status,
  }
  saveError.value     = null
  activeTab.value     = 'general'
  carsLoaded.value    = false; carsList.value  = []
  msLoaded.value      = false; msList.value    = []
  empLoaded.value     = false; empList.value   = []
  phonesList.value    = []
  phonesError.value   = null
  phonesLoading.value = false
  newPhoneRaw.value   = ''
  modalOpen.value     = true
  detailId.value      = row.id
  document.body.classList.add('modal-open')
  loadPhones()
}

function closeModal() {
  modalOpen.value = false
  detailId.value = null
  document.body.classList.remove('modal-open')
}

async function switchTab(tab) {
  activeTab.value = tab
  if (tab === 'cars'         && !carsLoaded.value) await loadCars()
  if (tab === 'managed-stos' && !msLoaded.value)   await loadManagedStos()
  if (tab === 'employments'  && !empLoaded.value)  { await loadEmployments(); await loadPositions() }
  if (tab === 'admin'        && !adminLoaded.value) await loadAdminTab()
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
    const res  = await fetch(`/api/admin/users/${modalData.value.id}/phones`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
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
  const res  = await fetch(`/api/admin/users/${modalData.value.id}/phones`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body:    JSON.stringify({ phones: payload }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.message ?? 'Помилка збереження телефонів')
  phonesList.value = (json.data ?? []).map(p => ({ ...p, raw: p.e164 }))
  if (json.main_phone !== undefined) {
    const idx = items.value.findIndex(r => r.id === modalData.value.id)
    if (idx !== -1) items.value[idx].phone = json.main_phone
  }
}

async function saveModal() {
  saving.value    = true
  saveError.value = null
  try {
    const payload = {
      firstname:  modalForm.value.firstname?.trim()  || null,
      secondname: modalForm.value.secondname?.trim() || null,
      lastname:   modalForm.value.lastname?.trim()   || null,
      status:     modalForm.value.status,
    }
    const res  = await fetch(`${cfg.apiUpdate}/${modalData.value.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка збереження')
    const idx = items.value.findIndex(r => r.id === modalData.value.id)
    if (idx !== -1) Object.assign(items.value[idx], json.data)
    if (newPhoneRaw.value.trim()) addPhone()
    await savePhones()
    closeModal()
  } catch (e) {
    saveError.value = e.message
  } finally {
    saving.value = false
  }
}

// ── Tab: Cars ─────────────────────────────────────────────────────────────────
const carsLoading = ref(false)
const carsLoaded  = ref(false)
const carsError   = ref(null)
const carsList    = ref([])

async function loadCars() {
  carsLoading.value = true; carsError.value = null
  try {
    const res  = await fetch(`/api/admin/users/${modalData.value.id}/cars`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    carsList.value  = json.data ?? []
    carsLoaded.value = true
  } catch (e) { carsError.value = e.message }
  finally { carsLoading.value = false }
}

// ── Tab: Managed STOs ─────────────────────────────────────────────────────────
const msLoading    = ref(false)
const msLoaded     = ref(false)
const msError      = ref(null)
const msList       = ref([])
const msDeletingId = ref(null)
const msSearchTerm  = ref('')
const msStoResults  = ref([])
const msStoLoading  = ref(false)
const msStoDropdown = ref(false)
const msSelectedSto = ref(null)
const msAdding      = ref(false)
const msAddError    = ref(null)

async function loadManagedStos() {
  msLoading.value = true; msError.value = null
  try {
    const res  = await fetch(`/api/admin/users/${modalData.value.id}/managed-stos`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    msList.value  = json.data ?? []
    msLoaded.value = true
  } catch (e) { msError.value = e.message }
  finally { msLoading.value = false }
}

async function removeManagedSto(ms) {
  msDeletingId.value = ms.sto_id
  try {
    const res = await fetch(`/api/admin/users/${modalData.value.id}/managed-stos/${ms.sto_id}`, {
      method: 'DELETE', headers: authHeaders(),
    })
    if (!res.ok) throw new Error((await res.json()).message ?? 'Помилка')
    msList.value = msList.value.filter(m => m.sto_id !== ms.sto_id)
  } catch (e) { alert(e.message) }
  finally { msDeletingId.value = null }
}

async function addManagedSto() {
  if (!msSelectedSto.value) return
  msAdding.value = true; msAddError.value = null
  try {
    const res  = await fetch(`/api/admin/users/${modalData.value.id}/managed-stos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ sto_id: msSelectedSto.value.id }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    msList.value.push(json.data)
    msSearchTerm.value  = ''
    msSelectedSto.value = null
    msStoResults.value  = []
  } catch (e) { msAddError.value = e.message }
  finally { msAdding.value = false }
}

// ── Tab: Employments ──────────────────────────────────────────────────────────
const empLoading     = ref(false)
const empLoaded      = ref(false)
const empError       = ref(null)
const empList        = ref([])
const empDeletingId  = ref(null)
const empTogglingId  = ref(null)
const empUpdatingId  = ref(null)
const empSearchTerm  = ref('')
const empStoResults  = ref([])
const empStoLoading  = ref(false)
const empStoDropdown = ref(false)
const empSelectedSto = ref(null)
const empAddPositionId = ref(null)
const empAdding      = ref(false)
const empAddError    = ref(null)

// Positions (shared for both select and add form)
const positionsList   = ref([])
const positionsLoaded = ref(false)
const positionsGrouped = computed(() => positionsList.value)

async function loadPositions() {
  if (positionsLoaded.value) return
  try {
    const res  = await fetch('/api/admin/users/positions', { headers: authHeaders() })
    const json = await res.json()
    if (res.ok) { positionsList.value = json.data ?? []; positionsLoaded.value = true }
  } catch {}
}

async function loadEmployments() {
  empLoading.value = true; empError.value = null
  try {
    const res  = await fetch(`/api/admin/users/${modalData.value.id}/employments`, { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    empList.value  = json.data ?? []
    empLoaded.value = true
  } catch (e) { empError.value = e.message }
  finally { empLoading.value = false }
}

async function changeEmpPosition(emp, newPosId) {
  empUpdatingId.value = emp.id
  try {
    const posId = newPosId !== '' ? parseInt(newPosId) : null
    const res   = await fetch(`/api/admin/users/${modalData.value.id}/employments/${emp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ employee_position_id: posId }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    Object.assign(emp, json.data)
  } catch (e) { alert(e.message) }
  finally { empUpdatingId.value = null }
}

async function toggleEmpActive(emp) {
  empTogglingId.value = emp.id
  try {
    const res  = await fetch(`/api/admin/users/${modalData.value.id}/employments/${emp.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ is_active: emp.is_active ? 0 : 1 }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    emp.is_active = json.data.is_active
  } catch (e) { alert(e.message) }
  finally { empTogglingId.value = null }
}

async function removeEmployment(emp) {
  empDeletingId.value = emp.id
  try {
    const res = await fetch(`/api/admin/users/${modalData.value.id}/employments/${emp.id}`, {
      method: 'DELETE', headers: authHeaders(),
    })
    if (!res.ok) throw new Error((await res.json()).message ?? 'Помилка')
    empList.value = empList.value.filter(e => e.id !== emp.id)
  } catch (e) { alert(e.message) }
  finally { empDeletingId.value = null }
}

async function addEmployment() {
  if (!empSelectedSto.value) return
  empAdding.value = true; empAddError.value = null
  try {
    const res  = await fetch(`/api/admin/users/${modalData.value.id}/employments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ sto_id: empSelectedSto.value.id, employee_position_id: empAddPositionId.value }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')
    empList.value.push(json.data)
    empSearchTerm.value  = ''
    empSelectedSto.value = null
    empAddPositionId.value = null
    empStoResults.value  = []
  } catch (e) { empAddError.value = e.message }
  finally { empAdding.value = false }
}

// ── Tab: Admin ────────────────────────────────────────────────────────────────
const adminLoading        = ref(false)
const adminLoaded         = ref(false)
const adminData           = ref({})
const adminActionLoading  = ref(false)
const adminActionError    = ref(null)
const adminActionSuccess  = ref(null)

async function loadAdminTab() {
  if (adminLoaded.value) return
  adminLoading.value = true
  adminActionError.value = null
  try {
    // Get admin credential info from management API
    const res = await fetch('/api/admin/management/users', { headers: authHeaders() })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')

    // Find current user in the list
    const user = json.users.find(u => u.id === modalData.value.id)
    if (user) {
      adminData.value = {
        access_granted: user.admin_access.granted,
        is_enabled: user.admin_access.enabled,
        has_password: user.admin_access.has_password,
        last_login_at: user.admin_access.last_login_at,
        roles: user.roles,
      }
    } else {
      adminData.value = { access_granted: false }
    }
    adminLoaded.value = true
  } catch (e) {
    adminActionError.value = e.message
  } finally {
    adminLoading.value = false
  }
}

async function grantAdminAccess() {
  if (!confirm(`Надати доступ до адмін-панелі користувачу ${modalData.value.username}?`)) return
  adminActionLoading.value = true
  adminActionError.value = null
  adminActionSuccess.value = null
  try {
    const res = await fetch('/api/admin/credential/grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ user_id: modalData.value.id }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')

    adminActionSuccess.value = 'Доступ надано! Користувач може встановити пароль через /admin/first-login'
    adminLoaded.value = false
    await loadAdminTab()
  } catch (e) {
    adminActionError.value = e.message
  } finally {
    adminActionLoading.value = false
  }
}

async function revokeAdminAccess() {
  if (!confirm(`Відкликати доступ до адмін-панелі для ${modalData.value.username}?`)) return
  adminActionLoading.value = true
  adminActionError.value = null
  adminActionSuccess.value = null
  try {
    const res = await fetch(`/api/admin/credential/${modalData.value.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message ?? 'Помилка')

    adminActionSuccess.value = 'Доступ відкликано'
    adminLoaded.value = false
    await loadAdminTab()
  } catch (e) {
    adminActionError.value = e.message
  } finally {
    adminActionLoading.value = false
  }
}

async function enableAdminAccess() {
  adminActionLoading.value = true
  adminActionError.value = null
  adminActionSuccess.value = null
  try {
    // TODO: add API endpoint to enable/disable admin access
    // For now, just reload
    adminActionSuccess.value = 'Функція активації у розробці'
  } catch (e) {
    adminActionError.value = e.message
  } finally {
    adminActionLoading.value = false
  }
}

function copyFirstLoginLink() {
  const link = `${window.location.origin}/admin/first-login`
  navigator.clipboard.writeText(link).then(() => {
    adminActionSuccess.value = 'Посилання скопійовано в буфер обміну!'
    setTimeout(() => { adminActionSuccess.value = null }, 3000)
  })
}

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('uk-UA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Shared STO search ─────────────────────────────────────────────────────────
let stoSearchTimers = { ms: null, emp: null }

function debounceStoSearch(ctx) {
  clearTimeout(stoSearchTimers[ctx])
  const term = ctx === 'ms' ? msSearchTerm.value : empSearchTerm.value
  if (ctx === 'ms') { msSelectedSto.value = null; msStoResults.value = [] }
  else              { empSelectedSto.value = null; empStoResults.value = [] }
  if (term.length < 2) return
  stoSearchTimers[ctx] = setTimeout(() => fetchStos(ctx), 300)
}

async function fetchStos(ctx) {
  const term = ctx === 'ms' ? msSearchTerm.value : empSearchTerm.value
  if (term.length < 2) return
  if (ctx === 'ms') msStoLoading.value = true
  else              empStoLoading.value = true
  try {
    const res  = await fetch(`/api/admin/sto?search=${encodeURIComponent(term)}&per_page=10`, { headers: authHeaders() })
    const json = await res.json()
    const results = res.ok ? (json.data ?? []) : []
    if (ctx === 'ms') msStoResults.value  = results
    else              empStoResults.value = results
  } catch {}
  finally {
    if (ctx === 'ms') msStoLoading.value = false
    else              empStoLoading.value = false
  }
}

function selectStoFor(ctx, sto) {
  if (ctx === 'ms') {
    msSelectedSto.value  = sto
    msSearchTerm.value   = sto.name_uk
    msStoResults.value   = []
    msStoDropdown.value  = false
  } else {
    empSelectedSto.value = sto
    empSearchTerm.value  = sto.name_uk
    empStoResults.value  = []
    empStoDropdown.value = false
  }
}

onMounted(() => {
  initFromUrl()
  load(page.value)
})
</script>

<style scoped>
/* Page content wrapper with scroll */
.th-sortable { cursor: pointer; user-select: none; white-space: nowrap; }
.th-sortable:hover { background: #e9ecef; }

.readonly-field {
  padding: 4px 8px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  min-height: 31px;
  line-height: 1.4;
}

/* Modal styles moved to BaseModal component */
</style>
