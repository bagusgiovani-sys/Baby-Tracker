import { environmentSchema } from '../src/lib/env.ts';

const parsed = environmentSchema.safeParse({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  key: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsed.success) {
  // Never echo configuration values or Zod input into build logs.
  console.error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in Vercel before building. Only a publishable/anon key is allowed.');
  process.exitCode = 1;
} else {
  const url = new URL(parsed.data.url);
  const local = url.hostname === 'localhost' || url.hostname === '[::1]' ||
    /^(127|10)\./.test(url.hostname) || /^192\.168\./.test(url.hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname) || url.hostname.endsWith('.local');
  if (url.protocol !== 'https:' || local || url.username || url.password ||
      url.search || url.hash || url.pathname !== '/') {
    console.error('Vercel requires a public HTTPS Supabase project origin, without credentials, paths or query parameters. A local development URL cannot be deployed.');
    process.exitCode = 1;
  } else {
    console.log('Public Supabase build configuration validated.');
  }
}
