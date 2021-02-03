import * as D from 'io-ts/Decoder'

import { StringUtils, s } from './StringUtils'

export const decodeError = (name: string) => (value: unknown) => (error: D.DecodeError): Error =>
  Error(
    StringUtils.stripMargins(
      s`Couldn't decode ${name}:
       |Error:
       |${D.draw(error)}
       |
       |Value: ${JSON.stringify(value)}`,
    ),
  )
