import { resolve } from 'path'
import { Command, flags } from '@oclif/command'
import { load } from 'cheerio'

import { Botonic } from '../botonic'
import { track, parseOutputServer } from '../utils'

const render = require('next/dist/server/render')
const { createServer } = require('http')
const { parse } = require('url')

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

    await this.botonic.app.prepare()
    createServer(async (req: any, res: any) => { 
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl = parse(req.url, true)
      const { pathname, query } = parsedUrl
      var jsonString = ''
      await req.on('data', (data:any) => {
        jsonString += data;
      })
      var reqBody:any = ''
      try {
        reqBody = JSON.parse(jsonString)
      } catch{}
      if (pathname === '/index') {
        this.botonic.app.render(req, res, '/index', query)
      } else if (pathname === '/input') {
        try {
          if(!reqBody){
            res.statusCode = 500
            return render.sendHTML(req, res, 'There was an error in the request', req.method, {})
          }
          this.botonic.processInput(reqBody.input, reqBody.route, reqBody.context)
            .then((resp:any) => {
              let rp = parseOutputServer(resp)
              let response = {
                outputs: rp.output_json,
                context: rp.context,
                route: rp.route
              }
              return render.sendJSON(res, response, req.method)
            })
        } catch(e) {
          res.statusCode = 500
          return render.sendHTML(req, res, e.toString(), req.method, {})
        }
      } else if(pathname === '/webview') {
        if(!reqBody){
          res.statusCode = 500
          return render.sendHTML(req, res, 'There was an error in the request', req.method, {})
        }
        let response = await this.botonic.getWebview(reqBody.webview_page)
        return render.sendJSON(res, response, req.method)
      }else {
          handle(req, res, parsedUrl)
        }
    }).listen(port, (err: any) => {
      if (err) throw err
      console.log(`> Ready on http://localhost:${port}`)
  })
  }
}