# GKE Deployment (Web + API)

## 1) Build and push images
```bash
gcloud auth configure-docker us-west1-docker.pkg.dev

docker build -t us-west1-docker.pkg.dev/aiaas/saas/api:latest -f apps/api/Dockerfile.prod .
docker build -t us-west1-docker.pkg.dev/aiaas/saas/web:latest -f apps/web/Dockerfile .

docker push us-west1-docker.pkg.dev/aiaas/saas/api:latest
docker push us-west1-docker.pkg.dev/aiaas/saas/web:latest
```
### if using dockerhub
```bash
docker login
docker build -t <dockerhub-username>/saas-api:latest -f apps/api/Dockerfile.prod .
docker build -t <dockerhub-username>/saas-web:latest -f apps/web/Dockerfile .
docker push <dockerhub-username>/saas-api:latest
docker push <dockerhub-username>/saas-web:latest
```

## 2) Configure kubectl context
```bash

gcloud container clusters create-auto vishu-aiaas \
  --project=saas-main-vishusystems \
  --region=us-west1 \
  --release-channel=regular
  
gcloud container clusters get-credentials vishu-aiaas --region us-west1 --project saas-main-vishusystems



```

## 3) Customize config and secrets
- Edit `k8s/configmap.yaml` and `k8s/secret.yaml` values.
- Replace Auth0 values, Mongo URI, encryption keys, and domains.

## 4) Apply manifests
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/mongo.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/backendconfig-api.yaml
kubectl apply -f k8s/api.yaml
kubectl apply -f k8s/web.yaml
kubectl apply -f k8s/managed-cert.yaml
kubectl apply -f k8s/ingress.yaml
```

## 4b) Gateway API + Wildcard TLS (recommended)
This replaces per-service Ingress + ManagedCertificate with a single Gateway and
Certificate Manager wildcard cert.

### Create wildcard cert + cert map (one-time, via gcloud)
```bash
gcloud certificate-manager certificates create vishuaiaas-wildcard \
  --domains="*.vishuaiaas.com" \
  --global

gcloud certificate-manager maps create vishuaiaas-cert-map --global

gcloud certificate-manager maps entries create vishuaiaas-wildcard-entry \
  --map="vishuaiaas-cert-map" \
  --hostname="*.vishuaiaas.com" \
  --certificates="vishuaiaas-wildcard" \
  --global
```

### Deploy Gateway
```bash
kubectl apply -f k8s/gateway.yaml
```

### Configure API to use Gateway routes
Set in `k8s/configmap.yaml`:
```yaml
USE_GATEWAY_API: "true"
GATEWAY_NAME: "saas-gateway"
GATEWAY_NAMESPACE: "gateway"
```

Rebuild and deploy API so new services create HTTPRoutes instead of Ingress.

## 4a) ExternalDNS (automatic per-service DNS)
Create a dedicated GCP service account with DNS admin role and a key file:

```bash
gcloud iam service-accounts create external-dns \
  --display-name="ExternalDNS" \
  --project=saas-main-vishusystems

gcloud projects add-iam-policy-binding saas-main-vishusystems \
  --member="serviceAccount:external-dns@saas-main-vishusystems.iam.gserviceaccount.com" \
  --role="roles/dns.admin"

gcloud iam service-accounts keys create /tmp/external-dns-gcp-sa.json \
  --iam-account=external-dns@saas-main-vishusystems.iam.gserviceaccount.com
```

Create the secret and deploy ExternalDNS:

```bash
kubectl create namespace external-dns
kubectl -n external-dns create secret generic external-dns-gcp-sa \
  --from-file=gcp-sa.json=/tmp/external-dns-gcp-sa.json
kubectl apply -f k8s/external-dns.yaml
```

ExternalDNS will create A records for any ingress annotated with:
`external-dns.alpha.kubernetes.io/hostname: <service>.<org>.vishuaiaas.com`

With Gateway API, ExternalDNS will also read HTTPRoutes (enabled in `k8s/external-dns.yaml`).

## 5) Verify
```bash
kubectl -n saas get pods
kubectl -n saas get svc
kubectl -n saas get ingress
kubectl -n saas get managedcertificate
```

## 6) Reserve static IP and map DNS
```bash
gcloud compute addresses create saas-ingress-ip --global --project saas-main-vishusystems
gcloud compute addresses describe saas-ingress-ip --global --project saas-main-vishusystems --format='value(address)'
```

- Create `A` records:
  - `app.vishuaiaas.com` -> ingress static IP
  - `api.vishuaiaas.com` -> ingress static IP
