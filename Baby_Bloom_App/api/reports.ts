import type { IncomingMessage, ServerResponse } from 'node:http';
import { generateReport, ReportError } from '../src/server/report-service';
export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const reply = (status: number, body: unknown) => {
    res.statusCode = status;
    res.end(JSON.stringify(body));
  };
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    reply(405, { error: 'invalid' });
    return;
  }
  if (Number(req.headers['content-length'] ?? 0) > 4096) {
    reply(413, { error: 'invalid' });
    return;
  }
  try {
    let body = req.body;
    if (body === undefined) {
      let raw = '';
      for await (const chunk of req) {
        raw += chunk.toString();
        if (Buffer.byteLength(raw) > 4096) throw new ReportError(413, 'invalid');
      }
      try {
        body = JSON.parse(raw);
      } catch {
        throw new ReportError(400, 'invalid');
      }
    } else if (typeof body === 'string') {
      if (Buffer.byteLength(body) > 4096) throw new ReportError(413, 'invalid');
      try {
        body = JSON.parse(body);
      } catch {
        throw new ReportError(400, 'invalid');
      }
    }
    const authorization = req.headers.authorization ?? '';
    const bearer = /^Bearer ([^\s]+)$/i.exec(authorization)?.[1] ?? '';
    const result = await generateReport(body, bearer, {
      url: process.env.EXPO_PUBLIC_SUPABASE_URL,
      publicKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      apiKey: process.env.GROQ_API_KEY,
    });
    reply(200, result);
  } catch (e) {
    reply(e instanceof ReportError ? e.status : 502, {
      error: e instanceof ReportError ? e.message : 'ai_unavailable',
    });
  }
}
