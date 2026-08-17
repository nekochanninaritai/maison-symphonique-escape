import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const serverDir = join(process.cwd(), 'dist', 'server')
await mkdir(serverDir, { recursive: true })

const worker = `const securityHeaders = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin"
};

async function serveAsset(request, env) {
  const response = await env.ASSETS.fetch(request);
  if (response.status !== 404) return withHeaders(response);
  const url = new URL(request.url);
  if (url.pathname.includes(".")) return withHeaders(response);
  return withHeaders(await env.ASSETS.fetch(new Request(new URL("/", request.url), request)));
}

function withHeaders(response) {
  const next = new Response(response.body, response);
  for (const [key, value] of Object.entries(securityHeaders)) {
    next.headers.set(key, value);
  }
  return next;
}

export default {
  async fetch(request, env) {
    return serveAsset(request, env);
  }
};
`

await writeFile(join(serverDir, 'index.js'), worker)
