import { apply } from 'fp-ts'
import { flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'

import { config } from '../../config'
import { DOMUtils } from '../../utils/DOMUtils'
import { Either, Maybe, NonEmptyArray, Tuple } from '../../utils/fp'
import { numberFromString } from '../../utils/ioTsTypes'
import { StringUtils } from '../../utils/StringUtils'
import { Album } from '../Album'
import { Genre } from '../Genre'
import { Url } from '../Url'
import { Validation } from '../Validation'
import { AlbumMetadata } from './AlbumMetadata'
import { lift } from './lift'
import { Track } from './Track'

export const fromAlbumDocument = (genre: Genre) => (
  document: DOMUtils.Document,
): Either<NonEmptyArray<string>, AlbumMetadata> =>
  pipe(
    apply.sequenceT(Validation.validation)(
      lift('artist')(DOMUtils.parseText(document, '#name-section a')),
      parseAlbum(document),
      parseYear(document),
      parseTracks(document),
      parseCoverUrl(document),
    ),
    Either.map(([artist, [album, isEp], year, tracks, coverUrl]) => ({
      artist,
      album,
      isEp,
      year,
      genre,
      tracks,
      coverUrl,
    })),
  )

const parseAlbum = (document: DOMUtils.Document): Validation<Tuple<Album, boolean>> => {
  const album = pipe(DOMUtils.parseText(document, '#name-section > h2.trackTitle'), lift('album'))
  const isEp = pipe(
    album,
    Either.fold(() => false, StringUtils.matches(config.epRegex)),
  )
  return pipe(
    album,
    Either.map(
      flow(Album.wrap, a => [
        isEp
          ? pipe(
              Album.withoutEp(a),
              Album.modify(_ => StringUtils.cleanWhitespaces(_).trim()),
            )
          : a,
        isEp,
      ]),
    ),
  )
}

const parseYear = (document: DOMUtils.Document): Validation<number> =>
  pipe(
    DOMUtils.parseText(document, '#trackInfoInner .tralbumData.tralbum-credits'),
    Either.chain(str =>
      pipe(
        str,
        StringUtils.matcher1(config.yearRegex),
        Maybe.chain(flow(numberFromString.decode, Maybe.fromEither)),
        Either.fromOption(() => `Could't find year in string: "${str}"`),
      ),
    ),
    lift('year'),
  )

const parseTracks = (document: DOMUtils.Document): Validation<NonEmptyArray<Track>> => {
  const name: keyof AlbumMetadata = 'tracks'
  const selector = '#track_table tr.track_row_view.linked'
  return pipe(
    [...document.querySelectorAll(selector)],
    NonEmptyArray.fromArray,
    Either.fromOption(() =>
      NonEmptyArray.of(`Failed to decode ${name}: No element matches selector: ${selector}`),
    ),
    Either.chain(
      NonEmptyArray.traverseWithIndex(Validation.applicativeValidation)(parseTrack(name)),
    ),
  )
}

const parseTrack = (name: keyof AlbumMetadata) => (
  i: number,
  tr: DOMUtils.Element,
): Validation<Track> =>
  pipe(
    apply.sequenceS(Validation.validation)({
      number: lift(`${name}[${i}].number`)(
        pipe(
          DOMUtils.parseText(tr, 'td.track-number-col div.track_number'),
          Either.chain(str =>
            pipe(str.slice(0, -1), numberFromString.decode, Either.mapLeft(D.draw)),
          ),
        ),
      ),
      title: lift(`${name}[${i}].title`)(DOMUtils.parseText(tr, 'td.title-col span.track-title')),
    }),
  )

const parseCoverUrl = (document: DOMUtils.Document): Validation<Url> =>
  pipe(
    document,
    DOMUtils.querySelectorEnsureOne('#tralbumArt img', DOMUtils.HTMLImageElement),
    Either.map(e => e.src),
    Either.filterOrElse(isJpg, src => `Expected cover to be a jpg: ${src}`),
    Either.map(Url.wrap),
    lift('coverUrl'),
  )

const isJpg = (src: string): boolean => {
  const srcLower = src.toLowerCase()
  return config.jpgExtension.some(ext => srcLower.endsWith(ext))
}
