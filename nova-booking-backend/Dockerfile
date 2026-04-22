# Sử dụng Node.js bản nhẹ
FROM node:20-alpine

# Cài đặt OpenSSL cho Prisma
RUN apk add --no-cache openssl

# Chuyển thư mục làm việc
WORKDIR /app

# Copy file cấu hình thư viện
COPY package*.json ./
COPY prisma ./prisma/

# Cài đặt TOÀN BỘ thư viện (Bao gồm cả devDependencies để chạy start:dev)
RUN npm install

# Copy toàn bộ source code (bao gồm cả thư mục src)
COPY . .

# Sinh ra Prisma Client
RUN npx prisma generate

# Mở cổng
EXPOSE 3001

# Chạy chế độ Development (Hot-reload)
CMD ["npm", "run", "start:dev"]