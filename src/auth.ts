import NextAuth, { DefaultSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import authConfig from "./auth.config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"]
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (!user?.email || !user?.id) return true;
      
      try {
        const { prisma } = await import("@/lib/prisma");
        const normalizedEmail = user.email.toLowerCase().trim();
        
        const dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              { id: user.id },
              { email: { equals: normalizedEmail, mode: 'insensitive' } }
            ]
          }
        });

        if (dbUser) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              name: user.name,
              email: normalizedEmail,
              image: user.image,
            },
          });
        } else {
          await prisma.user.create({
            data: {
              id: user.id,
              name: user.name,
              email: normalizedEmail,
              image: user.image,
              role: "MANAGER" 
            },
          });
        }
      } catch (error) {
        console.error("Error syncing user to database in signIn callback:", error);
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role as string || "MANAGER";
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        try {
          const { prisma } = await import("@/lib/prisma");
          const normalizedEmail = user.email?.toLowerCase().trim();
          
          const orConditions: Prisma.UserWhereInput[] = [{ id: user.id }];
          if (normalizedEmail) {
            orConditions.push({ email: { equals: normalizedEmail, mode: 'insensitive' } });
          }
          
          const dbUser = await prisma.user.findFirst({
            where: { OR: orConditions }
          });
          
          token.sub = dbUser ? dbUser.id : user.id;
          token.role = dbUser ? dbUser.role : "MANAGER";
        } catch (error) {
          console.error("Error in JWT callback user sync:", error);
          token.sub = user.id;
          token.role = "MANAGER";
        }
      } else if (token.sub && !token.role) {
          try {
            const { prisma } = await import("@/lib/prisma");
            const dbUser = await prisma.user.findUnique({ where: { id: token.sub as string } });
            token.role = dbUser?.role || "MANAGER";
          } catch (e) {
            token.role = "MANAGER";
          }
      }
      return token;
    },
  },
});
