# BLACK STEEL MEDIA

**Cinematic AI Campaigns for Minority-Owned Businesses**

🌐 **Live Site → [black-steel-media-9c5c5.web.app](https://black-steel-media-9c5c5.web.app)**

---

## What This Is

The official website for Black Steel Media — a full-stack marketing site with a lead capture system built on Google Cloud / Firebase.

- Afrofuturist-Minimalist design system (dark charcoal + warm gold)
- Booking modal that captures leads directly into Firestore
- Automated emails to the team + confirmation to the prospect
- Deployed on Firebase Hosting with a Cloud Function backend

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Vanilla HTML/CSS/JS — no framework, no build step |
| Hosting | Firebase Hosting |
| Backend | Cloud Functions (Node.js 22) |
| Database | Firestore |
| Email | Nodemailer + Gmail |
| Fonts | Newsreader · Manrope · Space Grotesk (Google Fonts) |

---

## Project Structure

```
├── public/
│   └── index.html          # Full website — single file
├── functions/
│   ├── index.js            # Cloud Function: form → Firestore → email
│   └── package.json
├── firebase.json           # Hosting + function routing config
├── firestore.rules         # Firestore security rules
├── firestore.indexes.json  # Composite indexes for leads queries
└── .firebaserc             # Firebase project alias
```

---

## Local Development

```bash
# Install dependencies
cd functions && npm install

# Start local emulators (hosting + functions + firestore)
firebase emulators:start
```

Open **http://localhost:5000** to preview the site locally.

---

## Deploy

```bash
# Deploy everything (hosting + functions)
firebase deploy

# Deploy only the site
firebase deploy --only hosting

# Deploy only the Cloud Function
firebase deploy --only functions
```

---

## Environment Secrets

Set via Firebase Secret Manager (never committed to git):

```bash
firebase functions:secrets:set GMAIL_USER    # Gmail address for sending
firebase functions:secrets:set GMAIL_PASS    # Gmail App Password
firebase functions:secrets:set NOTIFY_EMAIL  # Where new leads get emailed
```

---

## Lead Flow

```
User submits booking form
        ↓
POST /api/submit-lead (Cloud Function)
        ↓
Validate → Save to Firestore (leads collection)
        ↓
Email team + confirmation to prospect
```

View all leads at: **[Firebase Console → Firestore → leads](https://console.firebase.google.com/project/black-steel-media-9c5c5/firestore)**

---

## Design System

| Token | Value |
|---|---|
| Background | `#131313` |
| Primary Gold | `#D4AF37` / `#f2ca50` |
| Body Text | `#e5e2e1` |
| Border | `#4d4635` |
| Headline Font | Newsreader |
| Body Font | Manrope |
| Label Font | Space Grotesk |
| Border Radius | 0px (sharp everywhere) |
| Section Gap | 128px |
| Max Width | 1440px |
