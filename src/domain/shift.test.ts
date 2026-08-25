import { describe, it, expect } from 'vitest'
import { guessRole, scopesForRole, isCollabScope, isDueOn } from './shift'

describe('guessRole', () => {
  it('시간 경계로 근무형태를 추정한다', () => {
    expect(guessRole(0)).toBe('open')
    expect(guessRole(13)).toBe('open')
    expect(guessRole(14)).toBe('middle')
    expect(guessRole(17)).toBe('middle')
    expect(guessRole(18)).toBe('close')
    expect(guessRole(22)).toBe('close')
  })
})

describe('scopesForRole', () => {
  it('open → open, open_middle, all', () => {
    expect(scopesForRole('open').sort()).toEqual(['all', 'open', 'open_middle'])
  })
  it('middle → middle, open_middle, middle_close, all', () => {
    expect(scopesForRole('middle').sort()).toEqual([
      'all',
      'middle',
      'middle_close',
      'open_middle',
    ])
  })
  it('close → close, middle_close, all', () => {
    expect(scopesForRole('close').sort()).toEqual(['all', 'close', 'middle_close'])
  })
})

describe('isCollabScope', () => {
  it('협업 스코프만 true', () => {
    expect(isCollabScope('all')).toBe(true)
    expect(isCollabScope('open_middle')).toBe(true)
    expect(isCollabScope('middle_close')).toBe(true)
    expect(isCollabScope('open')).toBe(false)
    expect(isCollabScope('middle')).toBe(false)
    expect(isCollabScope('close')).toBe(false)
  })
})

describe('isDueOn', () => {
  it('always는 항상', () => {
    expect([1, 2, 3, 4, 5].every((w) => isDueOn('always', w))).toBe(true)
  })
  it('biweekly는 짝수주(2·4)만', () => {
    expect(isDueOn('biweekly', 1)).toBe(false)
    expect(isDueOn('biweekly', 2)).toBe(true)
    expect(isDueOn('biweekly', 3)).toBe(false)
    expect(isDueOn('biweekly', 4)).toBe(true)
  })
  it('monthly_first는 1주만', () => {
    expect(isDueOn('monthly_first', 1)).toBe(true)
    expect(isDueOn('monthly_first', 2)).toBe(false)
    expect(isDueOn('monthly_first', 4)).toBe(false)
  })
})
