export async function onRequestGet() {
  return new Response(JSON.stringify({ status: 'ok', message: 'Server is running' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
