let currentUser = '', currentIdentity = '', selectedDate = new Date().toISOString().slice(0, 10), currentOrders = {};

// 初始化
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

// 總額計算
async function refreshTotalBalanceSum() {
    const res = await fetch(`/manager/all_balances`);
    const balances = await res.json();
    const total = Object.values(balances).reduce((a, b) => a + b, 0);
    document.getElementById('total-sum-amount').textContent = total.toLocaleString();
}

// 登入
document.getElementById('login-btn').onclick = async () => {
    const username = document.getElementById('username-input').value;
    const password = document.getElementById('password-input').value;
    const res = await fetch('/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password})
    });
    if (res.ok) {
        const data = await res.json();
        currentUser = username; currentIdentity = data.identity;
        document.getElementById('current-user').textContent = username;
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        document.getElementById(`${currentIdentity}-dashboard`).style.display = 'block';
        initialize();
    } else alert('登入失敗');
};

// 渲染會員選單
function renderMemberMenu(meals, deadlines, userOrders) {
    const container = document.getElementById('current-meals-list');
    container.innerHTML = '';
    currentOrders = userOrders || {};
    for (const [type, list] of Object.entries(meals)) {
        const section = document.createElement('div');
        section.innerHTML = `<h4>${type} (截止: ${deadlines[type] || '未設'})</h4>`;
        list.forEach(item => {
            const id = `${item.restaurant}-${item.item_name}-${item.price}`;
            const qty = (currentOrders[type] && currentOrders[type][id]) ? currentOrders[type][id].quantity : 0;
            const div = document.createElement('div');
            div.className = 'order-item';
            div.innerHTML = `<span>${item.restaurant} - ${item.item_name} ($${item.price})</span>
                <div><button onclick="changeQty('${type}','${id}','${item.item_name}',${item.price},'${item.restaurant}', -1)">-</button>
                <span id="qty-${id}">${qty}</span>
                <button onclick="changeQty('${type}','${id}','${item.item_name}',${item.price},'${item.restaurant}', 1)">+</button></div>`;
            section.appendChild(div);
        });
        container.appendChild(section);
    }
}

function changeQty(type, id, name, price, rest, delta) {
    if (!currentOrders[type]) currentOrders[type] = {};
    let q = (currentOrders[type][id] ? currentOrders[type][id].quantity : 0) + delta;
    if (q < 0) q = 0;
    currentOrders[type][id] = {quantity: q, item_name: name, price: price, restaurant: rest};
    document.getElementById(`qty-${id}`).textContent = q;
}

// 送出訂單
document.getElementById('save-order-btn').onclick = async () => {
    const res = await fetch('/member/order', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username: currentUser, orders: currentOrders})
    });
    const data = await res.json();
    alert(data.message);
    if (res.ok) initialize();
};

// 管理員功能與日期切換略... (原理同上，串接對應 API)
document.getElementById('calendar-input').onchange = (e) => {
    selectedDate = e.target.value;
    initialize();
};

// 彈窗處理
const modal = document.getElementById('modal');
document.getElementById('modal-close-btn').onclick = () => modal.style.display = 'none';

document.getElementById('show-all-balances-btn').onclick = async () => {
    const res = await fetch('/manager/all_balances');
    const balances = await res.json();
    let html = '<h3>會員儲值</h3><ul>';
    for (const [user, bal] of Object.entries(balances)) {
        html += `<li>${user}: $${bal} <input type="number" id="amt-${user}" style="width:60px"> 
                <button onclick="recharge('${user}')">儲值</button></li>`;
    }
    document.getElementById('modal-body').innerHTML = html + '</ul>';
    modal.style.display = 'block';
};

async function recharge(user) {
    const amt = parseInt(document.getElementById(`amt-${user}`).value);
    await fetch('/manager/recharge', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username: user, amount: amt})
    });
    alert('儲值成功');
    document.getElementById('show-all-balances-btn').click();
    refreshTotalBalanceSum();
}

document.getElementById('logout-btn').onclick = () => location.reload();