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
kubectl apply -f k8s/api.yaml
kubectl apply -f k8s/web.yaml
kubectl apply -f k8s/ingress.yaml
```

## 5) Verify
```bash
kubectl -n saas get pods
kubectl -n saas get svc
kubectl -n saas get ingress
```
