import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { pipe } from "fp-ts/function";

import { Url } from "../models/Url";
import { Future } from "./fp";

type Config = Omit<AxiosRequestConfig, "url"> & {
  readonly url?: Url;
};

export namespace AxiosUtils {
  export const request = (config: Config): Future<AxiosResponse<unknown>> =>
    Future.tryCatch(() =>
      axios.request<unknown>({
        ...config,
        url: config.url === undefined ? undefined : Url.unwrap(config.url),
      })
    );

  export namespace Document {
    export const get = (
      url: Url,
      config: Omit<Config, "method" | "url" | "responseType"> = {}
    ): Future<AxiosResponse<string>> =>
      pipe(
        request({ ...config, method: "get", url, responseType: "document" }),
        Future.chain((response) =>
          typeof response.data !== "string"
            ? Future.left(Error("Weird response from axios"))
            : Future.right({ ...response, data: response.data })
        )
      );
  }

  export namespace ArrayBuffer {
    export const get = (
      url: Url,
      config: Omit<Config, "method" | "url" | "responseType"> = {}
    ): Future<AxiosResponse<Buffer>> =>
      pipe(
        request({ ...config, method: "get", url, responseType: "arraybuffer" }),
        Future.chain((response) =>
          !(response.data instanceof Buffer)
            ? Future.left(Error("Weird response from axios"))
            : Future.right({ ...response, data: response.data })
        )
      );
  }
}
