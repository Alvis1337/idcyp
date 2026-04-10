export function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  for (const part of cookieHeader.split(';')) {
    const [key, ...vals] = part.trim().split('=');
    if (key) {
      try {
        cookies[key.trim()] = decodeURIComponent(vals.join('='));
      } catch {
        cookies[key.trim()] = vals.join('=');
      }
    }
  }
  return cookies;
}
