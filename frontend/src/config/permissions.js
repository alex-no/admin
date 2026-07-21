// Реєстр дозволів адмінки (дзеркало permissions.php)
// Використовується у шаблонах: auth.can(P.geography.countries.edit)
// При додаванні нового дозволу — додавати в обидва файли одночасно

const P = {

  geography: {
    countries: {
      view:       'geography.countries.view',
      editNames:  'geography.countries.edit.names',
      editStatus: 'geography.countries.edit.status',
      edit:       'geography.countries.edit',
      create:     'geography.countries.create',
      delete:     'geography.countries.delete',
    },
    regions: {
      view:       'geography.regions.view',
      editNames:  'geography.regions.edit.names',
      editStatus: 'geography.regions.edit.status',
      edit:       'geography.regions.edit',
      create:     'geography.regions.create',
      delete:     'geography.regions.delete',
    },
    cities: {
      view:       'geography.cities.view',
      editNames:  'geography.cities.edit.names',
      editStatus: 'geography.cities.edit.status',
      edit:       'geography.cities.edit',
      create:     'geography.cities.create',
      delete:     'geography.cities.delete',
    },
    districts: {
      view:       'geography.districts.view',
      editNames:  'geography.districts.edit.names',
      editStatus: 'geography.districts.edit.status',
      edit:       'geography.districts.edit',
      create:     'geography.districts.create',
      delete:     'geography.districts.delete',
    },
    timezones: {
      view:       'geography.timezones.view',
      edit:       'geography.timezones.edit',
    },
  },

  sto: {
    view:       'sto.view',
    edit:       'sto.edit',
    editStatus: 'sto.edit.status',
    create:     'sto.create',
    delete:     'sto.delete',
  },

  bookings: {
    view:       'bookings.view',
    edit:       'bookings.edit',
    editStatus: 'bookings.edit.status',
    delete:     'bookings.delete',
  },

  users: {
    view:   'users.view',
    edit:   'users.edit',
    create: 'users.create',
    delete: 'users.delete',
  },

  catalog: {
    vehicleTypes: { view: 'catalog.vehicle-types.view', edit: 'catalog.vehicle-types.edit', create: 'catalog.vehicle-types.create' },
    carBrands:    { view: 'catalog.car-brands.view',    edit: 'catalog.car-brands.edit',    create: 'catalog.car-brands.create'    },
    carModels:    { view: 'catalog.car-models.view',    edit: 'catalog.car-models.edit',    create: 'catalog.car-models.create'    },
    serviceGroups: { view: 'catalog.service-groups.view', edit: 'catalog.service-groups.edit', create: 'catalog.service-groups.create' },
    services:      { view: 'catalog.services.view',      edit: 'catalog.services.edit',      create: 'catalog.services.create'      },
  },

  system: {
    monitoringView: 'system.monitoring.view',
  },

  news: {
    view:   'news.view',
    create: 'news.create',
    edit:   'news.edit',
    delete: 'news.delete',
  },

}

export default P
