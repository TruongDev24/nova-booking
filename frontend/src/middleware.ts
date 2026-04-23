import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  role: string;
  sub: string;
  email: string;
  exp: number;
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  const { pathname } = request.nextUrl;

  // 1. If trying to access protected routes without a token
  if (!token) {
    if (pathname.startsWith('/admin') || pathname.startsWith('/user')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  try {
    // 2. Decode the token to get the user's role
    const decoded: JwtPayload = jwtDecode(token);
    const userRole = decoded.role;

    // 3. Logic for Admin routes
    if (pathname.startsWith('/admin')) {
      if (userRole !== 'ADMIN') {
        // Not an admin? Redirect to home or user dashboard
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    // 4. Logic for User routes
    if (pathname.startsWith('/user')) {
      if (userRole !== 'USER' && userRole !== 'ADMIN') {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    // 5. If already logged in, prevent accessing login/register pages
    if (token && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/', request.url));
    }

  } catch (error) {
    // If token is invalid/corrupted, clear it and redirect to login
    console.error('Middleware JWT Error:', error);
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('access_token');
    return response;
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/admin/:path*', '/user/:path*', '/login', '/register'],
};
