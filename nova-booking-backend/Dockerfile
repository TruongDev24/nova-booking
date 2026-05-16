# Giai đoạn 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl curl
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

# Giai đoạn 2: Run
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl curl
# Chỉ copy những thứ cần thiết từ stage builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Thiết lập cổng và lệnh chạy
ENV NODE_ENV=production
EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
