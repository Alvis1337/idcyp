# Kubernetes Deployment Guide

## Prerequisites

- Kubernetes cluster
- kubectl configured
- Helm 3.x installed
- Docker registry access (or use Docker Hub)

## Build and Push Image

```bash
# Build the image
docker build -f Dockerfile.k8s -t your-registry/idcyp:latest .

# Push to registry
docker push your-registry/idcyp:latest
```

## Configure Secrets

Create a `values-prod.yaml` file with your secrets:

```yaml
image:
  repository: your-registry/idcyp
  tag: latest

ingress:
  hosts:
    - host: menu.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: idcyp-tls
      hosts:
        - menu.yourdomain.com

env:
  clientUrl: https://menu.yourdomain.com

secrets:
  googleClientId: "your-google-client-id"
  googleClientSecret: "your-google-client-secret"
  sessionSecret: "generate-with-openssl-rand-hex-32"
  jwtSecret: "generate-with-openssl-rand-hex-32"

postgresql:
  auth:
    password: "your-secure-db-password"
```

## Deploy to Kubernetes

```bash
# Install/upgrade the chart
helm upgrade --install idcyp ./helm/idcyp \
  -f values-prod.yaml \
  --namespace idcyp \
  --create-namespace

# Check status
kubectl get pods -n idcyp
kubectl get ingress -n idcyp

# View logs
kubectl logs -f deployment/idcyp -n idcyp

# Port forward for testing (optional)
kubectl port-forward svc/idcyp 3001:3001 -n idcyp
```

## Update Google OAuth

Make sure to add your Kubernetes ingress URL to Google OAuth authorized redirect URIs:

```
https://menu.yourdomain.com/api/auth/google/callback
```

## Uninstall

```bash
helm uninstall idcyp -n idcyp
kubectl delete namespace idcyp
```

## Using External PostgreSQL

If you want to use an external PostgreSQL database:

```yaml
postgresql:
  enabled: false

externalDatabase:
  enabled: true
  host: your-postgres-host
  port: 5432
  database: menu_db
  username: postgres
  password: your-password
```

Then manually run the schema from `server/schema.sql` on your external database.

## Production Recommendations

1. **Use a proper secret management solution** (e.g., sealed-secrets, external-secrets, Vault)
2. **Enable persistent storage** for PostgreSQL
3. **Configure resource limits** appropriately
4. **Set up monitoring** (Prometheus, Grafana)
5. **Configure backup** for PostgreSQL data
6. **Use HTTPS** with proper TLS certificates (cert-manager)
7. **Enable autoscaling** if needed
8. **Set up log aggregation** (ELK, Loki)

## Troubleshooting

```bash
# Check pod status
kubectl describe pod <pod-name> -n idcyp

# Check logs
kubectl logs <pod-name> -n idcyp

# Check database connection
kubectl exec -it <app-pod-name> -n idcyp -- sh
# Inside pod:
# psql -h idcyp-postgresql -U postgres -d menu_db

# Check config and secrets
kubectl get configmap idcyp-config -n idcyp -o yaml
kubectl get secret idcyp-secrets -n idcyp -o yaml
```
