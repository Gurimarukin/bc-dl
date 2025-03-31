import { bcDl } from './features/bcDl'
import { KyUtils } from './utils/KyUtils'
import { execYoutubeDl } from './utils/execCommand'
import { runMain } from './utils/runMain'

// eslint-disable-next-line functional/no-expression-statements
runMain(argv => bcDl(argv, KyUtils.Document.get, KyUtils.Buffer_.get, execYoutubeDl))
