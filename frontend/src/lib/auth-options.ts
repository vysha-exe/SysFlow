import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { ensureUserSystem, upsertGoogleUser } from "@/lib/accounts";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/user";

const isGoogleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    ...(isGoogleConfigured
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        await connectToDatabase();
        const user = await UserModel.findOne({
          email: credentials.email.toLowerCase(),
        }).lean();

        if (!user?.passwordHash) return null;

        const isValid = await compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: String(user._id),
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;

      if (account?.provider === "google") {
        await upsertGoogleUser({
          email: user.email,
          name: user.name ?? "SysFlow User",
          image: user.image,
        });
      } else {
        await connectToDatabase();
        const existingUser = await UserModel.findOne({
          email: user.email.toLowerCase(),
        }).lean();
        if (existingUser) {
          await ensureUserSystem(
            String(existingUser._id),
            existingUser.name,
            existingUser.email,
          );
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        await connectToDatabase();
        const dbUser = await UserModel.findOne({
          email: user.email.toLowerCase(),
        }).lean();

        if (dbUser) {
          token.userId = String(dbUser._id);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
