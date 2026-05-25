/**
 * API 客户端 - 与后端 API 通信
 * 基础 URL 自动检测当前域名
 */

const API_BASE = '/api';

/**
 * 通用请求方法
 * @param {string} endpoint - API 端点
 * @param {object} options - 请求选项
 * @returns {Promise<any>} 响应数据
 */
async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    const response = await fetch(url, config);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `请求失败 (${response.status})`);
    }

    return response.json();
}

// ==================== 用户相关 ====================

/**
 * 注册/获取用户信息
 * @param {string} fingerprint - 浏览器指纹 ID
 * @returns {Promise<{user: object}>} 用户信息
 */
export async function registerFingerprint(fingerprint) {
    return request('/fingerprint', {
        method: 'POST',
        body: JSON.stringify({ fingerprint })
    });
}

// ==================== 百业相关 ====================

/**
 * 获取所有百业列表
 * @returns {Promise<Array>} 百业列表
 */
export async function getBaiyes() {
    return request('/baiye');
}

/**
 * 创建百业
 * @param {object} data - 百业数据 { name, description }
 * @param {string} userId - 用户 ID
 * @param {string} userRole - 用户角色
 * @returns {Promise<object>} 创建的百业
 */
export async function createBaiye(data, userId, userRole) {
    return request(`/baiye?userId=${encodeURIComponent(userId)}&userRole=${encodeURIComponent(userRole)}`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

/**
 * 删除百业
 * @param {number} baiyeId - 百业 ID
 * @param {string} userId - 用户 ID
 * @param {string} userRole - 用户角色
 * @returns {Promise<object>} 删除结果
 */
export async function deleteBaiye(baiyeId, userId, userRole) {
    return request(`/baiye?baiyeId=${baiyeId}&userId=${encodeURIComponent(userId)}&userRole=${encodeURIComponent(userRole)}`, {
        method: 'DELETE'
    });
}

// ==================== 时间段相关 ====================

/**
 * 获取所有时间段列表
 * @returns {Promise<Array>} 时间段列表
 */
export async function getTimeSlots() {
    return request('/time-slots');
}

/**
 * 创建时间段
 * @param {object} data - 时间段数据 { description }
 * @param {string} userId - 用户 ID
 * @param {string} userRole - 用户角色
 * @returns {Promise<object>} 创建的时间段
 */
export async function createTimeSlot(data, userId, userRole) {
    return request(`/time-slots?userId=${encodeURIComponent(userId)}&userRole=${encodeURIComponent(userRole)}`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

/**
 * 更新时间段
 * @param {number} slotId - 时间段 ID
 * @param {object} data - 时间段数据 { description }
 * @param {string} userId - 用户 ID
 * @param {string} userRole - 用户角色
 * @returns {Promise<object>} 更新后的时间段
 */
export async function updateTimeSlot(slotId, data, userId, userRole) {
    return request(`/time-slots?slotId=${slotId}&userId=${encodeURIComponent(userId)}&userRole=${encodeURIComponent(userRole)}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
}

/**
 * 删除时间段
 * @param {number} slotId - 时间段 ID
 * @param {string} userId - 用户 ID
 * @param {string} userRole - 用户角色
 * @returns {Promise<object>} 删除结果
 */
export async function deleteTimeSlot(slotId, userId, userRole) {
    return request(`/time-slots?slotId=${slotId}&userId=${encodeURIComponent(userId)}&userRole=${encodeURIComponent(userRole)}`, {
        method: 'DELETE'
    });
}

// ==================== 成员相关 ====================

/**
 * 获取所有成员列表
 * @param {number} [baiyeId] - 可选，按百业 ID 筛选
 * @returns {Promise<Array>} 成员列表
 */
export async function getMembers(baiyeId) {
    const endpoint = baiyeId ? `/members?baiyeId=${baiyeId}` : '/members';
    return request(endpoint);
}

/**
 * 创建成员
 * @param {object} data - 成员数据 { name, baiyeId }
 * @param {string} userId - 用户 ID
 * @param {string} userRole - 用户角色
 * @returns {Promise<object>} 创建的成员
 */
export async function createMember(data, userId, userRole) {
    return request(`/members?userId=${encodeURIComponent(userId)}&userRole=${encodeURIComponent(userRole)}`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

/**
 * 删除成员
 * @param {number} memberId - 成员 ID
 * @param {string} userId - 用户 ID
 * @param {string} userRole - 用户角色
 * @returns {Promise<object>} 删除结果
 */
export async function deleteMember(memberId, userId, userRole) {
    return request(`/members?memberId=${memberId}&userId=${encodeURIComponent(userId)}&userRole=${encodeURIComponent(userRole)}`, {
        method: 'DELETE'
    });
}

// ==================== 预约相关 ====================

/**
 * 获取所有预约列表
 * @param {object} [filters] - 可选筛选条件 { baiyeId, timeSlotId }
 * @returns {Promise<Array>} 预约列表
 */
export async function getBookings(filters = {}) {
    let endpoint = '/bookings';
    const params = [];
    if (filters.baiyeId) params.push(`baiyeId=${encodeURIComponent(filters.baiyeId)}`);
    if (filters.timeSlotId) params.push(`timeSlotId=${encodeURIComponent(filters.timeSlotId)}`);
    if (params.length > 0) endpoint += '?' + params.join('&');
    return request(endpoint);
}

/**
 * 创建预约
 * @param {object} data - 预约数据 { characterName, dps, baiyeId, timeSlotId, remark, fingerprint }
 * @returns {Promise<object>} 创建的预约
 */
export async function createBooking(data) {
    return request('/bookings', {
        method: 'POST',
        body: JSON.stringify(data)
    });
}

/**
 * 删除预约
 * @param {number} bookingId - 预约 ID
 * @param {string} userId - 用户 ID
 * @returns {Promise<object>} 删除结果
 */
export async function deleteBooking(bookingId, userId) {
    return request(`/bookings?bookingId=${bookingId}&userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE'
    });
}

/**
 * 清空所有预约
 * @param {string} userId - 用户 ID
 * @param {string} userRole - 用户角色
 * @returns {Promise<object>} 清空结果
 */
export async function clearBookings(userId, userRole) {
    return request(`/bookings?userId=${encodeURIComponent(userId)}&userRole=${encodeURIComponent(userRole)}`, {
        method: 'DELETE'
    });
}

// ==================== 数据库管理 ====================

/**
 * 初始化数据库
 * @param {string} userId - 用户 ID
 * @param {string} userRole - 用户角色
 * @returns {Promise<object>} 初始化结果
 */
export async function initDatabase(userId, userRole) {
    return request(`/init-db?userId=${encodeURIComponent(userId)}&userRole=${encodeURIComponent(userRole)}`, {
        method: 'POST'
    });
}
