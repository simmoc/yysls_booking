import { pool, sql } from '../_lib/db.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { fingerprint } = await req.json();

    if (!fingerprint) {
      return new Response(
        JSON.stringify({ success: false, error: 'fingerprint is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await pool.query(
      sql`INSERT INTO users (fingerprint) VALUES (${fingerprint})
          ON CONFLICT (fingerprint) DO NOTHING
          RETURNING id, fingerprint, role`
    );

    let user = result.rows[0];

    if (!user) {
      const existing = await pool.query(
        sql`SELECT id, fingerprint, role FROM users WHERE fingerprint = ${fingerprint}`
      );
      user = existing.rows[0];
    }

    return new Response(
      JSON.stringify({ success: true, user }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
