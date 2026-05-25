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
      const timeSlotId = req.query.timeSlotId;

      let result;

      if (baiyeId && timeSlotId) {
        result = await sql`
          SELECT b.id, b.user_id, b.character_name, b.character_role, b.character_dps,
                 b.baiye_id, b.time_slot_id, b.remark, b.created_at,
                 by.name AS baiye_name, ts.description AS time_slot_description
          FROM bookings b
          JOIN baiye by ON b.baiye_id = by.id
          JOIN time_slots ts ON b.time_slot_id = ts.id
          WHERE b.baiye_id = ${parseInt(baiyeId)} AND b.time_slot_id = ${parseInt(timeSlotId)}
          ORDER BY b.created_at DESC
        `;
      } else if (baiyeId) {
        result = await sql`
          SELECT b.id, b.user_id, b.character_name, b.character_role, b.character_dps,
                 b.baiye_id, b.time_slot_id, b.remark, b.created_at,
                 by.name AS baiye_name, ts.description AS time_slot_description
          FROM bookings b
          JOIN baiye by ON b.baiye_id = by.id
          JOIN time_slots ts ON b.time_slot_id = ts.id
          WHERE b.baiye_id = ${parseInt(baiyeId)}
          ORDER BY b.created_at DESC
        `;
      } else if (timeSlotId) {
        result = await sql`
          SELECT b.id, b.user_id, b.character_name, b.character_role, b.character_dps,
                 b.baiye_id, b.time_slot_id, b.remark, b.created_at,
                 by.name AS baiye_name, ts.description AS time_slot_description
          FROM bookings b
          JOIN baiye by ON b.baiye_id = by.id
          JOIN time_slots ts ON b.time_slot_id = ts.id
          WHERE b.time_slot_id = ${parseInt(timeSlotId)}
          ORDER BY b.created_at DESC
        `;
      } else {
        result = await sql`
          SELECT b.id, b.user_id, b.character_name, b.character_role, b.character_dps,
                 b.baiye_id, b.time_slot_id, b.remark, b.created_at,
                 by.name AS baiye_name, ts.description AS time_slot_description
          FROM bookings b
          JOIN baiye by ON b.baiye_id = by.id
          JOIN time_slots ts ON b.time_slot_id = ts.id
          ORDER BY b.created_at DESC
        `;
      }

      // 计算统计信息（按百业和时间段分组）
      const stats = {};
      result.forEach(row => {
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
        if (row.character_role === '奶妈') stats[key].healers++;
        else if (row.character_role === '承伤') stats[key].tanks++;
        else if (row.character_role === '输出') stats[key].dps++;
      });

      return res.status(200).json({ success: true, data: result, stats: Object.values(stats) });
    }

    if (req.method === 'POST') {
      const { characterName, characterRole, characterSchool, characterDps, baiyeId, timeSlotId, remark, userId } = req.body;

      if (!userId || !baiyeId || !timeSlotId) {
        return res.status(400).json({ success: false, error: 'userId, baiyeId, and timeSlotId are required' });
      }

      // 检查是否已预约该活动（同一用户+同百业+同时间段）
      const existing = await sql`
        SELECT id FROM bookings
        WHERE user_id = ${parseInt(userId)} AND baiye_id = ${parseInt(baiyeId)} AND time_slot_id = ${parseInt(timeSlotId)}
      `;
      if (existing.length > 0) {
        return res.status(400).json({ success: false, error: '你已经预约了该时段，不能重复预约' });
      }

      // 检查同一场预约的限制
      const existingBookings = await sql`
        SELECT character_role FROM bookings WHERE baiye_id = ${parseInt(baiyeId)} AND time_slot_id = ${parseInt(timeSlotId)}
      `;

      const totalCount = existingBookings.length;
      const healerCount = existingBookings.filter(b => b.character_role === '奶妈').length;

      // 限制1: 总人数不超过10人
      if (totalCount >= 10) {
        return res.status(400).json({ success: false, error: '该时段预约已满（最多10人）' });
      }

      // 限制2: 奶妈最多3人
      if (characterRole === '奶妈' && healerCount >= 3) {
        return res.status(400).json({ success: false, error: '该时段奶妈名额已满（最多3人）' });
      }

      // 限制3: 预留1个位置给奶妈
      if (totalCount >= 9 && healerCount === 0 && characterRole !== '奶妈') {
        return res.status(400).json({ success: false, error: '该时段仅剩1个名额，需预留给奶妈' });
      }

      const result = await sql`
        INSERT INTO bookings (user_id, character_name, character_role, character_school, character_dps, baiye_id, time_slot_id, remark)
        VALUES (${parseInt(userId)}, ${characterName || null}, ${characterRole || null}, ${characterSchool || null}, ${characterDps || null},
                ${parseInt(baiyeId)}, ${parseInt(timeSlotId)}, ${remark || null})
        RETURNING id, user_id, character_name, character_role, character_dps, baiye_id, time_slot_id, remark, created_at
      `;

      return res.status(201).json({ success: true, data: result[0] });
    }

    if (req.method === 'DELETE') {
      const bookingId = req.query.bookingId;
      const userId = req.query.userId;
      const userRole = req.query.userRole;

      // Clear all bookings (admin only)
      if (!bookingId && userRole === 'admin') {
        await sql`DELETE FROM bookings`;
        return res.status(200).json({ success: true, data: { message: 'All bookings cleared' } });
      }

      if (!bookingId || !userId) {
        return res.status(400).json({ success: false, error: 'bookingId and userId are required' });
      }

      // Verify the booking belongs to the user
      const existing = await sql`SELECT user_id FROM bookings WHERE id = ${parseInt(bookingId)}`;

      if (existing.length === 0) {
        return res.status(404).json({ success: false, error: 'Booking not found' });
      }

      if (existing[0].user_id !== parseInt(userId)) {
        const userResult = await sql`SELECT role FROM users WHERE id = ${parseInt(userId)}`;
        if (userResult.length === 0 || userResult[0].role !== 'admin') {
          return res.status(403).json({ success: false, error: 'Not authorized to delete this booking' });
        }
      }

      await sql`DELETE FROM bookings WHERE id = ${parseInt(bookingId)}`;
      return res.status(200).json({ success: true, data: { bookingId: parseInt(bookingId) } });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
