const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const cors = require('cors')({ origin: true });

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ region: 'us-central1' });

// ─── Email transporter ───────────────────────────────────────────────────────
// Uses Gmail + App Password (set via: firebase functions:secrets:set GMAIL_USER etc.)
// To get an App Password: myaccount.google.com/apppasswords
function makeTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
}

// ─── Validation ──────────────────────────────────────────────────────────────
function validate(data) {
  const errors = {};
  if (!data.name || data.name.trim().length < 2)
    errors.name = 'Name is required.';
  if (!data.business || data.business.trim().length < 1)
    errors.business = 'Business name is required.';
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()))
    errors.email = 'Valid email is required.';
  if (!data.service || data.service.trim() === '')
    errors.service = 'Campaign type is required.';
  return errors;
}

const SERVICE_LABELS = {
  sprint:   'AI Video Campaign Sprint',
  launch:   'Product Launch Video',
  founder:  'Founder Story Campaign',
  content:  'Social Media Content System',
  unsure:   'Not sure yet — let\'s talk',
};

// ─── Main HTTP Function ───────────────────────────────────────────────────────
exports.submitLead = onRequest({ cors: true }, async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = req.body || {};
    const errors = validate(body);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    const lead = {
      name:      body.name.trim(),
      business:  body.business.trim(),
      email:     body.email.trim().toLowerCase(),
      service:   body.service.trim(),
      message:   (body.message || '').trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status:    'new',
    };

    try {
      // 1. Save to Firestore
      const docRef = await db.collection('leads').add(lead);

      // 2. Send emails (non-blocking — don't fail the response if email fails)
      sendEmails(lead, docRef.id).catch(err =>
        console.error('Email send failed:', err)
      );

      return res.status(200).json({ success: true, id: docRef.id });

    } catch (err) {
      console.error('Firestore write failed:', err);
      return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  });
});

// ─── Email helpers ────────────────────────────────────────────────────────────
async function sendEmails(lead, leadId) {
  const transport = makeTransporter();
  const serviceLabel = SERVICE_LABELS[lead.service] || lead.service;
  const notifyTo = process.env.NOTIFY_EMAIL || process.env.GMAIL_USER;

  await Promise.all([
    // Internal notification to Black Steel team
    transport.sendMail({
      from: `"Black Steel Media" <${process.env.GMAIL_USER}>`,
      to: notifyTo,
      subject: `🎬 New Lead: ${lead.name} — ${serviceLabel}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#131313;color:#e5e2e1;padding:40px;border:1px solid #4d4635;">
          <div style="border-bottom:2px solid #d4af37;padding-bottom:20px;margin-bottom:28px;">
            <h1 style="font-size:22px;color:#f2ca50;margin:0;">New Campaign Lead</h1>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:10px 0;color:#99907c;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;width:140px;">Name</td><td style="padding:10px 0;">${lead.name}</td></tr>
            <tr><td style="padding:10px 0;color:#99907c;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">Business</td><td style="padding:10px 0;">${lead.business}</td></tr>
            <tr><td style="padding:10px 0;color:#99907c;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">Email</td><td style="padding:10px 0;"><a href="mailto:${lead.email}" style="color:#f2ca50;">${lead.email}</a></td></tr>
            <tr><td style="padding:10px 0;color:#99907c;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">Campaign</td><td style="padding:10px 0;">${serviceLabel}</td></tr>
            ${lead.message ? `<tr><td style="padding:10px 0;color:#99907c;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;vertical-align:top;">Message</td><td style="padding:10px 0;">${lead.message}</td></tr>` : ''}
          </table>
          <div style="margin-top:32px;padding-top:20px;border-top:1px solid #4d4635;font-size:12px;color:#99907c;">
            Lead ID: ${leadId} · Black Steel Media CRM
          </div>
        </div>
      `,
    }),

    // Confirmation to the prospect
    transport.sendMail({
      from: `"Black Steel Media" <${process.env.GMAIL_USER}>`,
      to: lead.email,
      subject: `We got your request, ${lead.name.split(' ')[0]} — Black Steel Media`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#131313;color:#e5e2e1;padding:40px;border:1px solid #4d4635;">
          <div style="border-bottom:2px solid #d4af37;padding-bottom:20px;margin-bottom:28px;">
            <h1 style="font-size:22px;color:#f2ca50;margin:0;">Black Steel Media</h1>
          </div>
          <h2 style="font-family:Georgia,serif;font-size:28px;font-weight:500;line-height:1.3;margin-bottom:20px;">
            Your story is<br/>about to move people.
          </h2>
          <p style="font-size:16px;line-height:1.7;color:#d0c5af;margin-bottom:16px;">
            Hey ${lead.name.split(' ')[0]},
          </p>
          <p style="font-size:16px;line-height:1.7;color:#d0c5af;margin-bottom:16px;">
            We received your request for a <strong style="color:#e5e2e1;">${serviceLabel}</strong> and we're already thinking about how to make ${lead.business} impossible to ignore.
          </p>
          <p style="font-size:16px;line-height:1.7;color:#d0c5af;margin-bottom:32px;">
            Expect a reply within <strong style="color:#e5e2e1;">24 hours</strong> to schedule your discovery call. We'll map out your campaign strategy and show you exactly what's possible in 14 days.
          </p>
          <div style="background:#201f1f;border:1px solid #4d4635;padding:24px;margin-bottom:32px;">
            <p style="font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#99907c;margin-bottom:8px;">Your request summary</p>
            <p style="margin:0;font-size:15px;"><strong>${lead.business}</strong> — ${serviceLabel}</p>
          </div>
          <div style="margin-top:32px;padding-top:20px;border-top:1px solid #4d4635;font-size:12px;color:#99907c;">
            Black Steel Media · AI-Powered Cinematic Campaigns<br/>
            Questions? Reply to this email.
          </div>
        </div>
      `,
    }),
  ]);
}
