import { checkText } from './check-copy'

describe('checkText', () => {
  it('flags em dashes', () => {
    expect(checkText('Rest now — then water.')).toHaveLength(1)
  })

  it('flags banned words as whole words only', () => {
    expect(checkText('A robust tag.').map((f) => f.problem)).toEqual(['banned word "robust"'])
    expect(checkText('Robustness is fine here.')).toHaveLength(0)
  })

  it('passes plain sentences', () => {
    expect(checkText('Offer water and let it rest.')).toHaveLength(0)
  })
})
