import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { createAdminClient } from "@/server/db";
import { checkPasswordSignIn } from "@/server/password-sign-in";
import { consumeRateLimit, getClientIp } from "@/server/rate-limit";
import { findAccountByEmail, upsertGoogleAccount } from "@/server/users";

const WEB_SIGN_IN_IP_LIMIT = {
  scope: "web-signin:ip",
  limit: 20,
  windowSeconds: 15 * 60,
};

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
      async authorize(credentials, request) {
        const { email, password } = credentials ?? {};
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        // Same limits as the mobile sign-in (server/password-sign-in.ts).
        // NextAuth shows one generic error for any null, so a limited
        // attempt reads like a wrong password.
        const db = createAdminClient();
        if (
          !(await consumeRateLimit(
            db,
            WEB_SIGN_IN_IP_LIMIT,
            getClientIp(request.headers)
          ))
        ) {
          return null;
        }
        const result = await checkPasswordSignIn(db, email, password);
        if (result.kind !== "ok") return null;
        const { account } = result;

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
    async signIn({ user, account, profile }) {
      // Credentials users were already verified in authorize().
      if (account?.provider === "credentials") return true;

      const googleId = account?.providerAccountId;
      if (!user.email || !user.name || !googleId) return false;
      // Accounts are matched by email, so only trust one Google has verified
      // (the mobile sign-in checks the same, in google-id-token.ts).
      if (profile?.email_verified !== true) return false;

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
