import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "placeholder",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder",
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isApiRoute = nextUrl.pathname.startsWith("/api");
      const isLoginPage = nextUrl.pathname === "/login";

      if (isApiRoute) return true; // Les API gèrent leur propre auth ou sont protégées autrement

      if (!isLoggedIn && !isLoginPage) {
        return false; // Redirige vers login
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
