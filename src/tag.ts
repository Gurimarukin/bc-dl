import { tagFiles } from './features/tagFiles'
import { KyUtils } from './utils/KyUtils'
import { runMain } from './utils/runMain'

// eslint-disable-next-line functional/no-expression-statements
runMain(argv => tagFiles(argv, KyUtils.Document.get, KyUtils.Buffer_.get))
