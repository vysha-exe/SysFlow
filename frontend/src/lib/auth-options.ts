import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { ensureUserSystem } from "@/lib/accounts";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/user";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
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
    async signIn({ user }) {
      if (!user.email) return false;

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

      return true;
    },
    async jwt({ token, user }) {
      // On sign-in, `user` is set; on later requests it is undefined but `token` persists.
      if (user) {
        if (user.email) {
          await connectToDatabase();
          const dbUser = await UserModel.findOne({
            email: user.email.toLowerCase(),
          }).lean();
          if (dbUser) {
            token.userId = String(dbUser._id);
          }
        }
        // Credentials (and some providers) set `user.id` — use it if DB lookup missed (race, etc.)
        if (!token.userId && user.id) {
          token.userId = String(user.id);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
        // Keep session label in sync with `users.name` (same value as system profile display name).
        try {
          await connectToDatabase();
          const dbUser = await UserModel.findById(token.userId as string)
            .select("name email")
            .lean();
          if (dbUser?.name?.trim()) {
            session.user.name = dbUser.name.trim();
          }
          if (dbUser?.email && !session.user.email) {
            session.user.email = dbUser.email;
          }
        } catch {
          // If Mongo is unavailable, keep name/email from the JWT.
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    signOut: "/signout",
  },
};
