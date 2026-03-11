import fs from "node:fs";
import path from "node:path";

export function loadCapacityConfig() {
  const configPath = path.resolve(process.cwd(), "../..", "config", "capacity.json");
  const raw = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(raw);
}

function slugifyLabel(value, limit) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, limit);
}

export function buildK8sSpec({
  org,
  service,
  selection,
  packageDef,
  domain,
  capacity,
  namespace,
  dbName
}) {
  const orgSlug = org.slug || String(org._id);
  const orgDnsSlug = slugifyLabel(org.slug || org.name || org._id, 24) || orgSlug;
  const serviceId = service.id;
  const serviceDnsSlug = slugifyLabel(serviceId, 24) || "service";
  const name = slugifyLabel(`${orgDnsSlug}-${serviceDnsSlug}`, 50) || "service";
  const baseLabels = {
    app: name,
    org: orgSlug,
    service: serviceId
  };

  const workerReplicas = Math.max(1, Number(selection.instances || 1));
  const resources = capacity;
  const isQueueMode = packageDef.run?.mode === "queue";

  const overrideEnv = selection.configOverrides?.env || {};
  const mergedEnv = {
    ...(packageDef.run?.env || {}),
    ...overrideEnv,
    ...(dbName ? { DB_POSTGRESDB_DATABASE: dbName } : {})
  };
  const env = Object.entries(mergedEnv).map(([key, val]) => ({
    name: key,
    value: String(val)
      .replace("${TENANT_ID}", String(org._id))
      .replace("${ORG_ID}", String(org._id))
      .replace("${ORG_SLUG}", orgDnsSlug)
      .replace("${SELECTION_ID}", String(selection._id || ""))
      .replace(/\$\{([A-Z0-9_]+)\}/g, (_m, name) => process.env[name] || "")
  }));

  const redisName = `${name}-redis`;
  const mainName = `${name}-main`;
  const workerName = `${name}-worker`;
  const mainLabels = { ...baseLabels, role: "main" };
  const workerLabels = { ...baseLabels, role: "worker" };
  const redisLabels = { ...baseLabels, role: "redis" };
  const containerPort = Number(packageDef.run?.containerPort || 5678);
  const host = `${serviceDnsSlug}-${orgDnsSlug}.${domain}`;
  const queueEnv = isQueueMode
    ? [
        { name: "EXECUTIONS_MODE", value: "queue" },
        { name: "QUEUE_BULL_REDIS_HOST", value: redisName },
        { name: "QUEUE_BULL_REDIS_PORT", value: "6379" },
        { name: "N8N_PORT", value: String(containerPort) },
        { name: "N8N_HOST", value: host }
      ]
    : [];
  const mainEnv = [...env, ...queueEnv];
  const workerEnv = [...env, ...queueEnv];

  const endpoint = `https://${host}`;
  const useGatewayApi = process.env.USE_GATEWAY_API === "true";
  const gatewayName = process.env.GATEWAY_NAME || "saas-gateway";
  const gatewayNamespace = process.env.GATEWAY_NAMESPACE || "gateway";
  const manifests = [];

  manifests.push({
    apiVersion: "v1",
    kind: "Namespace",
    metadata: { name: namespace }
  });

  if (isQueueMode) {
    manifests.push({
      apiVersion: "apps/v1",
      kind: "Deployment",
      metadata: { name: redisName, labels: redisLabels, namespace },
      spec: {
        replicas: 1,
        selector: { matchLabels: redisLabels },
        template: {
          metadata: { labels: redisLabels },
          spec: {
            containers: [
              {
                name: "redis",
                image: packageDef.run?.redisImage || "redis:7-alpine",
                ports: [{ containerPort: 6379 }]
              }
            ]
          }
        }
      }
    });

    manifests.push({
      apiVersion: "v1",
      kind: "Service",
      metadata: { name: redisName, labels: redisLabels, namespace },
      spec: {
        selector: redisLabels,
        ports: [{ port: 6379, targetPort: 6379 }]
      }
    });
  }

  manifests.push({
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name: isQueueMode ? mainName : name,
      labels: isQueueMode ? mainLabels : baseLabels,
      namespace
    },
    spec: {
      replicas: 1,
      selector: { matchLabels: isQueueMode ? mainLabels : baseLabels },
      template: {
        metadata: { labels: isQueueMode ? mainLabels : baseLabels },
        spec: {
          containers: [
            {
              name: isQueueMode ? `${serviceId}-main` : serviceId,
              image: packageDef.image,
              command: isQueueMode ? ["n8n", "start"] : undefined,
              ports: [{ containerPort }],
              env: mainEnv,
              resources: {
                requests: resources,
                limits: resources
              }
            }
          ]
        }
      }
    }
  });

  if (isQueueMode) {
    manifests.push({
      apiVersion: "apps/v1",
      kind: "Deployment",
      metadata: { name: workerName, labels: workerLabels, namespace },
      spec: {
        replicas: workerReplicas,
        selector: { matchLabels: workerLabels },
        template: {
          metadata: { labels: workerLabels },
          spec: {
            containers: [
              {
                name: `${serviceId}-worker`,
                image: packageDef.image,
                command: ["n8n", "worker"],
                env: workerEnv,
                resources: {
                  requests: resources,
                  limits: resources
                }
              }
            ]
          }
        }
      }
    });
  }

  manifests.push({
    apiVersion: "v1",
    kind: "Service",
    metadata: { name, labels: baseLabels, namespace },
    spec: {
      selector: isQueueMode ? mainLabels : baseLabels,
      ports: [{ port: 80, targetPort: containerPort }]
    }
  });

  if (useGatewayApi) {
    manifests.push({
      apiVersion: "gateway.networking.k8s.io/v1",
      kind: "HTTPRoute",
      metadata: {
        name,
        labels: baseLabels,
        namespace,
        annotations: {
          "external-dns.alpha.kubernetes.io/hostname": host
        }
      },
      spec: {
        parentRefs: [{ name: gatewayName, namespace: gatewayNamespace }],
        hostnames: [host],
        rules: [
          {
            matches: [{ path: { type: "PathPrefix", value: "/" } }],
            backendRefs: [{ name, port: 80 }]
          }
        ]
      }
    });
  } else {
    manifests.push({
      apiVersion: "networking.k8s.io/v1",
      kind: "Ingress",
      metadata: {
        name,
        labels: baseLabels,
        namespace,
        annotations: {
          "kubernetes.io/ingress.class": "gce",
          "external-dns.alpha.kubernetes.io/hostname": host
        }
      },
      spec: {
        rules: [
          {
            host,
            http: {
              paths: [
                {
                  path: "/",
                  pathType: "Prefix",
                  backend: {
                    service: {
                      name,
                      port: { number: 80 }
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    });
  }

  return {
    name,
    endpoint,
    namespace,
    manifests,
    primaryDeploymentName: isQueueMode ? mainName : name,
    mode: isQueueMode ? "queue" : "direct"
  };
}
