# Задача 10: undoable-збереження (react-admin `mutationMode="undoable"`)

> ## 🔧 Адаптація для `admin`: обсяг менший, ніж здається
>
> **Що вже є:** inline-PATCH у фреймворку **уже оптимістичний з відкатом** —
> значення міняється в UI одразу, при помилці повертається назад і летить тост
> (`handleCellUpdate`, `DataListPage.vue:537`; `updateCell`, `useTableState.ts:179`).
> Тобто «мутація не блокує UI» вже виконано.
>
> **Чого немає — і це задача:** вікна «Скасувати». Зараз PATCH йде **негайно**;
> undo-затримки, як у `useUndoableDelete` (`UNDO_DELETE_DELAY`), для update немає.
>
> **Куди:** перейменувати `useUndoableDelete` → `useUndoableMutation` в обох мовах,
> додати `updateWithUndo` / `updateManyWithUndo`, підключити в `handleCellUpdate`
> та `updateCell`, а також у `applyBulkUpdate`.
>
> **Застосовується повністю:** дедуп по ключу `${id}:${field}` (без нього швидка
> зміна тієї самої комірки двічі дасть два конкуруючих PATCH), `flushPending()` на
> unmount + `beforeunload` з `fetch(..., { keepalive: true })`.
>
> **Розділ «⚠️ Важливо» нижче (чому undoable не для модалок) у `admin` читається
> інакше:** у фреймворку немає ні серверної валідації через `FieldConfigReader`,
> ні `version_conflict` 409 — тобто причини, які в `allsto` забороняють undoable
> для модалок, тут відсутні. Але висновок той самий: обмежитись комірками й bulk,
> бо модалку деталей тримає сторінка, і ядро не має права відкладати її збереження.
>
> **Взаємодія з 12:** `hasPending` мусить бути в публічному API composable —
> polling із задачі 12 не має перезаписувати рядок, для якого ще тікає undo.
>
> **Не застосовується:** `StoList.vue:2958-2968`, `version_conflict`,
> `FieldConfigReader::validateRequired()`, `toggleStatus`/`saveInline` (у
> фреймворку це один `updateCell`).
>
> ---

**Скіл:** спеціалізованого немає — перед стартом прогнати `validate-task-md`.
**Спільний контекст:** [README.md](README.md) — інвентаризація 26 списковых сторінок і спільні правила.

## Контекст

У нас уже є `composables/useUndoableDelete.js` — оптимістичне видалення з тостом
«Скасувати» і реальним `DELETE` через 5 секунд
(`UNDO_DELETE_DELAY = 5000`). Працює добре, розкатано на CRUD-сторінках.

Для **збереження** такого немає. Кожна зміна — це очікування відповіді сервера,
і якщо адмін помилився (перемкнув статус не тому рядку, стер назву при
inline-редагуванні), відкату немає — тільки міняти назад руками, і в audit log
залишаються два записи.

react-admin має для цього `mutationMode="undoable"` і робить його **дефолтом**
для `<Edit>`.

---

## ⚠️ Важливо: undoable підходить не для всіх збережень

react-admin сам документує обмеження undoable-режиму: клієнт не бачить
відповіді сервера, тому серверна валідація й серверні побічні ефекти
недоступні. Для нашої кодової бази це означає конкретні конфлікти:

**1. Optimistic locking.** `StoList.vue` уже надсилає `expected_version` і
розраховує **одразу** побачити 409 `version_conflict` з тостом
«Перезавантажити» (`StoList.vue:2958-2968`, задача
`tasks/optimistic-locking-sto.md`). В undoable-режимі модалка закривається, а
409 приходить через 5 секунд — уже без контексту, з втраченою формою. Це прямо
ламає фічу, яку щойно зробили.

**2. Серверна валідація.** `FieldConfigReader::validateRequired()` повертає
«Обовʼязкові поля: …» — цей текст мусить приїхати у відкриту форму, а не в тост
через 5 секунд після закриття.

**3. Створення записів.** Клієнту потрібен `id` нового запису (для
`justCreatedIds`-підсвітки, для `?id=` в URL). Undoable його не дає — react-admin
теж забороняє undoable для create.

**Тому deliverable цієї задачі — undoable для дешевих однопольних мутацій,
які вже існують і які легко відкотити локально**, а не для збереження модалки.
Це рівно ті мутації, що структурно ідентичні `delete`: одне поле, старе значення
відоме клієнту, серверної валідації немає.

---

## Промпт для Claude Code

> Розширь undoable-механіку адмінки з видалення на однопольні збереження —
> частковий аналог `mutationMode="undoable"` з react-admin.
>
> 1. **Переименуй/розширь `composables/useUndoableDelete.js` у
>    `composables/useUndoableMutation.js`**, зберігши наявні
>    `deleteWithUndo` / `deleteManyWithUndo` **без зміни поведінки й підписів**
>    (вони вже розкатані по сторінках — не ламати). Додати третю функцію:
>
>    ```js
>    updateWithUndo({ apply, revert, commit, onCommitError, message })
>    ```
>
>    Та сама механіка: `apply()` синхронно, таймер `UNDO_DELETE_DELAY`, тост із
>    «Скасувати», по таймауту — `commit()`, при помилці — `notify` + `revert()`
>    або `onCommitError()`.
>
>    Спільну частину (таймер + тост + скасування) винести у внутрішній хелпер —
>    зараз `deleteWithUndo` і `deleteManyWithUndo` дублюють її майже дослівно.
>
> 2. **Переведи на `updateWithUndo` три види мутацій, що вже є на сторінках:**
>
>    **а) Перемикання статусу в рядку** — `toggleStatus(row)`. Зараз (напр.
>    `Cities.vue`) це `await patch(...)` зі спінером у бейджі. Стає: бейдж
>    перемикається одразу, тост «Статус змінено» + «Скасувати».
>
>    **б) Inline-редагування клітинки** — `saveInline(row, field)`. Зараз
>    `await patch(...)` після blur/Enter. Стає: значення в клітинці одразу,
>    тост «Назву змінено» + «Скасувати». Реалізовано на 7 сторінках:
>    `catalog/ServiceGroups.vue`, `catalog/Services.vue`,
>    `catalog/VehicleTypes.vue`, `geography/AreaRegionList.vue`,
>    `geography/Cities.vue`, `geography/CityTypes.vue`,
>    `geography/Countries.vue`, `geography/Timezones.vue`.
>
>    **в) Bulk activate/deactivate** — використати `deleteManyWithUndo`-подібну
>    групову форму (`updateManyWithUndo`): один тост і одне «Скасувати» на всю
>    пачку. `delete` уже так працює, `activate`/`deactivate` — ні.
>
> 3. **Захист від втрати відкладеного запиту.** Зараз `useUndoableDelete` тримає
>    `setTimeout` і нічого не робить, якщо адмін піде зі сторінки до його
>    спрацювання — запит просто не відправиться, а UI уже показав зміну.
>    Додати:
>    - **flush при `beforeunload`** — виконати всі відкладені `commit()` (через
>      `navigator.sendBeacon` або синхронний `fetch` з `keepalive: true`);
>    - **flush при unmount сторінки** (`onUnmounted`) — виконати відкладені
>      commit'и, не чекаючи таймера;
>    - **черга по (id, field)**: друга зміна того самого поля того самого запису
>      до спрацювання таймера мусить скасувати перший таймер і замінити його, а
>      не створювати другий паралельний.
>
>    Це стосується і наявного `deleteWithUndo` — тобто виправляє існуючу дірку,
>    не тільки нову функцію.
>
> 4. **Не робити undoable для:**
>    - збереження модалки (`saveModal` / `saveGeneral` / create) — див. розділ
>      «⚠️ Важливо» вище;
>    - будь-чого, що надсилає `expected_version` (optimistic locking);
>    - `delete` з `all: true` за фільтром (задача **08** його й так забороняє);
>    - `bulkAction` з `action: "update"` (задача **05**) — там inline-підтвердження
>      **до** дії, і це свідомий вибір, див. її FAQ.
>
> 5. **Тексти тостів мусять казати, що саме змінилось** — «Назву «Львів» змінено
>    на «Львів-1»», а не «Збережено». Інакше кнопка «Скасувати» незрозуміла:
>    адмін не пам'ятає, яку з трьох останніх дій вона відкотить.

## Що перевірити після виконання

### Рефакторинг composable

- [ ] `useUndoableMutation.js` створений; `deleteWithUndo` і `deleteManyWithUndo` мають **ті самі імена, підписи й поведінку**
- [ ] Усі сторінки, що імпортували `useUndoableDelete`, оновлені; старий файл видалений (або залишений re-export'ом — обрати одне й не залишати два джерела)
- [ ] Спільна механіка таймера/тоста винесена в один внутрішній хелпер, дублювання між `delete`/`deleteMany`/`update` немає
- [ ] `UNDO_DELETE_DELAY` як і раніше експортується (на нього можуть спиратись сторінки)

### Перемикання статусу

- [ ] Клік по бейджу статусу міняє його **одразу**, без спінера-очікування
- [ ] Тост «Скасувати» повертає попередній статус у рядку
- [ ] Через 5 секунд без скасування летить реальний `PATCH`; у Network видно **один** запит
- [ ] Скасування протягом 5 секунд → **жодного** запиту в Network
- [ ] Помилка сервера після таймауту → тост з помилкою + статус у рядку відкочується назад
- [ ] Подвійний швидкий клік по тому самому статусу (вкл→викл→вкл) не створює двох паралельних таймерів і не надсилає двох запитів — летить один, з фінальним значенням

### Inline-редагування

- [ ] Значення в клітинці змінюється одразу після Enter/blur
- [ ] Тост містить старе й нове значення
- [ ] «Скасувати» повертає старе значення в клітинку
- [ ] Порожній ввід / незмінене значення як і раніше не надсилають запиту (`saveInline` уже має цю перевірку — `if (newVal === (row[field] ?? '')) return`)
- [ ] Редагування двох різних полів одного рядка поспіль дає два незалежних відкладених запити, обидва доходять
- [ ] Редагування того самого поля двічі поспіль дає **один** запит із фінальним значенням
- [ ] Працює на всіх 8 сторінках з inline-редагуванням

### Bulk activate/deactivate

- [ ] Один тост і одне «Скасувати» на всю пачку (як уже працює bulk-delete)
- [ ] «Скасувати» повертає статус усім записам пачки
- [ ] Часткова невдача (частина записів не оновилась) → тост з помилкою + `load()` замість вгадування стану

### Захист від втрати запиту

- [ ] Перехід на іншу сторінку адмінки протягом 5 секунд після зміни → відкладений запит **виконується** (перевірити в Network), зміна не втрачається
- [ ] Закриття/перезавантаження вкладки протягом 5 секунд → запит доходить (перевірити в Network із «Preserve log»)
- [ ] Те саме перевірити для **видалення** — це виправлення наявної дірки, не лише нової фічі
- [ ] Після flush тост не залишається висіти

### Що мусить залишитись синхронним

- [ ] Збереження модалки (`saveModal`) як і раніше синхронне: спінер на кнопці, помилки валідації показуються у **відкритій** формі
- [ ] `StoList.vue`: `version_conflict` (409) як і раніше приходить **одразу**, тост «Перезавантажити» працює, форма на момент помилки ще відкрита
- [ ] Створення записів як і раніше синхронне; `justCreatedIds`-підсвітка працює
- [ ] Bulk-update поля (задача **05**) як і раніше з підтвердженням до дії, без undo

### Загальне

- [ ] Немає console errors
- [ ] Немає регресій у `useUnsavedChanges` — undoable-мутації не в модалці, тому guard не мусить на них реагувати

---

## Технічні деталі для імплементації

### 1. `updateWithUndo`

Симетрично до наявного `deleteWithUndo` (`useUndoableDelete.js:19-49`):

```js
/**
 * Оптимістична зміна одного поля з можливістю відкату (react-admin:
 * mutationMode="undoable"). Свідомо не для збереження модалки: там потрібна
 * серверна валідація і version-check, які в undoable-режимі приходять надто
 * пізно — див. tasks/react-admin-parity/10-undoable-save.md.
 *
 * @param {Object} opts
 * @param {string} opts.key     - унікальний ключ мутації, напр. `${id}:${field}`.
 *                                Повторна мутація з тим самим ключем замінює
 *                                попередню відкладену, а не додає другу.
 * @param {Function} opts.apply  - синхронно застосувати нове значення в UI
 * @param {Function} opts.revert - синхронно повернути старе значення
 * @param {Function} opts.commit - async, реальний PATCH; кидає помилку при невдачі
 * @param {Function} [opts.onCommitError] - замість revert() при провалі commit
 * @param {string} opts.message  - текст тоста, напр. `«Львів» → «Львів-1»`
 */
function updateWithUndo({ key, apply, revert, commit, onCommitError, message }) { /* ... */ }
```

### 2. Черга відкладених мутацій (пункт 3 промпту)

Це найважливіша технічна частина — і вона потрібна не тільки для нової функції.
Зараз кожен виклик `deleteWithUndo` створює власний замикальний `setTimeout` і
ніде не реєструється. Наслідки: неможливо ні дізнатись, що є відкладене, ні
виконати його раніше, ні дедуплікувати.

Модульний реєстр (за прикладом module-scope стану в `useNotify.js` і
`useListCache.js`):

```js
// Реєстр відкладених мутацій: key → { timerId, commit, revert, toastId }.
// Потрібен для трьох речей: дедуплікація повторних змін того самого поля,
// flush при виході зі сторінки, flush при закритті вкладки.
const pending = new Map()

function schedule(key, { commit, revert, onCommitError, message }) {
  // Друга зміна того самого поля скасовує першу відкладену — інакше полетять
  // два PATCH, і порядок їх застосування на сервері не гарантований.
  const prev = pending.get(key)
  if (prev) {
    clearTimeout(prev.timerId)
    dismiss(prev.toastId)
    pending.delete(key)
  }
  // ... setTimeout → run(key)
}

async function run(key) {
  const entry = pending.get(key)
  if (!entry) return
  pending.delete(key)
  try {
    await entry.commit()
  } catch (e) {
    notify(e.message, { type: 'error' })
    if (entry.onCommitError) await entry.onCommitError()
    else entry.revert()
  }
}

/** Виконати всі відкладені мутації негайно (unmount сторінки, зміна маршруту). */
export async function flushPending() {
  const keys = [...pending.keys()]
  for (const k of keys) {
    clearTimeout(pending.get(k).timerId)
    await run(k)
  }
}
```

Для `beforeunload` `await` неможливий — браузер не чекає. Тому окремий шлях:

```js
// beforeunload: async-запит не встигне. Реєструємо синхронний варіант commit'а
// (keepalive), який браузер дозволяє відправити «навздогін».
window.addEventListener('beforeunload', () => {
  for (const entry of pending.values()) {
    clearTimeout(entry.timerId)
    entry.commitSync?.()      // fetch(..., { keepalive: true }) без await
  }
  pending.clear()
})
```

⚠️ Тобто `updateWithUndo` мусить приймати **два** варіанти коміту: `commit`
(звичайний async) і `commitSync` (той самий запит із `keepalive: true`, без
`await`). Дублювання мінімальне, якщо обидва будуються з одного опису запиту.

⚠️ `navigator.sendBeacon` тут не підходить напряму: він тільки `POST` і не
дозволяє кастомні заголовки, а нам потрібен `PATCH` з `Authorization`. Тому
`fetch(..., { keepalive: true, method: 'PATCH' })`.

### 3. Перероблення `toggleStatus`

Було (`Cities.vue`):

```js
async function toggleStatus(row) {
  togglingId.value = row.id
  try {
    applyToRow(row.id, await patch(row.id, { is_active: !row.is_active }))
  } catch (e) { notify(e.message, { type: 'error' }) }
  finally { togglingId.value = null }
}
```

Стало:

```js
function toggleStatus(row) {
  const before = row.is_active
  const after  = !before

  updateWithUndo({
    key: `${row.id}:is_active`,
    apply:  () => applyToRow(row.id, { is_active: after }),
    revert: () => applyToRow(row.id, { is_active: before }),
    commit: async () => applyToRow(row.id, await patch(row.id, { is_active: after })),
    onCommitError: () => load(page.value),
    message: `${row.name_uk}: ${after ? 'активовано' : 'деактивовано'}`,
  })
}
```

⚠️ `togglingId` (спінер у бейджі) більше не потрібен — це і є суть
оптимістичного оновлення. Прибрати його з шаблону, інакше залишиться мертвий стан.

⚠️ `applyToRow` вже вміє приймати частковий об'єкт (`Object.assign`) — тобто
`revert` не потребує повного рядка.

### 4. Перероблення `saveInline`

```js
function saveInline(row, field) {
  if (!inlineCell.value || inlineCell.value.id !== row.id) return
  const newVal = inlineValue.value
  const oldVal = row[field] ?? ''
  cancelInline()
  if (newVal === oldVal) return

  updateWithUndo({
    key: `${row.id}:${field}`,
    apply:  () => applyToRow(row.id, { [field]: newVal }),
    revert: () => applyToRow(row.id, { [field]: oldVal }),
    commit: async () => applyToRow(row.id, await patch(row.id, { [field]: newVal })),
    onCommitError: () => load(page.value),
    message: `«${oldVal || '—'}» → «${newVal}»`,
  })
}
```

### 5. `flushPending` у сторінках

```js
onUnmounted(() => { flushPending() })
```

Плюс, якщо на сторінці є перехід між фільтрами, що робить `load()` — відкладена
мутація й `load()` разом дадуть «блимання» старого значення. Простіше за все:
`flushPending()` перед `load()` там, де це помітно. Не робити цього всередині
самого `load()` — інакше кожне перемикання сторінки пагінації примусово
комітить, і кнопка «Скасувати» стає марною.

### 6. Взаємодія з іншими задачами

| Задача | Взаємодія |
|---|---|
| **05** (bulk field update) | undo **не** додавати, там inline-підтвердження до дії — див. FAQ задачі 05 |
| **08** (select all) | `updateManyWithUndo` для activate/deactivate мусить працювати і в режимі `selectAllMatching` — але тоді `revert` неможливий (id невідомі), тому в цьому режимі undo **вимкнути** і показати звичайне підтвердження |
| **03** (prev/next) | перехід на інший запис не мусить скидати відкладені мутації — вони живуть у module-scope реєстрі, не в стані модалки |
| `optimistic-locking-sto.md` | нічого не чіпати: `expected_version`-шлях залишається синхронним |

### 7. Scope & Non-Goals

**В scope:** рефакторинг composable у `useUndoableMutation.js`, `updateWithUndo`
+ `updateManyWithUndo`, реєстр відкладених мутацій з дедуплікацією і flush,
переведення `toggleStatus` / `saveInline` / bulk activate-deactivate на 8+
сторінках, виправлення втрати відкладеного `delete` при виході зі сторінки.

**Поза scope:**
- undoable для збереження модалки (обґрунтування — розділ «⚠️ Важливо»)
- undoable для create
- undoable там, де є `expected_version`
- undo для bulk-update поля (задача 05)
- налаштовуваний час undo (5 секунд лишається константою)
- «історія дій» з відкатом кількох кроків назад

---

## FAQ

**Q: Чому react-admin робить undoable дефолтом для `<Edit>`, а ми ні?**
A Бо react-admin у дефолтній конфігурації робить клієнтську валідацію й не
має optimistic locking. Ми маємо і серверну валідацію
(`FieldConfigReader::validateRequired`), і version-check
(`tasks/optimistic-locking-sto.md`) — обидві фічі покладаються на те, що
відповідь сервера приходить у відкриту форму. Undoable для модалки їх би
знецінив.

**Q: Чи не заплутає адміна, що частина дій відкатна, а частина ні?**
A Розділення інтуїтивне: «клікнув у таблиці» = відкатне, «заповнив форму й
натиснув Зберегти» = ні. Це той самий поділ, що вже є: `delete` з рядка
відкатний, а збереження модалки — ні.

**Q: Що якщо адмін змінить статус, а через 3 секунди хтось інший змінить його ж?**
A Наш `PATCH` перезапише — version-check для однопольних мутацій ми свідомо не
робимо (він і зараз там відсутній). Ризик той самий, що зараз, undoable його не
збільшує: вікно було ~200мс, стало 5с. Якщо це почне траплятись — це аргумент
за Tier 2 з `optimistic-locking-sto.md`, а не проти undoable.

**Q: Чому дедуплікація по `(id, field)`, а не одна черга на все?**
A Бо зміна назви й зміна статусу того самого рядка — незалежні мутації, обидві
мусять дійти. А дві зміни назви — ні, друга скасовує першу. Ключ `${id}:${field}`
дає рівно цю семантику.

**Q: `keepalive: true` реально працює на `PATCH` з `Authorization`?**
A Так, `keepalive` не обмежений методом і дозволяє заголовки (на відміну від
`sendBeacon`). Обмеження — розмір тіла (64 КБ), що для однопольного `PATCH`
неістотно. Але це **треба перевірити руками** в чеклісті («закриття вкладки
протягом 5 секунд → запит доходить»), а не прийняти на віру.

**Q: Чи не варто просто зменшити затримку до 2 секунд, щоб рідше втрачати запити?**
A Ні — це лікує симптом. 5 секунд для «Скасувати» це мінімум, за який адмін
успіває прочитати тост і зреагувати. Правильний фікс — flush при виході, тобто
пункт 3.
