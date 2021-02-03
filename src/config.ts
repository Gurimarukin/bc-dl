import { pipe } from 'fp-ts/function'

import { Dir } from './models/FileOrDir'

export const config = {
  genresTxt: pipe(Dir.of(__dirname), Dir.joinFile('..', 'genres.txt')),
  mp3Extension: '.mp3',
  epRegex: /E\s*\.?\s*P\s*\.?/g,
  yearRegex: /\D(\d{4})/,
  jpgExtension: ['.jpg', '.jpeg'],
}
