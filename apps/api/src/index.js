import express from "express";
import cors from "cors";
import morgan from "morgan";
import { requireAuth, getUserSub } from "./lib/auth.js";
import { loadCatalog, findPackage } from "./lib/catalog.js";
import { connectDb } from "./lib/db.js";
import { Org, Selection } from "./lib/models.js";
import { loadCapacityConfig, buildK8sSpec } from "./lib/k8s.js";
import {
  applyManifests,
  rollbackManifests,
  cleanupByAppLabel,
  deleteNamespace
} from "./lib/gke.js";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 63);
}

function shortSlug(value, limit) {
  return slugify(value).slice(0, limit);
}

function getOwnerHandle(req, ownerUserId, ownerPrefixOverride) {
  const override = shortSlug(ownerPrefixOverride || "", 24);
  if (override) return override;

  const payload = req.auth?.payload || {};
  const email = payload.email ? String(payload.email) : "";
  const preferred = payload.preferred_username ? String(payload.preferred_username) : "";
  const nickname = payload.nickname ? String(payload.nickname) : "";
  const sub = payload.sub ? String(payload.sub) : "";
  const subTail = sub.includes("|") ? sub.split("|").pop() : sub;
  const raw =
    (email && email.includes("@") ? email.split("@")[0] : "") ||
    preferred ||
    nickname ||
    subTail ||
    ownerUserId ||
    "user";
  const normalized = shortSlug(raw, 24) || "user";
  if (/^[a-f0-9]{10,}$/i.test(normalized)) return "user";
  return normalized;
}

function buildPrefixedOrgName(handle, orgName) {
  const cleanName = String(orgName || "Organization").trim();
  const lowerName = cleanName.toLowerCase();
  const prefix = `${handle}-`;
  if (lowerName.startsWith(prefix.toLowerCase())) return cleanName;
  return `${handle}-${cleanName}`;
}

async function generateOwnerScopedOrgSlug({ ownerUserId, orgName, ownerHandle }) {
  const cleanOrgName = String(orgName || "").trim();
  const orgPart = shortSlug(cleanOrgName || "organization", 55);
  const ownerPart = shortSlug(ownerHandle || "user", 24);
  const base = slugify(orgPart || `${ownerPart}-organization`).slice(0, 55);

  let candidate = base;
  let index = 2;
  while (await Org.findOne({ ownerUserId, slug: candidate }).lean()) {
    candidate = `${base}-${index}`.slice(0, 63);
    index += 1;
  }
  return candidate;
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.auth?.payload || null });
});

app.get("/services", (req, res) => {
  res.json(loadCatalog());
});

app.get("/orgs", requireAuth, async (req, res) => {
  const userSub = getUserSub(req);
  const query = userSub ? { ownerUserId: userSub } : {};
  const orgs = await Org.find(query).sort({ createdAt: -1 }).lean();
  res.json({ orgs });
});

app.post("/orgs/default", requireAuth, async (req, res) => {
  const userSub = getUserSub(req);
  const orgs = await Org.find({ ownerUserId: userSub }).sort({ createdAt: -1 }).lean();
  if (orgs.length > 0) {
    return res.json({ org: orgs[0], created: false });
  }
  const rawName = req.body?.name || "Default Organization";
  const ownerUserId = userSub || "local-dev";
  const handle = getOwnerHandle(req, ownerUserId, req.body?.ownerPrefix);
  const name = buildPrefixedOrgName(handle, rawName);
  const slug = await generateOwnerScopedOrgSlug({
    ownerUserId,
    orgName: name,
    ownerHandle: handle
  });
  const org = await Org.create({
    name,
    slug,
    ownerUserId
  });
  return res.status(201).json({ org, created: true });
});

app.post("/orgs", requireAuth, async (req, res) => {
  const { name: rawName } = req.body || {};
  if (!rawName) {
    return res.status(400).json({ error: "name is required" });
  }
  const ownerUserId = getUserSub(req) || "local-dev";
  const handle = getOwnerHandle(req, ownerUserId, req.body?.ownerPrefix);
  const name = buildPrefixedOrgName(handle, rawName);
  const safeSlug = await generateOwnerScopedOrgSlug({
    ownerUserId,
    orgName: name,
    ownerHandle: handle
  });

  const org = await Org.create({
    name,
    slug: safeSlug,
    ownerUserId
  });
  res.status(201).json({ org });
});

app.delete("/orgs/:orgId", requireAuth, async (req, res) => {
  const { orgId } = req.params;
  const userSub = getUserSub(req);
  const org = await Org.findById(orgId).lean();
  if (!org) return res.status(404).json({ error: "org not found" });
  if (userSub && org.ownerUserId !== userSub) {
    return res.status(403).json({ error: "forbidden" });
  }

  const enableDeploy = process.env.ENABLE_GKE_DEPLOY === "true";
  if (enableDeploy) {
    const namespace = slugify(`${userSub || org.ownerUserId}-${org.slug}`);
    try {
      await deleteNamespace({
        namespace,
        projectId: process.env.GCP_PROJECT_ID,
        region: process.env.GCP_REGION,
        clusterName: process.env.GKE_CLUSTER_NAME,
        serviceAccountKeyPath: process.env.GCP_SERVICE_ACCOUNT_JSON
      });
    } catch (err) {
      return res.status(500).json({
        error: "failed to remove deployed services for org",
        details: err?.message || String(err)
      });
    }
  }

  await Selection.deleteMany({ orgId });
  await Org.deleteOne({ _id: orgId });
  res.json({ ok: true });
});

app.get("/orgs/:orgId", requireAuth, async (req, res) => {
  const { orgId } = req.params;
  const userSub = getUserSub(req);
  const org = await Org.findById(orgId).lean();
  if (!org) return res.status(404).json({ error: "org not found" });
  if (userSub && org.ownerUserId !== userSub) {
    return res.status(403).json({ error: "forbidden" });
  }
  return res.json({ org });
});

app.get("/orgs/:orgId/services", requireAuth, async (req, res) => {
  const { orgId } = req.params;
  const userSub = getUserSub(req);
  const org = await Org.findById(orgId).lean();
  if (!org) return res.status(404).json({ error: "org not found" });
  if (userSub && org.ownerUserId !== userSub) {
    return res.status(403).json({ error: "forbidden" });
  }
  const catalog = loadCatalog();
  const selections = await Selection.find({ orgId }).lean();
  const selectionsByService = new Map(
    selections.map((s) => [s.serviceId, s])
  );

  const services = catalog.services.map((service) => {
    const selection = selectionsByService.get(service.id) || null;
    const status = selection ? selection.status : "not_enrolled";
    return {
      ...service,
      selectionId: selection?._id || null,
      status,
      selection
    };
  });

  res.json({ org, services });
});

app.get("/orgs/:orgId/selections", requireAuth, async (req, res) => {
  const { orgId } = req.params;
  const userSub = getUserSub(req);
  const org = await Org.findById(orgId).lean();
  if (!org) return res.status(404).json({ error: "org not found" });
  if (userSub && org.ownerUserId !== userSub) {
    return res.status(403).json({ error: "forbidden" });
  }
  const selections = await Selection.find({ orgId }).sort({ createdAt: -1 }).lean();
  res.json({ selections });
});

app.post("/orgs/:orgId/selections", requireAuth, async (req, res) => {
  const { orgId } = req.params;
  const { serviceId, packageId, configOverrides } = req.body || {};
  if (!serviceId || !packageId) {
    return res.status(400).json({ error: "serviceId and packageId are required" });
  }

  const userSub = getUserSub(req);
  const org = await Org.findById(orgId).lean();
  if (!org) return res.status(404).json({ error: "org not found" });
  if (userSub && org.ownerUserId !== userSub) {
    return res.status(403).json({ error: "forbidden" });
  }

  const catalog = loadCatalog();
  const pkg = findPackage(catalog, serviceId, packageId);
  if (!pkg) {
    return res.status(400).json({ error: "invalid service/package" });
  }

  const selection = await Selection.create({
    orgId,
    serviceId,
    packageId,
    configOverrides: configOverrides || {},
    status: "enrolled"
  });
  res.status(201).json({ selection });
});

app.post("/orgs/:orgId/enroll", requireAuth, async (req, res) => {
  const { orgId } = req.params;
  const { serviceId, packageId, instances, capacityOption } = req.body || {};
  if (!serviceId || !packageId) {
    return res.status(400).json({ error: "serviceId and packageId are required" });
  }

  const userSub = getUserSub(req);
  const org = await Org.findById(orgId).lean();
  if (!org) return res.status(404).json({ error: "org not found" });
  if (userSub && org.ownerUserId !== userSub) {
    return res.status(403).json({ error: "forbidden" });
  }

  const catalog = loadCatalog();
  const pkg = findPackage(catalog, serviceId, packageId);
  if (!pkg) {
    return res.status(400).json({ error: "invalid service/package" });
  }

  const selection = await Selection.create({
    orgId,
    serviceId,
    packageId,
    status: "enrolled",
    instances: Number(instances || 1),
    capacityOption: capacityOption || "standard"
  });

  res.status(201).json({ selection });
});

app.patch("/orgs/:orgId/selections/:selectionId/status", requireAuth, async (req, res) => {
  const { orgId, selectionId } = req.params;
  const { status } = req.body || {};
  const allowed = new Set(["enrolled", "active", "inactive"]);
  if (!allowed.has(status)) {
    return res.status(400).json({ error: "invalid status" });
  }

  const userSub = getUserSub(req);
  const org = await Org.findById(orgId).lean();
  if (!org) return res.status(404).json({ error: "org not found" });
  if (userSub && org.ownerUserId !== userSub) {
    return res.status(403).json({ error: "forbidden" });
  }

  const selection = await Selection.findOneAndUpdate(
    { _id: selectionId, orgId },
    { status },
    { new: true }
  ).lean();
  if (!selection) {
    return res.status(404).json({ error: "selection not found" });
  }
  res.json({ selection });
});

app.post("/orgs/:orgId/selections/:selectionId/activate", requireAuth, async (req, res) => {
  const { orgId, selectionId } = req.params;
  const userSub = getUserSub(req);
  const org = await Org.findById(orgId).lean();
  if (!org) return res.status(404).json({ error: "org not found" });
  if (userSub && org.ownerUserId !== userSub) {
    return res.status(403).json({ error: "forbidden" });
  }

  const selection = await Selection.findOne({ _id: selectionId, orgId }).lean();
  if (!selection) return res.status(404).json({ error: "selection not found" });

  const catalog = loadCatalog();
  const pkg = findPackage(catalog, selection.serviceId, selection.packageId);
  if (!pkg) {
    return res.status(400).json({ error: "invalid service/package" });
  }

  const capacityConfig = loadCapacityConfig();
  const capacity =
    capacityConfig[selection.capacityOption] || capacityConfig.standard;
  const domain = process.env.SERVICE_DOMAIN || "yourdomain.com";

  const service = catalog.services.find((s) => s.id === selection.serviceId);
  if (!service) {
    return res.status(400).json({
      error: "invalid service",
      details: `Service '${selection.serviceId}' not found in catalog`
    });
  }
  const namespace = slugify(`${userSub || org.ownerUserId}-${org.slug}`);
  const spec = buildK8sSpec({
    org,
    service,
    selection,
    packageDef: pkg,
    domain,
    capacity,
    namespace
  });

  const enableDeploy = process.env.ENABLE_GKE_DEPLOY === "true";

  try {
    if (enableDeploy) {
      await applyManifests({
        manifests: spec.manifests,
        projectId: process.env.GCP_PROJECT_ID,
        region: process.env.GCP_REGION,
        clusterName: process.env.GKE_CLUSTER_NAME,
        serviceAccountKeyPath: process.env.GCP_SERVICE_ACCOUNT_JSON,
        namespace,
        deploymentName: spec.primaryDeploymentName,
        waitTimeoutSeconds: Number(process.env.DEPLOY_WAIT_SECONDS || 120)
      });
    }

    await Selection.findByIdAndUpdate(selectionId, {
      status: "active",
      deploymentStatus: enableDeploy ? "active" : "provisioning",
      endpointUrl: spec.endpoint,
      lastDeploymentSpec: spec,
      lastDeploymentError: ""
    });
  } catch (err) {
    if (enableDeploy) {
      try {
        await rollbackManifests({
          namespace,
          deploymentName: spec.primaryDeploymentName
        });
      } catch {}
    }
    const errorMessage = err?.message || String(err);
    await Selection.findByIdAndUpdate(selectionId, {
      status: "inactive",
      deploymentStatus: "failed",
      lastDeploymentSpec: spec,
      lastDeploymentError: errorMessage
    });
    return res.status(500).json({
      error: "deployment failed",
      details: errorMessage
    });
  }

  res.json({
    ok: true,
    endpoint: spec.endpoint,
    spec
  });
});

app.delete("/orgs/:orgId/selections/:selectionId", requireAuth, async (req, res) => {
  const { orgId, selectionId } = req.params;
  const userSub = getUserSub(req);
  const org = await Org.findById(orgId).lean();
  if (!org) return res.status(404).json({ error: "org not found" });
  if (userSub && org.ownerUserId !== userSub) {
    return res.status(403).json({ error: "forbidden" });
  }

  const deleted = await Selection.findOneAndDelete({
    _id: selectionId,
    orgId
  });
  if (!deleted) {
    return res.status(404).json({ error: "selection not found" });
  }

  const enableDeploy = process.env.ENABLE_GKE_DEPLOY === "true";
  if (enableDeploy) {
    const namespace = deleted.lastDeploymentSpec?.namespace;
    const appName = deleted.lastDeploymentSpec?.name;
    if (namespace && appName) {
      try {
        await cleanupByAppLabel({
          namespace,
          appName,
          projectId: process.env.GCP_PROJECT_ID,
          region: process.env.GCP_REGION,
          clusterName: process.env.GKE_CLUSTER_NAME,
          serviceAccountKeyPath: process.env.GCP_SERVICE_ACCOUNT_JSON
        });
      } catch (err) {
        return res.status(500).json({
          error: "selection removed but failed to cleanup deployed instance",
          details: err?.message || String(err)
        });
      }
    }
  }
  res.json({ ok: true });
});

const port = process.env.PORT || 4000;
connectDb().then(() => {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on :${port}`);
  });
});
