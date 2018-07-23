
import { load } from 'cheerio'
import * as Table from 'cli-table3'

const fs = require('fs')
const os = require('os')
const path = require('path')
const Mixpanel = require('mixpanel')

export const mixpanel_token = 'c73e2685df454183c0f97fbf2052d827'

export var mixpanel: any
export var credentials: any
export const botonic_home_path: string = path.join(os.homedir(), '.botonic')
export const botonic_credentials_path = path.join(botonic_home_path, 'credentials.json')

export function initializeCredentials() {
  if(!fs.existsSync(botonic_home_path))
    fs.mkdirSync(botonic_home_path)
  let distinct_id = Math.round(Math.random()*100000000)
  fs.writeFileSync(botonic_credentials_path,
    JSON.stringify({mixpanel: {distinct_id}}))
}

function readCredentials() {
  if (!fs.existsSync(botonic_credentials_path)) {
    initializeCredentials()
  }
  try {
    credentials = JSON.parse(fs.readFileSync(botonic_credentials_path))
  } catch(e) {}
}

try {
  readCredentials()
} catch(e) {}

if(track_mixpanel()){
  mixpanel = Mixpanel.init(mixpanel_token, {
    protocol: 'https'
  })
}

export function track(event: string) {
  if(track_mixpanel() && mixpanel && credentials && credentials.mixpanel)
    mixpanel.track(event, {distinct_id: credentials.mixpanel ? credentials.mixpanel.distinct_id : null})
}

export function alias(email: string) {
  if(track_mixpanel() && mixpanel && credentials && credentials.mixpanel && email) {
    mixpanel.alias(credentials.mixpanel.distinct_id, email, (e:any) => {console.log(e)})
    credentials.mixpanel.distinct_id = email
    fs.writeFileSync(botonic_credentials_path, JSON.stringify(credentials))
  }
}

export function botonicPostInstall() {
  if(track_mixpanel()) {
    initializeCredentials()
    readCredentials()
    track('botonic_install')
  }
}

function track_mixpanel() {
  return process.env.BOTONIC_DISABLE_MIXPANEL !== '1'
}

export function parseOutputTerminal(output: string) {
  let soruceData = '[type=image], [type=video], [type=audio], [type=document]'
  let context = {}
  try {
    let nextData = JSON.parse(output.split('__NEXT_DATA__ =')[1].split('module')[0])
    context = nextData.props.pageProps.context || {}
  } catch(e) {}
  let html = load(output)
  let outputs = html('[type=text], [type=carrousel], [type=image], [type=video], [type=audio],\
    [type=document], [type=location], [type=button]')
    .map((i, elem) => {
      let el = html(elem)
      let out = ''
      let short = (v: string) => v.length > 20? v.substring(0, 17) + '...' : v
      if(el.is('[type=text]')) {
        out = el.contents().filter(e => el.contents()[e].type === 'text').text().trim()
      } else if(el.is('[type=carrousel]')) {
        const c = new Table({
          style: { head: [], border: [] },
          wordWrap: false }) as Table.HorizontalTable
        let cards: any[] = []
        el.find('element').slice(0, 3).each((j, e) => {
          let te = new Table({style: { head: [], border: [] }}) as Table.HorizontalTable
          let el = html(e)
          let buttons = el.find('button')
            .map((k, b) => { return {
              title: html(b).text(),
              desc: html(b).attr('url') || html(b).attr('payload')}
            })
            .get()
            .map(b => Object.values(b).map(short))
            .map(([title, desc]) => `${title}\n(${desc})`)
          te.push([short(el.find('title').text()) + '\n\n' + short(el.find('desc').text())], buttons)
          cards.push(te.toString())
        })
        if(el.find('element').length > 3)
          cards.push({
            content: '...\n(' + (el.find('element').length - 3) + ' more elements)',
            vAlign: 'center',
            hAlign: 'center'})
        c.push(cards)
        out = 'carrousel:\n' + c.toString()
      } else if(el.is(soruceData)) {
        out = `${el.attr('type')}: ${el.attr('src')}`;
      } else if(el.is('[type=location]')) {
        const lat = el.find('lat')[0].children[0].data
        const long = el.find('long')[0].children[0].data
        out = `${el.attr('type')}: https://www.google.com/maps?q=${lat},${long}`;
      }
      let keyboard = ''
      if(el.find('button').length > 0 && !el.is('[type=carrousel]')) {
        let kt = new Table({style: { head: [], border: [] }}) as Table.HorizontalTable
        let buttons = el.find('button')
          .map((i, e) => {
            let button_data = e.attribs
            let elem = html(e)
            let data:any = null
            if(button_data['url']){
              return [elem.text() + '\n(' + button_data['url'] + ')']
            } else if(button_data['href']){
              return [elem.text() + '\n(' + button_data['href'] + ')']
            } else{
              return [elem.text() + '\n(' + button_data['payload'] + ')']
            }
          })
          .get()
        kt.push(buttons)
        keyboard = '\nbuttons:\n' + kt.toString()
      }
      if(el.find('reply').length > 0) {
        let kt = new Table({style: { head: [], border: [] }}) as Table.HorizontalTable
        let keys = el.find('reply')
          .map((i, e) => html(e).text() + '\n(' + html(e).attr('payload') + ')')
          .get()
        kt.push(keys)
        keyboard = '\nquickreplies:\n' + kt.toString()
      }
      if(out) return '  [bot]> ' + out + keyboard
    })
    .get()
  return {context, outputs: outputs.join('\n')}
}

export function parseOutputServer(output: string) {
  let soruceData = '[type=image], [type=video], [type=audio], [type=document]'
  let context = {}
  let route = {}
  var output_json: any = [] as Object[] 
  try {
    let nextData = JSON.parse(output.split('__NEXT_DATA__ =')[1].split('module')[0])
    context = nextData.props.pageProps.context || {}
    route = nextData.query.routePath || {}
  } catch(e) {}
  let html = load(output)
  let outputs = html('[type=text], [type=carrousel], [type=image], [type=video], [type=audio],\
    [type=document], [type=location], [type=button]')
    .map((i, elem) => {
      let el = html(elem)
      if(el.is('[type=text]')) {
        output_json.push({
          type: 'text',
          data: el.contents().filter(e => el.contents()[e].type === 'text').text().trim()
        })
      } else if(el.is('[type=carrousel]')) {
        let elements = [] as Object[]
        el.find('element').each((j, e) => {
          let el = html(e)
          let buttons = [] as Object[]
          el.find('button')
            .map((k, b) => {
              let e = html(b)
              buttons.push({
                type: e.attr('type'),
                title: e.text(),
                desc: e.attr('url') || e.attr('payload') || e.attr('href')
              })
            })
          let element_obj = {
            image: el.find('image').text(),
            title: el.find('title').text(),
            desc: el.find('desc').text(),
            buttons: JSON.stringify(buttons)
          }
          elements.push(element_obj)
        })
        output_json.push({
          type: 'carrousel',
          elements: elements
        })
      } else if(el.is(soruceData)) {
        output_json.push({
          type: `${el.attr('type')}`,
          data: `${el.attr('src')}`
        })
      } else if(el.is('[type=location]')) {
        const lat = el.find('lat')[0].children[0].data
        const long = el.find('long')[0].children[0].data
        output_json.push({
          type: `${el.attr('type')}`,
          latitude: lat,
          longitude: long
        })
      }
      let keyboard = ''
      if(el.find('button').length > 0 && !el.is('[type=carrousel]')) {
        let buttons = [] as Object[]
        el.find('button')
          .map((k, b) => {
            let e = html(b)
            buttons.push({
              type: e.attr('type'),
              title: e.text(),
              url: e.attr('url'),
              payload: e.attr('payload'),
              href: e.attr('href')
            })
          })
        output_json[output_json.length-1]['buttons'] = JSON.stringify(buttons)
      }
      if(el.find('reply').length > 0) {
        let replies = [] as Object[]
        el.find('reply')
          .map((i, e) => {
            let q = html(e)
            replies.push({
              label: q.text(),
              payload: q.attr('payload')
            })
        })
        let tmp = {
          keyboard: JSON.stringify(replies)
        }
        output_json[output_json.length-1]['keyboard'] = JSON.stringify(replies)
      }
    })
    .get()
  return {context, route, output_json}
}
