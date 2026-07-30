# Задача 09: async-автокомпліт для FK-полів (react-admin `<ReferenceInput>` + `<AutocompleteInput>`)

> ## 🔧 Адаптація для `admin`: баг тут гостріший, ніж у `allsto`
>
> Задача та сама, але дефект, на якому вона тримається, у `admin` серйозніший.
>
> **`useRemoteOptions` запитує довідник взагалі без `per_page`:**
> ```js
> fetch(url, { headers: authHeaders() })   // useRemoteOptions.js:34
> ```
> Тобто отримує **дефолт бекенда** — 50 рядків
> (`AdminStoController::list` — `min(250, max(1, (int)($params['per_page'] ?? 50)))`).
> У `allsto` хоч був явний `per_page=2000`, який сервер молча обрізав до 500;
> тут і того немає. Select-колонка з `optionsUrl` показує перші 50 варіантів, і
> нічого не сигналізує, що їх більше.
>
> Дірка не лише в UI: `formatForExport` для CSV бере підпис із того самого
> обрізаного списку (`useTableState.ts:37`, `DataListPage.vue:391`) — тобто у
> вигрузці замість назви піде **код**, якщо запис не потрапив у перші 50.
>
> **Куди:**
> - Vue — `frontend/src/list-framework/composables/useRemoteOptions.js`,
>   `filters/FilterSelect.vue`, `cells/SelectCell.vue`, новий
>   `composables/useReferenceSearch.js` + `components/ReferenceSelect.vue`
> - React — `frontend-react/src/list-framework/hooks/useRemoteOptions.ts`,
>   `filters/SelectFilter.tsx`, `cells/SelectCell.tsx`, новий
>   `hooks/useReferenceSearch.ts` + `components/ReferenceSelect.tsx`
> - Бекенд — `?lookup=1` / `?search=` / `?ids=` + `truncated: true` у
>   `backend/src/Admin/Controller/` (у `admin` довідникових ендпоінтів мало:
>   `AdminGeographyController` — 59 рядків; починати з нього)
>
> **Мінімальний фікс, який робити першим:** передати явний `per_page` і читати
> `pagination.total` — якщо `total > отриманих`, показати в списку опцій рядок
> «показано N з M — введіть текст для пошуку». Без цього автокомпліт нижче
> просто ховає ту саму проблему за гарнішим UI.
>
> **Не застосовується з тексту нижче:** «10 ендпоінтів», `Cities.vue:668-685` з
> `Promise.all` пʼяти довідників, `AdminAreaRegionController.php:282`,
> `AdminCountryController.php:30` — це файли `allsto`.
>
> ---

**Скіл:** спеціалізованого немає — перед стартом прогнати `validate-task-md`.
**Спільний контекст:** [README.md](README.md) — інвентаризація 26 списковых сторінок і спільні правила.

## Контекст

Усі FK-поля в адмінці — це звичайний `<select>`, наповнений повністю
завантаженим довідником. Наприклад `pages/geography/Cities.vue` у `onMounted`
(рядки 668-685) тягне **п'ять** довідників одразу, до першого рендера списку:

```js
const [cRes, arRes, distRes, ctRes, ctMapRes] = await Promise.all([
  fetch('/api/admin/geography/countries?per_page=300&status=all',   h),
  fetch('/api/admin/geography/areas?per_page=1000&status=all',      h),
  fetch('/api/admin/geography/districts?per_page=2000&status=all',  h),
  fetch('/api/admin/geography/city-types?per_page=500',             h),
  fetch('/api/admin/geography/country-city-types',                  h),
])
```

І тільки після цього — `load()` основного списку.

### Це вже зараз працює невірно

Бекенд обрізає `per_page`:

| Запит фронтенду | Ліміт бекенду | Файл |
|---|---|---|
| `districts?per_page=2000` | `min(500, ...)` | `Geography/AdminAreaRegionController.php:282` |
| `areas?per_page=1000` | `min(500, ...)` | `Geography/AdminAreaRegionController.php:282` |
| `countries?per_page=300` | `min(250, ...)` | `Geography/AdminCountryController.php:30` |
| `city-types?per_page=500` | `min(500, ...)` | `Geography/AdminCityTypeController.php:31` |

Тобто запит на 2000 районів **тихо** повертає перші 500. Ніякої помилки, ніякого
попередження — просто в дропдауні бракує районів, і адмін не може вибрати
потрібний. Те, що фронтенд просить 2000, а не 500, — прямий доказ, що автор
очікував більше за ліміт. Те саме з країнами: просять 300, отримують 250.

Це не гіпотетична проблема на майбутнє: вона проявляється рівно тоді, коли
довідник переростає ліміт, і проявляється **непомітно**.

### Що робить react-admin

`<ReferenceInput>` + `<AutocompleteInput>`: поле шукає по мірі введення
(`?search=...&per_page=20`), окремо довантажує **лише** поточне обране значення
(щоб показати його назву), і нічого не вантажить наперед.

## Промпт для Claude Code

> Заміни `<select>` з повністю завантаженим довідником на async-автокомпліт для
> FK-полів адмінки — аналог `<ReferenceInput>` + `<AutocompleteInput>` з
> react-admin.
>
> ### Backend
>
> 1. **Додай «lookup»-режим у list-ендпоінти довідників** — щоб не тягнути
>    повний рядок для дропдауна. Параметр `?lookup=1` віддає тільки
>    `{ id, label }` (label = локалізована назва, та сама, що зараз показується в
>    `<option>`), і дозволяє `per_page` до 50.
>
>    Ендпоінти: `geography/countries`, `geography/areas`,
>    `geography/districts`, `geography/city-types`, `geography/cities`,
>    `catalog/car-brands`, `catalog/car-models`, `catalog/service-groups`,
>    `catalog/services`, `catalog/vehicle-types`.
>
> 2. **`?search=` мусить працювати на всіх цих ендпоінтах.** Перевір кожен — де
>    немає, додай (патерн уже є в `AdminCityController::list`, рядки 62-67:
>    `LIKE` по всіх трьох мовних колонках).
>
> 3. **Точкове довантаження по id**: `?ids=4,17,90` — щоб показати назву вже
>    обраного значення, не знаючи, чи воно в перших 20 результатах пошуку. Без
>    цього поле показувало б «4» замість «Львівська область».
>
> 4. **Ліміти `per_page` не піднімати.** Мета задачі — прибрати потребу в
>    завантаженні всього довідника, а не підняти стелю. Але **прибрати тихе
>    обрізання**: якщо запитаний `per_page` більший за ліміт, віддавати в
>    `pagination` реальний `per_page` (це вже так) **і** прапорець
>    `truncated: true`, щоб такі місця було видно.
>
> ### Frontend
>
> 5. **Новий composable `www_front/admin/src/composables/useReferenceSearch.js`**:
>    `useReferenceSearch(endpoint)` → `{ options, loading, search(term), resolveByIds(ids) }`.
>    Дебаунс 300мс (як `debounceLoad` у `Users.vue:761-764`, там 350 — взяти
>    близьке значення), скасування попереднього запиту, module-scope кеш
>    результатів по `endpoint + term` (за прикладом `useListCache.js`).
>
> 6. **Новий компонент `www_front/admin/src/components/ReferenceSelect.vue`** —
>    комбобокс: інпут із пошуком + випадний список + вибране значення чипом.
>    Пропи: `modelValue` (id), `endpoint`, `placeholder`, `disabled`,
>    `filters` (для каскадів — напр. райони в межах вибраної області),
>    `allowEmpty`. Клавіатура: ↑/↓/Enter/Esc.
>
>    **Без нових npm-залежностей** — Bootstrap 5 + власна розмітка, як решта
>    адмінки.
>
> 7. **Каскадні фільтри мусять зберегтись.** Зараз є `Cities.vue`:
>    область → район (`filteredDistrictsForFilter`, рядки 338-340) і в
>    `CityModal.vue` (`modalFilterArea` → `area_region_id`,
>    `CityModal.vue:49-59`). У новій схемі це проп `filters` у `ReferenceSelect`,
>    що додається в query пошуку; при зміні батьківського значення дитяче
>    скидається.
>
> 8. **Розкатай на FK-поля, де довідник може перерости ліміт** — за спаданням
>    ризику:
>    - `area_region_id` (райони/області) — `Cities.vue`, `CityModal.vue`,
>      `AreaRegionList.vue`
>    - `city_id` — усюди, де вибирається місто (`StoList.vue` адреси СТО,
>      `StoOutreach.vue`, `Timezones.vue` / `TimezoneAssignmentsModal.vue`)
>    - `car_model_id` / `car_brand_id` — `catalog/CarModels.vue`,
>      `CarModelModal.vue`, `StoList.vue` (вкладка марок)
>    - `service_id` / `service_group_id` — `catalog/Services.vue`,
>      `ServiceModal.vue`, `StoList.vue` (вкладка послуг)
>    - `country_id` — `Cities.vue`, `Countries.vue`, `AreaRegionList.vue`
>
>    **Не чіпати** дрібні стабільні довідники: `city_type_id`, `vehicle_type_id`,
>    `language_code`, статуси, `employee_position` — там `<select>` доречніший
>    (менше кліків), і рости їм нікуди.
>
> 9. **Прибери eager-завантаження, що стало непотрібним.** Після переходу на
>    автокомпліт `Promise.all` у `Cities.vue:668-685` мусить скоротитись — район
>    і область більше не потрібні цілком наперед. Список сторінки має рендеритись
>    **не чекаючи** довідників.
>
> **Не робити:** «створити нове значення прямо з поля» (`onCreate` у react-admin),
> віртуальний скрол у дропдауні, заміну всіх `<select>` підряд, зміну
> `per_page`-лімітів угору.

## Що перевірити після виконання

### Backend

- [ ] `?lookup=1` працює на всіх 10 перелічених ендпоінтах і віддає лише `{ id, label }`
- [ ] `?search=` працює на всіх 10 (перевірити кожен окремо — де його не було, додано)
- [ ] `?ids=4,17,90` віддає саме ці записи (і в `lookup`-формі теж); неіснуючі id просто відсутні у відповіді, а не 404
- [ ] `?ids=` санітизується як `bulkAction` (`intval` + `> 0`, `array_unique`), інʼєкція через список неможлива
- [ ] `truncated: true` з'являється в `pagination`, коли запитаний `per_page` більший за ліміт ендпоінта
- [ ] Ліміти `per_page` **не** підняті (`districts`/`areas` — 500, `countries` — 250, `city-types` — 500)
- [ ] Права на lookup-режим ті самі, що на `list` (адмін без `geography.cities.view` не може шукати міста)

### Frontend

- [ ] `useReferenceSearch.js` і `ReferenceSelect.vue` створені, без нових npm-залежностей
- [ ] Дебаунс працює: швидке введення «львів» дає **один** запит, не п'ять
- [ ] Попередній запит скасовується — результати не «переганяють» один одного (перевірити: ввести довгий термін, швидко стерти до короткого, переконатись, що в дропдауні результат короткого)
- [ ] **Вибране значення показується назвою, а не id** — навіть якщо його немає в перших 20 результатах пошуку (перевірити на записі з районом, назва якого не потрапляє в перші 20 за алфавітом)
- [ ] Відкриття модалки на існуючому записі **не** робить запит на весь довідник — лише `?ids=` на конкретні обрані значення
- [ ] Каскад працює: у `Cities.vue` вибір області обмежує пошук районів; зміна області скидає район
- [ ] Каскад у `CityModal.vue` (`modalFilterArea` → `area_region_id`) працює як до задачі
- [ ] Клавіатура: ↑/↓ ходить по списку, Enter обирає, Esc закриває без зміни, Tab не ламає стан
- [ ] `allowEmpty` дозволяє очистити необовʼязкове поле (`area_region_id` має `"default": null` у `cities.config.json`)
- [ ] Обовʼязкове поле (`country_id`, `"required": true`) не дає зберегти порожнім — валідація модалки працює як до задачі
- [ ] **Сторінка рендериться, не чекаючи довідників**: `Promise.all` у `Cities.vue:668-685` скоротився, список видно раніше (перевірити в Network — `load()` більше не стоїть у черзі за `districts?per_page=2000`)
- [ ] Запит `districts?per_page=2000` з фронтенду більше не надсилається
- [ ] Дрібні довідники (`city_type_id`, `vehicle_type_id`, статуси) залишились звичайними `<select>`
- [ ] Bulk-update із задачі **05**: якщо `updatableFields` містить FK-поле, для нього теж використовується `ReferenceSelect`, а не повний `<select>`
- [ ] Немає console errors; немає «підвислого» loading-стану після швидкого закриття модалки під час пошуку

---

## Технічні деталі для імплементації

### 1. `useReferenceSearch.js`

```js
import { ref } from 'vue'

// Module-scope кеш lookup-результатів, спільний для всіх полів (той самий
// підхід, що useListCache.js). Ключ — endpoint + нормалізований term.
const cache = new Map()
const MAX_ENTRIES = 200
const DEBOUNCE_MS = 300

export function useReferenceSearch(endpoint) {
  const options = ref([])
  const loading = ref(false)

  let debounceTimer = null
  let controller    = null   // AbortController останнього запиту

  async function fetchNow(term, filters) {
    const key = `${endpoint}?${new URLSearchParams({ ...filters, search: term })}`
    if (cache.has(key)) { options.value = cache.get(key); return }

    controller?.abort()
    controller = new AbortController()
    loading.value = true
    try {
      const params = new URLSearchParams({ lookup: '1', per_page: '20', search: term, ...filters })
      const res  = await fetch(`${endpoint}?${params}`, { headers: authHeaders(), signal: controller.signal })
      const json = await res.json()
      options.value = json.data ?? []
      cache.set(key, options.value)
      if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value)
    } catch (e) {
      if (e.name !== 'AbortError') options.value = []
    } finally {
      loading.value = false
    }
  }

  function search(term, filters = {}) {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => fetchNow(term, filters), DEBOUNCE_MS)
  }

  /** Точкове довантаження назв уже обраних значень — окремо від пошуку. */
  async function resolveByIds(ids) { /* ?lookup=1&ids=... */ }

  return { options, loading, search, resolveByIds }
}
```

⚠️ `AbortController` тут обов'язковий, не «покращення». Без нього повільніша
відповідь на коротший термін перезапише швидшу на довший, і адмін побачить
результати не свого запиту.

⚠️ `loading.value = false` у `finally` спрацює і на `AbortError` — це коректно,
бо новий запит одразу виставить `loading = true` знову.

### 2. Backend: lookup-режим

Найменш інвазивний варіант — не новий метод, а гілка в наявному `list()`:

```php
$lookup = !empty($params['lookup']);

// Lookup-режим для async-автокомпліту (ReferenceSelect): віддаємо тільки
// { id, label }, щоб дропдаун не тягнув повний рядок. per_page тут завжди
// маленький — пошук, а не вигрузка.
if ($lookup) {
    $perPage = min(50, max(1, (int) ($params['per_page'] ?? 20)));
}
```

І у формуванні відповіді:

```php
'data' => $lookup
    ? array_map(static fn(array $r) => ['id' => (int) $r['id'], 'label' => $r['name_uk']], $rows)
    : array_map(fn($r) => $this->mapRow($r), $rows),
```

`label` брати з тієї самої колонки, яку зараз показує `<option>` на фронті —
напр. для `city-types` це `short_name_uk` (`Cities.vue:35`), а не `name_uk`.
Перевіряти по кожному ендпоінту, не за шаблоном.

### 3. Backend: `?ids=`

```php
// Точкове довантаження вже обраних значень — ReferenceSelect не знає їх назв,
// а в перші 20 результатів пошуку вони можуть не потрапити.
if (!empty($params['ids'])) {
    $ids = array_values(array_unique(array_filter(
        array_map('intval', explode(',', (string) $params['ids'])),
        static fn (int $id) => $id > 0
    )));
    if ($ids === []) {
        return $this->json(['status' => 'success', 'data' => [], 'pagination' => [...]]);
    }
    $placeholders = implode(', ', array_fill(0, count($ids), '?'));
    // ... WHERE c.id IN ($placeholders), без інших фільтрів і без пагінації
}
```

⚠️ `?ids=` мусить **ігнорувати** `search`/`status`/інші фільтри. Інакше вибране
значення, що не проходить під поточний фільтр (напр. неактивний район, обраний
раніше), не резолвиться, і поле покаже id.

### 4. `ReferenceSelect.vue` — структура

```html
<template>
  <div class="ref-select position-relative">
    <!-- Обране значення / поле пошуку -->
    <div class="input-group input-group-sm">
      <input
        ref="inputEl"
        v-model="term"
        type="text"
        class="form-control form-control-sm"
        :placeholder="displayLabel || placeholder"
        :disabled="disabled"
        @focus="onFocus"
        @input="onInput"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="choose(options[cursor])"
        @keydown.esc="close"
      />
      <button v-if="allowEmpty && modelValue" class="btn btn-outline-secondary" title="Очистити"
              :disabled="disabled" @click="clear">✕</button>
    </div>

    <!-- Дропдаун -->
    <ul v-if="open" class="dropdown-menu show w-100 mt-1" style="max-height:260px; overflow-y:auto">
      <li v-if="loading" class="px-3 py-2 text-muted small">
        <span class="spinner-border spinner-border-sm me-1"></span>Пошук…
      </li>
      <li v-else-if="!options.length" class="px-3 py-2 text-muted small">Нічого не знайдено</li>
      <li v-for="(o, i) in options" :key="o.id">
        <button type="button" class="dropdown-item small"
                :class="{ active: i === cursor }" @click="choose(o)">{{ o.label }}</button>
      </li>
    </ul>
  </div>
</template>
```

Ключові моменти:

- `displayLabel` — назва поточного `modelValue`, отримана через `resolveByIds`
  при монтуванні і після кожної зміни `modelValue` зовні;
- `term` очищується при виборі, у `placeholder` залишається `displayLabel` — так
  видно обране й водночас поле готове до нового пошуку;
- закриття по кліку поза компонентом — через `@focusout` з перевіркою
  `relatedTarget`, **не** через глобальний `document` listener (модалок у нас
  багато, глобальні слухачі накопичуються).

### 5. Каскади

Зараз у `Cities.vue` це computed-фільтрація вже завантаженого масиву:

```js
const filteredDistrictsForFilter = computed(() =>
  allDistrictsList.value.filter(d => d.region_in_area_id === Number(filterOblast.value))
)
```

Стає пропом, який іде в query пошуку:

```html
<ReferenceSelect
  v-model="filterDistrict"
  endpoint="/api/admin/geography/districts"
  :filters="{ region_in_area_id: filterOblast || undefined }"
  placeholder="Район…"
  allow-empty
  @update:modelValue="load(1)"
/>
```

Отже бекенд `districts` мусить приймати `region_in_area_id` як фільтр у
lookup-режимі. Перевірити, чи він там уже є, — якщо ні, додати.

⚠️ При зміні `filterOblast` дитяче значення скидати явно (це вже робить
`onFilterOblastChange()`, `Cities.vue:342-345`) — `ReferenceSelect` сам цього не
знає.

### 6. Порядок робіт (задача велика — розбити)

1. Backend: `lookup` + `search` + `ids` на **одному** ендпоінті
   (`geography/districts` — там найгостріша проблема з обрізанням).
2. Frontend: `useReferenceSearch` + `ReferenceSelect`, підключити до
   `area_region_id` у `Cities.vue` і `CityModal.vue`. Перевірити повний цикл.
3. Далі решта ендпоінтів і полів за списком п.8, групами по домену
   (geography → catalog → sto).
4. Останнім — прибирання eager-`Promise.all` (п.9), коли всі поля сторінки
   переведені.

Не робити п.9 раніше — інакше сторінка залишиться без довідників для полів, які
ще не переведені.

### 7. Scope & Non-Goals

**В scope:** lookup/search/ids на 10 ендпоінтах, `truncated`-прапорець,
composable + компонент, переведення FK-полів зі списку п.8, збереження каскадів,
прибирання зайвого eager-завантаження.

**Поза scope:**
- створення нового значення з поля (`onCreate`)
- віртуальний скрол у дропдауні
- підняття `per_page`-лімітів
- заміна дрібних стабільних `<select>`
- мультивибір (`<AutocompleteArrayInput>`) — вкладки СТО з послугами/зручностями
  мають свій UI і не входять
- server-side підсвітка збігів у результатах

---

## FAQ

**Q: Чому не просто підняти `per_page` до 5000 і залишити `<select>`?**
A Бо це переносить проблему, а не вирішує: 5000 `<option>` у DOM це помітний
фриз при відкритті модалки, а довідник міст узагалі не має стелі. Плюс
`Cities.vue` тягне довідники **до** першого рендера — тобто чим більше стеля,
тим довше адмін дивиться в порожню сторінку.

**Q: `truncated: true` хтось буде читати?**
A Так — це діагностика, щоб такі місця не з'являлись знову. Мінімум: логувати
в консоль попередження у dev-режимі, коли відповідь прийшла з `truncated`.
Головна цінність не в UI, а в тому, що тихе обрізання стає видимим.

**Q: Кеш module-scope без TTL — не буде стейлим після створення нового району?**
A Буде, до перезавантаження сторінки. Той самий компроміс, що вже прийнятий у
`useListCache.js` (комент про відсутність TTL — прямо там). Мітигація: після
успішного create/update у довіднику скидати кеш по його `endpoint` — додати в
composable експорт `invalidate(endpoint)`.

**Q: Що з `country_city_types`-мапою (`Cities.vue`, `ctMapRes`)?**
A Не чіпати. Це не довідник для дропдауна, а мапа обмежень «які типи населених
пунктів допустимі в цій країні» — вона потрібна цілком і вона маленька.

**Q: Чи не зламає це `useUrlFilters`?**
A Ні, якщо `ReferenceSelect` працює як звичайний `v-model` над id. У URL
зберігається саме id (як зараз), а назва резолвиться при монтуванні через
`?ids=` — тобто прямі посилання з фільтром по району й далі працюють.
