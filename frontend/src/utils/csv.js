// Copyright (c) 2026 Oleksandr Nosov. MIT License.
// Реалізація переїхала в ядро, спільне з React — див. ../../../shared/core/README.md.
// Реекспорт лишається, щоб не чіпати наявні `import ... from '@/utils/csv'`.
export { rowsToCsv, downloadCsv } from '@core/csv'
