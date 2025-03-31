import { tagFiles } from './features/tagFiles'
import { AxiosUtils } from './utils/AxiosUtils'
import { runMain } from './utils/runMain'

// eslint-disable-next-line functional/no-expression-statements
runMain(argv => tagFiles(argv, AxiosUtils.Document.get, AxiosUtils.ArrayBuffer.get))
