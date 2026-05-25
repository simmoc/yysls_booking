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

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const baiyeId = url.searchParams.get('baiyeId');

      let query = sql`SELECT m.id, m.name, m.baiye_id, m.created_at,
                      by.name AS baiye_name
                      FROM members m
                      JOIN baiye by ON m.baiye_id = by.id`;

      if (baiyeId) {
        query = sql`${query} WHERE m.baiye_id = ${parseInt(baiyeId)}`;
      }

      query = sql`${query} ORDER BY m.created_at DESC`;

      const result = await pool.query(query);
      return new Response(
        JSON.stringify({ success: true, data: result.rows }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      const url = new URL(req.url);
      const userRole = url.searchParams.get('userRole');

      if (userRole !== 'admin') {
        return new Response(
          JSON.stringify({ success: false, error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { name, baiyeId } = await req.json();

      if (!name || !baiyeId) {
        return new Response(
          JSON.stringify({ success: false, error: 'name and baiyeId are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await pool.query(
        sql`INSERT INTO members (name, baiye_id) VALUES (${name}, ${parseInt(baiyeId)})
            RETURNING id, name, baiye_id, created_at`
      );

      return new Response(
        JSON.stringify({ success: true, data: result.rows[0] }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const memberId = url.searchParams.get('memberId');
      const userRole = url.searchParams.get('userRole');

      if (userRole !== 'admin') {
        return new Response(
          JSON.stringify({ success: false, error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!memberId) {
        return new Response(
          JSON.stringify({ success: false, error: 'memberId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const existing = await pool.query(
        sql`SELECT id FROM members WHERE id = ${parseInt(memberId)}`
      );

      if (existing.rows.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Member not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await pool.query(
        sql`DELETE FROM members WHERE id = ${parseInt(memberId)}`
      );

      return new Response(
        JSON.stringify({ success: true, data: { memberId: parseInt(memberId) } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
