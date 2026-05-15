import { defineConfig } from 'prisma'

export default defineConfig({
  earlyAccess: true,
  datasource: {
    url: process.env.DATABASE_URL
  }
})
