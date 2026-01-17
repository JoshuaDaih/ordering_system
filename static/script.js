// --- 全域變數 ---
let currentUser = '';
let currentIdentity = '';
let selectedDate = new Date().toISOString().slice(0, 10); 
let currentOrders = {}; 

// --- 初始化與介面切換 ---
function showPage(pageId) {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('member-dashboard').style.display = 'none';
    document.getElementById('manager-dashboard').style.display = 'none';
    document.getElementById(pageId).style.display = 'block';
}

async function initialize() {
    if (currentIdentity === 'manager') {
        const res = await fetch(`/manager/meal_options/${selectedDate}`);
        const data = await res.json();
        renderManagerMenu(data.meal_options, data.order_deadlines);
        refreshTotalBalanceSum();
    } else {
        const res = await fetch(`/member/meal_options`);
        const data = await res.json();
        const infoRes = await fetch(`/member/info/${currentUser}`);
        const info = await infoRes.json();
        document.getElementById('balance-info').textContent = info.remainingmoney;
        renderMemberMenu(data.meal_options, data.order_deadlines, info.current_orders);
    }
}

// --- 管理員：更新總餘額 ---
async function refreshTotalBalanceSum() {
    const res = await fetch(`/manager/all_balances`);
    const balances = await res.json();
    const total = Object.values(balances).reduce((a, b) => a + b, 0);
    document.getElementById('total-sum-amount').textContent = total.toLocaleString();
}

// --- 登入邏輯 ---
document.getElementById('login-btn').onclick = async () => {
    const u = document.getElementById('username-input').value;
    const p = document.getElementById('password-input').value;
    const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
    });
    if (res.ok) {
        const data = await res.json();
        currentUser = u; currentIdentity = data.identity;
        document.getElementById('current-user').textContent = u;
        if (currentIdentity === 'manager') {
            showPage('manager-dashboard');
            document.getElementById('calendar-input').value = selectedDate;
        } else {
            showPage('member-dashboard');
        }
        initialize();
    } else alert('登入失敗');
};

// --- 下載按鈕邏輯 ---

// 1. 下載會員資料
document.getElementById('download-member-data-btn').onclick = () => {
    window.location.href = '/manager/download_member_data';
};

// 2. 下載當前訂單 (新增)
document.getElementById('download-order-data-btn').onclick = () => {
    window.location.href = '/manager/download_order_data';
};

// --- 會員功能 (渲染選單/變更數量/送出) ---
function renderMemberMenu(meals, deadlines, userOrders) {
    const container = document.getElementById('current-meals-list');
    container.innerHTML = '';
    currentOrders = userOrders || {};
    for (const [type, list] of Object.entries(meals)) {
        const section = document.createElement('div');
        section.className = 'meal-setting-section';
        section.innerHTML = `<h4>${type} (截止: ${deadlines[type] || '未設'})</h4>`;
        list.forEach(item => {
            const id = `${item.restaurant}-${item.item_name}-${item.price}`;
            const qty = (currentOrders[type] && currentOrders[type][id]) ? currentOrders[type][id].quantity : 0;
            const div = document.createElement('div');
            div.className = 'order-item';
            div.innerHTML = `<span><strong>${item.restaurant}</strong> - ${item.item_name} ($${item.price})</span>
                <div class="order-controls">
                    <button onclick="changeQty('${type}','${id}','${item.item_name}',${item.price},'${item.restaurant}', -1)">-</button>
                    <span id="qty-${id}">${qty}</span>
                    <button onclick="changeQty('${type}','${id}','${item.item_name}',${item.price},'${item.restaurant}', 1)">+</button>
                </div>`;
            section.appendChild(div);
        });
        container.appendChild(section);
    }
}

window.changeQty = (type, id, name, price, rest, delta) => {
    if (!currentOrders[type]) currentOrders[type] = {};
    if (!currentOrders[type][id]) currentOrders[type][id] = { quantity: 0, item_name: name, price: price, restaurant: rest };
    let n = currentOrders[type][id].quantity + delta;
    currentOrders[type][id].quantity = n < 0 ? 0 : n;
    document.getElementById(`qty-${id}`).textContent = currentOrders[type][id].quantity;
};

document.getElementById('save-order-btn').onclick = async () => {
    const res = await fetch('/member/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser, orders: currentOrders })
    });
    const data = await res.json();
    alert(data.message);
    if (res.ok) initialize();
};

// --- 管理員功能 (菜單管理/儲值) ---
function renderManagerMenu(meals, deadlines) {
    ['午餐', '晚餐'].forEach(type => {
        const listEl = document.getElementById(`${type === '午餐' ? 'lunch' : 'dinner'}-menu-list`);
        if(listEl) {
            listEl.innerHTML = '';
            (meals[type] || []).forEach(item => {
                const li = document.createElement('li');
                li.className = 'current-meals-display li';
                li.innerHTML = `${item.restaurant} - ${item.item_name} ($${item.price})`;
                listEl.appendChild(li);
            });
        }
    });
}

document.getElementById('show-all-balances-btn').onclick = async () => {
    const res = await fetch('/manager/all_balances');
    const balances = await res.json();
    let html = '<h3>會員儲值</h3><ul id="balance-list">';
    for (const [u, b] of Object.entries(balances)) {
        html += `<li>${u}: <strong>$${b}</strong> <div class="recharge-controls">
                <input type="number" id="amt-${u}"> <button onclick="recharge('${u}')">儲值</button></div></li>`;
    }
    showModal(html + '</ul>');
};

window.recharge = async (u) => {
    const amt = parseInt(document.getElementById(`amt-${u}`).value);
    await fetch('/manager/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, amount: amt })
    });
    alert('成功');
    document.getElementById('show-all-balances-btn').click();
    refreshTotalBalanceSum();
};

// --- 彈窗與登出 ---
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
function showModal(content) { modalBody.innerHTML = content; modal.style.display = 'block'; }
document.getElementById('modal-close-btn').onclick = () => modal.style.display = 'none';
document.getElementById('logout-btn').onclick = () => location.reload();
document.getElementById('calendar-input').onchange = (e) => { selectedDate = e.target.value; initialize(); };