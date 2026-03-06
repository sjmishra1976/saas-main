# SaaS Multi-Tenant Platform
A cloud-native, multi-tenant SaaS platform enabling organizations to provision and manage AI-powered assistant services (Sales Assistant, Customer Service Assistant, etc.) as containerized workloads.

## Monorepo scaffold for a multi-tenant SaaS platform with:
- `apps/api`: Node/Express API (MongoDB)
- `apps/web`: Next.js frontend
- `services/catalog`: JSON service catalog
- `services/packages`: Service package definitions (Docker-ready)

## Auth0 wiring
- Web app uses `@auth0/nextjs-auth0`.
- API uses JWT verification via Auth0 and `express-oauth2-jwt-bearer`.
- Role claim for authorization:
  - Add roles to token under `https://vishusystems.com/roles` (array).
  - Supported roles: `org_admin`, `org_operator`, `org_viewer`.
  - API enforcement:
    - `org_admin`: delete org, delete selection
    - `org_admin` or `org_operator`: enroll, activate, deactivate, status updates
- Copy env templates:
  - `apps/web/.env.local.example` -> `apps/web/.env.local`
  - `apps/api/.env.example` -> `apps/api/.env`
  - Ensure `MONGODB_URI` points to your MongoDB instance

## API endpoints (MVP)
- `GET /health`
- `GET /services`
- `GET /orgs`
- `POST /orgs`
- `GET /orgs/:orgId`
- `GET /orgs/:orgId/selections`
- `POST /orgs/:orgId/selections`
- `DELETE /orgs/:orgId/selections/:selectionId`

## Local dev (manual)
- API: `npm install` then `npm run dev` in `apps/api`
- Web: `npm install` then `npm run dev` in `apps/web`

## Docker Compose (Local)
- Copy `.env.compose.example` -> `.env` at repo root and fill Auth0 values.
- Run: `docker compose up`
  - Starts: `mongo`, `api`, `web`, `n8n-postgres`, `n8n-redis`, `n8n-main`, `n8n-worker`
  - n8n editor URL: `http://localhost:5678`
  - For Docker web->api calls, keep `API_BASE_URL=http://api:4000`
  - `n8n-main` is built from `services/packages/local-n8n` and auto-imports both bundled workflows on first container start.

## Docker Compose (GCP Deploy Mode)
- Base compose keeps local mode with `ENABLE_GKE_DEPLOY=false`.
- For production-style deploys, enable GCP override file:
  - `docker compose -f docker-compose.yml -f docker-compose.gcp.yml up --build`
  - Requires `GCP_SERVICE_ACCOUNT_KEY`, `GCP_PROJECT_ID`, `GCP_REGION`, `GKE_CLUSTER_NAME`.

## n8n Queue Mode Deployments
- Service packages can set `run.mode` as `queue` in `services/catalog/services.json`.
- Activation deploys n8n queue topology to GKE using the package image URL:
  - n8n main deployment (`n8n start`)
  - n8n worker deployment (`n8n worker`, replicas from selected instances)
  - per-service Redis deployment/service
  - service + GCE ingress for the main deployment
  - Web app service console (Auth0-protected) is available per selection:
    - `/orgs/<orgId>/services/<selectionId>`
    - Includes Start/Stop controls and `Open Workflow Editor` link to n8n main UI.
- Required API env for n8n queue mode:
  - `N8N_DB_HOST`, `N8N_DB_PORT`, `N8N_DB_NAME`, `N8N_DB_USER`, `N8N_DB_PASSWORD`
  - `N8N_ENCRYPTION_KEY`
  - Sales assistant workflow env:
    - `PROMOTER_EMAIL` (default set to `contact@vishusystems.com` in catalog)
    - `ENRICHMENT_API_URL`, `ENRICHMENT_API_KEY`
    - `GOOGLE_SHEETS_INGEST_URL`, `GOOGLE_SHEETS_INGEST_KEY`
    - `LEAD_DB_INGEST_URL`, `LEAD_DB_INGEST_KEY`
    - `SERVICE_ACTIVITY_INGEST_BASE_URL`, `SERVICE_ACTIVITY_INGEST_KEY`
  - Customer service workflow env:
    - `HEALTHCARE_PROVIDER_NAME`, `SUPPORT_EMAIL` (default `contact@vishusystems.com`)
    - `SUPPORT_KB_JSON`
    - `SUPPORT_DB_INGEST_URL`, `SUPPORT_DB_INGEST_KEY`
    - `SUPPORT_SHEETS_INGEST_URL`, `SUPPORT_SHEETS_INGEST_KEY`
    - `SERVICE_ACTIVITY_INGEST_BASE_URL`, `SERVICE_ACTIVITY_INGEST_KEY`
- Local compose already provides these defaults via `n8n-postgres` and `n8n-redis`.
- Both service package images auto-import bundled workflows at container startup via package entrypoint:
  - Sales: `services/packages/sales-assistant/workflows/smb-sales-lead-gen-enrichment.json`
  - Customer support: `services/packages/customer-service-assistant/workflows/healthcare-customer-support-chat.json`
  - Local n8n bootstrap image (for UI testing): `services/packages/local-n8n/workflows/*`
- Workflows can emit runtime activity logs back to API via:
  - `POST /orgs/:orgId/selections/:selectionId/activity` (header `x-service-activity-key`)

## How GKE Deployment Works
1. Enrollment
- User enrolls a service for an organization with `service`, `package`, `instances`, and `capacityOption`.
- Enrollment creates a `selection` record in MongoDB.

2. Activation
- User clicks Activate (`POST /orgs/:orgId/selections/:selectionId/activate`).
- API loads the service package from `services/catalog/services.json` and selection details from Mongo.

3. Capacity and replicas
- `capacityOption` (`standard`, `professional`, `enterprise`) maps to CPU/memory in `config/capacity.json`.
- Queue mode deployment uses:
  - n8n main replicas: `1`
  - n8n worker replicas: `instances` (minimum `1`)
  - Redis replicas: `1`

4. Manifest generation
- API builds Kubernetes resources in `apps/api/src/lib/k8s.js`:
  - Namespace
  - Deployments (main/worker/redis)
  - Services
  - GCE Ingress
- Endpoint format:
  - `https://<serviceId>.<org-dns-slug>.<SERVICE_DOMAIN>`

5. Apply to GKE
- If `ENABLE_GKE_DEPLOY=true`, API executes deployment in `apps/api/src/lib/gke.js`:
  - `gcloud auth activate-service-account`
  - `gcloud container clusters get-credentials`
  - `kubectl apply -f -`
  - `kubectl wait --for=condition=available`
- On failure, API rolls back and stores deployment error.

6. Persist deployment state
- On success selection is updated with:
  - `status=active`
  - `deploymentStatus=active`
  - `endpointUrl`, `editorUrl`
  - `lastDeploymentSpec`
- On failure selection is updated with:
  - `status=inactive`
  - `deploymentStatus=failed`
  - `lastDeploymentError`

7. Deactivation
- `POST /orgs/:orgId/selections/:selectionId/deactivate` cleans deployed resources by app label (when deploy mode is enabled) and sets selection to inactive.

8. Required environment for GKE mode
- `ENABLE_GKE_DEPLOY=true`
- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GKE_CLUSTER_NAME`
- `GCP_SERVICE_ACCOUNT_JSON` (path inside API container to service-account key)
- `SERVICE_DOMAIN`

## Build Service Images
- Shared builder script:
  - `scripts/build_n8n_service_image.sh <service-dir> <image-ref> [--push]`
- Per-service wrappers:
  - `scripts/build_sales_assistant.sh [--push]`
  - `scripts/build_customer_service_assistant.sh [--push]`
- Override target image:
  - `IMAGE_REF=us-west1-docker.pkg.dev/aiaas/saas/sales-assistant-n8n:latest scripts/build_sales_assistant.sh --push`
  - `IMAGE_REF=us-west1-docker.pkg.dev/aiaas/saas/customer-service-assistant-n8n:latest scripts/build_customer_service_assistant.sh --push`

## Deploy Web + API to GKE
- Production Dockerfiles:
  - API: `apps/api/Dockerfile.prod`
  - Web: `apps/web/Dockerfile`
- Kubernetes manifests:
  - `k8s/namespace.yaml`
  - `k8s/configmap.yaml`
  - `k8s/secret.yaml`
  - `k8s/api.yaml`
  - `k8s/web.yaml`
  - `k8s/ingress.yaml`
- End-to-end deploy steps and commands:
  - `k8s/README.md`
- dockerhub example
  - `docker login`
  - `IMAGE_REF=<dockerhub-username>/sales-assistant-n8n:latest scripts/build_sales_assistant.sh --push`
  - `IMAGE_REF=<dockerhub-username>/customer-service-assistant-n8n:latest scripts/build_customer_service_assistant.sh --push`
