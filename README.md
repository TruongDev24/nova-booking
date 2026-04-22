# NOVA-booking - Professional Badminton Court Booking System

![NodeJS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)

Welcome to **NOVA-booking**, an enterprise-grade, full-stack badminton court reservation platform designed for scalability, security, and an excellent user experience. 

---

## 🛠 Tech Stack

### Backend
- **Framework**: [NestJS](https://nestjs.com/) (Node.js framework for building efficient and scalable server-side applications)
- **Database ORM**: [Prisma](https://www.prisma.io/)
- **Security**: JWT Authentication, Custom Guards, bcrypt password hashing.

### Frontend
- **Framework**: [Next.js 14/15](https://nextjs.org/) (React Framework using App Router architecture)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Language**: TypeScript for maximum type safety across the stack.

### Infrastructure
- **Database**: PostgreSQL
- **Containerization**: Docker (via Docker Compose)

---

## ✨ Core Features

- 🔐 **Secure Authentication**: Utilizing payload-encrypted JWT alongside salted passwords (via `bcrypt`).
- 🏸 **Court Management**: Robust CRUD operations exclusively locked to `ADMIN` roles, utilizing strict Validation Pipes and soft-delete capabilities to prevent data loss.
- 🕒 **Booking Logic** *(In-progress)*: Comprehensive overlapping prevention systems and timestamp evaluations.
- 🧱 **Monorepo Architecture**: Clean separation of concerns between backend services and client interfaces.

---

## 📁 Project Structure

```text
NOVA_booking/
├── docker-compose.yml       # PostgreSQL database container orchestration
├── .gitignore               # Global ignores for Node & ENV footprints
├── backend/                 # NestJS Core Application API
│   ├── .env                 # Database credentials and JWT secrets
│   ├── prisma/
│   │   ├── schema.prisma    # Database Entity maps (User, Court, Booking)
│   │   └── migrations/      # Historic DB schema updates
│   └── src/                 # Application logical layers (Controllers, Services)
└── frontend/                # Next.js Presentation Layer
    ├── package.json         
    ├── public/              # Global static resources 
    └── src/app/             # Application UI and Server Components
```

---

## 🔧 Prerequisites

Before attempting to initialize the NOVA-booking service cluster, please ensure you have installed the following requirements on your computer:

- **[Node.js](https://nodejs.org/en)** (v18.x or newer)
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (Running actively)
- **[Git](https://git-scm.com/)**

---

## 🚀 Getting Started

Follow these step-by-step instructions to get a local development environment running seamlessly.

### Step 1: Clone the Repository
Pull the latest application code from the master branch:
```bash
git clone https://github.com/your-username/NOVA_booking.git
cd NOVA_booking
```

### Step 2: Infrastructure Setup
Spin up the physical postgres database container using Docker:
```bash
docker-compose up -d
```
*(Verify your Docker interface to ensure the `nova-postgres` container is healthy and actively running on port `5432`)*

### Step 3: Backend Setup
Bootstrap the NestJS API application and apply initial database table migrations:

```bash
cd backend
npm install
npx prisma migrate dev --name init
```

### Step 4: Frontend Setup
In a new terminal window at the root (`NOVA_booking`), bootstrap the Next.js React application:

```bash
cd frontend
npm install
```

### Step 5: Running the App

You are now ready to launch both servers concurrently. In their respective terminal contexts (`backend` and `frontend`), run:

**Start Backend Server (Port 3000):**
```bash
npm run start:dev
```

**Start Frontend Client (Port 3001):**
```bash
npm run dev
```

*(By default, NestJS handles HTTP traffic on `http://localhost:3000`, while Next.js spins up its UI layer on `http://localhost:3001` or `3000` depending on port availability).*

---

## 🔐 Environment Variables

You must maintain a specialized `.env` file within your `backend/` directory root. Use the exact following template config:

```env
# Ensure postgresql connection variables match your docker-compose mappings
DATABASE_URL="postgresql://root:rootpassword@localhost:5432/nova_booking_db?schema=public"

# The cryptographic validation key utilized by Passports strategy securely issuing JWTs.
JWT_SECRET="super-secret-key-for-jwt"
```

---

> Built with passion by the NOVA-booking core developer team. Reach out via repository issues if you encounter obstacles during local deployments!
