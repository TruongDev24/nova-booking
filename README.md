# 🏸 Nova Booking - Court Management System

[![CI/CD Pipeline](https://img.shields.io/github/actions/workflow/status/TruongDev24/nova-booking/ci.yml?branch=main&style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/TruongDev24/nova-booking/actions)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

**Nova Booking** is a high-performance, full-stack platform designed to revolutionize how sports facilities manage their operations and how players book their favorite courts. Featuring a data-driven dashboard for owners and a seamless, real-time booking experience for customers, it ensures maximum efficiency and user satisfaction.

![Banner Image](https://via.placeholder.com/1200x400.png?text=Nova+Booking+-+Full-stack+Court+Management+System)

---

## 🌟 Key Features

### 👑 Admin / Owner Dashboard
*   **Advanced Analytics**: Real-time visualization of Revenue trends, Occupancy Rates, and Cancellation metrics.
*   **Peak Hours Heatmap**: Identify "Golden Hours" through dynamic bar charts to optimize court availability.
*   **VIP Customer Tracking**: Automated identification of high-value customers based on spending and booking volume.
*   **Court & Slot Control**: Full CRUD management for courts, amenities, and image galleries with a robust 24-hour slot generation system.

### 👤 Customer Experience
*   **Real-time Booking**: Interactive 24-hour time-slot grid with instant availability status (Booked, Past, Closed).
*   **Timezone-Aware Validation**: Strict backend enforcement of the **Asia/Ho_Chi_Minh** (UTC+7) timezone for all scheduling logic.
*   **Smart Conflict Prevention**: Atomic database transactions to ensure zero double-bookings or overlapping schedules.
*   **Booking History**: Personalized dashboard to track upcoming games and past performance.

---

## 💻 Tech Stack

### 🎨 Frontend
*   ![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB) **React 19**
*   ![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white) **Next.js 15 (App Router)**
*   ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white) **Tailwind CSS**
*   ![Recharts](https://img.shields.io/badge/Recharts-22b5bf?style=flat-square) **Recharts** (SVG Charts)

### ⚙️ Backend
*   ![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white) **NestJS**
*   ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white) **Prisma ORM**
*   ![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white) **Passport & JWT Authentication**
*   ![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=flat-square&logo=cloudinary&logoColor=white) **Cloudinary SDK** (Media Storage)

### 🗄️ Database
*   ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white) **PostgreSQL**

### 🛠️ DevOps & QA
*   ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white) **Docker Compose**
*   ![Jest](https://img.shields.io/badge/Jest-C21325?style=flat-square&logo=jest&logoColor=white) **Jest** (Unit Testing)
*   ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=github-actions&logoColor=white) **CI/CD Pipeline**

---

## 📸 Screenshots / Demo

![Dashboard UI](https://via.placeholder.com/800x450.png?text=Advanced+Analytics+Dashboard+Preview)
*The Admin Dashboard showcasing revenue charts, peak hours, and VIP customer tables.*

![Booking UI](https://via.placeholder.com/800x450.png?text=Real-time+Booking+Grid+Preview)
*The Customer Booking interface featuring the interactive 24-hour time-slot grid.*

---

## 🚀 Getting Started (Local Development)

### Prerequisites
*   **Node.js** (v18.x or v20.x)
*   **Docker Desktop** (for database and storage services)

### Installation
```bash
# Clone the repository
git clone https://github.com/TruongDev24/nova-booking.git
cd nova-booking

# Install Backend dependencies
cd nova-booking-backend
npm install

# Install Frontend dependencies
cd ../frontend
npm install
```

### Environment Variables
Create a `.env` file in `nova-booking-backend`:
```env
# Database connection
DATABASE_URL="postgresql://user:password@localhost:5432/nova_db?schema=public"

# Authentication
JWT_SECRET="generate_a_secure_long_secret_here"

# Cloudinary Storage
CLOUDINARY_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

### Run the App
```bash
# 1. Start the PostgreSQL database
docker-compose up -d

# 2. Synchronize database schema (Backend)
cd nova-booking-backend
npx prisma migrate dev

# 3. Start Backend server (runs on Port 3001)
npm run start:dev

# 4. Start Frontend server (runs on Port 3000)
cd ../frontend
npm run dev
```

---

## 🧪 Testing & CI/CD

### Automated Testing
We maintain high code reliability through automated test suites:
*   **Unit Tests**: Run `npm run test` in the backend to execute business logic validation (using Jest Mocking and FakeTimers).
*   **Linting**: Run `npm run lint` to ensure code style compliance across the workspace.

### CI/CD Pipeline
Our **GitHub Actions** pipeline automatically validates every push to the `main` branch:
1.  **Linting**: Verifies code standards.
2.  **Type-checking**: Runs `tsc` to ensure zero type errors.
3.  **Testing**: Executes the entire unit test suite.
4.  **Building**: Validates that both Next.js and NestJS build successfully for production.

---

## 📂 Folder Structure

```text
nova-booking/
├── frontend/                # Next.js Application
│   ├── src/
│   │   ├── app/             # App Router pages and layouts
│   │   ├── services/        # API communication layer (Axios)
│   │   ├── components/      # Reusable UI components (Recharts, etc.)
│   │   └── utils/           # Timezone and formatting helpers
│   └── public/              # Static assets
├── nova-booking-backend/    # NestJS API
│   ├── src/
│   │   ├── auth/            # JWT, Passport strategies, and Guards
│   │   ├── booking/         # Booking logic & 24h slot generation
│   │   ├── court/           # Court management and Cloudinary upload
│   │   ├── analytics/       # Data aggregation and stats logic
│   │   └── prisma/          # Prisma Service and Client
│   └── prisma/              # Schema definitions and migrations
└── docker-compose.yml       # Shared infrastructure (Postgres)
```

---

## ✍️ Author & License

*   **Author**: [TruongDev24](https://github.com/TruongDev24)
*   **License**: This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).

**Built with precision and passion for the sports community.**
