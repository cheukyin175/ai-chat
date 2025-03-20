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
        Row: {
          id: string
          userId: string
          title: string
          kind: string
          content: string
          createdAt: string
        }
        Insert: {
          id: string
          userId: string
          title: string
          kind: string
          content: string
          createdAt?: string
        }
        Update: {
          id?: string
          userId?: string
          title?: string
          kind?: string
          content?: string
          createdAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Document_userId_User_id_fk"
            columns: ["userId"]
            referencedRelation: "User"
            referencedColumns: ["id"]
          }
        ]
      }
      Suggestion: {
        Row: {
          id: string
          documentId: string
          documentCreatedAt: string
          content: string
          createdAt: string
        }
        Insert: {
          id?: string
          documentId: string
          documentCreatedAt: string
          content: string
          createdAt?: string
        }
        Update: {
          id?: string
          documentId?: string
          documentCreatedAt?: string
          content?: string
          createdAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Suggestion_documentId_Document_id_fk"
            columns: ["documentId"]
            referencedRelation: "Document"
            referencedColumns: ["id"]
          }
        ]
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          price_id: string
          plan_type: string
          status: string
          current_period_start: string | null
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          price_id?: string
          plan_type?: string
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          price_id?: string
          plan_type?: string
          status?: string
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_User_id_fk"
            columns: ["user_id"]
            referencedRelation: "User"
            referencedColumns: ["id"]
          }
        ]
      }
      user_balance: {
        Row: {
          id: string
          user_id: string
          balance_usd: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance_usd?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance_usd?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_balance_user_id_User_id_fk"
            columns: ["user_id"]
            referencedRelation: "User"
            referencedColumns: ["id"]
          }
        ]
      }
      usage: {
        Row: {
          id: string
          user_id: string
          chat_id: string | null
          message_id: string | null
          tokens_used: number
          cost_usd: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          chat_id?: string | null
          message_id?: string | null
          tokens_used?: number
          cost_usd?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          chat_id?: string | null
          message_id?: string | null
          tokens_used?: number
          cost_usd?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_user_id_User_id_fk"
            columns: ["user_id"]
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_chat_id_Chat_id_fk"
            columns: ["chat_id"]
            referencedRelation: "Chat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_message_id_Message_id_fk"
            columns: ["message_id"]
            referencedRelation: "Message"
            referencedColumns: ["id"]
          }
        ]
      }
      daily_usage: {
        Row: {
          id: string
          user_id: string
          date: string
          requests_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date?: string
          requests_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          requests_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_usage_user_id_User_id_fk"
            columns: ["user_id"]
            referencedRelation: "User"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
} 