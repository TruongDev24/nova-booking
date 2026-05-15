import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Dùng process.env trực tiếp để tránh lỗi crash khi chạy CI/Build mà thiếu biến môi trường
    url: process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy"
  }
})
