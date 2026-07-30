# Задача 20: inline-редагування для всіх типів полів (react-admin `<EditableDatagrid>`)

> ## ✅ У `admin` ця задача вже зроблена — читати як довідку
>
> Те, чого просить текст нижче, у `admin` реалізовано **в обох мовах** ще до
> цього пакету, і навіть ширше: не «inline-редактор для кількох типів», а
> **реєстр типів комірок** з точкою розширення.
>
> - Vue — `frontend/src/list-framework/cellTypes.js` + `cells/*.vue`
> - React — `frontend-react/src/list-framework/cellTypes.ts` + `cells/*.tsx`
>
> Типи: `text`, `select`, `boolean`, `number`, `phone-list`. Один компонент
> обслуговує і readonly, і editable — перемикається пропом `readonly`, щоб не
> тримати дві паралельні бібліотеки. Розширення — `registerCellType(type, component)`,
> або `customCellTypes` пропом для типу, потрібного одній сторінці.
>
> Оптимістичний PATCH із відкатом при помилці теж є: `handleCellUpdate`
> (`DataListPage.vue:537`), `updateCell` (`useTableState.ts:179`).
>
> **Що з цього лишається як робота:**
>
> 1. **Перенос у `allsto`** — там inline-редагування працює лише для `type: text`.
>    Це і є справжній обсяг задачі 20, але після задачі **00** в `allsto`.
> 2. **Нові типи, якщо знадобляться** при міграції сторінок (задача 00): `date`,
>    `datetime`, `select-dependent`. Заводити тоді, коли конкретна сторінка їх
>    попросить, а не наперед.
>
> **Не застосовується з тексту нижче:** `InlineCellEditor.vue`, `useInlineEdit.js`,
> гілка `v-else-if="col.displayKey"`, «12 полів на 6 сторінках» — усе це про
> `allsto`.
>
> ---

**Скіл:** спеціалізованого немає — перед стартом прогнати `validate-task-md`.
**Спільний контекст:** [README.md](README.md) · **Статус:** [STATUS.md](STATUS.md)

## 🟢 Рекомендація: робити

На відміну від задач **17-19**, ця має конкретний обʼєкт і закриває реальний
розрив у вже наявній фічі.

## Контекст

Inline-редагування клітинок працює на 8 сторінках
(`catalog/ServiceGroups.vue`, `catalog/Services.vue`, `catalog/VehicleTypes.vue`,
`geography/AreaRegionList.vue`, `geography/Cities.vue`, `geography/CityTypes.vue`,
`geography/Countries.vue`, `geography/Timezones.vue`), але **тільки для
`type: text`** — у шаблоні жорстко `<input class="form-control form-control-sm">`
(див. `geography/Cities.vue:161-174`).

Розподіл типів полів у config-файлах geography+catalog:

| Тип | Полів | Inline зараз |
|---|---|---|
| `text` | 31 | ✅ |
| `datetime` | 14 | — (і не потрібно, `editable: false`) |
| `select` | 8 | ❌ |
| `integer` | 7 | — (`editable: false`, це `id`) |
| `status` | 4 | ⚠️ окремий toggle-кнопкою, не inline |
| `number` | 3 | ❌ |
| `boolean` | 1 | ❌ |

Тобто **12 полів** (`select` + `number` + `boolean`) редагуються тільки через
модалку, хоча стоять у тій самій таблиці поруч із текстовими, які редагуються
на місці. Це виглядає непослідовно: назву міста можна поправити кліком, а тип
міста — ні, треба відкривати модалку.

`status` (4 поля) — окремий випадок: у нього вже є свій toggle-бейдж
(`Cities.vue:180-196`), і це працює добре. Його чіпати не треба, але варто
привести до спільного механізму, щоб не було трьох різних шляхів редагування в
одній таблиці.

react-admin закриває це `<EditableDatagrid>` з `<RowForm>`, де тип контрола
виводиться з типу поля.

## Промпт для Claude Code

> Розширь inline-редагування клітинок у адмінці на всі редаговані типи полів, не
> тільки `text`.
>
> 1. **Новий компонент `www_front/admin/src/components/InlineCellEditor.vue`** —
>    рендерить контрол за типом поля:
>    - `text` → `<input type="text">` (як зараз)
>    - `number` → `<input type="number">` зі `step` за потреби
>    - `boolean` → `<input type="checkbox">` або одразу перемикач без режиму
>      редагування (клік = зміна, як `status` зараз)
>    - `select` → `<select>` з опціями довідника; якщо задача **09** зроблена —
>      `ReferenceSelect` для великих довідників (`area_region_id`, `city_id`,
>      `car_model_id`), звичайний `<select>` для дрібних (`city_type_id`,
>      `vehicle_type_id`)
>    - `status` → перемикач-бейдж, як зараз
>
>    Пропи: `type`, `modelValue`, `options`, `field`, `autofocus`. Емітить
>    `save` і `cancel`.
>
> 2. **Уніфікувати механіку.** Зараз на кожній із 8 сторінок свій набір
>    `inlineCell` / `inlineValue` / `startInline` / `saveInline` / `cancelInline`
>    (майже дослівна копія). Винести в
>    `www_front/admin/src/composables/useInlineEdit.js`:
>    `{ cell, value, start(id, field, value), save(row, field), cancel(), isEditing(id, field) }`.
>
> 3. **`inlineEditable: true` у config тепер працює для будь-якого типу.**
>    Пройти по 8 config-файлах і проставити його полям, для яких inline
>    осмислений — за списком нижче (п.5 технічних деталей). Не проставляти всім
>    підряд.
>
> 4. **Права — той самий `canEditField()`**, що вже перевіряється в шаблоні
>    (`col.inlineEditable && canEditField(col.key)` — `Cities.vue:161`). Нічого
>    нового не заводити.
>
> 5. **Зберігати через `updateWithUndo`** із задачі **10**, якщо вона зроблена, —
>    щоб нові типи одразу отримали undo, як текстові. Якщо 10 не зроблена —
>    залишити поточну схему `await patch()` + `applyToRow()`, а після 10
>    підключити.
>
> 6. **Клавіатура однакова для всіх типів:** Enter — зберегти, Esc —
>    скасувати, blur — зберегти (як зараз для `text`). Для `select` Esc мусить
>    закривати редактор, а не тільки дропдаун — перевірити.
>
> 7. **FK-поля показують назву, не id.** У config для них уже є `displayKey`
>    (`"displayKey": "city_type_name"` у `cities.config.json`) — у режимі
>    перегляду показувати `row[displayKey]`, у режимі редагування — контрол по
>    `row[key]`. Після збереження оновити **обидва** поля: бекенд повертає рядок
>    із JOIN'ом (`AdminCityController::list` віддає `city_type_name`), тому
>    `applyToRow(id, updated)` це закриє — перевірити, що `patch`-ендпоінт теж
>    повертає joined-назву, а не тільки id.
>
> **Не робити:** редагування всього рядка одразу (`<RowForm>` з кількома
> клітинками в режимі редагування), inline для `datetime`, inline на
> hand-written сторінках без config, inline для полів-звʼязків «багато-до-багатьох»
> (послуги СТО тощо).

## Що перевірити після виконання

- [ ] `InlineCellEditor.vue` і `useInlineEdit.js` створені
- [ ] Дублювання `inlineCell`/`startInline`/`saveInline`/`cancelInline` прибране з усіх 8 сторінок, замінене на composable
- [ ] `text` працює **точно як до задачі** — жодної регресії (перевірити на `name_uk` у `Cities.vue`)
- [ ] `select` редагується inline; у режимі перегляду видно **назву** (`displayKey`), не id
- [ ] Після збереження `select` у клітинці одразу правильна **назва** — тобто `patch`-ендпоінт повернув joined-поле; якщо ні, це виправлено на бекенді
- [ ] `number` редагується, нечислове введення не зберігається; порожнє значення в полі з `"default": null` зберігається як `null`, а не `0`
- [ ] `boolean` перемикається одним кліком, без режиму редагування
- [ ] `status` працює як до задачі (toggle-бейдж), але через спільний механізм
- [ ] Клавіатура: Enter / Esc / blur однаково для всіх типів; **Esc у `select` закриває редактор**, не лише дропдаун
- [ ] Права: поле без `editPermissions` для поточного адміна не редагується inline (перевірити роллю з `geography.cities.edit.names`, але без `geography.cities.edit` — назви inline-редагуються, `city_type_id` ні)
- [ ] Якщо задача **10** зроблена: inline-зміна `select`/`number`/`boolean` дає тост із «Скасувати», і скасування повертає **і** id, **і** назву
- [ ] Якщо задача **09** зроблена: `area_region_id` inline використовує `ReferenceSelect` з пошуком, а не повний `<select>`
- [ ] Задача **01** (селектор колонок): приховування колонки не ламає активний inline-редактор у ній
- [ ] `npm run build:admin` виконаний — оновлені config з новими `inlineEditable` синкнуті в `www_app/config/`
- [ ] Немає console errors; немає «залипання» редактора при кліку по іншій клітинці під час редагування

---

## Технічні деталі

### 1. `useInlineEdit.js`

Витягується з того, що вже є (`Cities.vue:619-632`) — код майже готовий:

```js
import { ref } from 'vue'

/**
 * Inline-редагування клітинки таблиці (react-admin: EditableDatagrid).
 * Одна клітинка в редагуванні за раз — свідомо: редагування всього рядка
 * (RowForm) вимагало б окремої моделі стану й валідації рядка цілком.
 */
export function useInlineEdit({ onSave }) {
  const cell  = ref(null)   // { id, field }
  const value = ref(null)

  function isEditing(id, field) {
    return cell.value?.id === id && cell.value?.field === field
  }

  function start(id, field, initial) {
    cell.value  = { id, field }
    value.value = initial ?? null
  }

  function cancel() {
    cell.value = null
    value.value = null
  }

  async function save(row, field) {
    if (!cell.value || cell.value.id !== row.id || cell.value.field !== field) return
    const newVal = value.value
    const oldVal = row[field] ?? null
    cancel()
    // Порівняння через != намірене: '5' і 5 для select-поля — те саме значення.
    if (String(newVal ?? '') === String(oldVal ?? '')) return
    await onSave({ row, field, newVal, oldVal })
  }

  return { cell, value, isEditing, start, save, cancel }
}
```

⚠️ Порівняння «чи змінилось» для не-текстових типів складніше, ніж поточне
`newVal === (row[field] ?? '')` (`Cities.vue:626`): `<select>` віддає рядок, а в
`row` лежить число. Без нормалізації кожен вихід із редактора `select`
відправляв би `patch` навіть без зміни.

### 2. Розмітка клітинки

```html
<td v-else-if="col.inlineEditable && canEditField(col.key)">
  <InlineCellEditor
    v-if="isEditing(row.id, col.key)"
    v-model="inlineValue"
    :type="cfg.fields[col.key].type"
    :field="col.key"
    :options="referenceOptions(col.key)"
    autofocus
    @save="saveInline(row, col.key)"
    @cancel="cancel"
  />
  <span v-else class="inline-editable" @click="start(row.id, col.key, row[col.key])">
    {{ col.displayKey ? (row[col.displayKey] ?? '—') : (row[col.key] ?? '—') }}
  </span>
</td>
```

⚠️ Ключове — `col.displayKey ? row[col.displayKey] : row[col.key]` у режимі
перегляду. Зараз FK-колонки рендеряться окремою гілкою
(`v-else-if="col.displayKey"` — `Cities.vue:158`), яка **не** інтерактивна. Ці дві
гілки треба обʼєднати, інакше `select` inline не з'явиться: гілка з `displayKey`
перехоплює умову раніше.

### 3. Які поля позначити `inlineEditable`

Не всі підряд. Критерій: часто правиться поштучно і не має складної валідації.

| Config | Додати `inlineEditable` | Не додавати |
|---|---|---|
| `geography/cities.config.json` | `city_type_id`, `is_capital` | `country_id`, `area_region_id` — каскадні, зміна регіону без країни дає неконсистентність; `latitude`/`longitude` — правляться парою, не поштучно |
| `geography/countries.config.json` | статуси, порядкові номери | коди ISO — рідко правляться, помилка дорога |
| `geography/city-types.config.json` | `is_active`, числові | — |
| `geography/areas.config.json` / `districts.config.json` | `country_id` (для areas), `region_in_area_id` (для districts) | — |
| `catalog/vehicle-types.config.json` | `is_active`, порядок | — |
| `catalog/service-groups.config.json` | `is_active`, порядок | — |

⚠️ `latitude`/`longitude` (`type: number`) свідомо **не** inline: вони мають
сенс тільки в парі, і в `Cities.vue` для них є окремий геокодинг
(`AdminCityController::geocode`). Inline-правка однієї координати з двох дає
запис із координатами «пів-звідси, пів-звідти».

⚠️ Каскадні FK (`country_id` → `area_region_id` у cities) inline **не**
редагувати: у модалці для них є каскад (`CityModal.vue:49-59`), який стежить за
консистентністю. У клітинці цього каскаду немає.

### 4. `patch`-ендпоінт мусить повертати joined-назву

Це головна бекенд-залежність задачі. Зараз після inline-збереження текстового
поля робиться `applyToRow(row.id, await patch(...))` — тобто рядок оновлюється з
відповіді. Для `select` цього достатньо **тільки якщо** `PATCH` повертає
`city_type_name`, а не лише `city_type_id`.

Перевірити в `AdminCityController::update` (рядок 159) — чи він віддає рядок,
зібраний тим самим `SELECT` з JOIN'ами, що `list()`, або лише поля з `$data`.
Якщо друге — виправити: інакше після inline-зміни типу в клітинці буде порожньо
або старе значення.

---

## Scope & Non-Goals

**В scope:** `InlineCellEditor.vue`, `useInlineEdit.js`, обʼєднання гілки
`displayKey` з інтерактивною, `inlineEditable` для `select`/`number`/`boolean` за
списком п.3, нормалізація порівняння значень, перевірка/виправлення
joined-відповіді в `PATCH`.

**Поза scope:**
- редагування всього рядка одразу (`<RowForm>`)
- inline для `datetime`
- inline для каскадних FK і координат
- inline на hand-written сторінках без config (20 сторінок з категорії B)
- inline для звʼязків «багато-до-багатьох» (послуги/зручності СТО)
- масове inline-редагування (це задача **05**)

---

## FAQ

**Q: Чому `boolean` без режиму редагування, а одразу перемикач?**
A Бо в чекбокса немає стану «редагую, ще не зберіг» — клік уже і є вибір.
Робити для нього Enter/Esc означало б два кліки там, де достатньо одного. Це та
сама логіка, за якою `status` уже працює toggle-бейджем.

**Q: Чому не зробити одразу `<RowForm>` — редагування всього рядка?**
A Це інша фіча з іншою ціною: валідація рядка цілком, кнопки Зберегти/Скасувати
в рядку, конфлікт із `colspan` і прихованими колонками (задача **01**). А головне —
незрозуміло, чи потрібна: поточний сценарій «поправити одну клітинку» inline
покриває, а «поправити багато полів» покриває модалка.

**Q: Що з `status`, якщо він уже працює?**
A Не міняти поведінку, тільки перевести на спільний механізм, щоб у таблиці не
було трьох різних шляхів редагування (text-inline, status-toggle, модалка).
Візуально нічого не мусить змінитись.

**Q: Чому `latitude`/`longitude` не inline, вони ж `number`?**
A Бо координата без пари безглузда, і в `Cities.vue` для них уже є окремий
геокодинг. Inline-правка однієї з двох — прямий шлях до записів із
неконсистентними координатами.

**Q: Задача 09 обовʼязкова для цієї?**
A Ні. Без 09 `select` inline використовує звичайний `<select>` із уже
завантаженим довідником — так само, як зараз працює модалка. Але для великих
довідників (`area_region_id`) inline-`<select>` успадкує ту саму проблему
обрізання на 500 записів, що описана в задачі 09. Тому для великих FK краще
дочекатись 09 — і саме тому вони в п.3 у графі «не додавати».
