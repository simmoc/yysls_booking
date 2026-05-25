import { pool, sql } from '../_lib/db.js';

export const config = { runtime: 'edge' };

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
      const timeSlotId = url.searchParams.get('timeSlotId');

      let query = sql`SELECT b.id, b.user_id, b.character_name, b.character_role, b.character_dps,
                      b.baiye_id, b.time_slot_id, b.remark, b.created_at,
                      by.name AS baiye_name, ts.description AS time_slot_description
                      FROM bookings b
                      JOIN baiye by ON b.baiye_id = by.id
                      JOIN time_slots ts ON b.time_slot_id = ts.id`;

      const conditions = [];
      const params = [];

      if (baiyeId) {
        conditions.push(sql`b.baiye_id = ${parseInt(baiyeId)}`);
      }
      if (timeSlotId) {
        conditions.push(sql`b.time_slot_id = ${parseInt(timeSlotId)}`);
      }

      if (conditions.length > 0) {
        query = sql`${query} WHERE ${sql.join(conditions, sql` AND `)}`;
      }

      query = sql`${query} ORDER BY b.created_at DESC`;

      const result = await pool.query(query);
      return new Response(
        JSON.stringify({ success: true, data: result.rows }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      const { characterName, characterRole, characterDps, baiyeId, timeSlotId, remark, userId } = await req.json();

      if (!userId || !baiyeId || !timeSlotId) {
        return new Response(
          JSON.stringify({ success: false, error: 'userId, baiyeId, and timeSlotId are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await pool.query(
        sql`INSERT INTO bookings (user_id, character_name, character_role, character_dps, baiye_id, time_slot_id, remark)
            VALUES (${parseInt(userId)}, ${characterName || null}, ${characterRole || null}, ${characterDps || null},
                    ${parseInt(baiyeId)}, ${parseInt(timeSlotId)}, ${remark || null})
            RETURNING id, user_id, character_name, character_role, character_dps, baiye_id, time_slot_id, remark, created_at`
      );

      return new Response(
        JSON.stringify({ success: true, data: result.rows[0] }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url);
      const bookingId = url.searchParams.get('bookingId');
      const userId = url.searchParams.get('userId');
      const userRole = url.searchParams.get('userRole');

      // Clear all bookings (admin only)
      if (!bookingId && userRole === 'admin') {
        await pool.query(sql`DELETE FROM bookings`);
        return new Response(
          JSON.stringify({ success: true, data: { message: 'All bookings cleared' } }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!bookingId || !userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'bookingId and userId are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify the booking belongs to the user
      const existing = await pool.query(
        sql`SELECT user_id FROM bookings WHERE id = ${parseInt(bookingId)}`
      );

      if (existing.rows.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Booking not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (existing.rows[0].user_id !== parseInt(userId)) {
        // Check if user is admin
        const userResult = await pool.query(
          sql`SELECT role FROM users WHERE id = ${parseInt(userId)}`
        );
        if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
          return new Response(
            JSON.stringify({ success: false, error: 'Not authorized to delete this booking' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      await pool.query(
        sql`DELETE FROM bookings WHERE id = ${parseInt(bookingId)}`
      );

      return new Response(
        JSON.stringify({ success: true, data: { bookingId: parseInt(bookingId) } }),
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
