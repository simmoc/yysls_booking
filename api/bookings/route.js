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

      // è®¡ç®—ç»Ÿè®¡ä¿¡æ¯ï¼ˆæŒ‰ç™¾ä¸šå’Œæ—¶é—´æ®µåˆ†ç»„ï¼?      const stats = {};
      result.rows.forEach(row => {
        const key = `${row.baiye_id}_${row.time_slot_id}`;
        if (!stats[key]) {
          stats[key] = {
            baiyeId: row.baiye_id,
            timeSlotId: row.time_slot_id,
            total: 0,
            healers: 0,
            tanks: 0,
            dps: 0
          };
        }
        stats[key].total++;
        if (row.character_role === 'å¥¶å¦ˆ') stats[key].healers++;
        else if (row.character_role === 'æ‰¿ä¼¤') stats[key].tanks++;
        else if (row.character_role === 'è¾“å‡º') stats[key].dps++;
      });

      return new Response(
        JSON.stringify({ success: true, data: result.rows, stats: Object.values(stats) }),
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

      // æ£€æŸ¥åŒä¸€åœºé¢„çº¦çš„é™åˆ¶
      const existingBookings = await pool.query(
        sql`SELECT character_role FROM bookings WHERE baiye_id = ${parseInt(baiyeId)} AND time_slot_id = ${parseInt(timeSlotId)}`
      );

      const totalCount = existingBookings.rows.length;
      const healerCount = existingBookings.rows.filter(b => b.character_role === 'å¥¶å¦ˆ').length;

      // é™åˆ¶1: æ€»äººæ•°ä¸è¶…è¿‡10äº?      if (totalCount >= 10) {
        return new Response(
          JSON.stringify({ success: false, error: 'è¯¥æ—¶æ®µé¢„çº¦å·²æ»¡ï¼ˆæœ€å¤?0äººï¼‰' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // é™åˆ¶2: å¥¶å¦ˆæœ€å¤?äº?      if (characterRole === 'å¥¶å¦ˆ' && healerCount >= 3) {
        return new Response(
          JSON.stringify({ success: false, error: 'è¯¥æ—¶æ®µå¥¶å¦ˆåé¢å·²æ»¡ï¼ˆæœ€å¤?äººï¼‰' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // é™åˆ¶3: é¢„ç•™1ä¸ªä½ç½®ç»™å¥¶å¦ˆ
      // å½“æ€»äººæ•°è¾¾åˆ?äººä¸”æ²¡æœ‰å¥¶å¦ˆæ—¶ï¼Œéžå¥¶å¦ˆè§’è‰²æ— æ³•é¢„çº?      if (totalCount >= 9 && healerCount === 0 && characterRole !== 'å¥¶å¦ˆ') {
        return new Response(
          JSON.stringify({ success: false, error: 'è¯¥æ—¶æ®µä»…å‰?ä¸ªåé¢ï¼Œéœ€é¢„ç•™çµ¦å¥¶å¦? }),
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
