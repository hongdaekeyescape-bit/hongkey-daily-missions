import { describe, it, expect } from 'vitest'
import { guessRole, scopesForRole, isCollabScope } from './shift'

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
