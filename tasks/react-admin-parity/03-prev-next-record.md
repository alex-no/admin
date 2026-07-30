# Задача 03: навігація по записах у модалці (react-admin `<PrevNextButtons>`)

> ## 🔧 Адаптація для `admin`
>
> **Куди:** `useRecordNav.js` / `useRecordNav.ts` + `RecordNavigator` у
> `list-framework`. Позиція запису рахується з наявного стану ядра —
> `items`, `page`, `perPage`, `total` уже там є.
>
> **Складніше, ніж у `allsto`, в одному місці:** у фреймворку модалку деталей
> тримає **сторінка**, а не таблиця (`action: detail` → `emit('row-action')` →
> `StoRegistry.vue` відкриває свою модалку; у React — `onRowUpdated` + власний
> стан сторінки). Тому навігація мусить бути **контрактом між ядром і сторінкою**,
> а не жити всередині модалки:
>
> - ядро віддає сторінці `recordNav` (`{ position, total, hasPrev, hasNext, goPrev, goNext }`)
>   через `defineExpose` (Vue) / `useImperativeHandle` (React) — там уже є `reload`,
>   додати туди ж;
> - `goPrev`/`goNext` на межі сторінки самі роблять `load(page ± 1)` і потім
>   відкривають перший/останній запис — сторінка про пагінацію не знає.
>
> **Вимога до сторінки:** обробник `row-action` мусить бути ідемпотентним — при
> переході на сусідній запис модалка не закривається, а перезаповнюється. У
> `StoRegistry.vue` це перевірити окремо (вкладки мусять скидатись на першу).
>
> **Не застосовується:** `openModal` рукописних сторінок, `Users.vue`,
> `StoList.vue:2958`.
>
> ⚠️ **Побічно:** у `allsto` знайдено, що `Users.vue:743` звертається до
> `cfg.apiGet`, якого немає в конфізі (там `apiView`) — deep-link на запис поза
> поточною сторінкою ламається. У `admin` цієї сторінки на фреймворку немає, але
> при міграції (задача 00) перевірити, що завантаження одиночного запису по `?id=`
> взагалі реалізоване — у фреймворку зараз такого механізму немає.
>
> ---

**Скіл:** спеціалізованого немає — перед стартом прогнати `validate-task-md`.
**Спільний контекст:** [README.md](README.md) — інвентаризація 26 списковых сторінок і спільні правила.

## Контекст

Типовий сценарій: адмін модерує чергу — відкрив запис, подивився, закрив,
відкрив наступний, закрив, відкрив наступний. Зараз кожен крок це два кліки
(«Закрити» + іконка олівця в наступному рядку) плюс пошук очима, де саме він
зупинився. На `geography/CityTmpReview.vue` (черга нових міст),
`pages/Reviews.vue` (модерація відгуків), `pages/StoApplications.vue` (заявки) і
`pages/Feedback.vue` (звернення) це основний робочий цикл.

react-admin закриває це `<PrevNextButtons>`: стрілки ‹ › і індикатор позиції
`3 / 128` прямо в заголовку форми, з переходом через межу сторінки пагінації.

У нас для цього вже майже все є: `useUrlFilters` тримає `detail.id` у URL
(`useUrlFilters.js:114-122, 168-174`) і вміє відкривати модалку по `?id=`, а
`items` — це рядки поточної сторінки.

## Промпт для Claude Code

> Додай навігацію «попередній / наступний запис» у модалки списковых сторінок —
> аналог `<PrevNextButtons>` з react-admin.
>
> 1. **Новий composable `www_front/admin/src/composables/useRecordNav.js`**:
>
>    ```js
>    useRecordNav({ items, page, perPage, total, currentId, load, openRecord })
>    ```
>
>    Повертає `{ hasPrev, hasNext, position, totalCount, goPrev, goNext }`, де
>    `position` — глобальний 1-based індекс у відфільтрованому списку
>    (`(page - 1) * perPage + indexOnPage + 1`).
>
>    Логіка переходу:
>    - якщо сусідній запис є на поточній сторінці → просто `openRecord(row)`;
>    - якщо адмін на **останньому** рядку сторінки й `page < totalPages` →
>      `await load(page + 1)`, потім відкрити **перший** рядок нової сторінки;
>    - симетрично для першого рядка й `page > 1` → `load(page - 1)` і відкрити
>      **останній** рядок;
>    - на самому початку/кінці списку кнопки задизейблені.
>
> 2. **Новий компонент `www_front/admin/src/components/RecordNavigator.vue`** —
>    компактна група `‹ [3 / 128] ›`, кнопки `btn btn-sm btn-outline-secondary`,
>    вставляється у слот `#title` `BaseModal` праворуч від заголовка.
>
> 3. **Незбережені зміни мусять блокувати перехід.** У модалках уже є
>    `composables/useUnsavedChanges.js` — перехід на інший запис це фактично
>    закриття форми, тому має проходити через ту саму перевірку, що й закриття
>    модалки. Якщо є незбережені зміни — не переходити, а показати той самий
>    guard, що й зараз при закритті.
>
> 4. **Розкатай на сторінки, де модалка редагує один запис зі списку**:
>    `geography/Cities.vue`, `geography/Countries.vue`, `geography/CityTypes.vue`,
>    `geography/AreaRegionList.vue`, `geography/CityTmpReview.vue`,
>    `geography/Timezones.vue`, `catalog/VehicleTypes.vue`,
>    `catalog/ServiceGroups.vue`, `catalog/Services.vue`, `catalog/CarBrands.vue`,
>    `catalog/CarModels.vue`, `pages/Users.vue`, `pages/News.vue`,
>    `pages/Reviews.vue`, `pages/Feedback.vue`, `pages/ErrorLogs.vue`,
>    `pages/StoApplications.vue`, `pages/StoList.vue`.
>
>    **Не додавати** на `AuditLog.vue` (немає модалки запису),
>    `Analytics.vue`/`AnalyticsBannedIps.vue` (модалка агрегує, а не показує
>    рядок), `PermissionList.vue`, `RoleManagement.vue`, `AdminManagement.vue`,
>    `StoManagers.vue`, `StoOutreach.vue`.
>
> 5. **`?id=` в URL мусить оновлюватись** при переході — це вже працює само,
>    бо `useUrlFilters` вотчить `detail.id` (`useUrlFilters.js:236-240`); треба
>    лише оновлювати `detailId` разом із `modalData`.
>
> **Не робити:** клавіатурні шорткати (окрема задача), префетч сусідніх записів,
> навігацію по вкладках усередині модалки, «наступний непрочитаний».

## Що перевірити після виконання

- [ ] `useRecordNav.js` і `RecordNavigator.vue` створені; навігатор видно в заголовку модалки
- [ ] Індикатор показує **глобальну** позицію, а не позицію на сторінці: на сторінці 3 при `per_page=50` перший рядок = `101 / N`, а не `1 / N`
- [ ] `N` = загальна кількість записів **з урахуванням активних фільтрів** (`total` зі списку), а не кількість у БД
- [ ] Стрілка «наступний» на останньому рядку сторінки підгружає наступну сторінку і відкриває її перший запис; таблиця під модалкою теж перемальовується на нову сторінку
- [ ] Стрілка «попередній» на першому рядку сторінки підгружає попередню і відкриває її **останній** запис
- [ ] На першому записі всього списку «попередній» задизейблений; на останньому — «наступний» задизейблений
- [ ] `?id=` в URL змінюється при кожному переході; F5 на цьому URL відкриває саму цю модалку (перевірити на `Users.vue` — там `detail.onOpen` уже вміє довантажувати запис, якого немає на сторінці, `Users.vue:738-757`)
- [ ] Незбережені зміни блокують перехід так само, як блокують закриття модалки (`useUnsavedChanges.js`); після відмови модалка залишається на тому ж записі, `?id=` не змінився
- [ ] Перехід скидає стан вкладок модалки коректно: на `Users.vue` при переході з відкритої вкладки «Авто» дані **нового** користувача підгружаються, а не залишаються від попереднього
- [ ] Кеш списку не ламається: `useListCache` віддає закешовану сусідню сторінку без повторного запиту, а `revalidating`-спіннер поводиться як при звичайній пагінації
- [ ] Перехід після редагування: зберіг зміни → натиснув «наступний» → у списку під модалкою відредагований рядок оновлений
- [ ] На сторінках зі списку виключень (`AuditLog.vue`, `Analytics.vue`, `PermissionList.vue`, `RoleManagement.vue`, `AdminManagement.vue`, `StoManagers.vue`, `StoOutreach.vue`) навігатора немає і нічого не зламано
- [ ] Немає console errors, зокрема при швидкому багаторазовому клацанні по стрілці (перевірити, що не летить паралельних `load()`)

---

## Технічні деталі для імплементації

### 1. `useRecordNav.js`

```js
import { computed, ref } from 'vue'

/**
 * Навігація «попередній / наступний запис» у модалці (react-admin:
 * PrevNextButtons). Ходить по items поточної сторінки, а на межі — підгружає
 * сусідню сторінку через load() і відкриває крайній запис із неї.
 *
 * @param {Object} opts
 * @param {import('vue').Ref<Array>} opts.items     - рядки поточної сторінки
 * @param {import('vue').Ref<number>} opts.page
 * @param {import('vue').Ref<number>} opts.perPage
 * @param {import('vue').Ref<number>} opts.total    - всього записів з урахуванням фільтрів
 * @param {import('vue').Ref<number|null>} opts.currentId
 * @param {Function} opts.load       - async (page) => void, уже є на кожній сторінці
 * @param {Function} opts.openRecord - (row) => void, відкрити модалку на цьому рядку
 * @param {Function} [opts.canLeave] - () => boolean|Promise<boolean>, guard незбережених змін
 */
export function useRecordNav({ items, page, perPage, total, currentId, load, openRecord, canLeave }) {
  const busy = ref(false)   // блокує паралельні load() при швидкому клацанні

  const indexOnPage = computed(() => items.value.findIndex((r) => r.id === currentId.value))
  const position    = computed(() =>
    indexOnPage.value === -1 ? null : (page.value - 1) * perPage.value + indexOnPage.value + 1
  )

  const hasPrev = computed(() => position.value !== null && position.value > 1)
  const hasNext = computed(() => position.value !== null && position.value < total.value)

  async function step(delta) {
    if (busy.value) return
    if (canLeave && !(await canLeave())) return

    const i = indexOnPage.value
    if (i === -1) return

    const target = i + delta
    if (target >= 0 && target < items.value.length) {
      openRecord(items.value[target])
      return
    }

    // Межа сторінки — підгружаємо сусідню
    busy.value = true
    try {
      await load(page.value + delta)
      const row = delta > 0 ? items.value[0] : items.value[items.value.length - 1]
      if (row) openRecord(row)
    } finally {
      busy.value = false
    }
  }

  return {
    position, totalCount: total, busy,
    hasPrev, hasNext,
    goPrev: () => hasPrev.value && step(-1),
    goNext: () => hasNext.value && step(1),
  }
}
```

⚠️ `busy` тут не косметика: `load()` асинхронний, а `items` він підмінює цілком.
Два паралельних `load()` від швидкого клацання дадуть відкриття запису з
неправильної сторінки.

### 2. `RecordNavigator.vue`

```html
<template>
  <div class="d-inline-flex align-items-center gap-1 ms-2">
    <button class="btn btn-sm btn-outline-secondary py-0 px-2"
            :disabled="!hasPrev || busy" title="Попередній запис" @click="$emit('prev')">‹</button>
    <span class="text-muted small font-monospace" style="min-width:5.5rem; text-align:center">
      <span v-if="busy" class="spinner-border spinner-border-sm" style="width:.7rem;height:.7rem"></span>
      <template v-else>{{ position ?? '—' }} / {{ totalCount }}</template>
    </span>
    <button class="btn btn-sm btn-outline-secondary py-0 px-2"
            :disabled="!hasNext || busy" title="Наступний запис" @click="$emit('next')">›</button>
  </div>
</template>
```

### 3. Інтеграція у сторінку

Приклад для `pages/Users.vue` (у неї вже є все потрібне: `items`, `page`,
`perPage`, `total`, `detailId`, `load`, `openModal`):

```js
const { position, totalCount, hasPrev, hasNext, busy: navBusy, goPrev, goNext } = useRecordNav({
  items, page, perPage, total,
  currentId: detailId,
  load,
  openRecord: (row) => openModal(row),
  canLeave: confirmLeaveIfDirty,   // з useUnsavedChanges
})
```

І в шаблоні, у слот `#title` `BaseModal` (`Users.vue:160-165`):

```html
<template #title>
  <div class="d-flex align-items-center">
    <h5 class="mb-0">
      Користувач
      <span class="text-muted fw-normal fs-6">#{{ modalData.id }} — {{ modalData.username }}</span>
    </h5>
    <RecordNavigator
      :position="position" :total-count="totalCount"
      :has-prev="hasPrev" :has-next="hasNext" :busy="navBusy"
      @prev="goPrev" @next="goNext"
    />
  </div>
</template>
```

### 4. `openModal` мусить бути ідемпотентним

Ключова умова: `openModal(row)` викликається повторно, поверх уже відкритої
модалки. На сторінках із вкладками (`Users.vue`, `StoList.vue`) це означає, що
`openModal` мусить **скидати** пер-табовий стан, а не тільки заповнювати
`modalData`/`modalForm`. Перевірити на `Users.vue`: `carsList`, `msList`,
`phonesList`, `activeTab`, `saveError`, `adminActionError` — усе, що
підгружається лениво по `switchTab()`, треба обнулити.

Практично: якщо в `openModal` цього ще немає — додати скид, це прямий баг
незалежно від навігатора (він просто робить його помітним).

### 5. `detailId` при переході

`detailId` уже вотчиться в `useUrlFilters` і сам кладеться в `?id=`. Тому
`openModal` мусить його виставляти:

```js
function openModal(row) {
  detailId.value = row.id     // → useUrlFilters оновить ?id= в URL
  modalData.value = { ...row }
  // ... скид пер-табового стану
  modalOpen.value = true
}
```

⚠️ Не викликати `router.replace` руками — `useUrlFilters.updateUrl()` уже це
робить і порівнює query перед записом (`useUrlFilters.js:177-182`), інакше буде
дубль запису в історію.

### 6. Scope & Non-Goals

**В scope:** composable + компонент, розкатка на 18 сторінок зі списку в промпті,
guard незбережених змін, скид пер-табового стану в `openModal` там, де його бракує.

**Поза scope:**
- клавіатурні шорткати (`J`/`K`, `←`/`→`) — react-admin їх теж не має
- префетч сусіднього запису
- «наступний непрочитаний / наступний на модерації» (фільтр-aware стрибок)
- навігація в модалках, що не редагують рядок списку (аналітика, ролі, права)
- створення модалки там, де її зараз немає

---

## FAQ

**Q: Що робити, якщо запис відкрито через `?id=`, а на поточній сторінці його немає?**
A: `position` буде `null`, обидві стрілки задизейблені, індикатор показує `—`.
Це коректно: адмін прийшов по прямому посиланню, «список», по якому ходити, не
визначений. Так само поводиться react-admin, коли запис не в поточній вибірці.

**Q: Чому позиція рахується з `page`/`perPage`, а не приходить із бекенду?**
A Бо це чиста арифметика над тим, що вже є в стані сторінки. Просити бекенд
віддавати «глобальний індекс запису» означало б новий параметр на 18 ендпоінтах
заради цифри в заголовку.

**Q: А якщо `total` змінився (хтось видалив запис) — індикатор збреше?**
A Так, до наступного `load()`. Це прийнятно: та сама неточність уже є в
пагінації й у підписі «Всього: {{ total }}».

**Q: `StoList.vue` має свій optimistic locking (`version`) — не конфліктує?**
A Ні. `version` перевіряється на save; навігація без save просто змінює
`modalData` на інший рядок. Але guard незбережених змін тут особливо важливий —
інакше адмін піде на наступний запис і подумає, що зміни збереглися.
