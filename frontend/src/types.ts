export interface SimpleEntity {
  id: number
  name: string
  description: string
  type: string
}

export interface MySettings {
  value1: string
  value2: number
  value3: boolean
}

export interface LifecycleRow {
  controller: string
  view: string
}

export interface LifecycleDemo {
  transient: LifecycleRow
  scoped: LifecycleRow
  singleton: LifecycleRow
}

export type EntityInput = Omit<SimpleEntity, 'id'>
