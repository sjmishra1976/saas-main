import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), "data");

function readJson(fileName) {
  const filePath = path.join(dataDir, fileName);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function writeJson(fileName, data) {
  const filePath = path.join(dataDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function listOrgs() {
  return readJson("orgs.json").orgs;
}

export function saveOrgs(orgs) {
  writeJson("orgs.json", { orgs });
}

export function listSelections() {
  return readJson("selections.json").selections;
}

export function saveSelections(selections) {
  writeJson("selections.json", { selections });
}
