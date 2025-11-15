import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email || !user.name) {
        return false;
      }

      try {
        // Use service role key to bypass RLS for user creation
        const supabase = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          }
        );

        // Check if user exists
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", user.email)
          .single();

        if (!existingUser) {
          // Create new user
          await supabase.from("users").insert({
            email: user.email,
            name: user.name,
            avatar_url: user.image,
            google_id: account?.providerAccountId || "",
          });
        } else {
          // Update existing user
          await supabase
            .from("users")
            .update({
              name: user.name,
              avatar_url: user.image,
            })
            .eq("email", user.email);
        }

        return true;
      } catch (error) {
        console.error("Error during sign in:", error);
        return false;
      }
    },
    async session({ session, token }) {
      // Get user ID from JWT token (set in jwt callback)
      if (token.userId && session.user) {
        session.user.id = token.userId as string;
      }

      return session;
    },
    async jwt({ token, user, account }) {
      // Store user ID in token on first sign in
      if (user?.email) {
        // Use service role key to bypass RLS
        const supabase = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          }
        );
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("email", user.email)
          .single();

        if (userData) {
          token.userId = userData.id;
        }
      }

      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
});
