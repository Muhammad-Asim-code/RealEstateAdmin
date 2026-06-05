import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn('SENDGRID_API_KEY is not set in environment variables');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function sendVisitApprovalEmail(
  toEmail: string,
  userName: string,
  visitDate: string,
  timeSlot: string
) {
  const msg = {
    to: toEmail,
    from: process.env.SENDGRID_FROM_EMAIL || '',
    subject: 'Your Visit Request has been Approved!',
    text: `Hello ${userName},\n\nYour visit request has been approved.\n\nDate: ${visitDate}\nTime: ${timeSlot}\n\nWe look forward to seeing you!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg">
        <h2 style="color: #2563eb;">Visit Approved!</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>Great news! Your visit request has been <strong>approved</strong>.</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(visitDate).toLocaleDateString()}</p>
          <p style="margin: 5px 0;"><strong>Time Slot:</strong> ${timeSlot}</p>
        </div>
        <p>We look forward to meeting you. If you have any questions, please contact us.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b;">This is an automated notification from the Real Estate Admin Dashboard.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${toEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error sending email:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    return { success: false, error: error.message };
  }
}

export async function sendVisitRescheduleEmail(
  toEmail: string,
  userName: string,
  oldDate: string,
  oldSlot: string,
  newDate: string,
  newSlot: string
) {
  const msg = {
    to: toEmail,
    from: process.env.SENDGRID_FROM_EMAIL || '',
    subject: 'Update regarding your Property Visit Request',
    text: `Hello ${userName},\n\nWe are sorry, but the visit slot you requested (${oldDate} during ${oldSlot}) is already taken.\n\nWe have rescheduled your visit to:\nDate: ${newDate}\nTime: ${newSlot}\n\nWe look forward to seeing you!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #ea580c; margin-top: 0;">Visit Schedule Update</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>We are sorry, but the visit slot you requested is already taken:</p>
        <div style="background-color: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; margin: 15px 0; font-size: 14px;">
          <strong>Unavailable Slot:</strong> ${oldDate} during ${oldSlot}
        </div>
        <p>We have rescheduled your visit to the following available time:</p>
        <div style="background-color: #f0fdf4; color: #166534; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
          <p style="margin: 5px 0;"><strong>New Date:</strong> ${new Date(newDate).toLocaleDateString()}</p>
          <p style="margin: 5px 0;"><strong>New Time Slot:</strong> ${newSlot}</p>
        </div>
        <p>We look forward to meeting you. If you have any questions, please contact us.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">This is an automated notification from the Real Estate Admin Dashboard.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Reschedule email sent to ${toEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error sending reschedule email:', error);
    if (error.response) {
      console.error(error.response.body);
    }
    return { success: false, error: error.message };
  }
}
