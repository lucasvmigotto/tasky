# Frontend Demo/Test Data Policy

O frontend deve usar MSW (`src/core/api/msw/handlers.ts`) como fonte oficial de mocks para testes e demo controlado.

Arquivos mock locais por pagina devem ser removidos quando nao houver consumidor real.

Timer oficial: `src/core/tracker/timeTrackerStore.ts` + endpoints `/time-entries/*`.
