import { json } from '../../_lib/auth.js';

export async function onRequestGet({ data }) {
  if (!data.user) return json({ error: 'Not authenticated' }, 401);
  return json(data.user);
}
