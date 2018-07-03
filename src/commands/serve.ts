import { resolve } from 'path'
import { Command, flags } from '@oclif/command'
/*import {
  //renderToHTML,
  renderErrorToHTML,
  sendHTML
  //serveStatic,
  //renderScriptError
} from 'next'*/
import { load } from 'cheerio'

import { sendHTML, sendJSON } from 'next/dist/server/render'

const { createServer } = require('http')
const { parse } = require('url')

import { Botonic } from '../botonic'
import { track, parseOutputServer } from '../utils'

export default class Run extends Command {
  static description = 'Start a web based interactive session'

  static examples = [
    `$ botonic serve`,
  ]

  static flags = {
    path: flags.string({char: 'p', description: 'Path to botonic project. Defaults to current dir.'}),
    port: flags.string({char: 'o', description: 'Port number'})
  }

  private botonic: any

  async run() {
    track('botonic_input')
    const {args, flags} = this.parse(Run)

    const path = flags.path? resolve(flags.path) : process.cwd()
    const port = flags.port ? flags.port : 2001

    this.botonic = new Botonic(path)

    const handle = this.botonic.app.getRequestHandler()

    this.botonic.app.prepare().then(() => {
      createServer(async (req: any, res: any) => {
        // Be sure to pass `true` as the second argument to `url.parse`.
        // This tells it to parse the query portion of the URL.
        const parsedUrl = parse(req.url, true)
        const { pathname } = parsedUrl
        var jsonString = ''
        req.on('data', (data) => {
          jsonString += data;
        })
        req.on('end', () => {
            var reqBody = JSON.parse(jsonString)
            if (pathname === '/') {
              // return index.html
            } else if (pathname === '/input') {
              try {
                this.botonic.processInput(reqBody.input, reqBody.route, reqBody.context)
                  .then((resp) => {
                    let rp = parseOutputServer(resp)
                    let response = {
                      outputs: rp.output_json,
                      context: rp.context,
                      route: rp.route
                    }
                    return sendJSON(res, response, req.method)
                  })
              } catch(e) {
                res.statusCode = 500
                return sendHTML(req, res, e.toString(), req.method, {})
                //return renderErrorToHTML(e.toString(), req, res, pathname, query)
              }
            } else {
              handle(req, res, parsedUrl)
            }
            })
      }).listen(port, (err: any) => {
        if (err) throw err
        console.log(`> Ready on http://localhost:${port}`)
      })
    })
  }
}