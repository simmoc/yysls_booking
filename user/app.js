/**
 * 燕云百业侠境预约系统 - 用户页面逻辑
 */

import { registerFingerprint, getBaiyes, getTimeSlots, getBookings, getMembers, createBooking, deleteBooking } from '/shared/api-client.js';
import { getVisitorId } from '/shared/fingerprint.js';
import { escapeHtml, showToast, generateShareLink, copyToClipboard } from '/shared/utils.js';

// ==================== 全局状态 ====================

/** 当前登录用户 { id, fingerprint, role } */
let currentUser = null;

/** 当前选中的角色 { id, name, dps } */
let currentCharacter = null;

/** 所有百业数据 */
let baiyes = [];

/** 所有时间段数据 */
let timeSlots = [];

/** 所有预约数据（当前筛选条件下的） */
let allBookings = [];

// ==================== localStorage 常量 ====================

const CHAR_KEY = 'yy_current_character';
const CHARS_KEY = 'yy_characters';

// ==================== 初始化 ====================

/**
 * 应用初始化入口
 */
async function init() {
    showLoading(true);
    try {
        // 1. 获取浏览器指纹
        const fingerprint = await getVisitorId();

        // 2. 注册/登录
        const result = await registerFingerprint(fingerprint);
        currentUser = result.user;

        // 3. 加载本地角色
        loadLocalCharacter();

        // 4. 检查 URL 参数（分享链接）
        checkShareParams();

        // 5. 加载服务端数据
        await Promise.all([loadBaiyes(), loadTimeSlots()]);

        // 6. 加载预约列表
        await loadBookings();

        // 7. 更新 UI
        updateUI();
    } catch (error) {
        showToast('初始化失败: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== 角色管理（localStorage） ====================

/**
 * 从 localStorage 加载当前角色
 */
function loadLocalCharacter() {
    try {
        currentCharacter = JSON.parse(localStorage.getItem(CHAR_KEY) || 'null');
    } catch {
        currentCharacter = null;
    }
}

/**
 * 保存当前角色到 localStorage
 */
function saveLocalCharacter() {
    if (currentCharacter) {
        localStorage.setItem(CHAR_KEY, JSON.stringify(currentCharacter));
    } else {
        localStorage.removeItem(CHAR_KEY);
    }
}

/**
 * 获取所有角色列表
 * @returns {Array<{id: string, name: string, dps: string|number}>}
 */
function getAllCharacters() {
    try {
        return JSON.parse(localStorage.getItem(CHARS_KEY) || '[]');
    } catch {
        return [];
    }
}

/**
 * 保存所有角色列表到 localStorage
 * @param {Array} chars - 角色数组
 */
function saveAllCharacters(chars) {
    localStorage.setItem(CHARS_KEY, JSON.stringify(chars));
}

/**
 * 生成唯一 ID
 * @returns {string}
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * 打开角色创建模态框
 */
function showCharacterModal(editId) {
    const modal = document.getElementById('character-modal');
    const title = document.getElementById('character-modal-title');
    const idInput = document.getElementById('character-id');
    const nameInput = document.getElementById('character-name');
    const roleSelect = document.getElementById('character-role');
    const dpsInput = document.getElementById('character-dps');
    const dpsGroup = document.getElementById('dps-group');

    if (editId) {
        // 编辑模式
        const chars = getAllCharacters();
        const char = chars.find(c => c.id === editId);
        if (!char) return;
        title.textContent = '编辑角色';
        idInput.value = char.id;
        nameInput.value = char.name;
        roleSelect.value = char.role || '';
        dpsInput.value = char.dps || '';
    } else {
        // 创建模式
        title.textContent = '创建角色';
        idInput.value = '';
        nameInput.value = '';
        roleSelect.value = '';
        dpsInput.value = '';
    }

    // 根据职业类型控制秒伤字段显示
    toggleDpsField(roleSelect.value);

    openModal('character-modal');
    nameInput.focus();
}

/**
 * 根据职业类型切换秒伤字段显示
 * @param {string} role - 职业类型
 */
function toggleDpsField(role) {
    const dpsGroup = document.getElementById('dps-group');
    if (role === '奶妈') {
        dpsGroup.style.display = 'none';
    } else {
        dpsGroup.style.display = 'block';
    }
}

/**
 * 保存角色（创建或编辑）
 */
function saveCharacter() {
    const idInput = document.getElementById('character-id');
    const nameInput = document.getElementById('character-name');
    const roleSelect = document.getElementById('character-role');
    const dpsInput = document.getElementById('character-dps');

    const name = nameInput.value.trim();
    if (!name) {
        showToast('请输入角色名称', 'error');
        nameInput.focus();
        return;
    }

    const role = roleSelect.value;
    if (!role) {
        showToast('请选择职业类型', 'error');
        roleSelect.focus();
        return;
    }

    const dps = role === '奶妈' ? '' : dpsInput.value.trim();
    const chars = getAllCharacters();
    const editId = idInput.value;

    if (editId) {
        // 编辑已有角色
        const index = chars.findIndex(c => c.id === editId);
        if (index !== -1) {
            chars[index].name = name;
            chars[index].role = role;
            chars[index].dps = dps;
            // 如果编辑的是当前角色，同步更新
            if (currentCharacter && currentCharacter.id === editId) {
                currentCharacter = chars[index];
                saveLocalCharacter();
            }
        }
    } else {
        // 创建新角色
        const newChar = {
            id: generateId(),
            name,
            role,
            dps
        };
        chars.push(newChar);
        // 自动选中新创建的角色
        currentCharacter = newChar;
        saveLocalCharacter();
    }

    saveAllCharacters(chars);
    closeModal('character-modal');
    updateUI();
    showToast(editId ? '角色已更新' : '角色创建成功');
}

/**
 * 删除角色
 * @param {string} charId - 角色ID
 */
function deleteCharacter(charId) {
    if (!confirm('确定要删除该角色吗？')) return;

    let chars = getAllCharacters();
    chars = chars.filter(c => c.id !== charId);
    saveAllCharacters(chars);

    // 如果删除的是当前角色，清除选择
    if (currentCharacter && currentCharacter.id === charId) {
        currentCharacter = chars.length > 0 ? chars[0] : null;
        saveLocalCharacter();
    }

    updateUI();
    showToast('角色已删除');
}

/**
 * 选择角色
 * @param {string} charId - 角色ID
 */
function selectCharacter(charId) {
    const chars = getAllCharacters();
    const char = chars.find(c => c.id === charId);
    if (char) {
        currentCharacter = char;
        saveLocalCharacter();
        updateUI();
    }
}

// ==================== 数据加载 ====================

/**
 * 加载百业列表
 */
async function loadBaiyes() {
    try {
        const data = await getBaiyes();
        baiyes = Array.isArray(data) ? data : (data.data || data.baiyes || []);

        // 填充百业下拉框
        const baiyeSelect = document.getElementById('baiye-select');
        const filterBaiye = document.getElementById('filter-baiye');

        // 保留第一个默认选项
        baiyeSelect.innerHTML = '<option value="">请选择百业</option>';
        filterBaiye.innerHTML = '<option value="">全部百业</option>';

        baiyes.forEach(item => {
            const id = item.id || item._id;
            const name = item.name || item.baiyeName || '';
            baiyeSelect.innerHTML += `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`;
            filterBaiye.innerHTML += `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`;
        });

        // 如果有分享参数中的百业ID，自动选中
        const shareBaiyeId = sessionStorage.getItem('share_baiye');
        if (shareBaiyeId) {
            baiyeSelect.value = shareBaiyeId;
        }
    } catch (error) {
        console.error('加载百业失败:', error);
        showToast('加载百业列表失败', 'error');
    }
}

/**
 * 加载时间段列表
 */
async function loadTimeSlots() {
    try {
        const data = await getTimeSlots();
        timeSlots = Array.isArray(data) ? data : (data.data || data.timeSlots || []);

        // 填充时间下拉框
        const timeSelect = document.getElementById('time-select');
        const filterTime = document.getElementById('filter-time');

        timeSelect.innerHTML = '<option value="">请选择时间</option>';
        filterTime.innerHTML = '<option value="">全部时间</option>';

        timeSlots.forEach(item => {
            const id = item.id || item._id;
            const desc = item.description || item.timeDesc || item.name || '';
            timeSelect.innerHTML += `<option value="${escapeHtml(id)}">${escapeHtml(desc)}</option>`;
            filterTime.innerHTML += `<option value="${escapeHtml(id)}">${escapeHtml(desc)}</option>`;
        });

        // 如果有分享参数中的时间ID，自动选中
        const shareTimeId = sessionStorage.getItem('share_time');
        if (shareTimeId) {
            timeSelect.value = shareTimeId;
        }
    } catch (error) {
        console.error('加载时间段失败:', error);
        showToast('加载时间段列表失败', 'error');
    }
}

/**
 * 加载预约列表（支持筛选）
 */
async function loadBookings() {
    try {
        const filterBaiyeId = document.getElementById('filter-baiye').value;
        const filterTimeId = document.getElementById('filter-time').value;

        const params = {};
        if (filterBaiyeId) params.baiyeId = filterBaiyeId;
        if (filterTimeId) params.timeSlotId = filterTimeId;

        const data = await getBookings(params);
        allBookings = Array.isArray(data) ? data : (data.data || data.bookings || []);
        // 保存统计信息（用于预约表单显示）
        window.bookingStats = data.stats || [];

        renderBookingList(allBookings);
        updateStats(allBookings);
        updateBookingFormStats();
    } catch (error) {
        console.error('加载预约列表失败:', error);
        showToast('加载预约列表失败', 'error');
    }
}

// ==================== 预约操作 ====================

/**
 * 创建预约
 */
async function submitBooking() {
    if (!currentUser) {
        showToast('用户未登录，请刷新页面重试', 'error');
        return;
    }

    if (!currentCharacter) {
        showToast('请先选择一个角色', 'error');
        return;
    }

    const baiyeId = document.getElementById('baiye-select').value;
    const timeSlotId = document.getElementById('time-select').value;
    const remark = document.getElementById('remark-input').value.trim();

    if (!baiyeId) {
        showToast('请选择百业', 'error');
        return;
    }

    if (!timeSlotId) {
        showToast('请选择时间', 'error');
        return;
    }

    try {
        await createBooking({
    userId: currentUser.id,
    baiyeId: parseInt(baiyeId),
    timeSlotId: parseInt(timeSlotId),
    characterName: currentCharacter.name,
    characterRole: currentCharacter.role || null,
    characterDps: currentCharacter.dps ? parseFloat(currentCharacter.dps) : null,
    remark
});

        showToast('预约成功！');

        // 清空表单
        document.getElementById('remark-input').value = '';

        // 重新加载预约列表
        await loadBookings();
    } catch (error) {
        showToast('预约失败: ' + error.message, 'error');
    }
}

/**
 * 删除预约
 * @param {string} bookingId - 预约ID
 */
async function removeBooking(bookingId) {
    if (!currentUser) {
        showToast('用户未登录', 'error');
        return;
    }

    if (!confirm('确定要取消该预约吗？')) return;

    try {
        await deleteBooking(bookingId, currentUser.id);
        showToast('预约已取消');
        await loadBookings();
    } catch (error) {
        showToast('取消预约失败: ' + error.message, 'error');
    }
}

// ==================== 分享功能 ====================

/**
 * 检查 URL 参数，处理分享链接
 */
function checkShareParams() {
    const params = new URLSearchParams(window.location.search);
    const baiyeId = params.get('baiye');
    const timeSlotId = params.get('time');

    if (baiyeId || timeSlotId) {
        // 存储分享参数到 sessionStorage
        sessionStorage.setItem('share_baiye', baiyeId || '');
        sessionStorage.setItem('share_time', timeSlotId || '');
        // 横幅在数据加载完成后显示
    }
}

/**
 * 显示分享横幅
 */
function showShareBanner() {
    const baiyeId = sessionStorage.getItem('share_baiye');
    const timeSlotId = sessionStorage.getItem('share_time');

    if (!baiyeId && !timeSlotId) return;

    const banner = document.getElementById('share-banner');
    const titleEl = document.getElementById('share-banner-title');
    const descEl = document.getElementById('share-banner-desc');

    const baiyeName = baiyeId ? getBaiyeName(baiyeId) : '';
    const timeName = timeSlotId ? getTimeSlotName(timeSlotId) : '';

    let title = '来自好友的分享';
    let desc = '';

    if (baiyeName && timeName) {
        title = `${baiyeName} · ${timeName}`;
        desc = '好友邀请你参与预约，请选择角色后快速预约';
    } else if (baiyeName) {
        title = baiyeName;
        desc = '好友邀请你参与此百业预约';
    } else if (timeName) {
        title = timeName;
        desc = '好友邀请你参与此时段预约';
    }

    titleEl.textContent = title;
    descEl.textContent = desc;
    banner.classList.remove('hidden');
}

/**
 * 关闭分享横幅
 */
function closeShareBanner() {
    document.getElementById('share-banner').classList.add('hidden');
    sessionStorage.removeItem('share_baiye');
    sessionStorage.removeItem('share_time');
}

/**
 * 打开分享模态框
 */
function openShareModal() {
    const baiyeId = document.getElementById('baiye-select').value;
    const timeSlotId = document.getElementById('time-select').value;

    if (!baiyeId && !timeSlotId) {
        showToast('请先选择百业或时间', 'error');
        return;
    }

    const link = generateShareLink(baiyeId, timeSlotId);
    document.getElementById('share-link').value = link;
    openModal('share-modal');
}

/**
 * 复制分享链接
 */
async function copyShareLink() {
    const link = document.getElementById('share-link').value;
    const success = await copyToClipboard(link);
    if (success) {
        showToast('链接已复制到剪贴板');
        closeModal('share-modal');
    } else {
        showToast('复制失败，请手动复制', 'error');
    }
}

// ==================== 辅助函数 ====================

/**
 * 根据 ID 获取百业名称
 * @param {string} id - 百业ID
 * @returns {string} 百业名称
 */
function getBaiyeName(id) {
    const strId = String(id);
    const item = baiyes.find(b => String(b.id || b._id) === strId);
    return item ? (item.name || item.baiyeName || '未知百业') : '未知百业';
}

/**
 * 根据 ID 获取时间段名称
 * @param {string} id - 时间段ID
 * @returns {string} 时间段描述
 */
function getTimeSlotName(id) {
    const strId = String(id);
    const item = timeSlots.find(t => String(t.id || t._id) === strId);
    return item ? (item.description || item.timeDesc || item.name || '未知时间') : '未知时间';
}

// ==================== UI 渲染 ====================

/**
 * 更新整体 UI
 */
function updateUI() {
    renderCharacterList();
    updateBookingFormVisibility();
    updateStats(allBookings);

    // 数据加载完成后检查分享横幅
    showShareBanner();
}

/**
 * 渲染角色列表
 */
function renderCharacterList() {
    const container = document.getElementById('character-list');
    const chars = getAllCharacters();

    if (chars.length === 0) {
        container.innerHTML = '<p class="empty-tip">暂无角色，请创建</p>';
        return;
    }

    container.innerHTML = chars.map(char => {
        const isActive = currentCharacter && currentCharacter.id === char.id;
        const roleLabel = getRoleLabel(char.role);
        const dpsText = char.dps ? `${escapeHtml(char.dps)} 万秒伤` : '未填写秒伤';
        return `
            <div class="character-item ${isActive ? 'active' : ''}" data-id="${escapeHtml(char.id)}">
                <div class="char-info" onclick="window._selectCharacter('${escapeHtml(char.id)}')">
                    <span class="char-name">${escapeHtml(char.name)}</span>
                    <div class="char-meta">
                        <span class="role-tag role-${escapeHtml(char.role || '')}">${escapeHtml(roleLabel)}</span>
                        <span class="char-dps">${escapeHtml(dpsText)}</span>
                    </div>
                </div>
                <div class="char-actions">
                    <button class="btn-icon" title="编辑" onclick="event.stopPropagation(); window._showCharacterModal('${escapeHtml(char.id)}')">&#9998;</button>
                    <button class="btn-icon" title="删除" onclick="event.stopPropagation(); window._deleteCharacter('${escapeHtml(char.id)}')">&#10005;</button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 获取职业类型标签
 * @param {string} role - 职业类型
 * @returns {string} 显示标签
 */
function getRoleLabel(role) {
    const labels = {
        '输出': '🗡️ 输出',
        '承伤': '🛡️ 承伤',
        '奶妈': '💚 奶妈'
    };
    return labels[role] || role || '未设置';
}

/**
 * 更新预约表单的显示/隐藏
 */
function updateBookingFormVisibility() {
    const noTip = document.getElementById('no-character-tip');
    const form = document.getElementById('booking-form');

    if (currentCharacter) {
        noTip.style.display = 'none';
        form.style.display = 'block';

        // 更新当前角色显示
        const charEl = document.getElementById('current-character');
        const dpsText = currentCharacter.dps ? ` · ${escapeHtml(currentCharacter.dps)} 万秒伤` : '';
        charEl.innerHTML = `
            <div class="character-tag">
                <span class="booking-char">${escapeHtml(currentCharacter.name)}</span>
                <span class="booking-dps">${escapeHtml(currentCharacter.dps || '未填写')}</span>
            </div>
        `;
    } else {
        noTip.style.display = 'block';
        form.style.display = 'none';
    }
}

/**
 * 渲染预约列表
 * @param {Array} bookings - 预约数组
 */
function renderBookingList(bookings) {
    const container = document.getElementById('booking-list');

    if (!bookings || bookings.length === 0) {
        container.innerHTML = '<p class="empty-tip">暂无预约</p>';
        return;
    }

    container.innerHTML = bookings.map(booking => {
        const id = booking.id || booking._id;
        // 兼容蛇形和驼峰命名
        const charName = booking.character_name || booking.characterName || booking.name || '未知角色';
        const charRole = booking.character_role || booking.characterRole || '';
        const charDps = booking.character_dps || booking.characterDps || booking.dps || '';
        const baiyeId = booking.baiye_id || booking.baiyeId;
        const timeSlotId = booking.time_slot_id || booking.timeSlotId;
        const baiyeName = booking.baiye_name || getBaiyeName(baiyeId);
        const timeName = booking.time_slot_description || getTimeSlotName(timeSlotId);
        const remark = booking.remark || '';
        const isOwner = currentUser && (booking.user_id === currentUser.id || booking.userId === currentUser.id);
        const roleTag = charRole
            ? `<span class="role-tag role-${escapeHtml(charRole)}">${escapeHtml(getRoleLabel(charRole))}</span>`
            : '';

        return `
            <div class="booking-item">
                <div class="booking-info">
                    <div class="booking-header">
                        <span class="booking-char">${escapeHtml(charName)}</span>
                        ${roleTag}
                        ${charDps ? `<span class="booking-dps">⚔️ ${escapeHtml(charDps)}万</span>` : ''}
                    </div>
                    <div class="booking-detail">
                        <span class="booking-baiye">🏢 ${escapeHtml(baiyeName)}</span>
                        <span class="booking-time">⏰ ${escapeHtml(timeName)}</span>
                    </div>
                    ${remark ? `<div class="booking-remark">📝 ${escapeHtml(remark)}</div>` : ''}
                </div>
                <div class="booking-actions">
                    <button class="btn-icon btn-view-members" data-baiye-id="${escapeHtml(baiyeId)}" data-time-slot-id="${escapeHtml(timeSlotId)}" title="查看详情">👥</button>
                    ${isOwner ? `<button class="btn btn-small btn-danger" onclick="window._removeBooking('${escapeHtml(id)}')">取消预约</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 更新统计信息
 * @param {Array} bookings - 预约数组
 */
function updateStats(bookings) {
    const myCount = currentUser
        ? bookings.filter(b => b.userId === currentUser.id || b.fingerprint === currentUser.fingerprint).length
        : 0;

    document.getElementById('stat-my-bookings').textContent = myCount;
    document.getElementById('stat-total-bookings').textContent = bookings.length;
    document.getElementById('stat-baiye-count').textContent = baiyes.length;
}

/**
 * 更新预约表单中的人数统计显示
 */
function updateBookingFormStats() {
    const baiyeId = document.getElementById('baiye-select').value;
    const timeSlotId = document.getElementById('time-select').value;
    const statsContainer = document.getElementById('booking-stats');

    // 如果未选择百业或时间，隐藏统计
    if (!baiyeId || !timeSlotId) {
        statsContainer.style.display = 'none';
        return;
    }

    // 查找对应统计
    const stats = window.bookingStats || [];
    const key = `${baiyeId}_${timeSlotId}`;
    const stat = stats.find(s => String(s.baiyeId) === String(baiyeId) && String(s.timeSlotId) === String(timeSlotId));

    if (stat) {
        document.getElementById('stat-current').textContent = stat.total;
        document.getElementById('stat-healers').textContent = stat.healers;
        document.getElementById('stat-tanks').textContent = stat.tanks;
        document.getElementById('stat-dps').textContent = stat.dps;

        // 显示满员警告
        const fullWarning = document.getElementById('booking-full-warning');
        const healerWarning = document.getElementById('healer-full-warning');
        const reservedWarning = document.getElementById('healer-reserved-warning');

        fullWarning.style.display = stat.total >= 10 ? 'block' : 'none';

        // 检查当前角色是否是奶妈
        const isHealer = currentCharacter && currentCharacter.role === '奶妈';
        healerWarning.style.display = (isHealer && stat.healers >= 3) ? 'block' : 'none';

        // 预留位置提示：当人数>=9且没有奶妈时，非奶妈角色看到提示
        const needsHealerReserved = stat.total >= 9 && stat.healers === 0;
        reservedWarning.style.display = (needsHealerReserved && !isHealer) ? 'block' : 'none';
    } else {
        // 无预约数据
        document.getElementById('stat-current').textContent = '0';
        document.getElementById('stat-healers').textContent = '0';
        document.getElementById('stat-tanks').textContent = '0';
        document.getElementById('stat-dps').textContent = '0';
        document.getElementById('booking-full-warning').style.display = 'none';
        document.getElementById('healer-full-warning').style.display = 'none';
        document.getElementById('healer-reserved-warning').style.display = 'none';
    }

    statsContainer.style.display = 'block';
}

// ==================== 模态框控制 ====================

/**
 * 打开模态框
 * @param {string} id - 模态框元素 ID
 */
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

/**
 * 关闭模态框
 * @param {string} id - 模态框元素 ID
 */
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// ==================== 加载状态 ====================

/**
 * 显示/隐藏加载动画
 * @param {boolean} show - 是否显示
 */
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

// ==================== 暴露全局函数（供 HTML onclick 调用） ====================

window._selectCharacter = selectCharacter;
window._showCharacterModal = showCharacterModal;
window._deleteCharacter = deleteCharacter;
window._removeBooking = removeBooking;
window.closeShareBanner = closeShareBanner;

// ==================== 查看成员列表 ====================

/**
 * 查看指定百业+时间段的预约角色详情
 * @param {number|string} baiyeId - 百业 ID
 * @param {number|string} timeSlotId - 时间段 ID
 */
async function viewBookingDetail(baiyeId, timeSlotId) {
    const modal = document.getElementById('members-modal');
    const title = document.getElementById('members-modal-title');
    const content = document.getElementById('members-list-content');

    const baiye = baiyes.find(b => String(b.id) === String(baiyeId));
    const slot = timeSlots.find(t => String(t.id) === String(timeSlotId));
    title.textContent = `${baiye ? baiye.name : '百业'} - ${slot ? slot.description : '时段'}`;

    content.innerHTML = '<div class="loading-inline">加载中...</div>';
    openModal('members-modal');

    try {
        // 从 API 获取该百业+时间段的预约列表
        const filters = { baiyeId, timeSlotId };
        const data = await getBookings(filters);
        const bookings = data.data || data.bookings || data || [];

        if (bookings.length === 0) {
            content.innerHTML = '<p class="empty-tip">该时段暂无预约</p>';
            return;
        }

        // 统计
        const total = bookings.length;
        const healers = bookings.filter(b => (b.character_role || b.characterRole) === '奶妈').length;
        const tanks = bookings.filter(b => (b.character_role || b.characterRole) === '承伤').length;
        const dpsCount = bookings.filter(b => (b.character_role || b.characterRole) === '输出').length;

        let html = `
            <div class="detail-stats">
                <div class="stat-row"><span class="stat-label">总人数</span><span class="stat-value">${total}/10</span></div>
                <div class="stat-row"><span class="stat-label">🗡️ 输出</span><span class="stat-value">${dpsCount}</span></div>
                <div class="stat-row"><span class="stat-label">🛡️ 承伤</span><span class="stat-value">${tanks}</span></div>
                <div class="stat-row"><span class="stat-label">💚 奶妈</span><span class="stat-value">${healers}/3</span></div>
            </div>
        `;

        html += bookings.map(b => {
            const name = b.character_name || b.characterName || '未知角色';
            const role = b.character_role || b.characterRole || '';
            const dps = b.character_dps || b.characterDps || '';
            const remark = b.remark || '';
            const roleTag = role ? `<span class="role-tag role-${escapeHtml(role)}">${escapeHtml(getRoleLabel(role))}</span>` : '';
            return `
                <div class="member-item-inline">
                    <div class="member-detail-left">
                        <span class="member-name-inline">${escapeHtml(name)}</span>
                        ${roleTag}
                    </div>
                    <div class="member-detail-right">
                        ${dps ? `<span class="member-dps-inline">⚔️ ${escapeHtml(dps)}万</span>` : ''}
                    </div>
                    ${remark ? `<div class="member-remark-inline">📝 ${escapeHtml(remark)}</div>` : ''}
                </div>
            `;
        }).join('');

        content.innerHTML = html;
    } catch (error) {
        content.innerHTML = `<p class="empty-tip">加载失败: ${escapeHtml(error.message)}</p>`;
    }
}

// ==================== 事件绑定 ====================

document.addEventListener('DOMContentLoaded', () => {
    // 初始化应用
    init();

    // 创建角色按钮
    document.getElementById('btn-create-character').addEventListener('click', () => {
        showCharacterModal();
    });

    // 保存角色按钮
    document.getElementById('btn-save-character').addEventListener('click', saveCharacter);

    // 取消角色按钮
    document.getElementById('btn-cancel-character').addEventListener('click', () => {
        closeModal('character-modal');
    });

    // 关闭角色模态框
    document.getElementById('btn-close-character-modal').addEventListener('click', () => {
        closeModal('character-modal');
    });

    // 提交预约按钮
    document.getElementById('btn-submit-booking').addEventListener('click', submitBooking);

    // 分享预约按钮
    document.getElementById('btn-share-booking').addEventListener('click', openShareModal);

    // 复制分享链接按钮
    document.getElementById('btn-copy-share-link').addEventListener('click', copyShareLink);

    // 关闭分享模态框
    document.getElementById('btn-close-share-modal').addEventListener('click', () => {
        closeModal('share-modal');
    });

    // 关闭成员列表模态框
    document.getElementById('btn-close-members-modal').addEventListener('click', () => {
        closeModal('members-modal');
    });

    // 职业选择变化 - 控制秒伤字段显示
    document.getElementById('character-role').addEventListener('change', (e) => {
        toggleDpsField(e.target.value);
    });

    // 百业和时间选择变化 - 更新人数统计
    document.getElementById('baiye-select').addEventListener('change', updateBookingFormStats);
    document.getElementById('time-select').addEventListener('change', updateBookingFormStats);

    // 筛选栏变化
    document.getElementById('filter-baiye').addEventListener('change', loadBookings);
    document.getElementById('filter-time').addEventListener('change', loadBookings);

    // 预约列表事件委托（查看详情按钮）
    document.getElementById('booking-list').addEventListener('click', (e) => {
        const memberBtn = e.target.closest('.btn-view-members');
        if (memberBtn) {
            const baiyeId = memberBtn.dataset.baiyeId;
            const timeSlotId = memberBtn.dataset.timeSlotId;
            if (baiyeId && timeSlotId) viewBookingDetail(baiyeId, timeSlotId);
        }
    });

    // 点击模态框背景关闭
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });

    // ESC 键关闭模态框
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
});
