import * as React from "react"
import * as fs from 'fs'
import { join, resolve } from 'path'
import { default as i18n } from '../i18n'

export class Component extends React.Component {

  static async getInitialProps(args: any) {
    i18n.setLocale(args.req.context.__locale || 'en')
    let initProps = await this.botonicInit(args) || {}
    return {
      ...initProps,
      input: args.req.input,
      context: args.req.context,
      params: args.req.params
    }
  }

  static setLocale(req: any, locale: string) {
    req.context.__locale = locale
    i18n.setLocale(locale)
  }

  static async botonicInit(args: any) {
  }

  static async humanHandOff(req: any) {
    req.context['_botonic_action'] = 'create_case'
  }
}