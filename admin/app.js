/**
 * 管理后台 - 应用逻辑
 * 燕云百业侠境预约系统
 */

import {
    registerFingerprint,
    getBaiyes,
    getTimeSlots,
    getBookings,
    createBaiye,
    createTimeSlot,
    updateTimeSlot,
    deleteBaiye,
    deleteTimeSlot,
    clearBookings,
    initDatabase
} from '/shared/api-client.js';

import { getVisitorId } from '/shared/fingerprint.js';
import { escapeHtml, showToast, showLoading, openModal, closeModal } from '/shared/utils.js';

// ==================== 全局状态 ====================

let currentUser = null;      // 当前用户信息
let baiyes = [];             // 百业列表缓存
let timeSlots = [];          // 时间段列表缓存
let allBookings = [];        // 所有预约缓存
let isAdmin = false;         // 是否为管理员

// ==================== 初始化 ====================

/**
 * 页面初始化
 */
async function init() {
    showLoading(true);
    try {
        // 获取浏览器指纹
        const fingerprint = await getVisitorId();

        // 注册/获取用户信息
        const result = await registerFingerprint(fingerprint);
        currentUser = result.user;
        isAdmin = currentUser.role === 'admin';

        // 更新用户信息栏
        updateUserInfo();

        // 非管理员显示提示
        if (!isAdmin) {
            showAdminNotice();
        }

        // 加载所有数据
        await refreshAll();

        // 检查数据库状态
        await checkDbStatus();

        // 绑定事件
        bindEvents();
    } catch (error) {
        showToast('初始化失败: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * 刷新所有数据
 */
async function refreshAll() {
    try {
        await Promise.all([
            loadBaiyes(),
            loadTimeSlots(),
            loadMembers(),
            loadBookings()
        ]);
    } catch (error) {
        console.error('刷新数据失败:', error);
    }
}

// ==================== 百业管理 ====================

/**
 * 加载百业列表
 */
async function loadBaiyes() {
    try {
        const data = await getBaiyes();
        baiyes = data.data || data.baiyes || data || [];
        renderBaiyeList();
        updateBaiyeSelects();
    } catch (error) {
        console.error('加载百业失败:', error);
        renderBaiyeList();
    }
}

/**
 * 处理创建百业
 */
async function handleCreateBaiye() {
    if (!checkAdmin()) return;

    const nameInput = document.getElementById('baiye-name');
    const descInput = document.getElementById('baiye-desc');
    const name = nameInput.value.trim();
    const description = descInput.value.trim();

    if (!name) {
        showToast('请输入百业名称', 'error');
        nameInput.focus();
        return;
    }

    try {
        await createBaiye({ name, description }, currentUser.id, currentUser.role);
        showToast('百业创建成功');
        closeModal('baiye-modal');
        nameInput.value = '';
        descInput.value = '';
        await loadBaiyes();
    } catch (error) {
        showToast('创建失败: ' + error.message, 'error');
    }
}

/**
 * 处理删除百业
 * @param {number} id - 百业 ID
 * @param {string} name - 百业名称
 */
async function handleDeleteBaiye(id, name) {
    if (!checkAdmin()) return;

    const confirmed = await showConfirm(`确定要删除百业「${name}」吗？删除后该百业下的所有成员和预约数据将受到影响。`);
    if (!confirmed) return;

    try {
        await deleteBaiye(id, currentUser.id, currentUser.role);
        showToast('百业已删除');
        await refreshAll();
    } catch (error) {
        showToast('删除失败: ' + error.message, 'error');
    }
}

/**
 * 渲染百业列表
 */
function renderBaiyeList() {
    const container = document.getElementById('admin-baiye-list');

    if (!baiyes.length) {
        container.innerHTML = '<p class="empty-tip">暂无百业</p>';
        return;
    }

    container.innerHTML = baiyes.map(item => `
        <div class="admin-item">
            <div class="item-info">
                <span class="item-name">${escapeHtml(item.name)}</span>
                ${item.description ? `<span class="item-desc">${escapeHtml(item.description)}</span>` : ''}
            </div>
            <div class="item-actions">
                <button class="btn-icon admin-action" title="删除" onclick="window._deleteBaiye(${item.id}, '${escapeHtml(item.name)}')">
                    &#x1f5d1;
                </button>
            </div>
        </div>
    `).join('');
}

// ==================== 时间段管理 ====================

/**
 * 加载时间段列表
 */
async function loadTimeSlots() {
    try {
        const data = await getTimeSlots();
        timeSlots = data.data || data.timeSlots || data || [];
        renderTimeSlotList();
        updateTimeSelects();
    } catch (error) {
        console.error('加载时间段失败:', error);
        renderTimeSlotList();
    }
}

/**
 * 处理创建时间段
 */
// 编辑时间段 ID（null 表示创建模式）
let editingTimeSlotId = null;

/**
 * 打开时间段模态框（创建或编辑）
 * @param {number|null} editId - 编辑时传入 ID，创建时传 null
 * @param {string} editDesc - 编辑时传入描述
 */
function showTimeSlotModal(editId = null, editDesc = '') {
    const modal = document.getElementById('time-modal');
    const title = document.getElementById('time-modal-title');
    const startInput = document.getElementById('time-start');
    const endInput = document.getElementById('time-end');
    const noteInput = document.getElementById('time-note');

    editingTimeSlotId = editId;

    if (editId) {
        // 编辑模式：解析描述
        title.textContent = '编辑时间段';
        const match = editDesc.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})(?:\s*\((.+)\))?/);
        if (match) {
            startInput.value = match[1];
            endInput.value = match[2];
            noteInput.value = match[3] || '';
        } else {
            startInput.value = '';
            endInput.value = '';
            noteInput.value = editDesc;
        }
    } else {
        // 创建模式
        title.textContent = '创建时间段';
        startInput.value = '';
        endInput.value = '';
        noteInput.value = '';
    }

    openModal('time-modal');
}

async function handleCreateTimeSlot() {
    if (!checkAdmin()) return;

    const startInput = document.getElementById('time-start');
    const endInput = document.getElementById('time-end');
    const noteInput = document.getElementById('time-note');
    
    const startTime = startInput.value;
    const endTime = endInput.value;
    const note = noteInput.value.trim();

    if (!startTime || !endTime) {
        showToast('请选择开始和结束时间', 'error');
        return;
    }

    // 格式化描述：开始时间-结束时间 (备注)
    let description = `${startTime}-${endTime}`;
    if (note) {
        description += ` (${note})`;
    }

    try {
        if (editingTimeSlotId) {
            // 编辑模式
            await updateTimeSlot(editingTimeSlotId, { description }, currentUser.id, currentUser.role);
            showToast('时间段更新成功');
        } else {
            // 创建模式
            await createTimeSlot({ description }, currentUser.id, currentUser.role);
            showToast('时间段创建成功');
        }
        closeModal('time-modal');
        editingTimeSlotId = null;
        await loadTimeSlots();
    } catch (error) {
        showToast(editingTimeSlotId ? '更新失败: ' + error.message : '创建失败: ' + error.message, 'error');
    }
}

/**
 * 处理编辑时间段
 * @param {number} id - 时间段 ID
 * @param {string} desc - 时间段描述
 */
function handleEditTimeSlot(id, desc) {
    showTimeSlotModal(id, desc);
}

/**
 * 处理删除时间段
 * @param {number} id - 时间段 ID
 * @param {string} desc - 时间段描述
 */
async function handleDeleteTimeSlot(id, desc) {
    if (!checkAdmin()) return;

    const confirmed = await showConfirm(`确定要删除时间段「${desc}」吗？`);
    if (!confirmed) return;

    try {
        await deleteTimeSlot(id, currentUser.id, currentUser.role);
        showToast('时间段已删除');
        await refreshAll();
    } catch (error) {
        showToast('删除失败: ' + error.message, 'error');
    }
}

/**
 * 渲染时间段列表
 */
function renderTimeSlotList() {
    const container = document.getElementById('admin-time-list');

    if (!timeSlots.length) {
        container.innerHTML = '<p class="empty-tip">暂无时间段</p>';
        return;
    }

    container.innerHTML = timeSlots.map(item => `
        <div class="admin-item">
            <div class="item-info">
                <span class="item-name">${escapeHtml(item.description)}</span>
            </div>
            <div class="item-actions">
                <button class="btn-icon admin-action" title="编辑" onclick="window._editTimeSlot(${item.id}, '${escapeHtml(item.description)}')">
                    ✏️
                </button>
                <button class="btn-icon admin-action" title="删除" onclick="window._deleteTimeSlot(${item.id}, '${escapeHtml(item.description)}')">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');
}

// ==================== 成员管理 ====================

/**
 * 加载成员列表（支持按百业筛选）
 */
async function loadMembers() {
    try {
        const filterBaiyeId = document.getElementById('member-filter-baiye')?.value;
        // 从预约列表获取角色（去重）
        const filters = {};
        if (filterBaiyeId) filters.baiyeId = filterBaiyeId;
        const data = await getBookings(filters);
        const bookings = data.data || data.bookings || data || [];
        
        // 提取角色信息并去重（按角色名称+百业）
        const charactersMap = new Map();
        bookings.forEach(b => {
            const charName = b.character_name || b.characterName;
            const baiyeId = b.baiye_id || b.baiyeId;
            if (charName) {
                const key = `${charName}_${baiyeId}`;
                if (!charactersMap.has(key)) {
                    charactersMap.set(key, {
                        name: charName,
                        role: b.character_role || b.characterRole || '',
                        dps: b.character_dps || b.characterDps || b.dps || '',
                        baiyeId: baiyeId,
                        baiyeName: b.baiye_name || ''
                    });
                }
            }
        });
        
        renderMemberList(Array.from(charactersMap.values()));
    } catch (error) {
        console.error('加载成员失败:', error);
        renderMemberList([]);
    }
}

/**
 * 渲染预约角色列表
 * @param {Array} members - 角色数组
 */
function renderMemberList(members) {
    const container = document.getElementById('admin-member-list');

    if (!members || !members.length) {
        container.innerHTML = '<p class="empty-tip">暂无预约角色</p>';
        return;
    }

    container.innerHTML = members.map(item => {
        // 查找百业名称（字符串比较）
        const baiye = baiyes.find(b => String(b.id) === String(item.baiyeId));
        const baiyeName = baiye ? baiye.name : (item.baiyeName || '未知百业');
        
        // 职业标签
        const roleTag = item.role ? `<span class="role-tag role-${escapeHtml(item.role)}">${escapeHtml(getRoleLabel(item.role))}</span>` : '';

        return `
            <div class="admin-item">
                <div class="item-info" style="flex-direction: row; align-items: center; gap: 8px;">
                    <span class="item-name">${escapeHtml(item.name)}</span>
                    ${roleTag}
                    ${item.dps ? `<span class="item-desc">⚔️ ${escapeHtml(String(item.dps))}万</span>` : ''}
                    <span class="item-desc">所属百业: ${escapeHtml(baiyeName)}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== 预约管理 ====================

/**
 * 加载预约列表（支持按百业和时间筛选）
 */
async function loadBookings() {
    try {
        const filterBaiyeId = document.getElementById('booking-filter-baiye')?.value;
        const filterTimeId = document.getElementById('booking-filter-time')?.value;
        const filters = {};
        if (filterBaiyeId) filters.baiyeId = filterBaiyeId;
        if (filterTimeId) filters.timeSlotId = filterTimeId;
        const data = await getBookings(filters);
        allBookings = data.data || data.bookings || data || [];
        renderBookingList(allBookings);
        updateStats(allBookings);
        renderGanttChart(allBookings);
    } catch (error) {
        console.error('加载预约失败:', error);
        allBookings = [];
        renderBookingList([]);
        updateStats([]);
        renderGanttChart([]);
    }
}

/**
 * 处理清空预约记录
 */
async function handleClearBookings() {
    if (!checkAdmin()) return;

    const confirmed = await showConfirm('确定要清空所有预约记录吗？此操作不可撤销！');
    if (!confirmed) return;

    try {
        await clearBookings(currentUser.id, currentUser.role);
        showToast('所有预约已清空');
        await loadBookings();
    } catch (error) {
        showToast('清空失败: ' + error.message, 'error');
    }
}

/**
 * 获取选中的预约 ID 列表
 */
function getSelectedBookingIds() {
    const checkboxes = document.querySelectorAll('.booking-checkbox:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.dataset.bookingId));
}

/**
 * 更新批量操作按钮可见性
 */
function updateBatchActionsVisibility() {
    const selectedIds = getSelectedBookingIds();
    const batchActions = document.querySelector('.booking-batch-actions');
    const countSpan = document.getElementById('booking-selected-count');

    if (selectedIds.length > 0) {
        batchActions.style.display = 'flex';
        batchActions.style.gap = '8px';
        countSpan.textContent = `已选 ${selectedIds.length} 项`;
    } else {
        batchActions.style.display = 'none';
    }
}

/**
 * 全选/取消全选预约
 */
function handleSelectAllBookings() {
    const checkboxes = document.querySelectorAll('.booking-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
    updateBatchActionsVisibility();
}

/**
 * 批量删除选中的预约
 */
async function handleBatchDeleteBookings() {
    if (!checkAdmin()) return;

    const selectedIds = getSelectedBookingIds();
    if (selectedIds.length === 0) {
        showToast('请先选择要删除的预约', 'error');
        return;
    }

    const confirmed = await showConfirm(`确定要删除选中的 ${selectedIds.length} 项预约吗？此操作不可撤销！`);
    if (!confirmed) return;

    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
        try {
            await deleteBooking(id, currentUser.id);
            successCount++;
        } catch (error) {
            failCount++;
        }
    }

    if (failCount === 0) {
        showToast(`已删除 ${successCount} 项预约`);
    } else {
        showToast(`成功 ${successCount} 项，失败 ${failCount} 项`, failCount > 0 ? 'error' : 'success');
    }

    await loadBookings();
}

/**
 * 渲染预约列表 - 按时间段分组展示
 * @param {Array} bookings - 预约数组
 */
function renderBookingList(bookings) {
    const container = document.getElementById('admin-booking-list');

    if (!bookings || !bookings.length) {
        container.innerHTML = '<p class="empty-tip">暂无预约</p>';
        return;
    }

    // 按时间段+百业分组
    const grouped = {};
    bookings.forEach(item => {
        const timeSlotId = item.time_slot_id || item.timeSlotId;
        const timeDesc = item.time_slot_description || getTimeSlotName(timeSlotId);
        const baiyeId = item.baiye_id || item.baiyeId;
        const baiyeName = item.baiye_name || getBaiyeName(baiyeId);
        
        const groupKey = `${timeDesc}_${baiyeName}`;
        if (!grouped[groupKey]) {
            grouped[groupKey] = {
                timeDesc,
                baiyeName,
                timeRange: parseTimeRange(timeDesc),
                bookings: []
            };
        }
        grouped[groupKey].bookings.push(item);
    });

    // 按时间排序
    const sortedGroups = Object.values(grouped).sort((a, b) => a.timeRange.start - b.timeRange.start);

    // 生成 HTML
    let html = '';
    sortedGroups.forEach(group => {
        const { timeDesc, baiyeName, bookings: groupBookings } = group;
        
        // 统计
        const healerCount = groupBookings.filter(b => (b.character_role || b.characterRole) === '奶妈').length;
        const tankCount = groupBookings.filter(b => (b.character_role || b.characterRole) === '承伤').length;
        const dpsCount = groupBookings.filter(b => (b.character_role || b.characterRole) === '输出').length;
        
        html += `
            <div class="booking-group" style="margin-bottom: 16px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); overflow: hidden;">
                <div class="booking-group-header" style="background: linear-gradient(135deg, var(--primary-color), #4a6fa5); color: #fff; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; font-size: 1.05rem;">${escapeHtml(timeDesc)}</div>
                        <div style="font-size: 0.85rem; opacity: 0.9; margin-top: 2px;">${escapeHtml(baiyeName)}</div>
                    </div>
                    <div style="text-align: right; font-size: 0.8rem;">
                        <div>💚${healerCount} 🛡️${tankCount} 🗡️${dpsCount}</div>
                        <div>共 ${groupBookings.length} 人</div>
                    </div>
                </div>
                <div class="booking-group-body" style="padding: 8px;">
        `;
        
        groupBookings.forEach(item => {
            const charName = item.character_name || item.characterName || '未知角色';
            const charRole = item.character_role || item.characterRole || '';
            const charSchool = item.character_school || item.characterSchool || '';
            const charDps = item.character_dps || item.characterDps || item.dps || '';
            const remark = item.remark || '';
            const roleTag = charRole ? `<span class="role-tag role-${escapeHtml(charRole)}">${escapeHtml(getRoleLabel(charRole))}</span>` : '';
            const schoolTag = charSchool ? `<span class="school-tag">${escapeHtml(charSchool)}</span>` : '';

            html += `
                <div class="admin-item admin-booking-item" style="padding: 8px 12px; margin-bottom: 4px; background: var(--bg-color); border-radius: 4px; display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" class="booking-checkbox" data-booking-id="${item.id}" style="width: 18px; height: 18px; cursor: pointer;">
                    <div style="flex: 1; display: flex; justify-content: space-between; align-items: center;">
                        <div class="item-info" style="flex-direction: row; align-items: center; gap: 8px;">
                            <span class="item-name">${escapeHtml(charName)}</span>
                            ${roleTag}
                            ${schoolTag}
                            ${charDps ? `<span class="item-desc">⚔️ ${escapeHtml(String(charDps))}万</span>` : ''}
                        </div>
                        <span class="item-desc" style="font-size: 0.75rem;">#${item.id}</span>
                    </div>
                    ${remark ? `<div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px; padding-left: 26px;">📝 ${escapeHtml(remark)}</div>` : ''}
                </div>
            `;
        });
        
        html += '</div></div>';
    });

    container.innerHTML = html;
}

// ==================== 数据库管理 ====================

/**
 * 处理初始化数据库
 */
async function handleInitDb() {
    if (!checkAdmin()) return;

    const confirmed = await showConfirm('确定要初始化数据库吗？如果数据库已存在数据，此操作不会覆盖现有数据。');
    if (!confirmed) return;

    const statusEl = document.getElementById('db-status');
    statusEl.className = 'db-status pending';
    statusEl.textContent = '正在初始化...';

    try {
        await initDatabase(currentUser.id, currentUser.role);
        statusEl.className = 'db-status ready';
        statusEl.textContent = '数据库已就绪';
        showToast('数据库初始化成功');
        await refreshAll();
    } catch (error) {
        statusEl.className = 'db-status error';
        statusEl.textContent = '初始化失败: ' + error.message;
        showToast('数据库初始化失败: ' + error.message, 'error');
    }
}

/**
 * 检查数据库状态
 */
async function checkDbStatus() {
    const statusEl = document.getElementById('db-status');
    try {
        // 尝试获取百业列表来检测数据库是否可用
        await getBaiyes();
        statusEl.className = 'db-status ready';
        statusEl.textContent = '数据库已就绪';
    } catch (error) {
        statusEl.className = 'db-status error';
        statusEl.textContent = '数据库异常: ' + error.message;
    }
}

// ==================== 确认对话框 ====================

/**
 * 显示确认对话框（替代 window.confirm）
 * @param {string} message - 确认消息
 * @returns {Promise<boolean>} 用户是否确认
 */
function showConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const messageEl = document.getElementById('confirm-message');
        const okBtn = document.getElementById('btn-confirm-ok');
        const cancelBtn = document.getElementById('btn-confirm-cancel');

        messageEl.textContent = message;
        modal.classList.add('active');

        // 清除之前的事件监听器
        const newOk = okBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOk, okBtn);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

        // 绑定确认按钮
        newOk.addEventListener('click', () => {
            modal.classList.remove('active');
            resolve(true);
        });

        // 绑定取消按钮
        newCancel.addEventListener('click', () => {
            modal.classList.remove('active');
            resolve(false);
        });

        // 点击关闭按钮也视为取消
        const closeBtn = modal.querySelector('.close-btn');
        const newClose = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newClose, closeBtn);
        newClose.addEventListener('click', () => {
            modal.classList.remove('active');
            resolve(false);
        });

        // 点击遮罩层也视为取消
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                resolve(false);
            }
        }, { once: true });
    });
}

// ==================== UI 辅助 ====================

/**
 * 更新用户信息栏
 */
function updateUserInfo() {
    const fingerprintEl = document.getElementById('user-fingerprint');
    const roleEl = document.getElementById('user-role');

    if (currentUser) {
        fingerprintEl.textContent = `指纹 ID: ${currentUser.fingerprint || currentUser.id || '未知'}`;
        roleEl.textContent = currentUser.role === 'admin' ? '管理员' : '普通用户';
        roleEl.className = `user-role ${currentUser.role}`;
    }
}

/**
 * 显示非管理员提示
 */
function showAdminNotice() {
    const notice = document.getElementById('admin-notice');
    notice.style.display = 'block';

    // 禁用所有管理操作按钮
    document.querySelectorAll('.admin-action').forEach(btn => {
        btn.disabled = true;
        btn.title = '需要管理员权限';
    });
}

/**
 * 检查管理员权限
 * @returns {boolean} 是否为管理员
 */
function checkAdmin() {
    if (!isAdmin) {
        showToast('需要管理员权限才能执行此操作', 'error');
        return false;
    }
    return true;
}

/**
 * 获取职业类型标签
 */
function getRoleLabel(role) {
    const labels = { '输出': '🗡️ 输出', '承伤': '🛡️ 承伤', '奶妈': '💚 奶妈' };
    return labels[role] || role || '未设置';
}

/**
 * 更新统计一览
 * @param {Array} bookings - 预约数组
 */
function updateStats(bookings) {
    // 统计预约数
    document.getElementById('stat-total-bookings').textContent = bookings.length;
    
    // 统计角色数（去重）
    const uniqueChars = new Set(bookings.map(b => b.character_name || b.characterName).filter(Boolean));
    document.getElementById('stat-total-characters').textContent = uniqueChars.size;
    
    // 百业数
    document.getElementById('stat-total-baiye').textContent = baiyes.length;
    
    // 时间段数
    document.getElementById('stat-total-slots').textContent = timeSlots.length;
}

/**
 * 解析时间段描述获取开始和结束时间（分钟）
 * @param {string} desc - 时间段描述，如 "20:00-22:00 (周一至周五)"
 * @returns {object} {start: 开始分钟, end: 结束分钟}
 */
function parseTimeRange(desc) {
    if (!desc) return { start: 0, end: 1440 };
    
    // 匹配时间格式 HH:MM-HH:MM
    const match = desc.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!match) return { start: 0, end: 1440 };
    
    const startHour = parseInt(match[1]);
    const startMin = parseInt(match[2]);
    const endHour = parseInt(match[3]);
    const endMin = parseInt(match[4]);
    
    return {
        start: startHour * 60 + startMin,
        end: endHour * 60 + endMin
    };
}

/**
 * 渲染甘特图
 * @param {Array} bookings - 预约数组
 */
function renderGanttChart(bookings) {
    const container = document.getElementById('gantt-chart-container');
    
    if (!bookings || bookings.length === 0) {
        container.innerHTML = '<p class="empty-tip">暂无预约数据</p>';
        return;
    }
    
    // 按时间段分组预约
    const bookingsByTimeSlot = {};
    bookings.forEach(b => {
        const timeSlotId = b.time_slot_id || b.timeSlotId;
        const timeDesc = b.time_slot_description || getTimeSlotName(timeSlotId);
        if (!bookingsByTimeSlot[timeDesc]) {
            bookingsByTimeSlot[timeDesc] = { bookings: [], timeRange: parseTimeRange(timeDesc) };
        }
        bookingsByTimeSlot[timeDesc].bookings.push(b);
    });
    
    // 找出最早和最晚的时间范围
    let globalStart = 1440, globalEnd = 0;
    Object.values(bookingsByTimeSlot).forEach(group => {
        globalStart = Math.min(globalStart, group.timeRange.start);
        globalEnd = Math.max(globalEnd, group.timeRange.end);
    });
    const totalMinutes = globalEnd - globalStart || 1440;
    
    // 生成甘特图 HTML - 按时间段作为行
    let html = '<div class="gantt-chart">';
    
    Object.entries(bookingsByTimeSlot).forEach(([timeDesc, group]) => {
        const { timeRange, bookings: slotBookings } = group;
        
        // 计算该时间段在甘特图中的位置
        const left = ((timeRange.start - globalStart) / totalMinutes) * 100;
        const width = ((timeRange.end - timeRange.start) / totalMinutes) * 100;
        
        html += `
            <div class="gantt-row">
                <div class="gantt-label" title="${escapeHtml(timeDesc)}">${escapeHtml(timeDesc.substring(0, 15))}</div>
                <div class="gantt-timeline">
                    <div class="gantt-time-block" style="left: ${left}%; width: ${width}%; background: rgba(74, 111, 165, 0.1); border-radius: 6px; position: absolute; height: 32px;"></div>
        `;
        
        // 在该时间段内分布预约角色
        slotBookings.forEach((b, index) => {
            const role = b.character_role || b.characterRole || '';
            const charName = b.character_name || b.characterName || '未知';
            const baiyeName = b.baiye_name || getBaiyeName(b.baiye_id || b.baiyeId);
            const typeClass = role === '奶妈' ? 'type-healer' : (role === '承伤' ? 'type-tank' : 'type-dps');
            
            // 在时间段内分布（垂直堆叠）
            const barLeft = left + (index * (width / Math.max(slotBookings.length, 1)));
            const barWidth = width / Math.max(slotBookings.length, 1) - 2;
            
            html += `
                <div class="gantt-bar ${typeClass}" 
                     style="left: ${barLeft}%; width: ${Math.max(barWidth, 5)}%;"
                     onclick="showActivityDetail(${b.id})"
                     title="${escapeHtml(charName)} [${escapeHtml(baiyeName)}] - ${escapeHtml(getRoleLabel(role))}">
                    ${escapeHtml(charName.substring(0, 4))}
                </div>
            `;
        });
        
        html += '</div></div>';
    });
    
    html += '</div>';
    
    // 时间轴标签
    const timeLabels = [];
    for (let h = Math.floor(globalStart / 60); h <= Math.ceil(globalEnd / 60); h++) {
        timeLabels.push(`${h.toString().padStart(2, '0')}:00`);
    }
    
    html += `<div class="gantt-time-labels" style="margin-left: 132px;">`;
    timeLabels.forEach((label, i) => {
        const left = (i / (timeLabels.length - 1)) * 100;
        html += `<div class="gantt-time-label" style="position: absolute; left: ${left}%; transform: translateX(-50%);">${label}</div>`;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

/**
 * 显示活动详情
 * @param {number} bookingId - 预约ID
 */
function showActivityDetail(bookingId) {
    const booking = allBookings.find(b => b.id === bookingId);
    if (!booking) return;

    const charName = booking.character_name || booking.characterName || '未知角色';
    const charRole = booking.character_role || booking.characterRole || '';
    const charSchool = booking.character_school || booking.characterSchool || '';
    const charDps = booking.character_dps || booking.characterDps || booking.dps || '';
    const baiyeName = booking.baiye_name || getBaiyeName(booking.baiye_id || booking.baiyeId);
    const timeDesc = booking.time_slot_description || getTimeSlotName(booking.time_slot_id || booking.timeSlotId);
    const remark = booking.remark || '';
    const createdAt = booking.created_at || booking.createdAt || '';

    const content = document.getElementById('activity-detail-content');
    content.innerHTML = `
        <div class="activity-detail-item">
            <span class="activity-detail-label">角色名称</span>
            <span class="activity-detail-value">${escapeHtml(charName)}</span>
        </div>
        <div class="activity-detail-item">
            <span class="activity-detail-label">职业类型</span>
            <span class="activity-detail-value">${escapeHtml(getRoleLabel(charRole))}</span>
        </div>
        ${charSchool ? `
        <div class="activity-detail-item">
            <span class="activity-detail-label">流派</span>
            <span class="activity-detail-value">${escapeHtml(charSchool)}</span>
        </div>
        ` : ''}
        ${charDps ? `
        <div class="activity-detail-item">
            <span class="activity-detail-label">秒伤</span>
            <span class="activity-detail-value">${escapeHtml(String(charDps))} 万</span>
        </div>
        ` : ''}
        <div class="activity-detail-item">
            <span class="activity-detail-label">所属百业</span>
            <span class="activity-detail-value">${escapeHtml(baiyeName)}</span>
        </div>
        <div class="activity-detail-item">
            <span class="activity-detail-label">预约时段</span>
            <span class="activity-detail-value">${escapeHtml(timeDesc)}</span>
        </div>
        ${remark ? `
        <div class="activity-detail-item">
            <span class="activity-detail-label">备注</span>
            <span class="activity-detail-value">${escapeHtml(remark)}</span>
        </div>
        ` : ''}
        ${createdAt ? `
        <div class="activity-detail-item">
            <span class="activity-detail-label">预约时间</span>
            <span class="activity-detail-value">${new Date(createdAt).toLocaleString()}</span>
        </div>
        ` : ''}
    `;

    openModal('activity-detail-modal');
}

/**
 * 更新所有百业下拉选择框
 */
function updateBaiyeSelects() {
    const selects = [
        document.getElementById('member-filter-baiye'),
        document.getElementById('booking-filter-baiye')
    ];

    selects.forEach(select => {
        if (!select) return;
        const currentValue = select.value;
        const isFilter = select.id.includes('filter');

        select.innerHTML = `<option value="">${isFilter ? '全部百业' : '请选择百业'}</option>`;
        baiyes.forEach(b => {
            const option = document.createElement('option');
            option.value = b.id;
            option.textContent = b.name;
            select.appendChild(option);
        });

        // 恢复之前选中的值
        if (currentValue) select.value = currentValue;
    });
}

/**
 * 更新所有时间段下拉选择框
 */
function updateTimeSelects() {
    const select = document.getElementById('booking-filter-time');
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">全部时间</option>';
    timeSlots.forEach(t => {
        const option = document.createElement('option');
        option.value = t.id;
        option.textContent = t.description;
        select.appendChild(option);
    });

    if (currentValue) select.value = currentValue;
}

// ==================== 事件绑定 ====================

/**
 * 绑定所有事件
 */
function bindEvents() {
    // 百业创建
    document.getElementById('btn-create-baiye').addEventListener('click', () => {
        if (!checkAdmin()) return;
        openModal('baiye-modal');
    });
    document.getElementById('btn-save-baiye').addEventListener('click', handleCreateBaiye);

    // 时间段创建
    document.getElementById('btn-create-time').addEventListener('click', () => {
        if (!checkAdmin()) return;
        showTimeSlotModal();
    });
    document.getElementById('btn-save-time').addEventListener('click', handleCreateTimeSlot);

    // 预约清空
    document.getElementById('btn-clear-bookings').addEventListener('click', handleClearBookings);

    // 预约批量操作
    document.getElementById('btn-batch-delete-bookings').addEventListener('click', handleBatchDeleteBookings);
    document.getElementById('btn-select-all').addEventListener('click', handleSelectAllBookings);

    // 预约列表复选框变化监听（事件委托）
    document.getElementById('admin-booking-list').addEventListener('change', (e) => {
        if (e.target.classList.contains('booking-checkbox')) {
            updateBatchActionsVisibility();
        }
    });

    // 数据库初始化
    document.getElementById('btn-init-db').addEventListener('click', handleInitDb);

    // 成员筛选
    document.getElementById('member-filter-baiye').addEventListener('change', loadMembers);

    // 预约筛选
    document.getElementById('booking-filter-baiye').addEventListener('change', loadBookings);
    document.getElementById('booking-filter-time').addEventListener('change', loadBookings);

    // 模态框关闭按钮（通过 data-close 属性）
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(btn.getAttribute('data-close'));
        });
    });

    // 模态框点击遮罩关闭
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // 暴露删除函数到全局（供 onclick 调用）
    window._deleteBaiye = handleDeleteBaiye;
    window._deleteTimeSlot = handleDeleteTimeSlot;
    window._editTimeSlot = handleEditTimeSlot;
    window.showActivityDetail = showActivityDetail;
}

// ==================== 启动 ====================

document.addEventListener('DOMContentLoaded', init);
