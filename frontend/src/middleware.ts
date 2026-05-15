import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

export function middleware(request: NextRequest) {
    const tokenObj = request.cookies.get('access_token');
    const token = tokenObj?.value;
    
    const {pathname} = request.nextUrl;

    // Helper kiểm tra token hợp lệ
    const isValid = (t: string | undefined) => {
        return t && t !== 'undefined' && t !== 'null' && t.length > 10;
    };

    const isAuthPage = pathname === '/login' || pathname === '/register';
    const isProtectedPage = pathname.startsWith('/admin') || pathname.startsWith('/user');

    // 1. Nếu đã có token mà vào trang login/register -> redirect về dashboard tương ứng
    // Lưu ý: Middleware không truy cập được sessionStorage, nên ta chỉ có thể đoán hoặc dựa vào JWT (nếu decode)
    // Ở đây ta cứ để cho Client-side redirect (đã thêm vào LoginPage/RegisterPage) xử lý phần role cụ thể.
    // Hoặc ta có thể redirect về mặc định /user nếu có token.
    if (isAuthPage && isValid(token)) {
        // Ta không biết chắc role ở middleware nếu không decode JWT, 
        // nhưng thường thì redirect về /user là an toàn vì client-side sẽ sửa lại nếu là ADMIN.
        // Tuy nhiên, để tránh nháy trang, ta có thể tạm thời redirect về /user.
        return NextResponse.redirect(new URL('/user', request.url));
    }

    // 2. Nếu vào trang bảo mật mà không có token -> về login
    if (isProtectedPage && !isValid(token)) {
        console.log(`[Middleware Check] Path: ${pathname} | Token Found: ${!!token} | Valid: false`);
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/user/:path*', '/login', '/register'],
};
