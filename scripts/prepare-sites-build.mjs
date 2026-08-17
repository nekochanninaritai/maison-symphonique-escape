import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { extname, join, relative, sep } from 'node:path'

const distDir = join(process.cwd(), 'dist')
const serverDir = join(process.cwd(), 'dist', 'server')
await mkdir(serverDir, { recursive: true })

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webp': 'image/webp',
}

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'server') files.push(...await collectFiles(fullPath))
    } else {
      files.push(fullPath)
    }
  }
  return files
}

const files = await collectFiles(distDir)
const assetMap = {}
for (const file of files) {
  const route = `/${relative(distDir, file).split(sep).join('/')}`
  assetMap[route] = {
    body: (await readFile(file)).toString('base64'),
    contentType: contentTypes[extname(file)] ?? 'application/octet-stream',
  }
}

const worker = `const assetMap = ${JSON.stringify(assetMap)};

const securityHeaders = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin"
};

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function serveAsset(request) {
  const url = new URL(request.url);
  const asset = assetMap[url.pathname] ?? assetMap["/index.html"];
  if (!asset) return new Response("Not found", { status: 404 });
  return withHeaders(new Response(decodeBase64(asset.body), {
    headers: { "content-type": asset.contentType }
  }));
}

function withHeaders(response) {
  const next = new Response(response.body, response);
  for (const [key, value] of Object.entries(securityHeaders)) {
    next.headers.set(key, value);
  }
  return next;
}

export default {
  async fetch(request) {
    return serveAsset(request);
  }
};
`

await writeFile(join(serverDir, 'index.js'), worker)
