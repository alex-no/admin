# Задача 04: клонування запису (react-admin `<CloneButton>`)

> ## 🔧 Адаптація для `admin`: спершу перевірити, чи є що клонувати
>
> ⚠️ **У фреймворку немає створення записів.** `DataListPage`/`DataTable` мають
> `apiList`, `apiUpdate`, `apiDelete` — і **не мають** `apiCreate`. Клонування
> без створення неможливе.
>
> Тому в `admin` задача 04 має передумову: або
> - зробити її **разом** із додаванням `apiCreate` + кнопки «Додати» у фреймворк
>   (це один із пунктів gap-аналізу задачі **00**), або
> - відкласти до того, як 00 це закриє.
>
> Рішення записати в [STATUS.md](STATUS.md) до початку.
>
> **Куди (коли створення зʼявиться):** `buildCloneForm` у ядрі фреймворку,
> `action: { type: 'clone' }` у `*.config.json` поруч із `detail`/`delete` —
> механіка дій рядка вже є (`actions[]` + `handleAction`), нова дія вписується
> без правок розмітки.
>
> **`unique`-поля:** у `admin` немає ні `FieldConfigReader`, ні дампу схеми
> `bak/db-data/structure.sql`. Перелік полів, які не можна копіювати
> (`slug`, `iso2`, `iso3`, `region_code`…), брати з міграцій
> `backend/` або позначати прапорцем `unique: true` у `*.columns.json`.
>
> **Не застосовується:** `SKIP_ON_CLONE` з `version` (optimistic locking у `admin`
> немає), `structure.sql`, перелік 6 config-driven сторінок.
>
> ---

**Скіл:** спеціалізованого немає — перед стартом прогнати `validate-task-md`.
**Спільний контекст:** [README.md](README.md) — інвентаризація 26 списковых сторінок і спільні правила.

## Контекст

Довідники заповнюються серіями схожих записів: п'ять послуг однієї групи з тими
самими налаштуваннями й різними назвами, десяток моделей однієї марки, кілька
типів населених пунктів з однаковою країною. Зараз кожен такий запис адмін
створює з нуля, повторно вибираючи ті самі FK і галочки — і рівно там робить
помилки (забув групу, забув країну).

react-admin вирішує це `<CloneButton>`: відкриває форму створення, попередньо
заповнену полями існуючого запису (без `id`).

Ключове: це **чисто фронтова** фіча. Жодного нового ендпоінта не треба — клон
іде звичайним `POST` на наявний create-ендпоінт.

## Промпт для Claude Code

> Додай клонування записів у списковых сторінках адмінки — аналог `<CloneButton>`
> з react-admin.
>
> 1. **Кнопка в рядку таблиці** — іконка `bi-copy`, `btn btn-sm
>    btn-outline-secondary`, у тій самій колонці дій, де вже стоїть олівець
>    редагування. Показувати **лише** якщо в адміна є create-permission сторінки
>    (та сама умова, що на кнопці «Створити»).
>
> 2. **Клік відкриває модалку створення, попередньо заповнену з рядка**, з
>    очищеними полями:
>    - `id` → не переносити (модалка мусить бути в режимі create, не update)
>    - `created_at`, `updated_at`, `version` → не переносити
>    - усі поля, позначені в config як `"editable": false` → не переносити
>    - поля з `"unique": true` (див. п.4) → **не** переносити або перенести з
>      суфіксом, залежно від типу поля
>
> 3. **Заголовок модалки мусить явно казати, що це клон** — напр.
>    «Створення (копія #42)», щоб адмін не думав, що редагує оригінал.
>
> 4. **Унікальні поля.** Додай у `*.config.json` до `fields{}` прапорець
>    `"unique": true` для полів, на яких у БД є UNIQUE-індекс, і для таких полів
>    при клонуванні:
>    - `type: text` → перенести значення з суфіксом ` (копія)`
>    - решта типів (`integer`, `number`, `select`) → залишити порожнім/дефолтом
>
>    Перед проставлянням прапорця **перевір фактичні UNIQUE-індекси** по
>    `h:\V-hosts\docker\allsto\bak\db-data\structure.sql` — не вгадувати за
>    назвою поля.
>
> 5. **Розкатай на сторінки, де є створення записів**:
>    `geography/Cities.vue`, `geography/Countries.vue`, `geography/CityTypes.vue`,
>    `geography/AreaRegionList.vue`, `catalog/VehicleTypes.vue`,
>    `catalog/ServiceGroups.vue`, `catalog/Services.vue`, `catalog/CarBrands.vue`,
>    `catalog/CarModels.vue`, `pages/News.vue`.
>
>    **Не додавати** там, де створення руками не існує або безглузде:
>    `Users.vue`, `StoList.vue`, `StoApplications.vue`, `StoManagers.vue`,
>    `StoOutreach.vue`, `Reviews.vue`, `Feedback.vue`, `AuditLog.vue`,
>    `ErrorLogs.vue`, `Analytics.vue`, `AnalyticsBannedIps.vue`,
>    `PermissionList.vue`, `RoleManagement.vue`, `AdminManagement.vue`,
>    `geography/CityTmpReview.vue`, `geography/Timezones.vue`.
>
> **Не робити:** «клонувати N разів», глибоке клонування пов'язаних сущностей
> (послуги СТО, фото, адреси), bulk-клонування виділених рядків.

## Що перевірити після виконання

- [ ] Кнопка `bi-copy` є в колонці дій на всіх 10 сторінках зі списку в промпті, і **немає** на сторінках-виключеннях
- [ ] Кнопка не показується адміну без create-permission (перевірити на `catalog/Services.vue` роллю без `catalog.services.create`)
- [ ] Клік відкриває модалку **у режимі створення**: кнопка внизу «Створити», а не «Зберегти»; запит іде `POST` на create-ендпоінт, не `PUT`
- [ ] `id`, `created_at`, `updated_at`, `version` у форму не перенеслись — у модалці поле ID порожнє/приховане
- [ ] Заголовок модалки містить вказівку на джерело, напр. «Створення (копія #42)»
- [ ] FK-поля перенеслись: клонування послуги переносить `service_group_id`, клонування міста — `country_id` і `area_region_id`
- [ ] Boolean-поля перенеслись правильно (`is_active`, `is_capital` — саме значення оригіналу, а не дефолт)
- [ ] Поля з `"editable": false` у config не перенеслись
- [ ] **UNIQUE-поля перевірені по `bak/db-data/structure.sql`**, прапорець `"unique": true` проставлений тільки там, де індекс реально є
- [ ] Текстове UNIQUE-поле перенеслось із суфіксом ` (копія)`; не-текстове — порожнє. Збереження клона без ручної правки не падає на duplicate key
- [ ] Успішне збереження клона додає новий рядок у список (той самий шлях, що звичайне створення — `justCreatedIds` підсвітка і `total++` не зламані)
- [ ] Скасування клонування не змінює оригінал (перевірити: клонувати → щось поправити у формі → «Скасувати» → оригінальний рядок без змін)
- [ ] `useUnsavedChanges` працює в режимі клона так само, як при створенні з нуля
- [ ] `npm run build:admin` виконаний — оновлені `*.config.json` синкнуті в `www_app/config/`
- [ ] Немає console errors

---

## Технічні деталі для імплементації

### 1. Кнопка в рядку

Зараз колонка дій виглядає так (`pages/Users.vue:119-123` як приклад форми):

```html
<td>
  <button class="btn btn-sm btn-outline-secondary" @click="openModal(row)">
    <i class="bi bi-pencil"></i>
  </button>
</td>
```

Стає:

```html
<td class="text-nowrap">
  <button class="btn btn-sm btn-outline-secondary" title="Редагувати" @click="openModal(row)">
    <i class="bi bi-pencil"></i>
  </button>
  <button v-if="canCreate" class="btn btn-sm btn-outline-secondary ms-1" title="Створити копію"
          @click="openCloneModal(row)">
    <i class="bi bi-copy"></i>
  </button>
</td>
```

⚠️ `text-nowrap` на `<td>` — щоб дві кнопки не переносились на другий рядок на
вузьких екранах. І перевірити `width` цієї колонки: на config-driven сторінках
вона задана хардкодом у шаблоні (`<th style="width:60px">` у `Cities.vue:141`) —
для двох кнопок треба ширше.

### 2. Побудова форми клона

Головне — **не** робити окремої «clone-модалки». Це та сама create-модалка, лише
з іншим початковим станом. Для config-driven сторінок наповнення робиться по
`cfg.fields`, тому логіка загальна:

```js
// Клонування (react-admin: CloneButton) — той самий create-флоу, лише з
// попередньо заповненою формою. Нового ендпоінта не треба: іде звичайний POST.
const SKIP_ON_CLONE = ['id', 'created_at', 'updated_at', 'version']

function buildCloneForm(row) {
  const form = {}
  for (const [key, field] of Object.entries(cfg.fields)) {
    if (SKIP_ON_CLONE.includes(key)) continue
    if (!field.editable) continue

    if (field.unique) {
      form[key] = field.type === 'text' && row[key] ? `${row[key]} (копія)` : (field.default ?? null)
      continue
    }
    form[key] = row[key] ?? field.default ?? null
  }
  return form
}

function openCloneModal(row) {
  cloneSourceId.value = row.id      // тільки для заголовка
  modalMode.value = 'create'
  modalForm.value = buildCloneForm(row)
  modalOpen.value = true
}
```

Для hand-written сторінок (`News.vue`, `catalog/CarModels.vue`,
`catalog/Services.vue`, `catalog/CarBrands.vue` — у них немає `cfg.fields`) —
локальний явний список полів для клона, без generic-обходу об'єкта рядка.
Причина: `row` містить joined-поля з бекенду (`country_name`,
`city_type_name`, `service_group_name`, `is_center` у `Cities.vue` SELECT), які
у create-ендпоінт передавати не можна.

### 3. Заголовок

```html
<template #title>
  <h5 class="mb-0">
    <template v-if="modalMode === 'create' && cloneSourceId">
      Створення <span class="text-muted fw-normal fs-6">(копія #{{ cloneSourceId }})</span>
    </template>
    <template v-else-if="modalMode === 'create'">Створення</template>
    <template v-else>Редагування <span class="text-muted fw-normal fs-6">#{{ modalData.id }}</span></template>
  </h5>
</template>
```

`cloneSourceId` обов'язково обнуляти в звичайному `openCreateModal()` — інакше
наступне звичайне створення покаже «(копія #42)».

### 4. UNIQUE-поля — перевірити, не вгадувати

Дамп схеми: `h:\V-hosts\docker\allsto\bak\db-data\structure.sql`.

Шукати `UNIQUE KEY` по таблицях, що зачіпаються: `city`, `country`, `city_type`,
`area_region`, `vehicle_type`, `service_group`, `service`, `car_brand`,
`car_model`, `news`.

Типові кандидати, які **треба підтвердити дампом**: `code`, `slug`, `iso_*`,
`alias`. Особливо уважно з композитними UNIQUE (напр. `(brand_id, name)`) —
для них перенос назви з суфіксом ` (копія)` достатній, а от очищати `brand_id`
не треба, інакше клон стає безглуздим.

Прапорець у config ставиться на **поле**, тому композитний індекс позначається
на його текстовій частині:

```json
"name_uk": { "label": "Назва [UA]", "type": "text", "editable": true, "required": true, "unique": true, ... }
```

### 5. Права

`canCreate` брати з того самого джерела, що вже використовується для кнопки
«Створити» на цій сторінці — у config-driven це `cfg.createPermission`
(є в `geography/cities.config.json`: `"createPermission": "geography.cities.create"`).

⚠️ Окремого `clone`-permission не заводити: клон = створення, права ті самі.
Але перевірити per-field права: якщо поле має `createPermissions: []` (як
`is_active` у `cities.config.json`), його не можна переносити в клон — адмін не
має права виставляти його при створенні.

### 6. Scope & Non-Goals

**В scope:** кнопка в рядку, `buildCloneForm`, заголовок-маркер, прапорець
`unique` у config-файлах (перевірений по дампу), розкатка на 10 сторінок.

**Поза scope:**
- новий бекенд-ендпоінт `POST /{id}/clone`
- глибоке клонування пов'язаних сущностей (для СТО це були б послуги,
  зручності, адреси, фото, телефони — окрема велика задача, і саме тому
  `StoList.vue` у виключеннях)
- «клонувати 5 разів»
- bulk-клонування виділених рядків
- клонування ролей/прав (`RoleManagement.vue`) — там своя семантика прав,
  копія роли з правами вимагає окремого обміркування

---

## FAQ

**Q: Чому `StoList.vue` у виключеннях, там же найбільше полів?**
A Саме тому. Запис СТО — це не один рядок, а рядок + послуги + зручності +
типи ТЗ + адреси + телефони + фото + співробітники (див. окремі ендпоінти
`AdminStoController::updateServices/updateAmenities/updateVehicleTypes/...`).
Клон, який переносить лише рядок `sto`, дає адміну «порожню копію» і виглядає
як баг. Повноцінне глибоке клонування — окрема задача.

**Q: А якщо адмін клонує й одразу зберігає, не змінивши UNIQUE-поле?**
A Для `type: text` спрацює суфікс ` (копія)` — збереження пройде. Для решти
типів поле порожнє, і сработає звичайна валідація `required` у модалці. Тобто
duplicate-key з БД адмін не побачить у жодному з двох випадків.

**Q: Чи писати клонування в audit log?**
A Нічого робити не треба. Клон іде звичайним create-ендпоінтом, і якщо
`AuditLogger` уже підключений до `create()` цього контролера — запис зʼявиться
сам, як для будь-якого створення.

**Q: Чи не плутати з «дублікатами» в імпорті СТО?**
A Це різні речі. `StoImport.vue` шукає дублікати серед імпортованих даних; ця
задача — про свідоме створення схожого запису адміном.
