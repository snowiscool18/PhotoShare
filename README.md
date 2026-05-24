# PhotoShare

**The simplest possible starting point for a family photo sharing app.**

This is an extremely minimal prototype. The **only** working feature right now is the ability to create a user account. Everything else is visual scaffolding for future development.

One real family photo is displayed (currently using a placeholder).

## Tech Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- Deployed on **Vercel** (zero-config, perfect with the existing GitHub repo)
- No backend, no database, no real auth yet — pure client-side simulation using React state + localStorage

This choice keeps the project dead simple while giving us an excellent path to grow later (Server Actions, real auth, database, photo storage, etc.).

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Try creating an account using the form — this is the only fully functional part of the site.

## The Family Photo

The prototype currently uses a high-quality placeholder image from Unsplash.

**To use your own photo:**

1. Add your photo to `public/images/family-photo.jpg`
2. Update the `FAMILY_PHOTO_URL` constant in `app/page.tsx` (or switch to using `next/image` with a local path)

The photo appears in the hero and again in the post-signup "dashboard" view.

## What Works Right Now

- Creating a user (name + email + password)
- The account persists in your browser (localStorage) until you sign out
- After signing up you see a realistic prototype dashboard with the family photo
- All navigation and secondary buttons show polite "Coming soon" messages

## Deploy to Vercel

This project is already connected to GitHub at:

https://github.com/snowiscool18/PhotoShare.git

**Recommended way:**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `PhotoShare` GitHub repository
3. Deploy (it will just work)

Or use the Vercel CLI:

```bash
npm i -g vercel
vercel
```

Every push to `main` will trigger a new production deployment with instant preview URLs for branches.

## Project Philosophy (for now)

- Keep it **as simple as possible**
- Only build what we actually need today
- Make the single working feature (user creation) feel real and polished
- Everything else is honest prototype scaffolding

## Next Steps (future work)

- Replace placeholder photo with real asset(s)
- Real authentication (Clerk, Supabase Auth, or NextAuth)
- Real database + photo uploads (Supabase Storage or Vercel Blob)
- Multiple pages / real navigation
- Albums, sharing, comments, etc.

---

Built as the starting foundation for PhotoShare — June 2026.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
