import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { pipe } from 'fp-ts/function'

import { Future } from './fp'

export const axiosRequest = (config: AxiosRequestConfig): Future<AxiosResponse<unknown>> =>
  Future.tryCatch(() => axios.request<unknown>(config))

export namespace AxiosUtils {
  export namespace Document {
    export const get = (
      url: string,
      config: Omit<AxiosRequestConfig, 'method' | 'url' | 'responseType'> = {},
    ): Future<AxiosResponse<string>> =>
      pipe(
        axiosRequest({ ...config, method: 'get', url, responseType: 'document' }),
        Future.chain(response =>
          typeof response.data !== 'string'
            ? Future.left(Error('Weird response from axios'))
            : Future.right({ ...response, data: response.data }),
        ),
      )
  }
}
