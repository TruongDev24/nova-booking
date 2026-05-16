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

    // 1. Nếu đã có bất kỳ token nào mà vào trang login/register -> về dashboard
    if (isAuthPage && (isValid(token) || isValid(refreshToken))) {
        return NextResponse.redirect(new URL('/user', request.url));
    }

    // 2. Nếu vào trang bảo mật mà KHÔNG CÓ CẢ 2 TOKEN -> về login
    if (isProtectedPage && !isValid(token) && !isValid(refreshToken)) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/user/:path*', '/login', '/register'],
};
