FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npx prisma generate

# Sửa deploy thành db push để tự động cập nhật DB khi sửa schema mà không dính lỗi cờ (flag)
CMD ["sh", "-c", "npx prisma db push && npm run start:dev"]