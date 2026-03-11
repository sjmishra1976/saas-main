import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function runWithStdin(cmd, args, stdinData) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `${cmd} failed with code ${code}`));
    });
    child.stdin.write(stdinData);
    child.stdin.end();
  });
}

async function setupGkeContext({
  projectId,
  region,
  clusterName,
  serviceAccountKeyPath
}) {
  if (!projectId || !region || !clusterName || !serviceAccountKeyPath) {
    throw new Error("Missing GKE configuration");
  }

  await execFileAsync("gcloud", [
    "auth",
    "activate-service-account",
    `--key-file=${serviceAccountKeyPath}`
  ]);

  await execFileAsync("gcloud", [
    "container",
    "clusters",
    "get-credentials",
    clusterName,
    "--region",
    region,
    "--project",
    projectId
  ]);
}

export async function applyManifests({
  manifests,
  projectId,
  region,
  clusterName,
  serviceAccountKeyPath,
  namespace,
  deploymentName,
  waitTimeoutSeconds = 120
}) {
  await setupGkeContext({ projectId, region, clusterName, serviceAccountKeyPath });

  const yamlDocs = manifests.map((m) => JSON.stringify(m)).join("\n---\n");
  await runWithStdin("kubectl", ["apply", "--validate=false", "-f", "-"], yamlDocs);

  if (namespace && deploymentName) {
    await execFileAsync("kubectl", [
      "wait",
      `--namespace=${namespace}`,
      `deployment/${deploymentName}`,
      "--for=condition=available",
      `--timeout=${waitTimeoutSeconds}s`
    ]);
  }
}

export async function rollbackManifests({ namespace, deploymentName }) {
  if (!namespace || !deploymentName) return;
  const args = [
    `--namespace=${namespace}`,
    "delete",
    "deployment,service,ingress",
    deploymentName,
    "--ignore-not-found=true"
  ];
  await execFileAsync("kubectl", args);
}

export async function cleanupByAppLabel({
  namespace,
  appName,
  projectId,
  region,
  clusterName,
  serviceAccountKeyPath
}) {
  if (!namespace || !appName) return;
  await setupGkeContext({ projectId, region, clusterName, serviceAccountKeyPath });
  await execFileAsync("kubectl", [
    `--namespace=${namespace}`,
    "delete",
    "deployment,service,ingress",
    "-l",
    `app=${appName}`,
    "--ignore-not-found=true"
  ]);
}

export async function deleteNamespace({
  namespace,
  projectId,
  region,
  clusterName,
  serviceAccountKeyPath
}) {
  if (!namespace) return;
  await setupGkeContext({ projectId, region, clusterName, serviceAccountKeyPath });
  await execFileAsync("kubectl", [
    "delete",
    "namespace",
    namespace,
    "--ignore-not-found=true"
  ]);
}
