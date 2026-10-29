# Documentación

| Recurso | Ubicación |
|---|---|
| Entregable de arquitectura técnica (RACI planificada y ejecutada, casos de uso, base de datos, API, seguridad) | `arquitectura-tecnica.md` (este mismo directorio) |
| Versión resumida del entregable (la que se entrega) | `arquitectura-tecnica-resumen.md` |
| Manual de despliegue (Supabase, Azure, GitHub Actions, APK) | `manual-despliegue.md` |
| Diagrama UML de casos de uso | `diagramas/casos-de-uso.svg` |
| Registros de decisiones de arquitectura (ADR) | `adr/` (ADR-001: autenticación propia) |
| Contrato de la API (OpenAPI 3.1) | `openapi.yaml` |
| Reglas de cálculo de la planilla | `reglas-calculo.md` |

Un ADR es un documento corto que registra una decisión técnica importante, con su contexto, alternativas y consecuencias.

## Fuera de alcance de esta versión

- **Contratos laborales y prestaciones** (aguinaldo, bono 14, indemnización, vacaciones pagadas): ningún caso de uso
  (CU-01 a CU-15) los pide y las reglas de cálculo cubren horas, extras, Bonificación Incentivo e IGSS. Lo que la
  planilla necesita del trabajador ya está en `perfiles`, sus estados, sus tarifas con vigencia y sus asignaciones.
  Los endpoints `/contratos` que el borrador del contrato tenía como propuesta se retiraron.

Las reglas de trabajo del equipo están en `CONTRIBUTING.md`, en la raíz del repositorio.