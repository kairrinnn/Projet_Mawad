import "dotenv/config";
import { defineConfig } from "prisma/config";

function withRequiredSsl(url?: string) {
  if (!url) {
    return url;
  }

  if (url.includes("sslmode=")) {
    return url;
  }

  return `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: withRequiredSsl(process.env["DIRECT_URL"] || process.env["DATABASE_URL"]),
  },
});
