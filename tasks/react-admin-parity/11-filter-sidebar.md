# Задача 11: сайдбар фільтрів зі счётчиками (react-admin `<FilterList>`)

> ## 🔧 Адаптація для `admin`
>
> **Куди:** `FilterSidebar.vue` / `FilterSidebar.tsx` у `list-framework`,
> прапорець `facetable` у `ColumnConfig` (`types.ts`) і в `*.filter.json`.
>
> **Тут вигода найбільша:** у `allsto` задача обмежена 4 сторінками з 26, бо
> фільтри там рукописні на кожній. У `admin` фільтри вже декларативні
> (`filterConfig` + реєстр `filterTypes`), тому фасетний сайдбар — це **новий тип
> фільтра в реєстрі**, і він одразу доступний будь-якій сторінці фреймворку через
> JSON. Обсяг падає з L до M на фронті.
>
> **Бекенд:** `?facets=` у `backend/src/Admin/Controller/`. Виділення
> `buildListWhere($params, ?string $excludeField)` — спільне із задачею **08**,
> тому робити 08 і 11 поспіль, одним підходом до контролера, а не двічі.
>
> **Не застосовується:** «4 сторінки», перелік рукописних фільтрів `allsto`.
>
> ---

**Скіл:** спеціалізованого немає — перед стартом прогнати `validate-task-md`.
**Спільний контекст:** [README.md](README.md) · **Статус:** [STATUS.md](STATUS.md)

## Контекст

Фільтри в нас — рядок контролів над таблицею: `<input>` пошуку + кілька
`<select>`. Адмін бачить *які* фільтри є, але не бачить, *скільки чого* за ними
знайдеться. Щоб дізнатись, скільки неактивних міст у Львівській області, треба
виставити два фільтри й подивитись на «Всього: N» — і так для кожної комбінації.

react-admin має `<FilterList>` — сайдбар зі згрупованими фільтрами, де кожне
значення підписане кількістю: «Активні (1 204) / Неактивні (340)». Адмін бачить
розподіл до кліку.

Це найдорожча задача з «дешевих» B-tier: сам сайдбар — проста розмітка, а от
счётчики вимагають агрегатів на кожному list-ендпоінті.

## Промпт для Claude Code

> Додай сайдбар фільтрів зі счётчиками для списковых сторінок адмінки — аналог
> `<FilterList>` з react-admin.
>
> ### Backend
>
> 1. **Новий параметр `?facets=field1,field2` у list-ендпоінтах.** Коли він є,
>    відповідь додатково містить:
>    ```json
>    "facets": {
>      "is_active":    [ { "value": 1, "count": 1204 }, { "value": 0, "count": 340 } ],
>      "city_type_id": [ { "value": 3, "count": 890, "label": "місто" }, ... ]
>    }
>    ```
>
> 2. **Кожен facet рахується з урахуванням **інших** активних фільтрів, але
>    **не** свого власного.** Це принципово: якщо адмін уже вибрав «неактивні»,
>    счётчик по типах мусить показувати розподіл *серед неактивних*, а счётчик по
>    статусах — повний розподіл, інакше «Активні (0)» і адмін не зможе
>    перемкнутись назад.
>
>    Реалізація: для кожного запитаного facet будувати `WHERE` без умови по
>    цьому полю. Тобто `buildListWhere()` з задачі **08** мусить приймати
>    другим аргументом `?string $excludeField`.
>
> 3. **Переиспользувати `buildListWhere()` із задачі 08.** Якщо 08 ще не
>    зроблена — витягнути `WHERE` зі `list()` тут, і тоді 08 бере готове.
>    **Не** робити дві копії побудови умов.
>
> 4. **Whitelist полів для facets** — через `FieldConfigReader`, як у задачі
>    **05**: новий прапорець `"facetable": true` у `fields{}`. Причина та сама —
>    `GROUP BY` по довільній колонці з фронтенду це і повільно, і зайва
>    поверхня.
>
> 5. **Ліміт значень у facet — 20**, відсортованих за `count DESC`. Для полів з
>    великою кардинальністю (місто, модель авто) facet не має сенсу — таким
>    полям `facetable` не ставити взагалі.
>
> 6. **Facets рахувати тільки коли їх попросили.** Без `?facets=` — жодного
>    додаткового запиту до БД, поведінка `list()` не змінюється.
>
> ### Frontend
>
> 7. **Новий компонент `www_front/admin/src/components/FilterSidebar.vue`** —
>    ліва колонка, згорнута за замовчуванням на вузьких екранах. Групи фільтрів,
>    у кожній — значення з счётчиком, активне підсвічене. Клік по значенню
>    перемикає фільтр.
>
> 8. **Стан «розгорнутий / згорнутий» сайдбар** зберігати в `localStorage`
>    (`admin.filterSidebar:<namespace>`), як `useColumnPrefs` із задачі **01**.
>
> 9. **Не дублювати фільтри.** Поля, що переїхали в сайдбар, з верхнього
>    тулбару прибрати — інакше два джерела правди для одного значення. Пошук
>    (`search`) залишити в тулбарі, він не facet.
>
> 10. **Розкатай на 4 сторінки з найбільшою кількістю фільтрів**:
>     `geography/Cities.vue` (країна / регіон / тип / статус / центри),
>     `pages/StoList.vue`, `pages/Reviews.vue`, `pages/Feedback.vue`.
>
>     На решту **не** розкатувати: там 1-2 фільтри, сайдбар з'їсть ширину
>     таблиці й нічого не дасть.
>
> **Не робити:** діапазонні facets (дата від/до з гістограмою), збереження
> сайдбару в URL, facets для полів з великою кардинальністю, багатовибір у межах
> одного facet (`status in (a, b)`).

## Що перевірити після виконання

### Backend

- [ ] `?facets=` реалізований на 4 ендпоінтах, що обслуговують сторінки зі п.10
- [ ] **Без `?facets=` жодного додаткового SQL** — перевірити по логу запитів або `EXPLAIN`-обгортці; звичайний `list()` не сповільнився
- [ ] **Facet рахується без свого власного фільтра**: виставити `status=inactive`, у facet по `is_active` мусять бути **обидва** значення з непорожніми `count` (не «Активні (0)»)
- [ ] Facet рахується **з** іншими фільтрами: виставити `country_id=1`, счётчик по типах мусить змінитись відносно порожнього фільтра
- [ ] `buildListWhere()` **один** — і `list()`, і facets, і (якщо 08 зроблена) `bulkAction` викликають той самий метод
- [ ] Складна умова не зламалась: у `AdminCityController` фільтр `area_region_id` — три підзапити (`AdminCityController.php:52-61`); facets по інших полях мусять враховувати саме її, а не спрощену версію
- [ ] Whitelist: `?facets=password_hash`, `?facets=created_at` → поле проігноровано (або 400), `GROUP BY` не виконався
- [ ] Поле без `"facetable": true` у facets не потрапляє
- [ ] Не більше 20 значень на facet, сортування за `count DESC`
- [ ] `label` для `select`-полів приходить із JOIN'а (як `country_name`/`city_type_name` у `list()`), а не як сирий id
- [ ] Права: facets доступні тим самим, хто має право на `list`

### Frontend

- [ ] `FilterSidebar.vue` створений; на 4 сторінках зі п.10 і тільки на них
- [ ] Счётчики видно біля кожного значення
- [ ] Клік по значенню застосовує фільтр, повторний клік знімає
- [ ] Активне значення візуально виділене
- [ ] **Фільтри не дубльовані**: поля, що в сайдбарі, з верхнього тулбару прибрані
- [ ] Пошук залишився в тулбарі
- [ ] Згортання сайдбару зберігається після F5, окремо на кожній сторінці
- [ ] `useUrlFilters` не зламаний: фільтр із сайдбару так само потрапляє в URL, пряме посилання відкриває сторінку з тим самим фільтром
- [ ] Сайдбар не ламає верстку таблиці: на вузькому екрані згортається, `.table-responsive` як і раніше скролиться горизонтально
- [ ] `ListPageWrapper` `contentMargin` не конфліктує з новою колонкою (він рахує margin для drawer'ів — перевірити разом із відкритою модалкою)
- [ ] Empty state (задача **02**): при фільтрі з `count: 0` показується режим «нічого не знайдено», а не «ще немає»
- [ ] Немає console errors

---

## Технічні деталі для імплементації

### 1. Backend: побудова facet

Ключова частина — `WHERE` **без** умови по полю, для якого рахується facet:

```php
/**
 * Побудова WHERE для list()/facets/bulk. $excludeField потрібен для facets:
 * счётчик по полю мусить рахуватись без фільтра по цьому ж полю, інакше
 * вибране значення показувало б повну кількість, а всі інші — нулі, і адмін
 * не зміг би перемкнутись.
 *
 * @return array{0: string, 1: array<string, mixed>}
 */
private function buildListWhere(array $params, ?string $excludeField = null): array
{
    $where = [];
    $bind  = [];

    $status = $params['status'] ?? 'all';
    if ($excludeField !== 'is_active') {
        if ($status === 'active')   { $where[] = 'c.is_active = 1'; }
        if ($status === 'inactive') { $where[] = 'c.is_active = 0'; }
    }
    if ($excludeField !== 'country_id' && !empty($params['country_id'])) {
        $where[] = 'c.country_id = :countryId';
        $bind[':countryId'] = (int) $params['country_id'];
    }
    // ... решта умов, кожна під своїм $excludeField-чеком

    return [$where ? 'WHERE ' . implode(' AND ', $where) : '', $bind];
}
```

⚠️ Мапінг «імʼя facet-поля → імʼя фільтра» не завжди 1:1. У `cities` фільтр
називається `status`, а поле — `is_active`. Тримати цей мапінг явно, одним
масивом у контролері, а не вгадувати.

Далі власне агрегат:

```php
private function buildFacet(string $field, array $params): array
{
    [$whereClause, $bind] = $this->buildListWhere($params, $field);

    // Ліміт 20 + count DESC: facet — це «топ значень», а не повний довідник.
    $stmt = $this->pdo->prepare(
        "SELECT c.`$field` AS value, COUNT(*) AS cnt
         FROM city c
         LEFT JOIN country co ON co.id = c.country_id
         LEFT JOIN city_type ct ON ct.id = c.city_type_id
         LEFT JOIN area_region ar ON ar.id = c.area_region_id
         $whereClause
         GROUP BY c.`$field`
         ORDER BY cnt DESC
         LIMIT 20"
    );
    $stmt->execute($bind);
    // ...
}
```

⚠️ `$field` підставляється як ідентифікатор. Тому він **обов'язково** мусить
пройти whitelist через `FieldConfigReader::isFacetable()` **до** цього місця —
рівно та сама вимога, що в задачі **05** для `bulkAction`.

### 2. Продуктивність

Кожен facet — окремий `GROUP BY` по відфільтрованій таблиці. Чотири facets = 4
запити плюс основний `SELECT` плюс `COUNT(*)`. Це відчутно.

Мітигації, в порядку простоти:

1. **Просити facets тільки при першому завантаженні сторінки й при зміні
   фільтрів, а не при кожній пагінації.** Перехід на сторінку 2 не міняє
   розподіл — фронт може не запитувати facets повторно. Це найдешевший і
   найефективніший крок.
2. Індекси на facet-колонках (`is_active`, `country_id`, `city_type_id`) —
   перевірити по `bak/db-data/structure.sql`, чи вони є; якщо ні — окрема
   міграція.
3. Не додавати кешування facets на бекенді в межах цієї задачі — спочатку
   поміряти.

### 3. `FilterSidebar.vue`

```html
<template>
  <aside class="filter-sidebar" :class="{ collapsed }">
    <button class="btn btn-sm btn-link p-0 mb-2" @click="toggleCollapsed">
      <i :class="['bi', collapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left']"></i>
      <span v-if="!collapsed" class="ms-1 small">Фільтри</span>
    </button>

    <template v-if="!collapsed">
      <div v-for="group in groups" :key="group.field" class="mb-3">
        <div class="text-muted small fw-semibold mb-1">{{ group.label }}</div>
        <button
          v-for="v in group.values" :key="v.value"
          class="btn btn-sm w-100 text-start d-flex justify-content-between align-items-center mb-1"
          :class="isActive(group.field, v.value) ? 'btn-primary' : 'btn-outline-secondary'"
          @click="$emit('toggle', { field: group.field, value: v.value })"
        >
          <span class="text-truncate">{{ v.label ?? v.value }}</span>
          <span class="badge" :class="isActive(group.field, v.value) ? 'bg-light text-dark' : 'bg-secondary'">
            {{ v.count }}
          </span>
        </button>
      </div>
    </template>
  </aside>
</template>
```

### 4. Scope & Non-Goals

**В scope:** `?facets=` на 4 ендпоінтах, `buildListWhere($params, $excludeField)`,
`facetable` у config, `FilterSidebar.vue`, розкатка на 4 сторінки, прибирання
дубльованих контролів із тулбару.

**Поза scope:**
- діапазонні facets (дати, числові інтервали, гістограми)
- багатовибір у межах одного facet
- facets для полів з великою кардинальністю (місто, модель авто)
- кешування facets на бекенді
- розкатка на решту 22 сторінки
- збереження стану сайдбару в URL

---

## FAQ

**Q: Чому не рахувати facets на фронті з уже завантажених `items`?**
A Бо `items` — це одна сторінка з 50 записів із 1500. Счётчик «Активні (37)»
замість «Активні (1204)» гірший за відсутність счётчика: він виглядає як правда й
брехає.

**Q: Чому facet не враховує свій власний фільтр — це не дивно?**
A Це стандартна поведінка faceted search (так само в Amazon, GitHub, Jira).
Інакше після вибору значення всі альтернативи показали б 0, і фільтр став би
однонаправленим — зняти його можна, а перемкнути на інше значення осмислено ні.

**Q: 4 додаткових `GROUP BY` на кожен запит списку — не занадто?**
A Тому в п.2 перший пункт мітигації: facets запитуються при зміні фільтрів, а не
при пагінації. Для типового сеансу це кілька разів, не на кожен клік.

**Q: Чи не конфліктує сайдбар із `ListPageWrapper`?**
A `ListPageWrapper` рахує `contentMargin` через `usePageLayout` і слухає
`modal-content-margin-change` для drawer'ів
(`ListPageWrapper.vue:29-40` — файл проєкту `allsto`; у `admin` такої обгортки немає,
сторінка живе безпосередньо в `BaseLayout`).
Сайдбар мусить бути **всередині** нього як flex-колонка, а не поза ним — інакше
margin-логіка порахує ширину невірно.
