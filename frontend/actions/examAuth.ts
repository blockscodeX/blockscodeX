'use server'

import { cookies } from 'next/headers';
import { headers as nextHeaders } from 'next/headers';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function examLoginAction(email: string, testCode: string, password?: string, slug?: string | null) {
    try {
        const incomingHeaders = await nextHeaders();
        const userAgent = incomingHeaders.get('user-agent') || '';
        const derivedClientPlatform = userAgent.toLowerCase().includes('electron') ? 'electron' : 'web';
        const clientPlatform = incomingHeaders.get('x-client-platform') || derivedClientPlatform;

        const res = await fetch(`${BASE_URL}/auth/exam-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'user-agent': userAgent,
                'x-client-platform': clientPlatform
            },
            body: JSON.stringify({ email, testCode, password, slug })
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Exam login failed');
        }

        const data = await res.json();

        if (data.access_token) {
            // Set HTTP-Only Cookie
            // Expires in 24 hours
            await (await cookies()).set('auth_token', data.access_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 24 * 60 * 60
            });

            // For exam sessions, we might store a temporary exam-specific flag (though auth_token is primary)
            if (data.exam && data.exam.slug) {
                // We rely on auth_token, but can hint client
            }
        }

        return { success: true, user: data.user, exam: data.exam, access_token: data.access_token };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
