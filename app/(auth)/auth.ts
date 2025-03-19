import { compare } from 'bcrypt-ts';
import NextAuth, { type User, type Session } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { supabaseAdmin } from '@/lib/supabase';

import { getUser, initializeUserSubscription } from '@/lib/db/queries';

import { authConfig } from './auth.config';

interface ExtendedSession extends Session {
  user: User;
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        const users = await getUser(email);
        if (users.length === 0) return null;
        // biome-ignore lint: Forbidden non-null assertion.
        const passwordsMatch = await compare(password, users[0].password!);
        if (!passwordsMatch) return null;
        return users[0] as any;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Only handle Google sign-ins here
      if (account?.provider === 'google') {
        try {
          // Check if user exists in Supabase
          const { data: existingUser } = await supabaseAdmin
            .from('User')
            .select()
            .eq('email', user.email!)
            .single();
          
          // If user doesn't exist, create a new user
          if (!existingUser) {
            const { data: newUser, error } = await supabaseAdmin.from('User').insert({
              email: user.email!,
              // No password for OAuth users
            }).select().single();
            
            if (error) {
              console.error('Error creating user:', error);
              return false;
            }
            
            // Initialize subscription and balance for new user
            if (newUser) {
              try {
                await initializeUserSubscription(newUser.id);
              } catch (error) {
                console.error('Error initializing subscription:', error);
                // Continue even if this fails, as the user is created
              }
            }
          }
          
          return true;
        } catch (error) {
          console.error('Error during sign in:', error);
          return false;
        }
      }
      
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        
        // If it's a Google sign-in, get or create the user in Supabase
        if (account?.provider === 'google') {
          try {
            // Get user from Supabase by email
            const { data: supabaseUser } = await supabaseAdmin
              .from('User')
              .select()
              .eq('email', user.email!)
              .single();
            
            if (supabaseUser) {
              token.id = supabaseUser.id;
              
              // Check if user has a subscription, if not initialize one
              const { data: subscription } = await supabaseAdmin
                .from('subscriptions')
                .select()
                .eq('user_id', supabaseUser.id)
                .single();
              
              if (!subscription) {
                try {
                  await initializeUserSubscription(supabaseUser.id);
                } catch (error) {
                  console.error('Error initializing subscription:', error);
                  // Continue even if this fails
                }
              }
            }
          } catch (error) {
            console.error('Error getting user from Supabase:', error);
          }
        }
      }

      return token;
    },
    async session({
      session,
      token,
    }: {
      session: ExtendedSession;
      token: any;
    }) {
      if (session.user) {
        session.user.id = token.id as string;
      }

      return session;
    },
  },
});
