import React from 'react'
import { Botonic } from 'botonic'

export default class extends Botonic.React.Component {

  render() {
    return (
        <message type="text">
            You chose Pizza! Choose one ingredient:
            <reply payload="sausage">Sausage</reply>
            <reply payload="bacon">Bacon</reply>
        </message>
    )
  }
}