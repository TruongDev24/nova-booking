# NOVA Booking

> **Premium Sports Court Management System** for real-time court reservations, secure checkout, automated payment fulfillment, and smart refund operations.

NOVA Booking is a production-ready full-stack platform built for sports court owners and players. It combines real-time availability synchronization, Redis-based anti-double-booking locks, PayOS payment automation, and an admin-first operations dashboard.

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-TypeScript-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-App%20Router-000000?style=for-the-badge&logo=next.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Locking%20%26%20Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)

---

## Table of Contents

- [1. Key Features](#1-key-features)
- [2. Tech Stack](#2-tech-stack)
- [3. Architecture Overview](#3-architecture-overview)
- [4. System Workflow](#4-system-workflow)
- [5. Project Structure](#5-project-structure)
- [6. Getting Started](#6-getting-started)
- [7. Environment Variables](#7-environment-variables)
- [8. API Documentation](#8-api-documentation)
- [9. Contributors](#9-contributors)
- [10. License](#10-license)

---

## 1. Key Features

- **Real-time Court Availability**
  - Socket.io keeps all active clients synchronized.
  - When a slot is locked, booked, released, or canceled, connected users immediately receive live updates.

- **Anti-Double Booking with Redis Locks**
  - Redis-powered 10-minute temporary slot lock during checkout.
  - Prevents multiple users from paying for the same court slot.
  - Uses all-or-nothing locking to avoid partial slot reservation.

- **Automated PayOS Payment Flow**
  - Secure PayOS checkout link generation.
  - Webhook verification for payment fulfillment.
  - Prisma `$transaction` ensures booking and payment records are created atomically.

- **Smart Cancellation & Refund Workflow**
  - Enforces a strict 12-hour cancellation rule.
  - Paid cancellations move into a refund-pending workflow.
  - Admin dashboard supports manual refund confirmation.

- **VietQR Refund Support**
  - Users can store refund bank details.
  - Admins can process refunds using bank information and VietQR-ready data.
  - Designed for fast, traceable manual refund operations.

- **Court Management Dashboard**
  - Court CRUD with images, amenities, pricing, opening hours, and soft delete/reactivation.
  - Future bookings are automatically canceled when a court is deactivated.

- **Review & Rating System**
  - Users can review only completed bookings.
  - Prevents duplicate reviews.
  - Maintains cached court rating fields for fast display.

- **Admin Analytics**
  - Revenue, occupancy rate, cancellation rate, peak hours, court performance, and VIP customers.

- **Production-Oriented Security**
  - JWT authentication.
  - Role-based authorization.
  - Strict DTO validation.
  - Server-side price calculation.
  - Redis anti-spam pending-order limits.

---

## 2. Tech Stack

### Frontend

- **Next.js App Router**
- **React**
- **TanStack React Query**
- **Tailwind CSS**
- **Socket.io Client**
- **Axios**
- **shadcn-style UI components**

### Backend

- **NestJS**
- **TypeScript**
- **Prisma ORM**
- **PostgreSQL**
- **Redis**
- **Socket.io WebSockets**
- **Swagger / OpenAPI**
- **JWT Authentication**
- **PayOS Payment Integration**
- **Cloudinary Image Upload**

### Infrastructure

- **Docker Compose**
- **PostgreSQL**
- **Redis**
- **Prisma Migrations**
- **Ngrok for local webhook testing**

---

## 3. Architecture Overview

NOVA Booking is designed around a clear separation of responsibilities:

```text
Client Browser
   |
   | Next.js App Router + React Query
   |
Frontend API Services
   |
   | REST API + WebSocket Events
   |
NestJS Backend
   |
   |-- Auth Module
   |-- Court Module
   |-- Booking Module
   |-- Payment Module
   |-- Review Module
   |-- Analytics Module
   |-- Notification Gateway
   |
   | Prisma ORM
   |
PostgreSQL
   |
Redis
   |
PayOS Gateway
```

Core design goals:

- Keep booking availability consistent in real time.
- Prevent double booking before payment is completed.
- Never trust client-side price calculation.
- Fulfill paid bookings only after verified PayOS webhook confirmation.
- Keep database writes atomic and recoverable.

---

## 4. System Workflow

### Cache-First Booking & PayOS Fulfillment Flow

```text
1. User selects court + date + time slots
2. Frontend sends booking request to NestJS API
3. Backend validates:
   - Court exists and is active
   - Date is today or future
   - Slots match HH:00 format
   - Max 4 slots per request
   - No duplicate slots
   - Slots are not past or outside opening hours
4. Backend recalculates price from database
5. Redis locks selected slots for 10 minutes
6. Backend creates temporary Redis order payload
7. PayOS checkout link is generated
8. User completes payment on PayOS
9. PayOS sends webhook to backend
10. Backend verifies webhook signature and payment amount
11. Prisma transaction creates:
    - Booking records
    - Payment records
12. Redis locks and temp order are cleared
13. Socket.io broadcasts real-time updates
```

### Why this flow matters

```text
Without Redis:
User A selects 18:00
User B selects 18:00
Both pay
Double booking happens

With Redis:
User A locks 18:00 for checkout
User B immediately sees 18:00 as pending/unavailable
Only one payment can fulfill the slot
```

---

## 5. Project Structure

```text
NOVA_booking/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   └── (main)/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   ├── package.json
│   └── next.config.ts
│
├── nova-booking-backend/
│   ├── src/
│   │   ├── analytics/
│   │   ├── auth/
│   │   ├── booking/
│   │   ├── cloudinary/
│   │   ├── common/
│   │   ├── court/
│   │   ├── notification/
│   │   ├── payment/
│   │   ├── prisma/
│   │   ├── redis/
│   │   ├── review/
│   │   └── users/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## 6. Getting Started

### Prerequisites

Make sure you have installed:

- **Node.js 20+**
- **npm**
- **Docker Desktop**
- **Ngrok** for PayOS webhook testing

### 1. Clone Repository

```bash
git clone https://github.com/TruongDev24/nova-booking.git
cd nova-booking
```

### 2. Install Dependencies

Backend:

```bash
cd nova-booking-backend
npm install
```

Frontend:

```bash
cd ../frontend
npm install
```

### 3. Configure Environment Files

Create backend environment file:

```bash
cd nova-booking-backend
cp .env.example .env
```

Create frontend environment file:

```bash
cd ../frontend
cp .env.example .env.local
```

Update values based on your local environment.

### 4. Start Infrastructure

From the project root:

```bash
docker-compose up -d
```

This starts PostgreSQL and Redis.

### 5. Run Prisma Migration

```bash
cd nova-booking-backend
npx prisma migrate dev
npx prisma generate
```

Optional Prisma Studio:

```bash
npx prisma studio
```

### 6. Run Backend

```bash
cd nova-booking-backend
npm run start:dev
```

Backend runs by default at:

```text
http://localhost:3001
```

### 7. Run Frontend

```bash
cd frontend
npm run dev
```

Frontend runs by default at:

```text
http://localhost:3000
```

### 8. Configure PayOS Webhook with Ngrok

Start Ngrok:

```bash
ngrok http 3001
```

Use the generated HTTPS URL as your PayOS webhook endpoint:

```text
https://your-ngrok-url.ngrok-free.app/payment/webhook
```

---

## 7. Environment Variables

### Backend `.env.example`

```env
# Application
PORT=3001
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://root:rootpassword@localhost:5435/nova_booking_db?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your_secure_jwt_secret
ADMIN_REGISTRATION_SECRET=your_admin_registration_secret

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Cloudinary
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# PayOS
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
PAYOS_CHECKSUM_KEY=your_payos_checksum_key
```

### Frontend `.env.local.example`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

---

## 8. API Documentation

The backend is designed to expose Swagger/OpenAPI documentation.

After starting the backend, visit:

```text
http://localhost:3001/api
```

or, depending on your Swagger setup:

```text
http://localhost:3001/docs
```

Main API groups:

- `Auth`
- `Courts`
- `Bookings`
- `Payments`
- `Reviews`
- `Analytics`
- `Users`
- `Notifications`

---


## 9. License

This project is licensed under the **MIT License**.

```text
MIT License

Copyright (c) 2026 NOVA Booking

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files, to deal in the Software
without restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.
```

---

## Final Note

NOVA Booking is more than a CRUD booking system. It demonstrates real production concerns: concurrency control, payment integrity, transactional fulfillment, real-time synchronization, refund operations, and secure role-based workflows.
