import { resolve } from 'path'
import { Command, flags } from '@oclif/command'
import { load } from 'cheerio'
import * as Table from 'cli-table3'
import { Question, prompt } from 'inquirer'
import * as colors from 'colors'

import { Botonic, BotonicAPIService } from '../botonic'
import { track, parseOutputTerminal } from '../utils'

export default class Run extends Command {
  static description = 'Start interactive session'

  static examples = [
    `$ botonic run
Your bot is ready, start talking:
[you] > Hi
[bot] > Bye!
`,
  ]

  static flags = {
    path: flags.string({char: 'p', description: 'Path to botonic project. Defaults to current dir.'})
  }

  static args = [{name: 'input', parse: JSON.parse}]

  private botonic: any
  private context: any = {
    'last_session': {},
    'user': {
      'id': '000001',
      'username': 'John',
      'name': 'Doe',
      'provider': 'terminal',
      'provider_id': '0000000',
      'extra_data': {}
    },
    'organization': '',
    'bot': {
      'id': '0000000',
      'name': 'botName'
    }
  }
  private helpText: string = `
This is an interactive chat session with your bot.

Type anything and press enter to get a response.
Use ! to send a payload message.

Examples:
[user]> ${colors.bold('hi')} --> this will send a message of type 'text' and content 'hi'
[user]> ${colors.bold('!button_click_1')} --> this will send a message of type 'postback' and payload 'button_click_1'

Use / for special commands:
${colors.bold('/quit')} | ${colors.bold('/q')} --> Exit interactive session
${colors.bold('/help')} | ${colors.bold('/h')} --> Show this help`

  private botonicApiService: BotonicAPIService = new BotonicAPIService()

  async run() {
    track('botonic_run')
    const {args, flags} = this.parse(Run)
    const path = flags.path? resolve(flags.path) : process.cwd()

    //Build project
    await this.botonicApiService.buildIfChanged()
    this.botonicApiService.beforeExit()

    this.botonic = new Botonic(path)
    console.log(this.helpText)
    this.chat_loop()
  }

  chat_loop() {
    console.log()
    prompt([{
      type: 'input',
      name: 'input',
      message: '[you]>'
    }]).then((inp: any) => {
      let input: any = {type: 'text', 'data': inp.input}
      if(inp.input.startsWith('!'))
        input = {type: 'postback', 'payload': inp.input.slice(1)}
      this.botonic.processInput(input, null, this.context).then((response: string) => {
        if(['/q', '/quit'].indexOf(input.data) >= 0)
          return
        if(['/help', '/h'].indexOf(input.data) >= 0) {
          console.log(this.helpText)
          this.chat_loop()
          return
        }
        console.log()
        let resp = parseOutputTerminal(response)
        this.context = resp.context
        console.log(colors.magenta(resp.outputs))
        this.chat_loop()
      })
    })
  }
}
