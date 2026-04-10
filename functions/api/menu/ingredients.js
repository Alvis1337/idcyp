import { json } from '../../_lib/auth.js';

export async function onRequestGet({ env }) {
  try {
    const result = await env.DB.prepare('SELECT * FROM ingredients ORDER BY name').all();
    return json(result.results);
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    return json({ error: 'Failed to fetch ingredients' }, 500);
  }
}
