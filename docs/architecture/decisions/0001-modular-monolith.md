# ADR 0001: Server-first modular monolith

**Status:** Accepted

Use one server-first web application with modular public, content, recruitment and administration areas. Use managed database, storage, queue/worker, email, scanner and monitoring capabilities where needed. Do not introduce product microservices, Kubernetes, service mesh or event streaming.

One authorization/audit model is smaller and safer; asynchronous work stays outside request handling.
