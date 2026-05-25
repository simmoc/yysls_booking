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
    const userRole = req.query.userRole;

    if (userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    // Create tables in correct order: users -> baiye -> time_slots -> members -> bookings
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        fingerprint VARCHAR(64) UNIQUE NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS baiye (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS time_slots (
        id SERIAL PRIMARY KEY,
        description VARCHAR(200) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        baiye_id INTEGER REFERENCES baiye(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        character_name VARCHAR(100),
        character_role VARCHAR(20),
        character_school VARCHAR(50),
        character_dps DECIMAL(10,2),
        baiye_id INTEGER REFERENCES baiye(id),
        time_slot_id INTEGER REFERENCES time_slots(id),
        remark TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Add character_school column if it doesn't exist (for existing tables)
    try {
      await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS character_school VARCHAR(50)`;
    } catch (e) {
      // Ignore if column already exists
    }

    return res.status(200).json({ success: true, data: { message: 'All tables created successfully' } });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
