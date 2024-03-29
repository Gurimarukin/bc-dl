import { pipe } from 'fp-ts/function'

import { Dir } from './models/FileOrDir'

export const config = {
  genresTxt: pipe(Dir.of(__dirname), Dir.joinFile('..', 'genres.txt')),
  mp3Extension: '.mp3',
  epRegex: [
    /\(\s*EP\s*\)/g,
    /\[\s*EP\s*\]/g,
    /\sE\s*\.?\s*P\s*\./g,
    /^EP\s*\./g,
    /EP\s*[:-]/g,
    /[:-]\s*EP/g,
    /\sEP$/g,
    /^EP\s/g,
    /\sEP\s/g,
  ],
  yearRegex: /\D(\d{4})/,
  jpgExtension: ['.jpg', '.jpeg'],
  colors: {
    error: '31;1',
    warn: '33',
    // url: '90',
    url: '36',
  },
}
