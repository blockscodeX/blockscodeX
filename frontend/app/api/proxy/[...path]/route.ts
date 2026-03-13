import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return handleRequest(request, params);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return handleRequest(request, params);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return handleRequest(request, params);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return handleRequest(request, params);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    return handleRequest(request, params);
}

async function handleRequest(request: NextRequest, params: Promise<{ path: string[] }>) {
    const { path } = await params;
    const pathString = path.join('/');
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    console.log(`[Proxy] Request to /${pathString}`);

    const headers: HeadersInit = {};

    // Forward the Content-Type header if present (important for multipart/form-data)
    const contentType = request.headers.get('content-type');
    if (contentType) {
        headers['Content-Type'] = contentType;
    }

    // Forward custom headers needed by specific endpoints
    const fileSize = request.headers.get('x-file-size');
    if (fileSize) {
        headers['x-file-size'] = fileSize;
    }

    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        headers['x-forwarded-for'] = forwardedFor;
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        headers['x-real-ip'] = realIp;
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`; // For strategies checking Bearer
        headers['Cookie'] = `auth_token=${token}`;    // For strategies checking Cookie (redundancy)
    }

    const url = new URL(`${BASE_URL}/${pathString}${request.nextUrl.search}`);
    console.log(`[Proxy] Forwarding to: ${url.href}`);

    // Prevent SSRF via path traversal (e.g. `../../../`)
    if (!url.href.startsWith(BASE_URL)) {
        return NextResponse.json({ message: 'Invalid API Path' }, { status: 400 });
    }

    // Use request.body as a stream to avoid loading large files into memory
    const body = (request.method !== 'GET' && request.method !== 'HEAD')
        ? request.body
        : undefined;

    // Next.js Route Handlers have a default body size limit that can be bypassed 
    // by not consuming the body as JSON/Text, but streaming it.
    // However, some fetch implementations require 'duplex: "half"' for streaming bodies.
    const fetchOptions: any = {
        method: request.method,
        headers,
        body,
        cache: 'no-store',
        // @ts-ignore - duplex is required for streaming bodies in some environments
        duplex: body ? 'half' : undefined
    };

    try {
        const response = await fetch(url.href, fetchOptions);

        // Filter headers to avoid Content-Encoding issues since fetch auto-decompresses
        const responseHeaders = new Headers(response.headers);
        responseHeaders.delete('content-encoding');
        responseHeaders.delete('content-length');

        // Forward response
        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
        });
    } catch (error) {
        console.error('API Proxy Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
