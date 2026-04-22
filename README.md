# NOVA-booking - Hệ Thống Đặt Sân Thể Thao Đa Nền Tảng (Professional Badminton Court Booking System)

![NodeJS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)

Chào mừng bạn đến với **NOVA-booking**, nền tảng đặt sân thể thao bảo mật cao cấp (được thiết kế mô phỏng mô hình doanh nghiệp kinh doanh Sân Cầu Lông). Ứng dụng cung cấp trọn vẹn một quy trình luồng vận hành từ Khách Hàng, Đặt Sân, Thanh Toán, đến Hệ thống quản lý toàn diện dành cho Quản trị viên.

---

## 🛠 Ngăn Xếp Công Nghệ (Tech Stack)

### Backend (Lõi Hệ Thống)
- **Framework**: [NestJS](https://nestjs.com/) (Kiến trúc Module chặt chẽ, tối ưu tính mở rộng với Node.js)
- **Database & ORM**: PostgreSQL & [Prisma](https://www.prisma.io/) (Type-safe Queries)
- **Security**: JWT Authentication, Custom Guards, xác thực DTO linh hoạt, mật khẩu băm mã hoá `bcrypt`.

### Frontend (Giao Diện Khách Hàng)
- **Framework**: [Next.js 14/15](https://nextjs.org/) (Sử dụng App Router hiện đại triệt để)
- **Giao diện**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Ngôn ngữ**: TypeScript 100%.

### Infrastructure (Kiến Trúc Hạ Tầng)
- **Kiến trúc**: Full-stack Monorepo.
- **Docker**: Triển khai đóng gói qua Multi-stage Docker Builds và Docker Compose. Mọi Container hoạt động biệt lập tại mác mạng ảo `nova-network`.

---

## 🗄️ Kiến Trúc Cơ Sở Dữ Liệu (Database Architecture)

Cơ sở dữ liệu của chúng tôi được thiết kế nâng cao, giám sát gắt gao quá trình đồng bộ luồng Book sân và Thanh toán để tránh sai sót doanh thu:

### Các Thực Thể Chính Lõi (Core Models)
- **User (Tài khoản)**: Quản lý khách hàng và phân quyền bảo mật qua Enums `ADMIN`, `USER`, hoặc `COURT_MANAGER`. Lưu trữ lịch sử `Booking`, `Payment`, và `Review`.
- **Court (Sân thi đấu)**: Chứa thông tin vật lý khu vực sân, Giờ mở cửa/Đóng cửa (`openingTime`, `closingTime`), đặc quyền tiện nghi (`amenities`) thông qua mảng mảng String Arrays chuẩn PostgreSQL và Cờ đánh dấu vô hiệu hóa (Soft-delete). 
- **Booking (Đơn Đặt Sân - Cốt lõi)**: Kết liên kết quan hệ tỷ lệ (`1-N`) giữa `User` và `Court`. Chứa khung thời gian (`startTime`, `endTime`), tổng chi phí, theo dõi luồng giao dịch `BookingStatus` (`PENDING`, `CONFIRMED`, `CANCELLED`). Thiết lập **Compound Index** `@@index([startTime, endTime])` chống chịu tra cứu cắt ca/trùng lặp giờ lịch cao điểm trên hệ thống.
- **Payment (Giao Dịch Hóa Đơn)**: Nối kết `1-1` cực nghiêm ngặt với `Booking`. Ghi chú chính xác lưu lượng tiền nạp vô ứng dụng thông qua biên lai giao dịch, trạng thái phân đoạn `UNPAID`, `PARTIAL_PAID`, `PAID` qua các cổng chuyển biến `CASH`, `E_WALLET`,...
- **Review (Đánh Giá)**: Các điểm số, comment được ghi qua mối nối `Court` và `User`.

Cấu trúc DB này chặn đứt nguy cơ sai hỏng dữ liệu khi lượng lớn Traffic xả bộ máy query check khoảng hở giờ chơi trống tại các sân thể thao.

---

## 📁 Tổ Chức Thư Mục (Project Structure)

Dự án cấu trúc theo Monorepo để dễ dàng liên kết dữ liệu giữa các luồng:

```text
NOVA_booking/                  # Mạng lưới dự án chính
├── docker-compose.yml         # Trung tâm khởi tạo Data và Containers đồng nhất
├── nova-booking-backend/      # Tầng Server-API (NestJS Application)
│   ├── Dockerfile             # Multi-stage image build (Giảm dụng lượng tải Production)
│   ├── .env                   # Tham số môi trường DB nội bộ JWT
│   ├── prisma/                
│   │   └── schema.prisma      # Hồ sơ định chế CSDL DB
│   └── src/                   # Tập con Code xử lý (App Module, Prisma Module, Auth Module, Court CRUD...)
└── frontend/                  # Tầng Client-UI (Next.js Application)
    ├── Dockerfile             # Standalone production container build
    ├── src/app/               # Hệ sinh thái Pages / Routing
    ├── public/                # Tài nguyên Media
    └── next.config.ts         # Setting lõi Output Build
```

---

## 🔧 Yêu Cầu Cài Đặt (Prerequisites)

Hãy chắc chắn máy tính hoặc máy chủ của bạn đã có:
- **Node.js**: Phiên bản 18+ (Dành cho việc dev riêng lẻ ngoài Docker).
- **Docker & Docker Compose**: Thiết lập Hạ Tầng.
- **Git**

---

## 🚀 Hướng Dẫn Bắt Đầu (Getting Started)

Nếu không muốn chạy qua Docker Compose All-in-One sẵn có, bạn có thể triển khai hệ thống nội bộ thông qua các luồng cơ bản sau:

### 1. Khởi chạy Database
Kích hoạt máy chủ PostgreSQL thông qua Docker bằng một lệnh duy nhất ở thư mục gốc:
```bash
docker-compose up db -d
```
Cơ sở dữ liệu lúc này sẽ lắng nghe tại cổng `5435/5432` tuỳ map volume của bạn.

### 2. Thiết lập Backend (API Lõi)
Trỏ cấu trúc Prisma Sync lên Postgres DB thực tế của bạn:
```bash
cd nova-booking-backend
npm install
npx prisma migrate dev --name init
```
Chạy Server API:
```bash
npm run start:dev
```
*(Backend Server mở ở đường truyền TCP `http://localhost:3001`)*

### 3. Thiết lập Frontend
Triển khai khởi dựng Next.js ở cổng mặc định `3000`:
```bash
cd frontend
npm install
npm run dev
```

---

## 🔐 Tham Số Môi Trường (`.env`)

Phía bên trong thư mục Backend (`nova-booking-backend`), bạn bắt buộc sở hữu file `.env` theo chuẩn mẫu dưới đây:

```env
# Chuỗi kết nối trực tiếp đến PostgreSQL Docker Host (Nếu run Native: sửa `db:5432` về `localhost:5432`/`5435`)
DATABASE_URL="postgresql://root:rootpassword@localhost:5432/nova_booking_db?schema=public"

# Chìa khóa riêng tư cung cấp bảo mật HMAC khi Backend ký Tokens.
JWT_SECRET="super-secret-key-for-jwt"
```

Tương tự tại `frontend`, hãy chắc chắn bạn cắm biến URL Backend vào file `.env` nếu có file custom fetch URL:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---
*NOVA-booking được định hướng kiến trúc hóa chuyên nghiệp. Mọi vấn đề lỗi xung đột hoặc đóng góp Pull-request đều được chào đón!*
