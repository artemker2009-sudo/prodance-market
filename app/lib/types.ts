export type ProductCategory = 'турнирная' | 'тренировочная'
export type ProductCondition = 'новое' | 'бу'
export type DanceProgram = 'стандарт' | 'латина'
export type ProductGender = 'М' | 'Ж' | 'Дети'

export interface Profile {
  id: string
  name: string
  phone: string | null
  telegram: string | null
  city: string | null
  created_at: string
}

export interface Product {
  id: string
  user_id: string
  title: string
  price: number
  description: string | null
  category: ProductCategory
  condition: ProductCondition
  program: DanceProgram
  gender: ProductGender
  federation: string | null
  image_url: string | null
  is_approved: boolean
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id: string
          name: string
          phone?: string | null
          telegram?: string | null
          city?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          telegram?: string | null
          city?: string | null
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: Product
        Insert: {
          id?: string
          user_id: string
          title: string
          price: number
          description?: string | null
          category: ProductCategory
          condition: ProductCondition
          program: DanceProgram
          gender: ProductGender
          federation?: string | null
          image_url?: string | null
          is_approved?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          price?: number
          description?: string | null
          category?: ProductCategory
          condition?: ProductCondition
          program?: DanceProgram
          gender?: ProductGender
          federation?: string | null
          image_url?: string | null
          is_approved?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
  }
}
