export interface Survey {
  id: number
  title: string
  description: string
  status: 'active' | 'draft' | 'closed'
  date: string
}

export interface Question {
  id: number
  text: string
  type: 'radio' | 'scale' | 'text'
  options?: { value: number; label: string }[]
}

export interface Participant {
  id: number
  name: string
  role: string
  initial: string
  color: string
}
