import { flow, pipe } from 'fp-ts/function'

import { bcDl, getActions, ordStringLength } from '../../src/features/bcDl'
import { getMetadata, getTags } from '../../src/features/common'
import { Album } from '../../src/models/Album'
import { AlbumMetadata } from '../../src/models/AlbumMetadata'
import { Dir, File, FileOrDir } from '../../src/models/FileOrDir'
import { Genre } from '../../src/models/Genre'
import { Url } from '../../src/models/Url'
import { WriteTagsAction } from '../../src/models/WriteTagsAction'
import { Either, Future, List, NonEmptyArray, Tuple } from '../../src/utils/fp'
import { FsUtils } from '../../src/utils/FsUtils'
import { TagsUtils } from '../../src/utils/TagsUtils'
import { cleanMusicDir, execYoutubeDlMocked, httpGetBufferMocked, httpGetMocked } from './helpers'

const musicDir = pipe(Dir.of(__dirname), Dir.joinDir('..', 'music', 'welcome-to-speed-castle'))
const mp3Dir = pipe(
  Dir.of(__dirname),
  Dir.joinDir('..', 'resources', 'mp3', 'welcome-to-speed-castle'),
)

const imageBuffer = Buffer.from('Image Buffer', 'utf-8')

describe('getMetadata - track', () => {
  it('should get metadata', () =>
    pipe(
      getMetadata(httpGetMocked)(
        Genre.wrap('Electro'),
        Url.wrap('https://snakesofrussia.bandcamp.com/track/welcome-to-speed-castle'),
      ),
      Future.map(result => {
        const expected: AlbumMetadata = {
          artist: 'Inlustris',
          album: Album.wrap('Stella Splendens'),
          year: 2020,
          genre: Genre.wrap('Dungeon Synth'),
          isEp: false,
          tracks: [
            { number: 1, title: 'Ave Gloriosa' },
            { number: 2, title: 'Morena Me Llaman' },
            { number: 3, title: 'Ecco La Primavera' },
            { number: 4, title: 'Gaudens In Domino' },
            { number: 5, title: 'Como Somos Per Consello CSM 119' },
            { number: 6, title: 'Santa Maria, Strela Do Dia CSM 100' },
            { number: 7, title: 'Stella Splendens' },
          ],
          coverUrl: Url.wrap('https://f4.bcbits.com/img/a3172027603_16.jpg'),
        }
        expect(result).toStrictEqual(expected)
      }),
      Future.runUnsafe,
    ))
})

// describe('getActions', () => {
//   const testGetActions = (metadata: AlbumMetadata, mp3Files: NonEmptyArray<File>) => (
//     // eslint-disable-next-line functional/no-return-void
//     f: (result: Either<Error, NonEmptyArray<WriteTagsAction>>) => void,
//   ): Promise<void> =>
//     pipe(
//       getActions(mp3Files, Dir.of(''), metadata, imageBuffer),
//       Future.map(Either.right),
//       Future.recover<Either<Error, NonEmptyArray<WriteTagsAction>>>(
//         flow(Either.left, Future.right),
//       ),
//       Future.map(f),
//       Future.runUnsafe,
//     )

//   /**
//    * Artist's name and album's name are the same
//    */
//   const blackSabb: AlbumMetadata = {
//     artist: 'Black Sabbath',
//     album: Album.wrap('Black Sabbath'),
//     isEp: false,
//     year: 1970,
//     genre: Genre.wrap('Heavy Metal'),
//     tracks: [
//       { number: 1, title: 'Black Sabbath' },
//       { number: 2, title: 'The Wizard' },
//       { number: 3, title: 'Behind the Wall of Sleep' },
//       { number: 4, title: 'N.I.B.' },
//       { number: 5, title: 'The Wizard II' },
//     ],
//     coverUrl: Url.wrap('https://www.metal-archives.com/images/4/8/2/482.jpg?5008'),
//   }

//   it('should for files having only track title', () =>
//     testGetActions(blackSabb, [
//       File.fromPath('black sabbath (1).mp3'),
//       File.fromPath('the wizard (2).mp3'),
//       File.fromPath('the wizard ii (5).mp3'),
//     ])(result => {
//       expect(result).toStrictEqual(
//         Either.right<Error, NonEmptyArray<WriteTagsAction>>([
//           {
//             file: File.fromPath('black sabbath (1).mp3'),
//             newTags: getTags(blackSabb, imageBuffer, {
//               number: 1,
//               title: 'Black Sabbath',
//             }),
//             renameTo: File.fromPath('01 - Black Sabbath.mp3'),
//           },
//           {
//             file: File.fromPath('the wizard (2).mp3'),
//             newTags: getTags(blackSabb, imageBuffer, { number: 2, title: 'The Wizard' }),
//             renameTo: File.fromPath('02 - The Wizard.mp3'),
//           },
//           {
//             file: File.fromPath('the wizard ii (5).mp3'),
//             newTags: getTags(blackSabb, imageBuffer, { number: 5, title: 'The Wizard II' }),
//             renameTo: File.fromPath('05 - The Wizard II.mp3'),
//           },
//         ]),
//       )
//     }))

//   it('should for files having artist name and track title', () =>
//     testGetActions(blackSabb, [
//       File.fromPath('black sabbath - black sabbath (1).mp3'),
//       File.fromPath('black sabbath - the wizard (2).mp3'),
//       File.fromPath('black sabbath - the wizard ii (5).mp3'),
//     ])(result => {
//       expect(result).toStrictEqual(
//         Either.right<Error, NonEmptyArray<WriteTagsAction>>([
//           {
//             file: File.fromPath('black sabbath - black sabbath (1).mp3'),
//             newTags: getTags(blackSabb, imageBuffer, {
//               number: 1,
//               title: 'Black Sabbath',
//             }),
//             renameTo: File.fromPath('01 - Black Sabbath.mp3'),
//           },
//           {
//             file: File.fromPath('black sabbath - the wizard (2).mp3'),
//             newTags: getTags(blackSabb, imageBuffer, { number: 2, title: 'The Wizard' }),
//             renameTo: File.fromPath('02 - The Wizard.mp3'),
//           },
//           {
//             file: File.fromPath('black sabbath - the wizard ii (5).mp3'),
//             newTags: getTags(blackSabb, imageBuffer, { number: 5, title: 'The Wizard II' }),
//             renameTo: File.fromPath('05 - The Wizard II.mp3'),
//           },
//         ]),
//       )
//     }))

//   it('should for files having album name and track title', () =>
//     testGetActions(blackSabb, [
//       File.fromPath('black sabbath - black sabbath (1).mp3'),
//       File.fromPath('black sabbath - the wizard (2).mp3'),
//       File.fromPath('black sabbath - the wizard ii (5).mp3'),
//     ])(result => {
//       expect(result).toStrictEqual(
//         Either.right<Error, NonEmptyArray<WriteTagsAction>>([
//           {
//             file: File.fromPath('black sabbath - black sabbath (1).mp3'),
//             newTags: getTags(blackSabb, imageBuffer, {
//               number: 1,
//               title: 'Black Sabbath',
//             }),
//             renameTo: File.fromPath('01 - Black Sabbath.mp3'),
//           },
//           {
//             file: File.fromPath('black sabbath - the wizard (2).mp3'),
//             newTags: getTags(blackSabb, imageBuffer, { number: 2, title: 'The Wizard' }),
//             renameTo: File.fromPath('02 - The Wizard.mp3'),
//           },
//           {
//             file: File.fromPath('black sabbath - the wizard ii (5).mp3'),
//             newTags: getTags(blackSabb, imageBuffer, { number: 5, title: 'The Wizard II' }),
//             renameTo: File.fromPath('05 - The Wizard II.mp3'),
//           },
//         ]),
//       )
//     }))

//   it('should for files having artist name, album name and track title', () =>
//     testGetActions(blackSabb, [
//       File.fromPath('black sabbath - black sabbath - black sabbath (1).mp3'),
//       File.fromPath('black sabbath - black sabbath - the wizard (2).mp3'),
//       File.fromPath('black sabbath - black sabbath - the wizard ii (5).mp3'),
//     ])(result => {
//       expect(result).toStrictEqual(
//         Either.right<Error, NonEmptyArray<WriteTagsAction>>([
//           {
//             file: File.fromPath('black sabbath - black sabbath - black sabbath (1).mp3'),
//             newTags: getTags(blackSabb, imageBuffer, {
//               number: 1,
//               title: 'Black Sabbath',
//             }),
//             renameTo: File.fromPath('01 - Black Sabbath.mp3'),
//           },
//           {
//             file: File.fromPath('black sabbath - black sabbath - the wizard (2).mp3'),
//             newTags: getTags(blackSabb, imageBuffer, { number: 2, title: 'The Wizard' }),
//             renameTo: File.fromPath('02 - The Wizard.mp3'),
//           },
//           {
//             file: File.fromPath('black sabbath - black sabbath - the wizard ii (5).mp3'),
//             newTags: getTags(blackSabb, imageBuffer, { number: 5, title: 'The Wizard II' }),
//             renameTo: File.fromPath('05 - The Wizard II.mp3'),
//           },
//         ]),
//       )
//     }))

//   /**
//    * Artist's name includes album's name
//    */
//   const artistIncludesAlbum: AlbumMetadata = {
//     artist: 'Muezli II',
//     album: Album.wrap('Muezli'),
//     isEp: false,
//     year: 1970,
//     genre: Genre.wrap('Heavy Metal'),
//     tracks: [
//       { number: 1, title: 'Black Sabbath' },
//       { number: 2, title: 'Muezli' },
//       { number: 3, title: 'Muezli V' },
//       { number: 4, title: 'Muezli II' },
//     ],
//     coverUrl: Url.wrap('https://www.metal-archives.com/images/4/8/2/482.jpg?5008'),
//   }

//   it('should for files having artist name, album name and track title (artistIncludesAlbum)', () =>
//     testGetActions(artistIncludesAlbum, [
//       File.fromPath('muezli ii - muezli - black sabbath (1).mp3'),
//       File.fromPath('muezli ii - muezli - muezli (2).mp3'),
//       File.fromPath('muezli ii - muezli - muezli v (3).mp3'),
//       File.fromPath('muezli ii - muezli - muezli ii (4).mp3'),
//     ])(result => {
//       expect(result).toStrictEqual(
//         Either.right<Error, NonEmptyArray<WriteTagsAction>>([
//           {
//             file: File.fromPath('muezli ii - muezli - black sabbath (1).mp3'),
//             newTags: getTags(artistIncludesAlbum, imageBuffer, {
//               number: 1,
//               title: 'Black Sabbath',
//             }),
//             renameTo: File.fromPath('01 - Black Sabbath.mp3'),
//           },
//           {
//             file: File.fromPath('muezli ii - muezli - muezli (2).mp3'),
//             newTags: getTags(artistIncludesAlbum, imageBuffer, { number: 2, title: 'Muezli' }),
//             renameTo: File.fromPath('02 - Muezli.mp3'),
//           },
//           {
//             file: File.fromPath('muezli ii - muezli - muezli v (3).mp3'),
//             newTags: getTags(artistIncludesAlbum, imageBuffer, { number: 3, title: 'Muezli V' }),
//             renameTo: File.fromPath('03 - Muezli V.mp3'),
//           },
//           {
//             file: File.fromPath('muezli ii - muezli - muezli ii (4).mp3'),
//             newTags: getTags(artistIncludesAlbum, imageBuffer, { number: 4, title: 'Muezli II' }),
//             renameTo: File.fromPath('04 - Muezli II.mp3'),
//           },
//         ]),
//       )
//     }))

//   /**
//    * Album's name includes artist's name
//    */
//   const albumIncludesArtist: AlbumMetadata = {
//     artist: 'Muezli',
//     album: Album.wrap('Muezli II'),
//     isEp: false,
//     year: 1970,
//     genre: Genre.wrap('Heavy Metal'),
//     tracks: [
//       { number: 1, title: 'Black Sabbath' },
//       { number: 2, title: 'Muezli' },
//       { number: 3, title: 'Muezli V' },
//       { number: 4, title: 'Muezli II' },
//     ],
//     coverUrl: Url.wrap('https://www.metal-archives.com/images/4/8/2/482.jpg?5008'),
//   }

//   it('should for files having artist name, album name and track title (albumIncludesArtist)', () =>
//     testGetActions(albumIncludesArtist, [
//       File.fromPath('muezli - muezli ii - black sabbath (1).mp3'),
//       File.fromPath('muezli - muezli ii - muezli (2).mp3'),
//       File.fromPath('muezli - muezli ii - muezli v (3).mp3'), // TODO
//       File.fromPath('muezli - muezli ii - muezli ii (4).mp3'), // TODO
//     ])(result => {
//       expect(result).toStrictEqual(
//         Either.right<Error, NonEmptyArray<WriteTagsAction>>([
//           {
//             file: File.fromPath('muezli - muezli ii - black sabbath (1).mp3'),
//             newTags: getTags(albumIncludesArtist, imageBuffer, {
//               number: 1,
//               title: 'Black Sabbath',
//             }),
//             renameTo: File.fromPath('01 - Black Sabbath.mp3'),
//           },
//           {
//             file: File.fromPath('muezli - muezli ii - muezli (2).mp3'),
//             newTags: getTags(albumIncludesArtist, imageBuffer, { number: 2, title: 'Muezli' }),
//             renameTo: File.fromPath('02 - Muezli.mp3'),
//           },
//           {
//             file: File.fromPath('muezli - muezli ii - muezli v (3).mp3'),
//             newTags: getTags(albumIncludesArtist, imageBuffer, { number: 3, title: 'Muezli V' }),
//             renameTo: File.fromPath('03 - Muezli V.mp3'),
//           },
//           {
//             file: File.fromPath('muezli - muezli ii - muezli ii (4).mp3'),
//             newTags: getTags(albumIncludesArtist, imageBuffer, { number: 4, title: 'Muezli II' }),
//             renameTo: File.fromPath('04 - Muezli II.mp3'),
//           },
//         ]),
//       )
//     }))

//   /**
//    * Artist's name and album's name are different
//    */
//   const albumArtistDifferent: AlbumMetadata = {
//     artist: 'Artist',
//     album: Album.wrap('Album'),
//     isEp: false,
//     year: 1970,
//     genre: Genre.wrap('Heavy Metal'),
//     tracks: [
//       { number: 1, title: 'Track' },
//       { number: 2, title: 'Album' },
//       { number: 3, title: 'Artist' },
//     ],
//     coverUrl: Url.wrap('https://www.metal-archives.com/images/4/8/2/482.jpg?5008'),
//   }

//   it('should for files having artist name, album name and track title (albumArtistDifferent)', () =>
//     testGetActions(albumArtistDifferent, [
//       File.fromPath('artist - album - track (1).mp3'),
//       File.fromPath('artist - album - album (2).mp3'),
//       File.fromPath('artist - album - artist (3).mp3'),
//     ])(result => {
//       expect(result).toStrictEqual(
//         Either.right<Error, NonEmptyArray<WriteTagsAction>>([
//           {
//             file: File.fromPath('artist - album - track (1).mp3'),
//             newTags: getTags(albumArtistDifferent, imageBuffer, { number: 1, title: 'Track' }),
//             renameTo: File.fromPath('01 - Track.mp3'),
//           },
//           {
//             file: File.fromPath('artist - album - album (2).mp3'),
//             newTags: getTags(albumArtistDifferent, imageBuffer, { number: 2, title: 'Album' }),
//             renameTo: File.fromPath('02 - Album.mp3'),
//           },
//           {
//             file: File.fromPath('artist - album - artist (3).mp3'),
//             newTags: getTags(albumArtistDifferent, imageBuffer, { number: 3, title: 'Artist' }),
//             renameTo: File.fromPath('03 - Artist.mp3'),
//           },
//         ]),
//       )
//     }))
// })

// describe('ordStringLength', () => {
//   it('should sort', () => {
//     const expected = ['looooong', '012', 'abc']

//     expect(pipe(['012', 'looooong', 'abc'], List.sort(ordStringLength))).toStrictEqual(expected)
//     expect(pipe(['abc', 'looooong', '012'], List.sort(ordStringLength))).toStrictEqual(expected)
//   })
// })

// describe('e2e', () => {
//   beforeEach(() => pipe(cleanMusicDir(musicDir), Future.runUnsafe))
//   afterEach(() => pipe(cleanMusicDir(musicDir), Future.runUnsafe))

//   it('should e2e', () =>
//     pipe(
//       bcDl(
//         ['test/music', 'Dungeon Synth', 'https://inlustris.bandcamp.com/album/stella-splendens'],
//         httpGetMocked,
//         httpGetBufferMocked,
//         execYoutubeDlMocked(mp3Dir),
//       ),
//       Future.chain(() => {
//         const albumDir = pipe(musicDir, Dir.joinDir('Inlustris', '[2020] Stella Splendens'))
//         return pipe(
//           FsUtils.readdir(albumDir),
//           Future.chain(
//             flow(
//               List.map(f => {
//                 expect(FileOrDir.isFile(f)).toStrictEqual(true)

//                 const file = f as File
//                 return pipe(
//                   TagsUtils.read(file),
//                   // eslint-disable-next-line @typescript-eslint/no-unused-vars
//                   Future.map(({ raw, ...tags }) => Tuple.of(file.basename, tags)),
//                 )
//               }),
//               Future.sequenceArray,
//             ),
//           ),
//         )
//       }),
//       Future.map(result => {
//         expect(result).toStrictEqual([
//           [
//             '01 - Ave Gloriosa.mp3',
//             {
//               album: 'Stella Splendens',
//               artist: 'Inlustris',
//               genre: 'Dungeon Synth',
//               image: {
//                 description: undefined,
//                 imageBuffer,
//                 mime: 'jpeg',
//                 type: { id: 3, name: 'front cover' },
//               },
//               performerInfo: 'Inlustris',
//               title: 'Ave Gloriosa',
//               trackNumber: '1',
//               year: '2020',
//             },
//           ],
//           [
//             '02 - Morena Me Llaman.mp3',
//             {
//               album: 'Stella Splendens',
//               artist: 'Inlustris',
//               genre: 'Dungeon Synth',
//               image: {
//                 description: undefined,
//                 imageBuffer,
//                 mime: 'jpeg',
//                 type: { id: 3, name: 'front cover' },
//               },
//               performerInfo: 'Inlustris',
//               title: 'Morena Me Llaman',
//               trackNumber: '2',
//               year: '2020',
//             },
//           ],
//           [
//             '03 - Ecco La Primavera.mp3',
//             {
//               album: 'Stella Splendens',
//               artist: 'Inlustris',
//               genre: 'Dungeon Synth',
//               image: {
//                 description: undefined,
//                 imageBuffer,
//                 mime: 'jpeg',
//                 type: { id: 3, name: 'front cover' },
//               },
//               performerInfo: 'Inlustris',
//               title: 'Ecco La Primavera',
//               trackNumber: '3',
//               year: '2020',
//             },
//           ],
//           [
//             '04 - Gaudens In Domino.mp3',
//             {
//               album: 'Stella Splendens',
//               artist: 'Inlustris',
//               genre: 'Dungeon Synth',
//               image: {
//                 description: undefined,
//                 imageBuffer,
//                 mime: 'jpeg',
//                 type: { id: 3, name: 'front cover' },
//               },
//               performerInfo: 'Inlustris',
//               title: 'Gaudens In Domino',
//               trackNumber: '4',
//               year: '2020',
//             },
//           ],
//           [
//             '05 - Como Somos Per Consello CSM 119.mp3',
//             {
//               album: 'Stella Splendens',
//               artist: 'Inlustris',
//               genre: 'Dungeon Synth',
//               image: {
//                 description: undefined,
//                 imageBuffer,
//                 mime: 'jpeg',
//                 type: { id: 3, name: 'front cover' },
//               },
//               performerInfo: 'Inlustris',
//               title: 'Como Somos Per Consello CSM 119',
//               trackNumber: '5',
//               year: '2020',
//             },
//           ],
//           [
//             '06 - Santa Maria, Strela Do Dia CSM 100.mp3',
//             {
//               album: 'Stella Splendens',
//               artist: 'Inlustris',
//               genre: 'Dungeon Synth',
//               image: {
//                 description: undefined,
//                 imageBuffer,
//                 mime: 'jpeg',
//                 type: { id: 3, name: 'front cover' },
//               },
//               performerInfo: 'Inlustris',
//               title: 'Santa Maria, Strela Do Dia CSM 100',
//               trackNumber: '6',
//               year: '2020',
//             },
//           ],
//           [
//             '07 - Stella Splendens.mp3',
//             {
//               album: 'Stella Splendens',
//               artist: 'Inlustris',
//               genre: 'Dungeon Synth',
//               image: {
//                 description: undefined,
//                 imageBuffer,
//                 mime: 'jpeg',
//                 type: { id: 3, name: 'front cover' },
//               },
//               performerInfo: 'Inlustris',
//               title: 'Stella Splendens',
//               trackNumber: '7',
//               year: '2020',
//             },
//           ],
//         ])
//       }),
//       Future.runUnsafe,
//     ))
// })
