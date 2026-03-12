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
        const normalizedEmail = user.email.toLowerCase().trim();
        
        // On cherche par ID ou par Email (insensible à la casse)
        const dbUser = await prisma.user.findFirst({
          where: {
            OR: [
              { id: user.id },
              { email: { equals: normalizedEmail, mode: 'insensitive' } }
            ]
          }
        });

        if (dbUser) {
          // Si l'utilisateur existe déjà, on met à jour ses infos (sauf l'ID qui est immuable)
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              name: user.name,
              email: normalizedEmail,
              image: user.image,
            },
          });
          
          // Note: Si dbUser.id !== user.id, le JWT utilisera user.id de Google.
          // C'est potentiellement un souci si on s'attend à ce que l'ID soit celui de la DB.
          // Mais forcer l'ID de la DB ici est complexe.
        } else {
          // Création si vraiment aucun match
          await prisma.user.create({
            data: {
              id: user.id,
              name: user.name,
              email: normalizedEmail,
              image: user.image,
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
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        try {
          const { prisma } = await import("@/lib/prisma");
          const normalizedEmail = user.email?.toLowerCase().trim();
          
          const dbUser = await prisma.user.findFirst({
            where: {
              OR: [
                { id: user.id },
                normalizedEmail ? { email: { equals: normalizedEmail, mode: 'insensitive' } } : {}
              ].filter(Boolean) as any
            }
          });
          
          token.sub = dbUser ? dbUser.id : user.id;
        } catch (error) {
          console.error("Error in JWT callback user sync:", error);
          token.sub = user.id;
        }
      }
      return token;
    },
  },
});
