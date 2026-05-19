# Kiến Trúc Mã Nguồn (Codebase Architecture)

Dự án NOVA Booking là một hệ thống Full-stack sử dụng Next.js (App Router) cho Frontend và NestJS 11 cho Backend. Tài liệu này hướng dẫn chi tiết cách tổ chức thư mục, tiêu chuẩn code và quy trình thêm mới tính năng.

---

## 1. Cấu Trúc Thư Mục (Folder Structure)

### Frontend (Next.js 15)
Thư mục: `frontend/src/`

```text
src/
├── app/                  # Next.js App Router (Chứa các page và layout)
│   ├── (auth)/           # Route group cho đăng nhập/đăng ký
│   ├── (dashboard)/      # Route group cho Admin và User sau khi login
│   └── globals.css       # File CSS toàn cục (Tailwind)
├── components/           # React Components có thể tái sử dụng
│   ├── ui/               # Các UI elements cơ bản (Shadcn UI)
│   ├── admin/            # Components dành riêng cho Admin
│   └── user/             # Components dành riêng cho User
├── hooks/                # Custom React Hooks (vd: use-socket.ts)
├── lib/                  # Tiện ích, cấu hình, constants (vd: utils.ts)
├── services/             # Lớp giao tiếp API (sử dụng Axios client)
├── types/                # Khai báo TypeScript Interfaces
└── middleware.ts         # Next.js Middleware (Kiểm tra token, phân quyền route)
```

### Backend (NestJS 11)
Thư mục: `nova-booking-backend/src/`

```text
src/
├── common/               # Dùng chung: Decorators, Filters, Guards, Interceptors
├── prisma/               # Prisma Module (Kết nối DB)
├── redis/                # Redis Module (Quản lý Cache & Locking)
├── auth/                 # Module xác thực & Authorization (JWT, Tokens)
├── users/                # Module quản lý thông tin người dùng
├── court/                # Module quản lý Sân cầu lông
├── booking/              # Module xử lý đặt sân, giá tiền, giữ chỗ (Core)
├── payment/              # Module xử lý thanh toán (PayOS Webhook)
├── notification/         # Socket.io Gateway (Phát sóng sự kiện Real-time)
└── main.ts               # Điểm khởi chạy của ứng dụng (Bootstrap)
```

---

## 2. Tiêu Chuẩn Lập Trình (Coding Standards & Conventions)

### Naming Conventions
- **Backend (NestJS)**: Bắt buộc sử dụng `kebab-case` cho tên file (VD: `booking.controller.ts`, `create-user.dto.ts`). Tên Class, Interface, và DTO sử dụng `PascalCase`.
- **Frontend (React)**: Sử dụng `kebab-case` cho tên file để nhất quán với URL và hệ thống (VD: `user-profile.tsx`), nhưng khai báo tên Component bên trong bằng `PascalCase` (VD: `export function UserProfile()`). Custom hooks luôn bắt đầu bằng chữ `use` và viết theo `camelCase` (VD: `useSocket`).

### Linting & Code Formatting
- Dự án được định cấu hình khắt khe với **ESLint** và **Prettier**. 
- Code phải vượt qua toàn bộ linting rules (không có cảnh báo, không sử dụng `any` trong TypeScript) mới được phép commit. Cấu hình Prettier tự động format code khi lưu (`formatOnSave`).

---

## 3. Quản Lý Trạng Thái & Fetch Dữ Liệu (State Management & Data Fetching)

- **Server State (TanStack Query)**: Frontend ưu tiên sử dụng tuyệt đối React Query (`useQuery`, `useMutation`) để giao tiếp với API. Việc này giúp tự động hóa cơ chế Caching, xử lý loading/error states, và đặc biệt là cực kỳ dễ dàng refetch dữ liệu khi có tín hiệu WebSockets (thông qua `queryClient.invalidateQueries()`).
- **Global State (Context API / Zustand)**: Được sử dụng rất hạn chế, chỉ dành riêng cho các trạng thái UI toàn cục không liên quan tới server (như Theme Light/Dark mode, Trạng thái đóng/mở Sidebar, hoặc thông tin Session cơ bản).
- **Local State**: Các trạng thái đơn lẻ của UI (input form, toggle) được quản lý gọn nhẹ bởi `useState` hoặc `useReducer`.

---

## 4. Hướng Dẫn Thêm Tính Năng Mới (How to add a new feature)

Dưới đây là quy trình 3 bước chuẩn hóa dành cho Developer khi muốn thêm một Module mới (Ví dụ: `Voucher`).

**Bước 1: Cập nhật Database Schema**
1. Mở `prisma/schema.prisma` và thiết kế model mới (`model Voucher { ... }`).
2. Chạy lệnh tạo migration: `npx prisma migrate dev --name add_voucher`.
3. Sinh lại Prisma Client để cập nhật Type Definitions: `npx prisma generate`.

**Bước 2: Khởi tạo Module Backend**
Sử dụng bộ công cụ của NestJS CLI để tự động sinh toàn bộ boilerplate code (Module, Controller, Service, DTOs, Entities):
```bash
nest g resource voucher
```
- Triển khai logic nghiệp vụ lõi tại `voucher.service.ts`.
- Gắn các Endpoint API và Middleware xác thực (`@UseGuards(JwtAuthGuard)`) tại `voucher.controller.ts`.

**Bước 3: Tích hợp Frontend UI**
1. Tạo file service gọi API: `frontend/src/services/voucher.service.ts`.
2. Tạo Page UI tương ứng (VD: `src/app/(dashboard)/admin/vouchers/page.tsx`).
3. Sử dụng `useQuery` fetch dữ liệu từ service, kết hợp cùng Shadcn UI và TailwindCSS để hiển thị bảng dữ liệu (Table) trực quan.
