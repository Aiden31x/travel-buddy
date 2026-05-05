import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      // Request the user:email scope so private GitHub emails are also returned.
      // Without this, users with a private primary email on GitHub get no email
      // back, causing sign-in to fail silently.
      authorization: {
        params: { scope: "read:user user:email" },
      },
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  // Do NOT set session.strategy: "jwt" when using PrismaAdapter.
  // The adapter manages sessions via the database (default "database" strategy).
  callbacks: {
    async session({ session, user }) {
      if (session.user && user?.id) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};
