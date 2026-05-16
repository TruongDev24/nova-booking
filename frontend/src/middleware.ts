import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

export function middleware(request: NextRequest) {
    const tokenObj = request.cookies.get('access_token');
    const token = tokenObj?.value;
    const rtObj = request.cookies.get('refresh_token');
    const refreshToken = rtObj?.value;
    
    const {pathname} = request.nextUrl;

    const isValid = (t: string | undefined) => {
        return t && t !== 'undefined' && t !== 'null' && t.length > 10;
    };

    const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/admin/register';
    const isProtectedPage = (pathname.startsWith('/admin') || pathname.startsWith('/user')) && pathname !== '/admin/register';

    // Hàm giải mã JWT đơn giản
    const getRole = (t: string | undefined) => {
        if (!t) return null;
        try {
            const base64Url = t.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload).role;
        } catch {
            return null;
        }
    };

    const role = getRole(token) || getRole(refreshToken);

    // 1. Nếu đã có bất kỳ token nào mà vào trang login/register -> về đúng dashboard của role đó
    if (isAuthPage && (isValid(token) || isValid(refreshToken))) {
        return NextResponse.redirect(new URL(role === 'ADMIN' ? '/admin' : '/user', request.url));
    }

    // 2. Nếu vào trang bảo mật mà KHÔNG CÓ CẢ 2 TOKEN -> về login
    if (isProtectedPage && !isValid(token) && !isValid(refreshToken)) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // 3. Chặn chéo: USER vào /admin hoặc ADMIN vào /user
    if (isValid(token) || isValid(refreshToken)) {
        if (pathname.startsWith('/admin') && role !== 'ADMIN' && pathname !== '/admin/register') {
            return NextResponse.redirect(new URL('/user', request.url));
        }
        if (pathname.startsWith('/user') && role === 'ADMIN') {
            return NextResponse.redirect(new URL('/admin', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/user/:path*', '/login', '/register'],
};
