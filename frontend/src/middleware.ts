import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

export function middleware(request: NextRequest) {
    // 1. Lấy token theo nhiều cách để đảm bảo tương thích
    const tokenObj = request.cookies.get('access_token');
    const token = typeof tokenObj === 'string' ? tokenObj : tokenObj?.value;
    
    const {pathname} = request.nextUrl;

    // Helper kiểm tra token hợp lệ
    const isValid = (t: string | undefined) => {
        return t && t !== 'undefined' && t !== 'null' && t.length > 10;
    };

    // 2. Log chẩn đoán (Sẽ xuất hiện trong Vercel Logs)
    if (pathname.startsWith('/admin') || pathname.startsWith('/user')) {
        if (!isValid(token)) {
            console.log(`[Middleware Check] Path: ${pathname} | Token Found: ${!!token} | Valid: ${isValid(token)}`);
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/user/:path*', '/login', '/register'],
};
