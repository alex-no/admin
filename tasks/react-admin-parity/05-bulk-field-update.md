# Задача 05: масове оновлення поля (react-admin `<BulkUpdateButton>`)

> ## 🔧 Адаптація для `admin`: клієнт уже готовий, лишається сервер
>
> **Ця задача в `admin` наполовину закрита ще до пакету, в обох мовах.**
> UI «вибрати рядки → обрати поле → задати значення → Застосувати» працює:
> `DataListPage.vue:81-102` + `applyBulkUpdate` (`:608`);
> `DataTable.tsx:281-312` + `useTableState.ts:290`.
>
> **Що НЕ зроблено — і саме це є задачею:**
>
> 1. **Серверного bulk-ендпоінта немає взагалі.** `backend/src/Admin/Controller/`
>    не має жодного `bulk`-методу. Клієнт шле по одному `PATCH /{id}` **послідовно**
>    в циклі `for (const id of selected)`. На 250 вибраних це 250 запросів; помилка
>    на 137-му лишає перші 136 змінених, решту — ні, і повідомляє тостом про
>    один запис. Транзакційності немає.
> 2. **Whitelist полів чисто клієнтський** — `columnsConfig.filter(c => c.editable)`.
>    Тобто обходиться з DevTools: `PATCH` з будь-яким полем сервер приймає, якщо
>    контролер його не фільтрує. Це те, про що йдеться в чеклісті безпеки нижче.
>
> **Куди:** `backend/src/Admin/Controller/AdminStoController.php` (і далі решта
> контролерів), новий `POST /api/admin/{resource}/bulk` + роут у
> `config/common/routes.php`. Прапорець `bulkEditable` — у `ColumnConfig`
> (`types.ts`) і в `*.columns.json`.
>
> **Не застосовується з тексту нижче:** `FieldConfigReader::resolveUpdate()` і
> нові методи в ньому (у `admin` цього класу немає — whitelist робити явним
> масивом у контролері або окремим маленьким сервісом у `src/Admin/Service/`),
> «12 контролерів», DDD-шари `Module/*/Application`.
>
> **Застосовується повністю:** чекліст безпеки (спроба `created_at`,
> `password_hash`, `id` → 400), валідація FK → 409, аудит по одному рядку на id.
>
> ---

**Скіл:** спеціалізованого немає — перед стартом прогнати `validate-task-md`.
**Спільний контекст:** [README.md](README.md) — інвентаризація 26 списковых сторінок і спільні правила.

## Контекст

Наш `components/BulkActions.vue` умів рівно три жорстко зашиті дії:
`activate` / `deactivate` / `delete`. Бекенд теж — див. `AdminCityController::bulkAction`
(`www_app/src/Module/Admin/Api/Controller/Geography/AdminCityController.php:265`):

```php
if (!in_array($action, ['activate', 'deactivate', 'delete'], true)) {
    return $this->json(['status' => 'error', 'message' => 'Невірна дія'], 400);
}
```

Тобто «перенести 40 виділених міст в інший регіон», «перекинути 12 послуг у
іншу групу», «виставити тип для пачки населених пунктів» адмін робить по одному
запису — 40 відкриттів модалки. react-admin закриває це `<BulkUpdateButton
data={{ field: value }} />`.

⚠️ **Це задача з реальною поверхнею атаки.** «Оновити довільне поле у виділених
записах» без строгого whitelist = масовий UPDATE будь-якої колонки з фронтенду.
Тому whitelist на бекенді обов'язковий і мусить бути **джерелом правди**, а не
дублюванням фронтового списку.

Добра новина: інструмент для цього вже є —
`www_app/src/Module/Admin/Application/Service/FieldConfigReader.php` читає
`*.config.json` (той самий, що синкається `npm run build:admin`) і вміє
`resolveUpdate()`, який пропускає **лише** `editable` поля і кастує по `type`.

## Промпт для Claude Code

> Розширь масові дії в адмінці: додай «задати полю значення для виділених
> записів» — аналог `<BulkUpdateButton>` з react-admin.
>
> ### Backend
>
> 1. У `bulkAction()` кожного контролера, що вже має цей метод, додай дію
>    `update` поруч із `activate`/`deactivate`/`delete`. Тіло запиту:
>    ```json
>    { "action": "update", "ids": [1,2,3], "field": "city_type_id", "value": 4 }
>    ```
>
> 2. **Whitelist полів — через `FieldConfigReader`, не через масив у коді.**
>    Поле приймається тільки якщо `resolveUpdate([$field => $value])` повернув
>    для нього значення (тобто воно є в `fields{}` і `editable: true`). Значення
>    брати **звідти ж** — це дає безкоштовний кастинг по `type` і відсікає
>    сміття. Якщо `resolveUpdate()` повернув порожній масив → 400 «Поле
>    недоступне для масового оновлення».
>
> 3. **Додай у config окремий прапорець `"bulkEditable": true`** і вимагай його
>    поверх `editable`. Причина: не всяке редаговане поле безпечно міняти пачкою
>    (напр. `name_uk` — масова заміна назв 40 містам не має сенсу і не
>    відкатується). Тобто whitelist = `editable && bulkEditable`.
>
> 4. **Права.** Перевіряти те саме право, що для одиночного `update` цього поля.
>    У config уже є per-field `editPermissions[]` (див.
>    `geography/cities.config.json`) — використовувати їх, а не одне загальне
>    `*.edit`.
>
> 5. **Foreign key валідація.** Якщо поле `type: select` — перевірити, що
>    `value` існує в цільовій таблиці, і віддати 409 з людським текстом замість
>    того, щоб дати впасти FK-constraint (як це вже зроблено для `delete`:
>    «Неможливо видалити: частина записів використовується в інших таблицях»).
>
> 6. **Audit log.** Якщо в контролері вже підключений `AuditLogger` — писати
>    **по одному рядку на кожен id**, як це зроблено для bulk-delete у
>    `AdminStoController` (див. `tasks/audit-log-sto.md`), а не один груповий
>    запис.
>
> 7. Оновити `updated_at`, як це вже робить гілка `activate`/`deactivate`.
>
> ### Frontend
>
> 8. **Розширь `components/BulkActions.vue`** — новим пропом
>    `updatableFields: [{ key, label, type, options? }]`. Якщо масив непорожній,
>    показувати кнопку «Змінити поле…», що розкриває маленьку форму:
>    `[селект поля] [контрол значення за типом] [Застосувати]`. Емітити
>    `update-field` з `{ field, value }`.
>
> 9. **Підтвердження перед застосуванням** — тост із `action`-кнопкою не
>    підходить (дія незворотна й масова). Показати inline-підтвердження в самому
>    блоці: «Змінити «Тип» на «місто» для 40 записів?» + [Застосувати] [Скасувати].
>
> 10. **Розкатай на сторінки, де вже є `BulkActions`** — 14 сторінок:
>     `catalog/CarBrands.vue`, `catalog/CarModels.vue`, `catalog/ServiceGroups.vue`,
>     `catalog/Services.vue`, `catalog/VehicleTypes.vue`,
>     `geography/AreaRegionList.vue`, `geography/Cities.vue`,
>     `geography/CityTmpReview.vue`, `geography/CityTypes.vue`,
>     `geography/Countries.vue`, `pages/News.vue`, `pages/StoApplications.vue`,
>     `pages/StoList.vue`, `pages/AdminManagement.vue`.
>
>     Для кожної визначити **осмислений** набір `bulkEditable` полів — не всі
>     `editable` підряд. Мінімум: FK-поля (група/тип/країна/регіон) і статуси.
>
> **Не робити:** зміну кількох полів за один раз, undo для bulk-update (див. FAQ),
> bulk-update на сторінках без `BulkActions` (`Users.vue`, `Reviews.vue`,
> `Feedback.vue`, `AuditLog.vue`, `ErrorLogs.vue`, `Analytics.vue` — там і
> виділення рядків немає).

## Що перевірити після виконання

### Backend

- [ ] `action: "update"` доданий у `bulkAction()` усіх 12 контролерів, що мають цей метод (`AdminReviewController`, `AdminStoController`, `Catalog/AdminCarBrandController`, `Catalog/AdminCarModelController`, `Catalog/AdminServiceController`, `Catalog/AdminServiceGroupController`, `Catalog/AdminVehicleTypeController`, `Geography/AdminAreaRegionController`, `Geography/AdminCityController`, `Geography/AdminCityTmpController`, `Geography/AdminCityTypeController`, `Geography/AdminCountryController`)
- [ ] Whitelist іде через `FieldConfigReader::resolveUpdate()` + прапорець `bulkEditable`, а **не** через окремий масив імен полів у коді контролера
- [ ] **Спроба оновити поле, якого немає в whitelist, дає 400** — перевірити руками через curl/Postman: `{"action":"update","ids":[1],"field":"created_at","value":"2000-01-01"}` → 400, значення в БД не змінилось
- [ ] **Спроба оновити поле, якого немає в `fields{}` взагалі** (напр. `"field":"password_hash"` на `Users`, `"field":"id"`) → 400, SQL не виконався
- [ ] **SQL-інʼєкція через `field`** неможлива: імʼя колонки не підставляється в запит напряму з тіла, а береться з ключа, що повернув `resolveUpdate()`
- [ ] Права перевіряються per-field через `editPermissions[]` з config: адмін із `geography.cities.edit.names` (але без `geography.cities.edit`) **не** може масово змінити `city_type_id` → 403
- [ ] Порожній `ids` → 400 (як зараз для інших дій); `ids` фільтруються через `intval` + `> 0` (той самий патерн, що вже є)
- [ ] FK-валідація: `{"field":"country_id","value":999999}` → 409 з людським текстом, а не 500 від constraint violation
- [ ] `updated_at` оновлюється
- [ ] Audit log: одна зміна поля для 3 записів дає **3 рядки** в `audit_log` з правильним diff'ом (old → new) на кожен id, не один груповий
- [ ] Відповідь містить `affected` (кількість реально змінених рядків), як зараз

### Frontend

- [ ] `BulkActions.vue` показує «Змінити поле…» тільки коли `updatableFields` непорожній — на сторінках без нього вигляд не змінився
- [ ] Контрол значення відповідає типу: `select` → дропдаун з `options`, `boolean`/`status` → так/ні, `text` → інпут, `number` → числовий інпут
- [ ] Inline-підтвердження показує **і назву поля, і нове значення (людською назвою, не id), і кількість записів**
- [ ] «Скасувати» в підтвердженні не надсилає запит
- [ ] Після успіху: список перезавантажується, виділення знімається, тост «Оновлено N запис(ів)»
- [ ] Після 403/409 з бекенду: тост з текстом помилки, виділення **не** знімається (адмін може виправити значення й повторити)
- [ ] У списку `updatableFields` немає полів без `bulkEditable` у config — перевірити, що `name_uk`/`name_en`/`name_ru` у `Cities.vue` в нього **не** потрапили
- [ ] Поля, на які в поточного адміна немає `editPermissions`, у дропдаун не потрапляють (та сама перевірка `canEditField()`, що вже є)
- [ ] Розкатано на всі 14 сторінок зі списку
- [ ] `npm run build:admin` виконаний — оновлені `*.config.json` з `bulkEditable` синкнуті в `www_app/config/` (**інакше бекенд відкине всі поля** — whitelist читається з синкнутого config)
- [ ] Немає console errors

---

## Технічні деталі для імплементації

### 1. Backend: гілка `update` у `bulkAction`

Референс — `AdminCityController::bulkAction` (рядки 251-294). Поточна структура:
парсинг `action`/`ids` → перевірка дії → перевірка `ids` → перевірка права →
`$placeholders` → `if delete / else activate|deactivate` → `affected`.

Додається:

```php
if (!in_array($action, ['activate', 'deactivate', 'delete', 'update'], true)) {
    return $this->json(['status' => 'error', 'message' => 'Невірна дія'], 400);
}

// ...

if ($action === 'update') {
    $field = (string) ($data['field'] ?? '');

    // Whitelist = fields{} з synced config, editable && bulkEditable.
    // resolveUpdate() сам відкидає не-editable і кастує значення по type,
    // тому імʼя колонки в SQL завжди приходить з config, не з тіла запиту.
    $resolved = $this->fieldConfig->resolveUpdate([$field => $data['value'] ?? null]);
    if (!array_key_exists($field, $resolved) || !$this->fieldConfig->isBulkEditable($field)) {
        return $this->json(['status' => 'error', 'message' => 'Поле недоступне для масового оновлення'], 400);
    }

    if (!$this->auth->canAny($payload['permissions'] ?? [], $this->fieldConfig->editPermissions($field))) {
        return $this->json(['status' => 'error', 'message' => 'Forbidden'], 403);
    }

    $value = $resolved[$field];
    // ... FK-перевірка для type: select
    // ... UPDATE city SET `$field` = ?, updated_at = ? WHERE id IN ($placeholders)
    // ... AuditLogger по кожному id
}
```

**Три нові методи в `FieldConfigReader`** (він зараз читає лише `fields`):

```php
public function isBulkEditable(string $key): bool
{
    return ($this->fields[$key]['editable'] ?? false) && ($this->fields[$key]['bulkEditable'] ?? false);
}

/** @return string[] */
public function editPermissions(string $key): array
{
    return $this->fields[$key]['editPermissions'] ?? [];
}

public function fieldType(string $key): string
{
    return $this->fields[$key]['type'] ?? 'text';
}
```

⚠️ `$field` у SQL підставляється як ідентифікатор, а не bind-параметр — тому
**обов'язково** беремо його з `array_key_exists($field, $resolved)`, тобто з
ключа, який пройшов через config. Не з `$data['field']` напряму.

### 2. Backend: контролери без `FieldConfigReader`

Не всі 12 контролерів його зараз інжектять. Для тих, що мають відповідний
config-файл — додати в конструктор, як це вже зроблено там, де він є. Для
контролерів **без** config (`AdminReviewController`, `AdminStoController`,
`AdminCityTmpController`, `Catalog/AdminCarModelController`,
`Catalog/AdminServiceController`, `Catalog/AdminCarBrandController` — у
`car-brands.config.json` немає `fields{}`) — оголосити явний константний
whitelist у самому контролері:

```php
/** Поля, дозволені для масового оновлення (аналог bulkEditable у config). */
private const BULK_EDITABLE = [
    'is_active'   => ['type' => 'status', 'perm' => 'sto.edit.status'],
    'sto_type'    => ['type' => 'text',   'perm' => 'sto.edit'],
];
```

Це не порушує п.2 промпту: правило «whitelist на бекенді — джерело правди»
виконується, просто джерело різне залежно від наявності config. Головне —
фронтовий список **ніколи** не є whitelist'ом.

### 3. Frontend: `BulkActions.vue`

Поточний компонент простий (52 рядки, три хардкодні кнопки + «Зняти виділення»).
Додати після кнопки «Видалити»:

```html
<button v-if="updatableFields.length" class="btn btn-sm btn-outline-primary"
        :disabled="busy" @click="formOpen = !formOpen">
  <i class="bi bi-pencil-square me-1"></i>Змінити поле…
</button>
```

І другий рядок у тому ж блоці (`v-if="formOpen"`), з селектом поля, контролом
значення й підтвердженням. Тримати все в самому `BulkActions.vue` — сторінка має
отримати лише `updatableFields` і обробити `@update-field`.

### 4. Frontend: `updatableFields` на сторінці

Для config-driven сторінок — computed із config, з фільтром по правах:

```js
// Поля, доступні для масового оновлення: bulkEditable у config + права
// поточного адміна. Whitelist на бекенді свій (з того ж config) — цей список
// лише про те, що показати в UI.
const updatableFields = computed(() =>
  Object.entries(cfg.fields)
    .filter(([key, f]) => f.bulkEditable && canEditField(key))
    .map(([key, f]) => ({
      key, label: f.label, type: f.type,
      options: f.type === 'select' ? referenceOptions(key) : undefined,
    }))
)
```

`referenceOptions(key)` бере вже завантажені довідники сторінки
(`countriesList`, `areaRegionsList`, `cityTypesList` у `Cities.vue:331-334`).

### 5. Рекомендовані `bulkEditable` по сторінках

Не «всі editable підряд». Мінімальний осмислений набір:

| Сторінка | `bulkEditable` |
|---|---|
| `geography/Cities.vue` | `city_type_id`, `country_id`, `area_region_id`, `is_active` |
| `geography/Countries.vue` | `is_active` |
| `geography/CityTypes.vue` | `is_active` |
| `geography/AreaRegionList.vue` | `country_id`, `region_in_area_id`, `is_active` |
| `catalog/Services.vue` | `service_group_id`, `is_active` |
| `catalog/ServiceGroups.vue` | `is_active` |
| `catalog/VehicleTypes.vue` | `is_active` |
| `catalog/CarModels.vue` | `car_brand_id`, `is_active` |
| `catalog/CarBrands.vue` | `is_active` |
| `pages/News.vue` | статус публікації |
| `pages/StoList.vue` | `is_active`, `sto_type` |
| `pages/StoApplications.vue` | статус заявки |

`geography/CityTmpReview.vue` і `pages/AdminManagement.vue` — залишити без
`update`-дії (черга модерації і керування адмінами мають власну семантику).

Назви полів у таблиці — **орієнтир**; фактичні брати з відповідних config/схеми,
не з цього списку.

### 6. Scope & Non-Goals

**В scope:** гілка `update` у 12 контролерах, 3 нові методи в
`FieldConfigReader`, `bulkEditable` у config-файлах, розширення `BulkActions.vue`,
розкатка на 14 сторінок, FK-валідація, audit log по рядку на id.

**Поза scope:**
- зміна кількох полів за один раз (`{ field_a: x, field_b: y }`)
- undo для bulk-update (див. FAQ)
- bulk-update на сторінках без виділення рядків
- виділення записів за фільтром (це задача **08**) — тут працюємо тільки з
  явним списком `ids`
- масова зміна `name_*` полів

---

## FAQ

**Q: Чому немає undo, якщо для delete він є (`useUndoableDelete`)?**
A Undo для delete працює тому, що ми **відкладаємо** запит на 5 секунд і
скасування = просто не надсилати його. Для update старі значення 40 записів
треба було б зберігати клієнтом і потім надсилати 40 зворотних запитів — це не
undo, а другий bulk-update, який може частково провалитись. Замість undo —
inline-підтвердження **до** дії плюс запис у audit log **після**.

**Q: Чому не дозволити фронтенду просто передавати `{field, value}` без прапорця `bulkEditable`?**
A Бо `editable: true` стоїть майже на всіх полях (це умова для одиночного
редагування в модалці), і без другого прапорця whitelist фактично = «всі поля».
Масова зміна `name_uk` для 40 міст — незворотна операція, яку адмін навряд чи
хотів.

**Q: Що буде, якщо забути `npm run build:admin` після правки config?**
A Бекенд читає `www_app/config/**/*.config.json`, а не файл із
`www_front/admin/src/pages/`. Без синку `isBulkEditable()` повернe `false` на
всі поля → 400 на будь-яку спробу. Симптом: у UI поле є в дропдауні, а запит
падає з «Поле недоступне для масового оновлення».

**Q: Чи можна оновити поле, яке зараз редагується inline у тому ж рядку?**
A Технічно так, але після успіху йде `load()`, який перемалює `items` — inline
клітинка закриється, незбережене значення зникне. Це прийнятно (аналогічно
поводиться `activate`/`deactivate` зараз).

**Q: Bulk-update і optimistic locking (`version` у `sto`) — конфлікт?**
A Ні, і це свідомо: bulk-дії не роблять version-check (див. FAQ у
`tasks/optimistic-locking-sto.md` — «масові дії свідомі, не concurrent edit»).
Але `version = version + 1` до `UPDATE` у `AdminStoController` **треба** додати,
інакше адмін з відкритою модалкою збереже поверх bulk-зміни й навіть не
дізнається.
