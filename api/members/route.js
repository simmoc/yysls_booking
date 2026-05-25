import { sql } from '../_lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const baiyeId = req.query.baiyeId;

      let result;

      if (baiyeId) {
        result = await sql`
          SELECT m.id, m.name, m.baiye_id, m.created_at,
                 by.name AS baiye_name
          FROM members m
          JOIN baiye by ON m.baiye_id = by.id
          WHERE m.baiye_id = ${parseInt(baiyeId)}
          ORDER BY m.created_at DESC
        `;
      } else {
        result = await sql`
          SELECT m.id, m.name, m.baiye_id, m.created_at,
                 by.name AS baiye_name
          FROM members m
          JOIN baiye by ON m.baiye_id = by.id
          ORDER BY m.created_at DESC
        `;
      }

      return res.status(200).json({ success: true, data: result });
    }

    if (req.method === 'POST') {
      const userRole = req.query.userRole;

      if (userRole !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
      }

      const { name, baiyeId } = req.body;

      if (!name || !baiyeId) {
        return res.status(400).json({ success: false, error: 'name and baiyeId are required' });
      }

      const result = await sql`
        INSERT INTO members (name, baiye_id) VALUES (${name}, ${parseInt(baiyeId)})
        RETURNING id, name, baiye_id, created_at
      `;

      return res.status(201).json({ success: true, data: result[0] });
    }

    if (req.method === 'DELETE') {
      const userRole = req.query.userRole;
      const memberId = req.query.memberId;

      if (userRole !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
      }

      if (!memberId) {
        return res.status(400).json({ success: false, error: 'memberId is required' });
      }

      await sql`DELETE FROM members WHERE id = ${parseInt(memberId)}`;
      return res.status(200).json({ success: true, data: { memberId: parseInt(memberId) } });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
