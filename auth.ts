import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { normalizeEmail, verifyPassword } from "@/lib/password";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

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

        const { data: user } = await supabase
          .from("users")
          .select("id, email, name, avatar_url, password_hash")
          .eq("email", normalizeEmail(credentials.email as string))
          .single();

        if (!user?.password_hash) return null;

        const valid = await verifyPassword(
          credentials.password as string,
          user.password_hash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar_url,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For credentials provider, user already exists (verified in authorize)
      if (account?.provider === "credentials") {
        return true;
      }

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

        const email = normalizeEmail(user.email);
        const googleId = account?.providerAccountId;
        if (!googleId) return false;

        const { data: existingUser } = await supabase
          .from("users")
          .select("id, google_id")
          .eq("email", email)
          .maybeSingle();

        if (!existingUser) {
          const { error } = await supabase.from("users").insert({
            email,
            name: user.name,
            avatar_url: user.image,
            google_id: googleId,
          });
          if (error) throw error;
        } else {
          // First Google sign-in for an account created with a password: Google
          // has now proven ownership of the email, but the password was set
          // without verification and may belong to someone who pre-registered
          // this address. Drop it so only the verified owner keeps access.
          const linking = existingUser.google_id
            ? {}
            : { google_id: googleId, password_hash: null };

          const { error } = await supabase
            .from("users")
            .update({ name: user.name, avatar_url: user.image, ...linking })
            .eq("id", existingUser.id);
          if (error) throw error;
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
          .eq("email", normalizeEmail(user.email))
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
