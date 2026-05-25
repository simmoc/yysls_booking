// 燕云百业侠境预约系统 - 主应用逻辑

// ==================== 数据存储管理 ====================
const StorageKeys = {
    CHARACTERS: 'yy_characters',
    BAIYES: 'yy_baiyes',
    TIME_SLOTS: 'yy_time_slots',
    MEMBERS: 'yy_members',
    BOOKINGS: 'yy_bookings',
    CURRENT_CHARACTER: 'yy_current_character'
};

// 数据操作类
class DataStore {
    static get(key, defaultValue = []) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('读取数据失败:', e);
            return defaultValue;
        }
    }

    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('保存数据失败:', e);
            return false;
        }
    }

    static remove(key) {
        localStorage.removeItem(key);
    }
}

// ==================== 全局状态 ====================
let currentCharacter = null;
let editingId = null;

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    // 检查URL参数（分享链接）
    checkUrlParams();
    
    // 加载当前角色
    loadCurrentCharacter();
    
    // 初始化界面
    loadCharacters();
    loadBaiyeOptions();
    loadTimeOptions();
    loadBookings();
    
    // 初始化管理界面
    loadAdminBaiyes();
    loadAdminTimeSlots();
    loadAdminMembers();
    loadAdminBookings();
    
    // 绑定标签切换
    bindTabSwitching();
}

// 检查URL参数（分享链接）
function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const baiyeId = params.get('baiye');
    const timeId = params.get('time');
    
    if (baiyeId || timeId) {
        // 保存分享参数到sessionStorage，创建角色后使用
        if (baiyeId) sessionStorage.setItem('share_baiye', baiyeId);
        if (timeId) sessionStorage.setItem('share_time', timeId);
        
        // 显示提示
        setTimeout(() => {
            showToast('检测到分享链接，创建角色后可快速预约');
        }, 500);
    }
}

// ==================== 标签切换 ====================
function bindTabSwitching() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            
            // 切换按钮状态
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // 切换面板
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            document.getElementById(tab + '-panel').classList.add('active');
            
            // 刷新管理界面数据
            if (tab === 'admin') {
                loadAdminBaiyes();
                loadAdminTimeSlots();
                loadAdminMembers();
                loadAdminBookings();
            }
        });
    });
}

// ==================== 角色管理 ====================
function loadCurrentCharacter() {
    currentCharacter = DataStore.get(StorageKeys.CURRENT_CHARACTER, null);
    updateCharacterUI();
}

function updateCharacterUI() {
    const noCharTip = document.getElementById('no-character-tip');
    const bookingForm = document.getElementById('booking-form');
    const currentCharDiv = document.getElementById('current-character');
    
    if (currentCharacter) {
        noCharTip.style.display = 'none';
        bookingForm.style.display = 'block';
        currentCharDiv.innerHTML = `
            <div class="character-tag active">
                <span class="char-name">${escapeHtml(currentCharacter.name)}</span>
                ${currentCharacter.dps ? `<span class="char-dps">⚔️ ${currentCharacter.dps}万</span>` : ''}
            </div>
        `;
        
        // 检查是否有分享的预约参数
        const shareBaiye = sessionStorage.getItem('share_baiye');
        const shareTime = sessionStorage.getItem('share_time');
        
        if (shareBaiye) {
            document.getElementById('baiye-select').value = shareBaiye;
            sessionStorage.removeItem('share_baiye');
        }
        if (shareTime) {
            document.getElementById('time-select').value = shareTime;
            sessionStorage.removeItem('share_time');
        }
    } else {
        noCharTip.style.display = 'block';
        bookingForm.style.display = 'none';
    }
}

function loadCharacters() {
    const characters = DataStore.get(StorageKeys.CHARACTERS);
    const listEl = document.getElementById('character-list');
    
    if (characters.length === 0) {
        listEl.innerHTML = '<p class="empty-tip">暂无角色，请创建</p>';
        return;
    }
    
    listEl.innerHTML = characters.map(char => `
        <div class="character-item ${currentCharacter && currentCharacter.id === char.id ? 'active' : ''}" 
             onclick="selectCharacter('${char.id}')">
            <div class="char-info">
                <span class="char-name">${escapeHtml(char.name)}</span>
                ${char.dps ? `<span class="char-dps">⚔️ ${char.dps}万</span>` : ''}
            </div>
            <div class="char-actions">
                <button class="btn-icon" onclick="event.stopPropagation(); editCharacter('${char.id}')" title="编辑">✏️</button>
                <button class="btn-icon" onclick="event.stopPropagation(); deleteCharacter('${char.id}')" title="删除">🗑️</button>
            </div>
        </div>
    `).join('');
}

function selectCharacter(id) {
    const characters = DataStore.get(StorageKeys.CHARACTERS);
    currentCharacter = characters.find(c => c.id === id) || null;
    
    if (currentCharacter) {
        DataStore.set(StorageKeys.CURRENT_CHARACTER, currentCharacter);
    } else {
        DataStore.remove(StorageKeys.CURRENT_CHARACTER);
    }
    
    loadCharacters();
    updateCharacterUI();
}

function showCharacterModal() {
    editingId = null;
    document.getElementById('character-id').value = '';
    document.getElementById('character-name').value = '';
    document.getElementById('character-dps').value = '';
    document.querySelector('#character-modal .modal-header h3').textContent = '创建角色';
    openModal('character-modal');
}

function editCharacter(id) {
    const characters = DataStore.get(StorageKeys.CHARACTERS);
    const character = characters.find(c => c.id === id);
    
    if (character) {
        editingId = id;
        document.getElementById('character-id').value = id;
        document.getElementById('character-name').value = character.name;
        document.getElementById('character-dps').value = character.dps || '';
        document.querySelector('#character-modal .modal-header h3').textContent = '编辑角色';
        openModal('character-modal');
    }
}

function saveCharacter() {
    const name = document.getElementById('character-name').value.trim();
    const dps = document.getElementById('character-dps').value.trim();
    
    if (!name) {
        showToast('请输入角色名称', 'error');
        return;
    }
    
    const characters = DataStore.get(StorageKeys.CHARACTERS);
    
    if (editingId) {
        // 编辑
        const index = characters.findIndex(c => c.id === editingId);
        if (index !== -1) {
            characters[index] = {
                ...characters[index],
                name,
                dps: dps ? parseFloat(dps) : null
            };
            
            // 如果编辑的是当前选中的角色，更新当前角色
            if (currentCharacter && currentCharacter.id === editingId) {
                currentCharacter = characters[index];
                DataStore.set(StorageKeys.CURRENT_CHARACTER, currentCharacter);
                updateCharacterUI();
            }
        }
    } else {
        // 创建
        const newCharacter = {
            id: generateId(),
            name,
            dps: dps ? parseFloat(dps) : null,
            createdAt: Date.now()
        };
        characters.push(newCharacter);
        
        // 自动选中新创建的角色
        currentCharacter = newCharacter;
        DataStore.set(StorageKeys.CURRENT_CHARACTER, currentCharacter);
    }
    
    DataStore.set(StorageKeys.CHARACTERS, characters);
    closeModal('character-modal');
    loadCharacters();
    updateCharacterUI();
    showToast(editingId ? '角色已更新' : '角色创建成功');
}

function deleteCharacter(id) {
    if (!confirm('确定要删除这个角色吗？')) return;
    
    let characters = DataStore.get(StorageKeys.CHARACTERS);
    characters = characters.filter(c => c.id !== id);
    DataStore.set(StorageKeys.CHARACTERS, characters);
    
    // 如果删除的是当前角色，清除当前角色
    if (currentCharacter && currentCharacter.id === id) {
        currentCharacter = null;
        DataStore.remove(StorageKeys.CURRENT_CHARACTER);
        updateCharacterUI();
    }
    
    loadCharacters();
    showToast('角色已删除');
}

// ==================== 百业管理 ====================
function loadBaiyeOptions() {
    const baiyes = DataStore.get(StorageKeys.BAIYES);
    const selects = ['baiye-select', 'filter-baiye', 'member-baiye'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        const currentValue = select.value;
        const defaultOption = select.options[0];
        
        select.innerHTML = '';
        select.appendChild(defaultOption);
        
        baiyes.forEach(baiye => {
            const option = document.createElement('option');
            option.value = baiye.id;
            option.textContent = baiye.name;
            select.appendChild(option);
        });
        
        select.value = currentValue;
    });
}

function loadAdminBaiyes() {
    const baiyes = DataStore.get(StorageKeys.BAIYES);
    const listEl = document.getElementById('admin-baiye-list');
    
    if (baiyes.length === 0) {
        listEl.innerHTML = '<p class="empty-tip">暂无百业</p>';
        return;
    }
    
    listEl.innerHTML = baiyes.map(baiye => `
        <div class="admin-item">
            <div class="item-info">
                <span class="item-name">${escapeHtml(baiye.name)}</span>
                ${baiye.desc ? `<span class="item-desc">${escapeHtml(baiye.desc)}</span>` : ''}
            </div>
            <div class="item-actions">
                <button class="btn-icon" onclick="deleteBaiye('${baiye.id}')" title="删除">🗑️</button>
            </div>
        </div>
    `).join('');
}

function showBaiyeModal() {
    document.getElementById('baiye-name').value = '';
    document.getElementById('baiye-desc').value = '';
    openModal('baiye-modal');
}

function saveBaiye() {
    const name = document.getElementById('baiye-name').value.trim();
    const desc = document.getElementById('baiye-desc').value.trim();
    
    if (!name) {
        showToast('请输入百业名称', 'error');
        return;
    }
    
    const baiyes = DataStore.get(StorageKeys.BAIYES);
    baiyes.push({
        id: generateId(),
        name,
        desc,
        createdAt: Date.now()
    });
    
    DataStore.set(StorageKeys.BAIYES, baiyes);
    closeModal('baiye-modal');
    loadBaiyeOptions();
    loadAdminBaiyes();
    showToast('百业创建成功');
}

function deleteBaiye(id) {
    if (!confirm('确定要删除这个百业吗？相关的成员和预约也会被影响。')) return;
    
    let baiyes = DataStore.get(StorageKeys.BAIYES);
    baiyes = baiyes.filter(b => b.id !== id);
    DataStore.set(StorageKeys.BAIYES, baiyes);
    
    // 删除相关成员
    let members = DataStore.get(StorageKeys.MEMBERS);
    members = members.filter(m => m.baiyeId !== id);
    DataStore.set(StorageKeys.MEMBERS, members);
    
    loadBaiyeOptions();
    loadAdminBaiyes();
    loadAdminMembers();
    showToast('百业已删除');
}

// ==================== 时间段管理 ====================
function loadTimeOptions() {
    const timeSlots = DataStore.get(StorageKeys.TIME_SLOTS);
    const selects = ['time-select', 'filter-time'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        const currentValue = select.value;
        const defaultOption = select.options[0];
        
        select.innerHTML = '';
        select.appendChild(defaultOption);
        
        timeSlots.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot.id;
            option.textContent = slot.desc;
            select.appendChild(option);
        });
        
        select.value = currentValue;
    });
}

function loadAdminTimeSlots() {
    const timeSlots = DataStore.get(StorageKeys.TIME_SLOTS);
    const listEl = document.getElementById('admin-time-list');
    
    if (timeSlots.length === 0) {
        listEl.innerHTML = '<p class="empty-tip">暂无时间段</p>';
        return;
    }
    
    listEl.innerHTML = timeSlots.map(slot => `
        <div class="admin-item">
            <div class="item-info">
                <span class="item-name">${escapeHtml(slot.desc)}</span>
            </div>
            <div class="item-actions">
                <button class="btn-icon" onclick="deleteTimeSlot('${slot.id}')" title="删除">🗑️</button>
            </div>
        </div>
    `).join('');
}

function showTimeModal() {
    document.getElementById('time-desc').value = '';
    openModal('time-modal');
}

function saveTimeSlot() {
    const desc = document.getElementById('time-desc').value.trim();
    
    if (!desc) {
        showToast('请输入时间描述', 'error');
        return;
    }
    
    const timeSlots = DataStore.get(StorageKeys.TIME_SLOTS);
    timeSlots.push({
        id: generateId(),
        desc,
        createdAt: Date.now()
    });
    
    DataStore.set(StorageKeys.TIME_SLOTS, timeSlots);
    closeModal('time-modal');
    loadTimeOptions();
    loadAdminTimeSlots();
    showToast('时间段添加成功');
}

function deleteTimeSlot(id) {
    if (!confirm('确定要删除这个时间段吗？')) return;
    
    let timeSlots = DataStore.get(StorageKeys.TIME_SLOTS);
    timeSlots = timeSlots.filter(t => t.id !== id);
    DataStore.set(StorageKeys.TIME_SLOTS, timeSlots);
    
    loadTimeOptions();
    loadAdminTimeSlots();
    showToast('时间段已删除');
}

// ==================== 成员管理 ====================
function loadAdminMembers() {
    const members = DataStore.get(StorageKeys.MEMBERS);
    const baiyes = DataStore.get(StorageKeys.BAIYES);
    const listEl = document.getElementById('admin-member-list');
    
    if (members.length === 0) {
        listEl.innerHTML = '<p class="empty-tip">暂无成员</p>';
        return;
    }
    
    listEl.innerHTML = members.map(member => {
        const baiye = baiyes.find(b => b.id === member.baiyeId);
        return `
            <div class="admin-item">
                <div class="item-info">
                    <span class="item-name">${escapeHtml(member.name)}</span>
                    ${baiye ? `<span class="item-desc">所属：${escapeHtml(baiye.name)}</span>` : ''}
                </div>
                <div class="item-actions">
                    <button class="btn-icon" onclick="deleteMember('${member.id}')" title="删除">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

function showMemberModal() {
    const baiyes = DataStore.get(StorageKeys.BAIYES);
    if (baiyes.length === 0) {
        showToast('请先创建百业', 'error');
        return;
    }
    
    document.getElementById('member-name').value = '';
    document.getElementById('member-baiye').value = '';
    openModal('member-modal');
}

function saveMember() {
    const name = document.getElementById('member-name').value.trim();
    const baiyeId = document.getElementById('member-baiye').value;
    
    if (!name) {
        showToast('请输入成员名称', 'error');
        return;
    }
    if (!baiyeId) {
        showToast('请选择所属百业', 'error');
        return;
    }
    
    const members = DataStore.get(StorageKeys.MEMBERS);
    members.push({
        id: generateId(),
        name,
        baiyeId,
        createdAt: Date.now()
    });
    
    DataStore.set(StorageKeys.MEMBERS, members);
    closeModal('member-modal');
    loadAdminMembers();
    showToast('成员添加成功');
}

function deleteMember(id) {
    if (!confirm('确定要删除这个成员吗？')) return;
    
    let members = DataStore.get(StorageKeys.MEMBERS);
    members = members.filter(m => m.id !== id);
    DataStore.set(StorageKeys.MEMBERS, members);
    
    loadAdminMembers();
    showToast('成员已删除');
}

// ==================== 预约管理 ====================
function createBooking() {
    if (!currentCharacter) {
        showToast('请先选择角色', 'error');
        return;
    }
    
    const baiyeId = document.getElementById('baiye-select').value;
    const timeId = document.getElementById('time-select').value;
    const remark = document.getElementById('remark-input').value.trim();
    
    if (!baiyeId) {
        showToast('请选择百业', 'error');
        return;
    }
    if (!timeId) {
        showToast('请选择时间', 'error');
        return;
    }
    
    const baiyes = DataStore.get(StorageKeys.BAIYES);
    const timeSlots = DataStore.get(StorageKeys.TIME_SLOTS);
    
    const baiye = baiyes.find(b => b.id === baiyeId);
    const timeSlot = timeSlots.find(t => t.id === timeId);
    
    const bookings = DataStore.get(StorageKeys.BOOKINGS);
    
    // 检查是否已预约
    const existingBooking = bookings.find(b => 
        b.characterId === currentCharacter.id && 
        b.baiyeId === baiyeId && 
        b.timeId === timeId
    );
    
    if (existingBooking) {
        showToast('您已经预约过这个时段了', 'error');
        return;
    }
    
    bookings.push({
        id: generateId(),
        characterId: currentCharacter.id,
        characterName: currentCharacter.name,
        characterDps: currentCharacter.dps,
        baiyeId,
        baiyeName: baiye ? baiye.name : '',
        timeId,
        timeDesc: timeSlot ? timeSlot.desc : '',
        remark,
        createdAt: Date.now()
    });
    
    DataStore.set(StorageKeys.BOOKINGS, bookings);
    
    // 清空表单
    document.getElementById('remark-input').value = '';
    
    loadBookings();
    showToast('预约成功');
}

function loadBookings() {
    const bookings = DataStore.get(StorageKeys.BOOKINGS);
    const filterBaiye = document.getElementById('filter-baiye').value;
    const filterTime = document.getElementById('filter-time').value;
    
    let filtered = bookings;
    if (filterBaiye) {
        filtered = filtered.filter(b => b.baiyeId === filterBaiye);
    }
    if (filterTime) {
        filtered = filtered.filter(b => b.timeId === filterTime);
    }
    
    // 按时间倒序
    filtered.sort((a, b) => b.createdAt - a.createdAt);
    
    const listEl = document.getElementById('booking-list');
    
    if (filtered.length === 0) {
        listEl.innerHTML = '<p class="empty-tip">暂无预约</p>';
        return;
    }
    
    listEl.innerHTML = filtered.map(booking => `
        <div class="booking-item">
            <div class="booking-info">
                <div class="booking-header">
                    <span class="booking-char">${escapeHtml(booking.characterName)}</span>
                    ${booking.characterDps ? `<span class="booking-dps">⚔️ ${booking.characterDps}万</span>` : ''}
                </div>
                <div class="booking-detail">
                    <span class="booking-baiye">🏢 ${escapeHtml(booking.baiyeName)}</span>
                    <span class="booking-time">⏰ ${escapeHtml(booking.timeDesc)}</span>
                </div>
                ${booking.remark ? `<div class="booking-remark">📝 ${escapeHtml(booking.remark)}</div>` : ''}
            </div>
            <div class="booking-actions">
                ${currentCharacter && currentCharacter.id === booking.characterId ? `
                    <button class="btn-icon" onclick="deleteBooking('${booking.id}')" title="取消预约">🗑️</button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function deleteBooking(id) {
    if (!confirm('确定要取消这个预约吗？')) return;
    
    let bookings = DataStore.get(StorageKeys.BOOKINGS);
    bookings = bookings.filter(b => b.id !== id);
    DataStore.set(StorageKeys.BOOKINGS, bookings);
    
    loadBookings();
    loadAdminBookings();
    showToast('预约已取消');
}

function loadAdminBookings() {
    const bookings = DataStore.get(StorageKeys.BOOKINGS);
    const listEl = document.getElementById('admin-booking-list');
    
    if (bookings.length === 0) {
        listEl.innerHTML = '<p class="empty-tip">暂无预约</p>';
        return;
    }
    
    // 按时间倒序
    const sorted = [...bookings].sort((a, b) => b.createdAt - a.createdAt);
    
    listEl.innerHTML = sorted.map(booking => `
        <div class="admin-item">
            <div class="item-info">
                <span class="item-name">${escapeHtml(booking.characterName)}</span>
                <span class="item-desc">
                    ${escapeHtml(booking.baiyeName)} · ${escapeHtml(booking.timeDesc)}
                    ${booking.characterDps ? `· ⚔️${booking.characterDps}万` : ''}
                </span>
            </div>
            <div class="item-actions">
                <button class="btn-icon" onclick="shareBooking('${booking.baiyeId}', '${booking.timeId}')" title="分享">🔗</button>
                <button class="btn-icon" onclick="deleteBooking('${booking.id}')" title="删除">🗑️</button>
            </div>
        </div>
    `).join('');
}

function clearAllBookings() {
    if (!confirm('确定要清空所有预约吗？此操作不可恢复。')) return;
    
    DataStore.set(StorageKeys.BOOKINGS, []);
    loadBookings();
    loadAdminBookings();
    showToast('所有预约已清空');
}

// ==================== 分享功能 ====================
function shareBooking(baiyeId, timeId) {
    const url = new URL(window.location.href);
    url.search = '';
    if (baiyeId) url.searchParams.set('baiye', baiyeId);
    if (timeId) url.searchParams.set('time', timeId);
    
    document.getElementById('share-link').value = url.toString();
    openModal('share-modal');
}

function copyShareLink() {
    const input = document.getElementById('share-link');
    input.select();
    document.execCommand('copy');
    showToast('链接已复制到剪贴板');
}

// ==================== 工具函数 ====================
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showToast(message, type = 'success') {
    // 移除已有的toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// 点击模态框外部关闭
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}
