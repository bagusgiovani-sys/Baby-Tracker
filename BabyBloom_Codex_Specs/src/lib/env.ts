import { z } from 'zod';
export const environmentSchema = z.object({
    url: z.url().refine(value => {
        try {
        const url = new URL(value);
        return url.protocol === 'https:' || (url.protocol === 'http:' && (url.hostname === 'localhost' || /^(127|10)\.\d+\.\d+\.\d+$/.test(url.hostname) || /^192\.168\.\d+\.\d+$/.test(url.hostname) || /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(url.hostname)));
        } catch {
            return false;
        }
    }),
    key: z.string().min(20).refine(value => {
        if (value.startsWith('sb_publishable_'))
            return true;
        if (value.startsWith('sb_secret_'))
            return false;
        try {
            const payload = (value.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='))).role === 'anon';
        }
        catch {
            return false;
        }
    }, 'config_required'),
});
export const environment = environmentSchema.safeParse({ url: process.env.EXPO_PUBLIC_SUPABASE_URL, key: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY });
