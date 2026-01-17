// --- 全域變數 ---
let currentUser = '';
let currentIdentity = '';
let selectedDate = new Date().toISOString().slice(0, 10); // 預設今天 (YYYY-MM-DD)
let currentOrders = {}; // 暫存目前選擇的餐點

// --- 介面切換 ---
function showPage(pageId) {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    document.getElementById('member-dashboard').style.display = 'none';
    document.getElementById('manager-dashboard').style.display = 'none';
    document.getElementById(pageId).style.display = 'block';
}

// --- 初始化資料 ---
async function initialize() {
    if (currentIdentity === 'manager') {
        // 管理員：載入指定日期的選單與截止時間
        const res = await fetch(`/manager/meal_options/${selectedDate}`);
        const data = await res.json();
        renderManagerMenu(data.meal_options, data.order_deadlines);
        refreshTotalBalanceSum(); // 更新右上角總餘額
    } else {
        // 會員：載入今日選單與個人資料
        const res = await fetch(`/member/meal_options`);
        const data = await res.json();
        const infoRes = await fetch(`/member/info/${currentUser}`);
        const info = await infoRes.json();
        
        document.getElementById('balance-info').textContent = info.remainingmoney;
        renderMemberMenu(data.meal_options, data.order_deadlines, info.current_orders);
    }
}

// --- 管理員：更新右上角總餘額匯總 ---
async function refreshTotalBalanceSum() {
    try {
        const res = await fetch(`/manager/all_balances`);
        const balances = await res.json();
        const total = Object.values(balances).reduce((a, b) => a + b, 0);
        const sumElement = document.getElementById('total-sum-amount');
        if (sumElement) {
            sumElement.textContent = total.toLocaleString();
        }
    } catch (e) {
        console.error("無法更新總餘額", e);
    }
}

// --- 登入邏輯 ---
document.getElementById('login-btn').onclick = async () => {
    const u = document.getElementById('username-input').value;
    const p = document.getElementById('password-input').value;

    if (!u || !p) return alert("請輸入帳號密碼");

    const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
    });

    if (res.ok) {
        const data = await res.json();
        currentUser = u;
        currentIdentity = data.identity;
        document.getElementById('current-user').textContent = u;
        
        if (currentIdentity === 'manager') {
            showPage('manager-dashboard');
            document.getElementById('calendar-input').value = selectedDate;
        } else {
            showPage('member-dashboard');
        }
        initialize();
    } else {
        alert('帳號或密碼錯誤');
    }
};

// --- 會員：渲染訂餐選單 ---
function renderMemberMenu(meals, deadlines, userOrders) {
    const container = document.getElementById('current-meals-list');
    container.innerHTML = '';
    currentOrders = userOrders || {};

    if (Object.keys(meals).length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#666;">今日尚無餐點選項</p>';
        return;
    }

    for (const [type, list] of Object.entries(meals)) {
        const section = document.createElement('div');
        section.className = 'meal-setting-section';
        section.innerHTML = `<h4>${type} <span style="font-size:0.8em; color:#4682B4;">(截止: ${deadlines[type] || '未設定'})</span></h4>`;
        
        list.forEach(item => {
            const id = `${item.restaurant}-${item.item_name}-${item.price}`;
            const qty = (currentOrders[type] && currentOrders[type][id]) ? currentOrders[type][id].quantity : 0;
            
            const div = document.createElement('div');
            div.className = 'order-item';
            div.innerHTML = `
                <span><strong>${item.restaurant}</strong> - ${item.item_name} ($${item.price})</span>
                <div class="order-controls">
                    <button onclick="changeQty('${type}','${id}','${item.item_name}',${item.price},'${item.restaurant}', -1)">-</button>
                    <span id="qty-${id}" style="margin: 0 10px; font-weight:bold;">${qty}</span>
                    <button onclick="changeQty('${type}','${id}','${item.item_name}',${item.price},'${item.restaurant}', 1)">+</button>
                </div>`;
            section.appendChild(div);
        });
        container.appendChild(section);
    }
}

window.changeQty = (type, id, name, price, rest, delta) => {
    if (!currentOrders[type]) currentOrders[type] = {};
    if (!currentOrders[type][id]) {
        currentOrders[type][id] = { quantity: 0, item_name: name, price: price, restaurant: rest };
    }
    let newQty = currentOrders[type][id].quantity + delta;
    if (newQty < 0) newQty = 0;
    currentOrders[type][id].quantity = newQty;
    document.getElementById(`qty-${id}`).textContent = newQty;
};

// --- 會員：送出訂單 ---
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

// --- 管理員：下載會員資料 JSON ---
document.getElementById('download-member-data-btn').onclick = () => {
    window.location.href = '/manager/download_member_data';
};

// --- 管理員：日期與菜單管理 ---
document.getElementById('calendar-input').onchange = (e) => {
    selectedDate = e.target.value;
    initialize();
};

function renderManagerMenu(meals, deadlines) {
    const types = ['午餐', '晚餐'];
    types.forEach(type => {
        // 更新截止時間輸入框
        const deadlineInput = document.querySelector(`.deadline-input[data-meal-type="${type}"]`);
        if (deadlineInput) deadlineInput.value = deadlines[type] || "";

        // 更新選單列表
        const listEl = document.getElementById(`${type === '午餐' ? 'lunch' : 'dinner'}-menu-list`);
        listEl.innerHTML = '';
        (meals[type] || []).forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `${item.restaurant} - ${item.item_name} ($${item.price}) <button>刪除</button>`;
            listEl.appendChild(li);
        });
    });
}

// --- 管理員：儲值功能 ---
document.getElementById('show-all-balances-btn').onclick = async () => {
    const res = await fetch('/manager/all_balances');
    const balances = await res.json();
    let html = '<h3>會員儲值系統</h3><ul id="balance-list">';
    for (const [user, bal] of Object.entries(balances)) {
        html += `<li>
            <span>${user}: <strong>$${bal}</strong></span>
            <div class="recharge-controls">
                <input type="number" id="amt-${user}" placeholder="金額">
                <button onclick="recharge('${user}')">儲值</button>
            </div>
        </li>`;
    }
    showModal(html + '</ul>');
};

window.recharge = async (user) => {
    const amt = parseInt(document.getElementById(`amt-${user}`).value);
    if (isNaN(amt) || amt <= 0) return alert("請輸入有效金額");
    
    const res = await fetch('/manager/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, amount: amt })
    });
    
    if (res.ok) {
        alert('儲值成功！');
        document.getElementById('show-all-balances-btn').click(); // 重新整理列表
        refreshTotalBalanceSum(); // 更新右上角總額
    }
};

// --- 彈窗系統 ---
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
function showModal(content) {
    modalBody.innerHTML = content;
    modal.style.display = 'block';
}
document.getElementById('modal-close-btn').onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };

// --- 登出 ---
document.getElementById('logout-btn').onclick = () => {
    location.reload();
};