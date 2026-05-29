const getBaseUrl = () => {
  let url = process.env.NEXT_PUBLIC_N8N_URL || "http://localhost:5678";
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  return url;
};

export async function fetchN8N(path: string, options: RequestInit = {}) {
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  
  const prodUrl = `${baseUrl}/webhook/${cleanPath}`;
  const testUrl = `${baseUrl}/webhook-test/${cleanPath}`;
  
  console.log(`[fetchN8N] attempting production: ${prodUrl}`);
  try {
    const res = await fetch(prodUrl, options);
    if (res.status === 404) {
      console.log(`[fetchN8N] production endpoint returned 404. Falling back to test endpoint: ${testUrl}`);
      return await fetch(testUrl, options);
    }
    return res;
  } catch (err) {
    console.warn(`[fetchN8N] production fetch failed: ${err instanceof Error ? err.message : String(err)}. Falling back to test endpoint: ${testUrl}`);
    return await fetch(testUrl, options);
  }
}
