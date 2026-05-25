/**
 * 管理后台 - 应用逻辑
 * 燕云百业侠境预约系统
 */

import {
    registerFingerprint,
    getBaiyes,
    getTimeSlots,
    getBookings,
    getMembers,
    createBaiye,
    createTimeSlot,
    createMember,
    deleteBaiye,
    deleteTimeSlot,
    deleteMember as apiDeleteMember,
    clearBookings,
    initDatabase
} from '/shared/api-client.js';

import { getVisitorId } from '/shared/fingerprint.js';
import { escapeHtml, showToast, showLoading, openModal, closeModal } from '/shared/utils.js';

// ==================== 全局状态 ====================

let currentUser = null;      // 当前用户信息
let baiyes = [];             // 百业列表缓存
let timeSlots = [];          // 时间段列表缓存
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
async function handleCreateTimeSlot() {
    if (!checkAdmin()) return;

    const descInput = document.getElementById('time-desc');
    const description = descInput.value.trim();

    if (!description) {
        showToast('请输入时间描述', 'error');
        descInput.focus();
        return;
    }

    try {
        await createTimeSlot({ description }, currentUser.id, currentUser.role);
        showToast('时间段创建成功');
        closeModal('time-modal');
        descInput.value = '';
        await loadTimeSlots();
    } catch (error) {
        showToast('创建失败: ' + error.message, 'error');
    }
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
                <button class="btn-icon admin-action" title="删除" onclick="window._deleteTimeSlot(${item.id}, '${escapeHtml(item.description)}')">
                    &#x1f5d1;
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
        const data = await getMembers(filterBaiyeId || undefined);
        const members = data.data || data.members || data || [];
        renderMemberList(members);
    } catch (error) {
        console.error('加载成员失败:', error);
        renderMemberList([]);
    }
}

/**
 * 处理创建成员
 */
async function handleCreateMember() {
    if (!checkAdmin()) return;

    const nameInput = document.getElementById('member-name');
    const baiyeSelect = document.getElementById('member-baiye');
    const name = nameInput.value.trim();
    const baiyeId = parseInt(baiyeSelect.value);

    if (!name) {
        showToast('请输入成员名称', 'error');
        nameInput.focus();
        return;
    }

    if (!baiyeId) {
        showToast('请选择所属百业', 'error');
        baiyeSelect.focus();
        return;
    }

    try {
        await createMember({ name, baiyeId }, currentUser.id, currentUser.role);
        showToast('成员添加成功');
        closeModal('member-modal');
        nameInput.value = '';
        baiyeSelect.value = '';
        await loadMembers();
    } catch (error) {
        showToast('添加失败: ' + error.message, 'error');
    }
}

/**
 * 处理删除成员
 * @param {number} id - 成员 ID
 * @param {string} name - 成员名称
 */
async function handleDeleteMember(id, name) {
    if (!checkAdmin()) return;

    const confirmed = await showConfirm(`确定要删除成员「${name}」吗？`);
    if (!confirmed) return;

    try {
        await apiDeleteMember(id, currentUser.id, currentUser.role);
        showToast('成员已删除');
        await loadMembers();
    } catch (error) {
        showToast('删除失败: ' + error.message, 'error');
    }
}

/**
 * 渲染成员列表
 * @param {Array} members - 成员数组
 */
function renderMemberList(members) {
    const container = document.getElementById('admin-member-list');

    if (!members || !members.length) {
        container.innerHTML = '<p class="empty-tip">暂无成员</p>';
        return;
    }

    container.innerHTML = members.map(item => {
        // 查找百业名称
        const baiye = baiyes.find(b => b.id === item.baiyeId);
        const baiyeName = baiye ? baiye.name : '未知百业';

        return `
            <div class="admin-item">
                <div class="item-info">
                    <span class="item-name">${escapeHtml(item.name)}</span>
                    <span class="item-desc">所属百业: ${escapeHtml(baiyeName)}</span>
                </div>
                <div class="item-actions">
                    <button class="btn-icon admin-action" title="删除" onclick="window._deleteMember(${item.id}, '${escapeHtml(item.name)}')">
                        &#x1f5d1;
                    </button>
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
        const data = await getBookings(
            filterBaiyeId || undefined,
            filterTimeId || undefined
        );
        const bookings = data.data || data.bookings || data || [];
        renderBookingList(bookings);
    } catch (error) {
        console.error('加载预约失败:', error);
        renderBookingList([]);
    }
}

/**
 * 处理清空所有预约
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
 * 渲染预约列表
 * @param {Array} bookings - 预约数组
 */
function renderBookingList(bookings) {
    const container = document.getElementById('admin-booking-list');

    if (!bookings || !bookings.length) {
        container.innerHTML = '<p class="empty-tip">暂无预约</p>';
        return;
    }

    container.innerHTML = bookings.map(item => {
        // 查找百业名称
        const baiye = baiyes.find(b => b.id === item.baiyeId);
        const baiyeName = baiye ? baiye.name : '未知百业';

        // 查找时间段描述
        const slot = timeSlots.find(t => t.id === item.timeSlotId);
        const timeDesc = slot ? slot.description : '未知时段';

        // 职业类型标签
        const role = item.characterRole || item.character_role;
        const roleTag = role ? `<span class="role-tag role-${escapeHtml(role)}">${escapeHtml(getRoleLabel(role))}</span>` : '';

        return `
            <div class="admin-item" style="flex-direction: column; align-items: flex-start; gap: 8px;">
                <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                    <div class="item-info" style="flex-direction: row; align-items: center; gap: 8px;">
                        <span class="item-name">${escapeHtml(item.characterName || item.memberName || '未知角色')}</span>
                        ${roleTag}
                        ${item.dps ? `<span class="item-desc">秒伤: ${escapeHtml(String(item.dps))}万</span>` : ''}
                    </div>
                    <span class="item-desc" style="font-size: 0.8rem;">#${item.id}</span>
                </div>
                <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 0.9rem; color: var(--text-secondary);">
                    <span>百业: ${escapeHtml(baiyeName)}</span>
                    <span>时间: ${escapeHtml(timeDesc)}</span>
                    ${item.remark ? `<span>备注: ${escapeHtml(item.remark)}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
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
 * 更新所有百业下拉选择框
 */
function updateBaiyeSelects() {
    const selects = [
        document.getElementById('member-filter-baiye'),
        document.getElementById('member-baiye'),
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
        openModal('time-modal');
    });
    document.getElementById('btn-save-time').addEventListener('click', handleCreateTimeSlot);

    // 成员创建
    document.getElementById('btn-create-member').addEventListener('click', () => {
        if (!checkAdmin()) return;
        openModal('member-modal');
    });
    document.getElementById('btn-save-member').addEventListener('click', handleCreateMember);

    // 预约清空
    document.getElementById('btn-clear-bookings').addEventListener('click', handleClearBookings);

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
    window._deleteMember = handleDeleteMember;
}

// ==================== 启动 ====================

document.addEventListener('DOMContentLoaded', init);
