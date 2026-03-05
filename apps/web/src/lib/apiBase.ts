function unique(values: Array<string | undefined | null>) {
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

export function getApiBases() {
  return unique([
    process.env.API_BASE_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
    "http://localhost:4000"
  ]);
}

export async function fetchFromApi(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const bases = getApiBases();
  let lastError: unknown = null;

  for (const base of bases) {
    try {
      return await fetch(`${base}${path}`, init);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to reach API");
}
