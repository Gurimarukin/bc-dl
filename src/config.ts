import { pipe } from 'fp-ts/function'

import { Dir } from './models/FileOrDir'

export const config = {
  genresTxt: pipe(Dir.of(__dirname), Dir.joinFile('..', 'genres.txt')),
  mp3Extension: '.mp3',
  epStrings: ['EP', 'E.P', 'E. P'],
  jpgExtension: ['.jpg', '.jpeg'],
}
