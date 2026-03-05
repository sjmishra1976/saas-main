import fs from "node:fs";
import path from "node:path";

export function loadCatalog() {
  const catalogPath = path.resolve(
    process.cwd(),
    "../..",
    "services",
    "catalog",
    "services.json"
  );
  const raw = fs.readFileSync(catalogPath, "utf-8");
  return JSON.parse(raw);
}

export function findPackage(catalog, serviceId, packageId) {
  const service = catalog.services.find((s) => s.id === serviceId);
  if (!service) return null;
  return service.packages.find((p) => p.id === packageId) || null;
}
