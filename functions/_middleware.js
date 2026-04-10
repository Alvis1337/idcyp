import { parseCookies } from './_lib/cookie.js';

export async function onRequest(context) {
  const cookieHeader = context.request.headers.get('Cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const sid = cookies['session'];

  if (sid) {
    try {
      const session = await context.env.DB.prepare(
        "SELECT sess FROM sessions WHERE sid = ? AND expire > datetime('now')"
      ).bind(sid).first();

      if (session) {
        const sessData = JSON.parse(session.sess);
        if (sessData.userId) {
          const user = await context.env.DB.prepare(
            'SELECT * FROM users WHERE id = ?'
          ).bind(sessData.userId).first();
          if (user) context.data.user = user;
        }
      }
    } catch {
      // ignore session errors, user stays unauthenticated
    }
  }

  return context.next();
}
