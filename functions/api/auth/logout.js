import { json } from '../../_lib/auth.js';
import { parseCookies } from '../../_lib/cookie.js';

export async function onRequestPost({ request, env }) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const sid = parseCookies(cookieHeader)['session'];

  if (sid) {
    await env.DB.prepare('DELETE FROM sessions WHERE sid = ?').bind(sid).run();
  }

  return new Response(JSON.stringify({ message: 'Logged out successfully' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    },
  });
}
