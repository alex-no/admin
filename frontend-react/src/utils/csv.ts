// Реалізація переїхала в ядро, спільне з Vue — див. ../../../shared/core/README.md.
// Реекспорт лишається, щоб не чіпати наявні `import ... from '@/utils/csv'`.
export { rowsToCsv, downloadCsv } from '@core/csv'
