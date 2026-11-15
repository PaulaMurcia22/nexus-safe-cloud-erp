# Arquitectura de despliegue propuesta

```mermaid
flowchart TB
  U[Usuarios / sedes / remoto] --> H[HTTPS administrado por Container Apps]
  H --> F[Container App Frontend Nginx]
  H --> B[Container App Backend Express]
  F -->|VITE_API_URL /api| B
  B -->|DB_HOST:5432 TLS| P[(PostgreSQL Flexible Server)]
  A[Azure Container Registry] -->|Managed Identity + AcrPull| F
  A -->|Managed Identity + AcrPull| B
  F --> L[Log Analytics]
  B --> L
```

El backend continúa siendo un monolito modular. RabbitMQ, el balanceador externo y Ollama permanente quedan fuera hasta contar con una integración y una decisión de costos validadas.

Flujo: crear ACR, publicar imágenes con tags inmutables, ejecutar `main.bicep`, inicializar PostgreSQL con el script seguro y probar healthchecks, sesión y persistencia.
