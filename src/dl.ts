import { bcDl } from "./features/bcDl";
import { AxiosUtils } from "./utils/AxiosUtils";
import { execYoutubeDl } from "./utils/execCommand";
import { runMain } from "./utils/runMain";

// eslint-disable-next-line functional/no-expression-statements
runMain((argv) =>
  bcDl(argv, AxiosUtils.Document.get, AxiosUtils.ArrayBuffer.get, execYoutubeDl)
);
