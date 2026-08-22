import type { Category } from '@/domain/types'

/** 카테고리별 대표 색(HEX). Tailwind 동적 클래스 대신 inline style로 사용. */
export const CATEGORY_COLOR: Record<Category, string> = {
  vacuum: '#2fd4b6',
  mop: '#7fd44e',
  toilet: '#4cb8f5',
  theme: '#ff7fb0',
  recycle: '#f6b93b',
  outside: '#ff7a66',
  maintenance: '#a78bfa',
  etc: '#9aa6a2',
}
