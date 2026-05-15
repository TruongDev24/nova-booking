import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('access_token')?.value;
    const {pathname} = request.nextUrl;

    // Helper kiểm tra token có tồn tại và hợp lệ
    const isValid = (t: string | undefined) => t && t !== 'undefined' && t !== 'null' && t.length > 10;

    // Chỉ chặn các route Dashboard nếu thiếu Access Token
    if (pathname.startsWith('/admin') || pathname.startsWith('/user')) {
        if (!isValid(token)) {
            console.log("Middleware: No access token, redirecting to /login");
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/user/:path*', '/login', '/register'],
};
