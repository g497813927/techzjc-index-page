import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
 
const port = process.env.PORT || 9000
const dev = process.env.NODE_ENV !== 'production'
const buildDir = '.next'
const hostname = '0.0.0.0'
const app = next({ dev, dir: '.', conf: { distDir: buildDir }, hostname: hostname })
const handle = app.getRequestHandler()



app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(port)
 
  console.log(
    `> Server listening at http://${hostname}:${port} as ${
      dev ? 'development' : process.env.NODE_ENV
    }`
  )
})
