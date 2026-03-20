This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Sign-in: email vs Google OAuth

By default, **third-party OAuth buttons are hidden** (no broken Google button). Use email/password or magic link from Supabase.

To **enable Google** (after configuring it in Supabase):

1. Supabase → **Authentication** → **Providers** → **Google**: enable and add Client ID + Secret from [Google Cloud Console](https://console.cloud.google.com/).
2. In Google Cloud, set **Authorized redirect URIs** to your Supabase callback, e.g. `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Supabase → **Authentication** → **URL Configuration**: add your app URLs to **Redirect URLs** (e.g. `http://localhost:3000/**` and production `https://yourdomain.com/**`).
4. In `.env`, set:
   - `NEXT_PUBLIC_SITE_URL=http://localhost:3000` (or your production URL)
   - `NEXT_PUBLIC_AUTH_OAUTH_PROVIDERS=google`

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
