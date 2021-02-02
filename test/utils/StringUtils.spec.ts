import { StringUtils } from '../../src/utils/StringUtils'

describe('StringUtils.cleanFileName', () => {
  it('should clean', () => {
    expect(StringUtils.cleanFileName('?f<i>l:e" n/a\\m|e*.ext')).toStrictEqual('file name.ext')
  })
})
