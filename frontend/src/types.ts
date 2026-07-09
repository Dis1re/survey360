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
}
