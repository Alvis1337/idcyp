import { generateInviteCode } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return Response.redirect(`${env.CLIENT_URL}?error=no_code`, 302);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${env.CLIENT_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) throw new Error('Token exchange failed');
    const tokens = await tokenRes.json();

    // Get user profile from Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileRes.ok) throw new Error('Profile fetch failed');
    const profile = await profileRes.json();

    let user = await env.DB.prepare(
      'SELECT * FROM users WHERE google_id = ?'
    ).bind(profile.id).first();

    if (!user) {
      // New user — create account + default group
      user = await env.DB.prepare(
        'INSERT INTO users (google_id, email, name, avatar_url) VALUES (?, ?, ?, ?) RETURNING *'
      ).bind(profile.id, profile.email, profile.name, profile.picture).first();

      const inviteCode = generateInviteCode();
      const group = await env.DB.prepare(
        "INSERT INTO groups (name, invite_code, created_by) VALUES (?, ?, ?) RETURNING *"
      ).bind(`${profile.name}'s Menu`, inviteCode, user.id).first();

      await env.DB.batch([
        env.DB.prepare("INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'owner')").bind(group.id, user.id),
        env.DB.prepare('UPDATE users SET active_group_id = ? WHERE id = ?').bind(group.id, user.id),
      ]);

      user.active_group_id = group.id;
    } else {
      // Existing user — update profile info
      user = await env.DB.prepare(
        'UPDATE users SET name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE google_id = ? RETURNING *'
      ).bind(profile.name, profile.picture, profile.id).first();

      // Ensure user has an active group (migration path)
      if (!user.active_group_id) {
        const member = await env.DB.prepare(
          'SELECT group_id FROM group_members WHERE user_id = ? LIMIT 1'
        ).bind(user.id).first();

        if (member) {
          await env.DB.prepare('UPDATE users SET active_group_id = ? WHERE id = ?')
            .bind(member.group_id, user.id).run();
          user.active_group_id = member.group_id;
        } else {
          const inviteCode = generateInviteCode();
          const group = await env.DB.prepare(
            "INSERT INTO groups (name, invite_code, created_by) VALUES (?, ?, ?) RETURNING *"
          ).bind(`${user.name}'s Menu`, inviteCode, user.id).first();

          await env.DB.batch([
            env.DB.prepare("INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, 'owner')").bind(group.id, user.id),
            env.DB.prepare('UPDATE users SET active_group_id = ? WHERE id = ?').bind(group.id, user.id),
          ]);
          user.active_group_id = group.id;
        }
      }
    }

    // Create session
    const sid = crypto.randomUUID();
    const sess = JSON.stringify({ userId: user.id });
    const expire = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString().replace('T', ' ').split('.')[0];

    await env.DB.prepare(
      'INSERT INTO sessions (sid, sess, expire) VALUES (?, ?, ?)'
    ).bind(sid, sess, expire).run();

    const isLocal = env.CLIENT_URL?.includes('localhost');
    const securePart = isLocal ? '' : '; Secure';

    return new Response(null, {
      status: 302,
      headers: {
        Location: env.CLIENT_URL,
        'Set-Cookie': `session=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${securePart}`,
      },
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    return Response.redirect(`${env.CLIENT_URL}?error=auth_failed`, 302);
  }
}
