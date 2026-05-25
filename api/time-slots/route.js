import { sql } from '../_lib/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const result = await sql`SELECT id, description, created_at FROM time_slots ORDER BY id ASC`;
      return res.status(200).json({ success: true, data: result });
    }

    if (req.method === 'POST') {
      const userRole = req.query.userRole;

      if (userRole !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
      }

      const { description } = req.body;

      if (!description) {
        return res.status(400).json({ success: false, error: 'description is required' });
      }

      const result = await sql`
        INSERT INTO time_slots (description) VALUES (${description})
        RETURNING id, description, created_at
      `;

      return res.status(201).json({ success: true, data: result[0] });
    }

    if (req.method === 'PUT') {
      const userRole = req.query.userRole;
      const slotId = req.query.slotId;

      if (userRole !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
      }

      if (!slotId) {
        return res.status(400).json({ success: false, error: 'slotId is required' });
      }

      const { description } = req.body;

      if (!description) {
        return res.status(400).json({ success: false, error: 'description is required' });
      }

      const result = await sql`
        UPDATE time_slots SET description = ${description}
        WHERE id = ${parseInt(slotId)}
        RETURNING id, description, created_at
      `;

      if (result.length === 0) {
        return res.status(404).json({ success: false, error: 'Time slot not found' });
      }

      return res.status(200).json({ success: true, data: result[0] });
    }

    if (req.method === 'DELETE') {
      const userRole = req.query.userRole;
      const slotId = req.query.slotId;

      if (userRole !== 'admin') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
      }

      await sql`DELETE FROM time_slots WHERE id = ${parseInt(slotId)}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
