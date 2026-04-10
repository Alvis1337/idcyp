import { json } from '../../_lib/auth.js';

export async function onRequestGet({ env }) {
  try {
    const result = await env.DB.prepare('SELECT * FROM tags ORDER BY name').all();
    return json(result.results);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return json({ error: 'Failed to fetch tags' }, 500);
  }
}
