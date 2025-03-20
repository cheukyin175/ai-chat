export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      User: {
        Row: {
          id: string
          email: string
          password: string | null
          createdAt: string
        }
        Insert: {
          id?: string
          email: string
          password?: string | null
          createdAt?: string
        }
        Update: {
          id?: string
          email?: string
          password?: string | null
          createdAt?: string
        }
        Relationships: []
      }
      Chat: {
        Row: {
          id: string
          userId: string
          title: string
          visibility: 'public' | 'private'
          createdAt: string
        }
        Insert: {
          id: string
          userId: string
          title: string
          visibility?: 'public' | 'private'
          createdAt?: string
        }
        Update: {
          id?: string
          userId?: string
          title?: string
          visibility?: 'public' | 'private'
          createdAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Chat_userId_User_id_fk"
            columns: ["userId"]
            referencedRelation: "User"
            referencedColumns: ["id"]
          }
        ]
      }
      Message: {
        Row: {
          id: string
          chatId: string
          role: string
          content: string
          createdAt: string
          has_reasoning: boolean
        }
        Insert: {
          id?: string
          chatId: string
          role: string
          content: string
          createdAt?: string
          has_reasoning?: boolean
        }
        Update: {
          id?: string
          chatId?: string
          role?: string
          content?: string
          createdAt?: string
          has_reasoning?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "Message_chatId_Chat_id_fk"
            columns: ["chatId"]
            referencedRelation: "Chat"
            referencedColumns: ["id"]
          }
        ]
      }
      ReasoningChain: {
        Row: {
          id: string
          messageId: string
          step_number: number
          reasoning: string
          createdAt: string
        }
        Insert: {
          id?: string
          messageId: string
          step_number: number
          reasoning: string
          createdAt?: string
        }
        Update: {
          id?: string
          messageId?: string
          step_number?: number
          reasoning?: string
          createdAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "ReasoningChain_messageId_Message_id_fk"
            columns: ["messageId"]
            referencedRelation: "Message"
            referencedColumns: ["id"]
          }
        ]
      }
      Vote: {
        Row: {
          chatId: string
          messageId: string
          isUpvoted: boolean
        }
        Insert: {
          chatId: string
          messageId: string
          isUpvoted: boolean
        }
        Update: {
          chatId?: string
          messageId?: string
          isUpvoted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "Vote_chatId_Chat_id_fk"
            columns: ["chatId"]
            referencedRelation: "Chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Vote_messageId_Message_id_fk"
            columns: ["messageId"]
            referencedRelation: "Message"
            referencedColumns: ["id"]
          }
        ]
      }
      Document: {
        // ... rest of the existing tables
      }
      Suggestion: {
        // ... rest of the existing tables
      }
      subscriptions: {
        // ... rest of the existing tables
      }
      user_balance: {
        // ... rest of the existing tables
      }
      usage: {
        // ... rest of the existing tables
      }
      daily_usage: {
        // ... rest of the existing tables
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
} 