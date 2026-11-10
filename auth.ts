import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { verifyPassword } from "@/lib/password";
import { createAdminClient } from "@/server/db";
import { findAccountByEmail, upsertGoogleAccount } from "@/server/users";

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
        const { email, password } = credentials ?? {};
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const account = await findAccountByEmail(createAdminClient(), email);
        if (!account?.passwordHash) return null;
        if (!(await verifyPassword(password, account.passwordHash))) {
          return null;
        }

        return {
          id: account.id,
          email: account.email,
          name: account.name,
          image: account.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Credentials users were already verified in authorize().
      if (account?.provider === "credentials") return true;

      const googleId = account?.providerAccountId;
      if (!user.email || !user.name || !googleId) return false;

      try {
        await upsertGoogleAccount(createAdminClient(), {
          email: user.email,
          name: user.name,
          image: user.image ?? null,
          googleId,
        });
        return true;
      } catch (error) {
        console.error("Error during sign in:", error);
        return false;
      }
    },
    async jwt({ token, user }) {
      // On first sign-in, store our user id in the token.
      if (user?.email) {
        const account = await findAccountByEmail(
          createAdminClient(),
          user.email
        );
        if (account) token.userId = account.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId && session.user) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
