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
import { track } from '../utils'

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

    /*this.botonic.processInput(args.input, route, context).then((response: string) => {
      console.log(response)
    })*/

    

    const handle = this.botonic.app.getRequestHandler()

    this.botonic.app.prepare().then(() => {
      createServer(async (req: any, res: any) => {
        // Be sure to pass `true` as the second argument to `url.parse`.
        // This tells it to parse the query portion of the URL.
        const parsedUrl = parse(req.url, true)
        const { pathname, query } = parsedUrl

        if (pathname === '/') {
          // return index.html
        } else if (pathname === '/input') {
          try {
            var output = await this.botonic.processInput(query, null, {})
            var json = {}
            let html = load(output)
            let outputs = html('[type=text], [type=carrousel], [type=image], [type=video], [type=audio],\
              [type=document], [type=location], [type=button]')
              .map((i, elem) => {
                let el = html(elem)
                let out = ''
                if(el.is('[type=text]')) {
                  json = {
                    type: 'text',
                    data: el.contents().filter(e => el.contents()[e].type === 'text').text().trim()
                  }
                }
              })
            //return sendHTML(req, res, html, req.method, {})//, this.renderOpts)
            return sendJSON(res, json, req.method)
          } catch(e) {
            console.log('NOOOOOOO')
            res.statusCode = 500
            return sendHTML(req, res, e.toString(), req.method, {})
            //return renderErrorToHTML(e.toString(), req, res, pathname, query)
          }
        } else {
          handle(req, res, parsedUrl)
        }
      }).listen(port, (err: any) => {
        if (err) throw err
        console.log(`> Ready on http://localhost:${port}`)
      })
    })
  }

}