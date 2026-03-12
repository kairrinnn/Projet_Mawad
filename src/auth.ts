import NextAuth, { DefaultSession } from "next-auth";
import authConfig from "./auth.config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"]
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (!user?.email || !user?.id) return true;
      
      try {
        const { prisma } = await import("@/lib/prisma");
        await prisma.user.upsert({
          where: { id: user.id },
          update: {
            name: user.name,
            email: user.email,
            image: user.image,
          },
          create: {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          },
        });
      } catch (error) {
        console.error("Error syncing user to database:", error);
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
});
