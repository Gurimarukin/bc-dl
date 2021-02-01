import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { pipe } from 'fp-ts/function'

import { Future } from './fp'

export namespace AxiosUtils {
  export const request = (config: AxiosRequestConfig): Future<AxiosResponse<unknown>> =>
    Future.tryCatch(() => axios.request<unknown>(config))

  export namespace Document {
    export const get = (
      url: string,
      config: Omit<AxiosRequestConfig, 'method' | 'url' | 'responseType'> = {},
    ): Future<AxiosResponse<string>> =>
      pipe(
        request({ ...config, method: 'get', url, responseType: 'document' }),
        Future.chain(response =>
          typeof response.data !== 'string'
            ? Future.left(Error('Weird response from axios'))
            : Future.right({ ...response, data: response.data }),
        ),
      )
  }

  // eslint-disable-next-line no-shadow
  export namespace ArrayBuffer {
    export const get = (
      url: string,
      config: Omit<AxiosRequestConfig, 'method' | 'url' | 'responseType'> = {},
    ): Future<AxiosResponse<Buffer>> =>
      pipe(
        request({ ...config, method: 'get', url, responseType: 'arraybuffer' }),
        Future.chain(response =>
          !(response.data instanceof Buffer)
            ? Future.left(Error('Weird response from axios'))
            : Future.right({ ...response, data: response.data }),
        ),
      )
  }
}
