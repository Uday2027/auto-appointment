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
  
  console.log(`[fetchN8N] attempting webhook call: ${prodUrl}`);
  return await fetch(prodUrl, options);
}

export async function safeJson(res: Response) {
  const text = await res.text();
  console.log(`[safeJson] raw response (status ${res.status}):`, text);
  
  if (!res.ok) {
    throw new Error(`n8n error (status ${res.status}): ${text || "Empty response body"}`);
  }
  
  try {
    return text ? JSON.parse(text) : {};
  } catch (err) {
    throw new Error(`Invalid JSON response from n8n (status ${res.status}): "${text}"`);
  }
}
