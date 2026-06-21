'use server';

import { NextResponse } from 'next/server';
import { sendOtpEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otp } = body;
    if (!email || !otp) {
      return NextResponse.json({ error: 'Missing email or otp' }, { status: 400 });
    }

    const res = await sendOtpEmail(email, otp);
    if (!res.success) {
      return NextResponse.json({ error: res.error || 'Failed to send' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('send-otp error', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
