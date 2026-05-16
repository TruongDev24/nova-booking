# 📂 Báo Cáo Cấu Trúc Mã Nguồn — NOVA Booking

Tài liệu này cung cấp cái nhìn thực tế về cấu trúc mã nguồn của dự án **NOVA Booking**, phản ánh chính xác các module và công nghệ đang được sử dụng trong Production.

---

## 🏛️ 1. Kiến Trúc Tổng Quan

Dự án được tổ chức theo mô hình **Client-Server** tách biệt:

- **Frontend**: Next.js 15 (App Router), triển khai trên Vercel.
- **Backend**: NestJS 11, triển khai trên Render (Dockerized).
- **Database**: PostgreSQL (Supabase) + Redis (Upstash).

---

## 📁 2. Cấu Trúc Frontend (`frontend/`)

Tập trung vào trải nghiệm người dùng mượt mà và quản lý trạng thái hiệu quả.

### `src/app/` (Routing)
- **`(auth)/`**: Xử lý logic Đăng nhập, Đăng ký, Quên mật khẩu.
- **`(dashboard)/`**: Khu vực Dashboard cho Admin, Chủ sân và Người dùng.
- **`layout.tsx`**: Chứa các Provider về Auth, Socket.io, và React Query.

### `src/components/` (UI & Logic)
- **`ui/`**: Các component nền tảng từ ShadcnUI.
- **`layouts/`**: Bố cục chung của Dashboard và trang chủ.
- **`providers/`**: Quản lý kết nối Socket.io và xác thực phía Client.

### `src/services/` (API Client)
- **`apiClient.ts`**: Cấu hình Axios với cơ chế tự động làm mới Token (Refresh Token).
- **`booking.service.ts`**: Gọi API đặt sân và lấy lịch trống.
- **`payment.service.ts`**: Xử lý tạo link thanh toán PayOS.

---

## ⚙️ 3. Cấu Trúc Backend (`nova-booking-backend/`)

Xây dựng theo mô hình Modular của NestJS, tập trung vào tính bảo mật và hiệu năng.

### `src/modules/`
- **`auth/`**: Xử lý xác thực JWT kép (Access & Refresh Token).
- **`booking/`**: Logic cốt lõi về đặt sân, khóa slot Redis và Cron Job tự động hoàn thành đơn.
- **`payment/`**: Tích hợp chặt chẽ với PayOS Webhook để xác nhận đơn hàng nguyên tử.
- **`analytics/`**: Tính toán doanh thu và tỷ lệ hủy thực tế cho Dashboard Admin.
- **`notification/`**: WebSocket Gateway để gửi thông báo real-time.

### `src/common/`
- **`decorators/`**: Các công cụ hỗ trợ lấy thông tin User hoặc phân quyền Role.
- **`filters/`**: Xử lý lỗi tập trung để trả về phản hồi đồng nhất cho Frontend.

---

## 🔄 4. Luồng Dữ Liệu Đặc trưng

1. **Real-time Synchronization**: Sử dụng Socket.io để cập nhật trạng thái sân ngay khi có thay đổi, tránh tình trạng khách hàng thấy thông tin cũ.
2. **Hybrid Database/Cache**: Sử dụng Redis để khóa nhanh slot (10 phút) trong khi chờ thanh toán, giảm tải cho PostgreSQL.
3. **Automated Tasks**: Cron Job chạy hàng giờ để dọn dẹp các đơn hàng đã qua giờ chơi và chuyển trạng thái thành `COMPLETED`.

---
*Tài liệu được cập nhật dựa trên mã nguồn thực tế ngày: 16/05/2026*
