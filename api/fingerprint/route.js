import { sql } from '../_lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { fingerprint } = req.body;

    if (!fingerprint) {
      return res.status(400).json({ success: false, error: 'fingerprint is required' });
    }

    const result = await sql`
      INSERT INTO users (fingerprint) VALUES (${fingerprint})
      ON CONFLICT (fingerprint) DO NOTHING
      RETURNING id, fingerprint, role
    `;

    let user = result[0];

    if (!user) {
      const existing = await sql`
        SELECT id, fingerprint, role FROM users WHERE fingerprint = ${fingerprint}
      `;
      user = existing[0];
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
