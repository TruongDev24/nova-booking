# 🏸 NOVA Booking — Hệ Thống Quản Lý Đặt Sân Cầu Lông Cao Cấp

> **Giải pháp quản trị sân thể thao toàn diện**: Đặt sân thời gian thực, giữ chỗ thông minh bằng Redis, thanh toán tự động qua PayOS và báo cáo thống kê chuyên sâu.

NOVA Booking là nền tảng Full-stack được thiết kế chuẩn Production dành cho chủ sân và người chơi. Hệ thống kết hợp khả năng đồng bộ trạng thái tức thời, cơ chế chống đặt trùng slot (Double-booking) mạnh mẽ, và quy trình xử lý hoàn tiền minh bạch.

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-TypeScript-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-App%20Router-000000?style=for-the-badge&logo=next.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Locking%20%26%20Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)

---

## 📌 Mục Lục

- [1. Tính Năng Nổi Bật](#1-tính-năng-nổi-bật)
- [2. Công Nghệ Sử Dụng](#2-công-nghệ-sử-dụng)
- [3. Kiến Trúc Hệ Thống](#3-kiến-trúc-hệ-thống)
- [4. Quy Trình Đặt Sân & Thanh Toán](#4-quy-trình-đặt-sân--thanh-toán)
- [5. Cấu Trúc Thư Mục](#5-cấu-trúc-thư-mục)
- [6. Yêu Cầu Hệ Thống (Prerequisites)](#6-yêu-cầu-hệ-thống-prerequisites)
- [7. Biến Môi Trường (Environment Variables)](#7-biến-môi-trường-environment-variables)
- [8. Hướng Dẫn Cài Đặt (Installation & Getting Started)](#8-hướng-dẫn-cài-đặt-installation--getting-started)
- [9. Tài Khoản Thử Nghiệm (Test Accounts)](#9-tài-khoản-thử-nghiệm-test-accounts)
- [10. Triển Khai Production (Render/Vercel)](#10-triển-khai-production-rendervercel)
- [11. API Documentation](#11-api-documentation)

---

## 🌟 1. Tính Năng Nổi Bật

### ⚡ Thời Gian Thực (Real-time)
- Sử dụng **Socket.io** để đồng bộ hóa trạng thái sân ngay lập tức trên mọi thiết bị.
- Khi một slot được chọn, khóa tạm thời hoặc hủy bỏ, tất cả khách hàng khác sẽ thấy thay đổi ngay mà không cần tải lại trang.

### 🔒 Chống Đặt Trùng Với Redis Lock
- Cơ chế **Atomic Lock** 10 phút: Khi khách hàng bắt đầu thanh toán, slot sẽ được khóa trên Redis để ngăn người khác xen ngang.
- Tự động giải phóng khóa nếu khách hàng hủy thanh toán hoặc quá 10 phút không hoàn tất.

### 💸 Thanh Toán & Hoàn Tiền Tự Động
- Tích hợp cổng **PayOS** (VietQR): Quét mã trả tiền, hệ thống xác nhận đơn ngay lập tức qua Webhook.
- Quy trình **Hoàn tiền thông minh**: Hỗ trợ Admin duyệt hoàn tiền cho các đơn bị hủy do bảo trì hoặc lý do bất khả kháng.

### 📊 Báo Cáo Thống Kê Chuyên Sâu
- Dashboard dành cho Admin với các chỉ số: Doanh thu, Tỷ lệ lấp đầy, **Tỷ lệ hủy thực tế** (chỉ tính trên các đơn đã trả tiền), VIP Customers và Khung giờ vàng.

### 🛠 Quản Trị Sân Toàn Diện
- CRUD sân vận động: Hình ảnh (Cloudinary), tiện ích, bảng giá theo giờ.
- **Tính năng bảo trì**: Khóa sân và tự động hủy + thông báo email cho khách hàng đã đặt trong khung giờ đó.

---

## 💻 2. Công Nghệ Sử Dụng

| Thành phần | Công nghệ chính |
|------------|-----------------|
| **Frontend** | Next.js 15 (App Router), Tailwind CSS, TanStack Query, Socket.io Client |
| **Backend** | NestJS, TypeScript, Prisma ORM, BullMQ (Queue) |
| **Dữ liệu** | PostgreSQL (Supabase), Redis (Upstash) |
| **Dịch vụ ngoài** | PayOS (Thanh toán), Cloudinary (Ảnh), Brevo/Gmail (Email Marketing) |
| **DevOps** | Docker Compose, GitHub Actions (CI/CD) |

---

## 🏗 3. Kiến Trúc Hệ Thống

NOVA Booking được xây dựng theo mô hình hướng dịch vụ (Service-oriented), tách biệt rõ ràng giữa logic nghiệp vụ và hạ tầng:

```mermaid
graph TD
    User((Khách hàng)) -->|Next.js| FE[Frontend Vercel]
    FE -->|API / Socket| BE[Backend Render]
    BE -->|Prisma| DB[(PostgreSQL Supabase)]
    BE -->|Locking| RD[(Redis Upstash)]
    BE -->|Webhook| POS[Cổng PayOS]
    BE -->|Email| BRV[Brevo SMTP]
```

---

## 🔄 4. Quy Trình Đặt Sân & Thanh Toán

1. **Chọn Slot**: Khách hàng chọn sân và khung giờ. Hệ thống check DB và Redis để đảm bảo slot còn trống.
2. **Khóa Tạm**: Khi bấm "Đặt sân", Backend tạo một khóa tạm trên Redis (10p) và sinh link thanh toán PayOS.
3. **Thanh Toán**: Khách hàng quét mã QR.
4. **Xác Nhận (Webhook)**: PayOS gửi tín hiệu về Backend -> Backend thực hiện **Prisma Transaction** để tạo đơn hàng + bản ghi thanh toán một cách nguyên tử.
5. **Hoàn Tất**: Giải phóng Redis lock và thông báo Real-time cho toàn hệ thống.

---

## 📂 5. Cấu Trúc Thư Mục

```text
NOVA_booking/
├── frontend/                 # Next.js - Client & Admin UI
│   ├── src/app/              # Routes & Pages
│   ├── src/components/       # UI Components (shadcn)
│   └── src/services/         # API & Socket logic
├── nova-booking-backend/     # NestJS - Server logic
│   ├── src/booking/          # Core logic đặt sân
│   ├── src/payment/          # Xử lý PayOS Webhook
│   └── prisma/               # Schema & Migrations
└── docker-compose.yml        # Chạy Local (DB & Redis)
```

---

## ⚙️ 6. Yêu Cầu Hệ Thống (Prerequisites)

Để chạy dự án này trên máy tính cá nhân, bạn cần cài đặt các công cụ sau:
- **Node.js**: Phiên bản `v20.x` trở lên.
- **Docker & Docker Compose**: Để khởi chạy PostgreSQL và Redis nội bộ.
- **Git**: Quản lý phiên bản và clone mã nguồn.

---

## 🔐 7. Biến Môi Trường (Environment Variables)

Bạn cần thiết lập file `.env` cho cả Frontend và Backend. Dưới đây là các cấu hình ví dụ.

### Backend (`nova-booking-backend/.env`)

```env
# Môi trường chạy
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Cơ sở dữ liệu (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/nova_booking?schema=public"

# Redis (Cache & Lock)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secrets (Xác thực)
JWT_SECRET="super-secret-access-token-key"
JWT_REFRESH_SECRET="super-secret-refresh-token-key"

# Cấu hình Email (SMTP - Brevo/Gmail)
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_smtp_password
MAIL_FROM="NOVA Booking <noreply@novabooking.com>"

# Tích hợp PayOS (Thanh toán VietQR)
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key

# Tích hợp Cloudinary (Upload ảnh)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend (`frontend/.env.local`)

```env
# Địa chỉ API của Backend (Socket & HTTP)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 🚀 8. Hướng Dẫn Cài Đặt (Installation & Getting Started)

Hãy làm theo từng bước chi tiết dưới đây để khởi chạy dự án tại môi trường Local.

### Bước 1: Clone mã nguồn
Mở terminal và clone dự án về máy:
```bash
git clone https://github.com/TruongDev24/nova-booking.git
cd nova-booking
```

### Bước 2: Khởi động Hạ tầng (Database & Redis)
Khởi chạy PostgreSQL và Redis bằng Docker Compose ở thư mục gốc:
```bash
docker-compose up -d
```
*Lưu ý: Đảm bảo Docker Desktop của bạn đang chạy trước khi gõ lệnh này.*

### Bước 3: Cài đặt và khởi chạy Backend
Mở một terminal mới, di chuyển vào thư mục Backend:
```bash
cd nova-booking-backend

# Cài đặt các gói phụ thuộc
npm install

# (Tuỳ chọn) Tạo file .env nếu chưa có
cp .env.example .env

# Cập nhật schema vào Database và chạy migrations
npx prisma migrate dev

# Chạy server ở chế độ phát triển (Watch mode)
npm run start:dev
```
Backend sẽ khởi chạy tại: `http://localhost:3001`

### Bước 4: Cài đặt và khởi chạy Frontend
Mở thêm một terminal mới, di chuyển vào thư mục Frontend:
```bash
cd frontend

# Cài đặt các gói phụ thuộc
npm install

# (Tuỳ chọn) Tạo file .env.local nếu chưa có
cp .env.local.example .env.local

# Chạy Next.js ở chế độ phát triển
npm run dev
```
Frontend sẽ khởi chạy tại: `http://localhost:3000`

---

## 🔑 9. Tài Khoản Thử Nghiệm (Test Accounts)

Sau khi khởi chạy dự án, bạn có thể sử dụng các tài khoản có sẵn dưới đây để test (hoặc sử dụng file seed nếu có):

- **Tài khoản Admin (Chủ sân):**
  - Email: `admin@example.com`
  - Password: `password123`

- **Tài khoản User (Khách hàng):**
  - Email: `user@example.com`
  - Password: `password123`

---

## 🌍 10. Triển Khai Production (Render/Vercel)

### Cấu hình Backend (Render)
- **Database**: Sử dụng Supabase PostgreSQL (Nhớ thêm `?pgbouncer=true` vào URL).
- **Redis**: Sử dụng Upstash (Bắt buộc dùng giao thức `rediss://` để hỗ trợ TLS).
- **Environment**: Thiết lập đầy đủ các biến môi trường trên Render.

### Cấu hình Frontend (Vercel)
- Trỏ `NEXT_PUBLIC_API_URL` về địa chỉ Backend đã deploy trên Render (ví dụ: `https://api.novabooking.com`).

---

## 📄 11. API Documentation

Backend cung cấp tài liệu API tự động qua Swagger. Truy cập Swagger UI tại địa chỉ:
👉 `http://localhost:3001/api` (hoặc URL production của bạn).

---
*Phát triển bởi đội ngũ NOVA Booking - 2026.*
