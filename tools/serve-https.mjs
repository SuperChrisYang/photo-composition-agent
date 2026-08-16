import { createServer } from 'node:https'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('..', import.meta.url)))
const port = Number(process.env.PORT || 8443)

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
}

const server = createServer({
  key: await readFile(join(root, 'certs/server.key')),
  cert: await readFile(join(root, 'certs/server.crt')),
}, async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '')
    const filePath = join(root, safe === '/' ? 'index.html' : safe)
    const body = await readFile(filePath)
    response.writeHead(200, {
      'Content-Type': mime[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    response.end(body)
  } catch {
    response.writeHead(404)
    response.end('Not Found')
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`HTTPS server: https://192.168.1.28:${port}/`)
})
