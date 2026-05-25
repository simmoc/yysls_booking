import { pool, sql } from '../_lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const result = await pool.query(
        sql`SELECT id, name, description, created_at FROM baiye ORDER BY id ASC`
      );
      return res.status(200).json({ success: true, data: result.rows });
    }

    if (req.method === 'POST') {
      const userRole = req.query.userRole;

      if (userRole !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
      }

      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: 'name is required' });
      }

      const result = await pool.query(
        sql`INSERT INTO baiye (name, description) VALUES (${name}, ${description || null})
            RETURNING id, name, description, created_at`
      );

      return res.status(201).json({ success: true, data: result.rows[0] });
    }

    if (req.method === 'DELETE') {
      const userRole = req.query.userRole;
      const baiyeId = req.query.baiyeId;

      if (userRole !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
      }

      await pool.query(sql`DELETE FROM baiye WHERE id = ${parseInt(baiyeId)}`);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
