import { NextResponse } from 'next/server';
import { sendVisitRescheduleEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, userName, oldDate, oldSlot, newDate, newSlot } = body;

    if (!email || !userName || !oldDate || !oldSlot || !newDate || !newSlot) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await sendVisitRescheduleEmail(email, userName, oldDate, oldSlot, newDate, newSlot);

    if (result.success) {
      return NextResponse.json({ message: 'Reschedule email sent successfully' });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
