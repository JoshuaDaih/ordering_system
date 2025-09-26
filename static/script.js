// --- 網站配置與資料模型 ---
const API_BASE_URL = '';
let memberMeals = {};
let orderDeadlines = {};
// 確保會員介面使用當前日期，管理員介面使用選定日期
let selectedDate = new Date().toISOString().slice(0, 10); 
// --- 網站配置與資料模型 ---

// --- 取得 DOM 元素 ---
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app');
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

// 會員
const memberDashboard = document.getElementById('member-dashboard');
const balanceInfo = document.getElementById('balance-info');
const currentMealsList = document.getElementById('current-meals-list');
const saveOrderBtn = document.getElementById('save-order-btn');
const showHistoryOrdersBtn = document.getElementById('show-history-orders-btn');

// 管理員
const managerDashboard = document.getElementById('manager-dashboard');
const showAllBalancesBtn = document.getElementById('show-all-balances-btn');
const allBalancesListArea = document.getElementById('all-balances-list-area');
const balanceList = document.getElementById('balance-list');
const showTodayOrdersBtn = document.getElementById('show-today-orders-btn');
const showAllHistoryOrdersBtn = document.getElementById('show-all-history-orders-btn');
const calendarInput = document.getElementById('calendar-input');
const selectedDateSpan = document.getElementById('selected-date');
const lunchMenuList = document.getElementById('lunch-menu-list');
const dinnerMenuList = document.getElementById('dinner-menu-list');
const mealSettings = document.getElementById('meal-settings');


// 餐點設定
const deadlineInputs = document.querySelectorAll('.deadline-input');
const setDeadlineBtns = document.querySelectorAll('.set-deadline-btn');
const addMealBtns = document.querySelectorAll('.add-meal-btn');

// 懸浮視窗
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modal-content');
const modalCloseBtn = document.getElementById('modal-close-btn');

let currentUser = null;
let currentIdentity = null;
let currentOrders = {};

// 初始化：根據身份載入不同的資料
async function initialize() {
    if (currentIdentity === 'manager') {
        // 管理員：載入選定日期的菜單
        calendarInput.value = selectedDate;
        selectedDateSpan.textContent = selectedDate;

        const response = await fetch(`${API_BASE_URL}/manager/meal_options/${selectedDate}`);
        const data = await response.json();
        memberMeals = data.meal_options; // 這裡 memberMeals 其實是管理員選定日期的菜單
        orderDeadlines = data.order_deadlines;

        renderManagerMealSettings();

    } else if (currentIdentity === 'member') {
        // 會員：載入**當日**菜單
        const response = await fetch(`${API_BASE_URL}/member/meal_options`);
        const data = await response.json();
        memberMeals = data.meal_options; // 會員只關心當日的菜單
        orderDeadlines = data.order_deadlines;
    }

}

// 輔助函式：只用於會員介面，載入當日訂單
async function loadMemberDashboard() {
    // 步驟 1: 載入當日菜單與截止時間
    await initialize(); // 會自動載入當日菜單到 memberMeals/orderDeadlines

    // 步驟 2: 載入會員資訊（餘額、當日訂單）
    const memberInfoRes = await fetch(`${API_BASE_URL}/member/info/${currentUser}`);
    const memberInfoData = await memberInfoRes.json();
    
    balanceInfo.textContent = memberInfoData.remainingmoney;
    
    // 步驟 3: 渲染訂餐介面
    renderMemberMeals(memberInfoData.current_orders);
}


function showPage(pageId) {
    loginContainer.style.display = 'none';
    appContainer.style.display = 'block';
    memberDashboard.style.display = 'none';
    managerDashboard.style.display = 'none';
    document.getElementById('current-user').textContent = `你好，${currentUser}`;
    document.getElementById(pageId).style.display = 'block';
}

function renderMemberMeals(userOrders) {
    currentOrders = userOrders;
    currentMealsList.innerHTML = '';
    
    // 會員：使用的菜單是 initialize() 載入的當日菜單 (memberMeals) 和截止時間 (orderDeadlines)
    const todayMeals = memberMeals || {};
    const todayDeadlines = orderDeadlines || {};

    for (const meal in todayMeals) {
        if (!Array.isArray(todayMeals[meal]) || todayMeals[meal].length === 0) continue;

        const mealDiv = document.createElement('div');
        mealDiv.classList.add('meal-section');
        
        const deadline = todayDeadlines[meal] || '未設定';
        mealDiv.innerHTML = `<h4>${meal} <span class="deadline">(截止時間: ${deadline})</span></h4>`;
        
        todayMeals[meal].forEach(item => {
            // 這裡的 itemId 必須與後端儲存訂單時的 Key 格式一致
            const itemId = `${item.restaurant}-${item.item_name}-${item.price}`;
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('order-item');
            
            const quantity = userOrders[meal] && userOrders[meal][itemId] ? userOrders[meal][itemId].quantity : 0;
            
            itemDiv.innerHTML = `
                <span>${item.restaurant} - ${item.item_name} (NT$ ${item.price})</span>
                <div class="order-controls">
                    <button class="decrease-btn" data-id="${itemId}" data-price="${item.price}" data-name="${item.item_name}" data-meal="${meal}" data-restaurant="${item.restaurant}">-</button>
                    <input type="text" class="quantity" value="${quantity}" readonly>
                    <button class="increase-btn" data-id="${itemId}" data-price="${item.price}" data-name="${item.item_name}" data-meal="${meal}" data-restaurant="${item.restaurant}">+</button>
                </div>
            `;
            mealDiv.appendChild(itemDiv);
        });
        currentMealsList.appendChild(mealDiv);
    }
}

function renderManagerMealSettings() {
    const dailyDeadlines = orderDeadlines || {};
    const dailyMeals = memberMeals || {};

    // 渲染截止時間
    deadlineInputs.forEach(input => {
        const mealType = input.dataset.mealType;
        input.value = dailyDeadlines[mealType] || '';
    });

    // 渲染餐點列表
    function renderMenuList(listElement, meals) {
        listElement.innerHTML = '';
        if (meals && meals.length > 0) {
            meals.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>${item.restaurant} - ${item.item_name} (NT$ ${item.price})</span>
                    <button class="delete-meal-btn" data-meal-type="${listElement.dataset.mealType}" data-item-name="${item.item_name}">刪除</button>
                `;
                listElement.appendChild(li);
            });
        } else {
            listElement.innerHTML = '<li>無餐點</li>';
        }
    }

    lunchMenuList.dataset.mealType = '午餐';
    dinnerMenuList.dataset.mealType = '晚餐';

    renderMenuList(lunchMenuList, dailyMeals['午餐']);
    renderMenuList(dinnerMenuList, dailyMeals['晚餐']);
}


function handleQuantityControls() {
    currentMealsList.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.decrease-btn, .increase-btn');
        if (!targetBtn) return;
        
        const isIncrease = targetBtn.classList.contains('increase-btn');
        const itemId = targetBtn.dataset.id;
        const itemName = targetBtn.dataset.name;
        const itemPrice = parseInt(targetBtn.dataset.price);
        const mealName = targetBtn.dataset.meal;
        const restaurantName = targetBtn.dataset.restaurant;
        
        if (!currentOrders[mealName]) {
            currentOrders[mealName] = {};
        }

        let quantity = currentOrders[mealName][itemId] ? currentOrders[mealName][itemId].quantity : 0;
        
        if (isIncrease) {
            quantity++;
        } else if (quantity > 0) {
            quantity--;
        }

        if (quantity > 0) {
            currentOrders[mealName][itemId] = {
                quantity: quantity,
                item_name: itemName,
                price: itemPrice,
                meal_name: mealName,
                restaurant: restaurantName
            };
        } else {
            delete currentOrders[mealName][itemId];
        }

        if (Object.keys(currentOrders[mealName] || {}).length === 0) {
            delete currentOrders[mealName];
        }

        const quantityInput = targetBtn.parentElement.querySelector('.quantity');
        if (quantityInput) {
            quantityInput.value = quantity;
        }
    });
}
handleQuantityControls();


// --- 登入/登出 ---
loginBtn.addEventListener('click', async () => {
    const username = usernameInput.value;
    const password = passwordInput.value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (response.ok) {
            currentUser = username;
            currentIdentity = data.identity;
            
            if (currentIdentity === 'member') {
                showPage('member-dashboard');
                await loadMemberDashboard(); // 使用新的載入函式
            } else if (currentIdentity === 'manager') {
                showPage('manager-dashboard');
                // 管理員登入時，預設日期為今天
                selectedDate = new Date().toISOString().slice(0, 10);
                await initialize();
            }
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('登入失敗:', error);
        alert('登入失敗，請檢查伺服器連線。');
    }
});

logoutBtn.addEventListener('click', () => {
    currentUser = null;
    currentIdentity = null;
    currentOrders = {};
    loginContainer.style.display = 'flex';
    appContainer.style.display = 'none';
    usernameInput.value = '';
    passwordInput.value = '';
    modal.style.display = 'none';
});

// --- 會員功能 ---
saveOrderBtn.addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/member/order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser, orders: currentOrders })
        });
        const data = await response.json();

        if (response.ok) {
            alert('訂單送出成功');
            // 重新載入會員資訊以更新餘額和訂單
            await loadMemberDashboard(); 
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('送出訂單失敗:', error);
    }
});

showHistoryOrdersBtn.addEventListener('click', async () => {
    const response = await fetch(`${API_BASE_URL}/member/history/${currentUser}`);
    const historyData = await response.json();
    
    modalContent.innerHTML = '<h3>我的歷史訂單</h3>';
    if (historyData.length === 0) {
        modalContent.innerHTML += '<p>尚無歷史訂單。</p>';
    } else {
        historyData.forEach(entry => {
            const dateDiv = document.createElement('div');
            dateDiv.classList.add('history-order-date');
            dateDiv.textContent = `日期: ${entry.date}`;
            modalContent.appendChild(dateDiv);
            
            for (const mealType in entry.orders) {
                const mealHeader = document.createElement('h5');
                mealHeader.textContent = mealType;
                modalContent.appendChild(mealHeader);
                
                for (const orderId in entry.orders[mealType]) {
                    const order = entry.orders[mealType][orderId];
                    const orderDiv = document.createElement('div');
                    orderDiv.classList.add('history-order-item');
                    orderDiv.textContent = `${order.restaurant} - ${order.item_name}: ${order.quantity}份 (NT$ ${order.price * order.quantity})`;
                    modalContent.appendChild(orderDiv);
                }
            }
        });
    }
    modal.style.display = 'block';
});

// --- 管理員功能 ---
showAllBalancesBtn.addEventListener('click', async () => {
    modalContent.innerHTML = '<h3>所有會員餘額</h3>';
    const response = await fetch(`${API_BASE_URL}/manager/all_balances`);
    const balances = await response.json();
    
    const ul = document.createElement('ul');
    ul.classList.add('balance-list');
    for (const user in balances) {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${user}: NT$ ${balances[user]}</span>
            <div class="recharge-controls">
                <input type="number" placeholder="金額" class="recharge-input" data-user="${user}">
                <button class="recharge-btn">儲值</button>
            </div>
        `;
        ul.appendChild(li);
    }
    modalContent.appendChild(ul);
    modal.style.display = 'block';

    modalContent.querySelector('.balance-list').addEventListener('click', async (e) => {
        if (!e.target.classList.contains('recharge-btn')) return;
        
        const rechargeInput = e.target.closest('li').querySelector('.recharge-input');
        const username = rechargeInput.dataset.user;
        const amount = parseInt(rechargeInput.value);
        
        if (isNaN(amount) || amount <= 0) {
            alert('請輸入有效金額');
            return;
        }
        
        const rechargeRes = await fetch(`${API_BASE_URL}/manager/recharge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, amount })
        });
        const rechargeData = await rechargeRes.json();
        alert(rechargeData.message);
        
        if (rechargeRes.ok) {
            showAllBalancesBtn.click(); // 重新整理餘額列表
        }
    });
});

showTodayOrdersBtn.addEventListener('click', async () => {
    const response = await fetch(`${API_BASE_URL}/manager/all_orders`);
    const orders = await response.json(); // 這是當日所有會員的訂單
    
    const summary = {};

    for (const username in orders) {
        for (const mealType in orders[username]) {
            for (const itemId in orders[username][mealType]) {
                const item = orders[username][mealType][itemId];
                // 訂單摘要的 key 包含所有重要資訊
                const key = `${item.meal_name}|${item.restaurant}|${item.item_name}|${item.price}`;
                
                if (!summary[key]) {
                    summary[key] = {
                        item_name: item.item_name,
                        restaurant: item.restaurant,
                        quantity: 0,
                        members: []
                    };
                }
                summary[key].quantity += item.quantity;
                summary[key].members.push(username);
            }
        }
    }
    
    modalContent.innerHTML = '<h3>當日訂單總結</h3>';
    if (Object.keys(summary).length === 0) {
        modalContent.innerHTML += '<p>今天沒有任何訂單。</p>';
    } else {
        const ul = document.createElement('ul');
        ul.classList.add('order-summary-list');
        for (const key in summary) {
            const item = summary[key];
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="summary-item">
                    <span>${item.restaurant} - ${item.item_name}</span>
                    <span>總計: ${item.quantity} 份</span>
                    <span class="member-list-toggle">點擊查看訂餐會員</span>
                </div>
                <div class="member-list" style="display:none;">
                    <strong>訂餐會員:</strong> ${item.members.join(', ')}
                </div>
            `;
            ul.appendChild(li);
        }
        modalContent.appendChild(ul);
    }
    
    modalContent.addEventListener('click', (e) => {
        if (e.target.classList.contains('member-list-toggle')) {
            const memberListDiv = e.target.parentElement.nextElementSibling;
            if (memberListDiv.style.display === 'none') {
                memberListDiv.style.display = 'block';
            } else {
                memberListDiv.style.display = 'none';
            }
        }
    });

    modal.style.display = 'block';
});

showAllHistoryOrdersBtn.addEventListener('click', async () => {
    const response = await fetch(`${API_BASE_URL}/manager/history`);
    const historyData = await response.json();
    
    modalContent.innerHTML = '<h3>所有歷史訂單</h3>';
    if (Object.keys(historyData).length === 0) {
        modalContent.innerHTML += '<p>尚無歷史訂單。</p>';
    } else {
        for(const username in historyData) {
            const userHistory = historyData[username];
            const userHeader = document.createElement('h4');
            userHeader.textContent = `會員: ${username}`;
            modalContent.appendChild(userHeader);

            userHistory.forEach(entry => {
                const dateDiv = document.createElement('div');
                dateDiv.classList.add('history-order-date');
                dateDiv.textContent = `日期: ${entry.date}`;
                modalContent.appendChild(dateDiv);
                
                for (const mealType in entry.orders) {
                    const mealHeader = document.createElement('h5');
                    mealHeader.textContent = mealType;
                    modalContent.appendChild(mealHeader);
                    
                    for (const orderId in entry.orders[mealType]) {
                        const order = entry.orders[mealType][orderId];
                        const orderDiv = document.createElement('div');
                        orderDiv.classList.add('history-order-item');
                        orderDiv.textContent = `${order.restaurant} - ${order.item_name}: ${order.quantity}份 (NT$ ${order.price * order.quantity})`;
                        modalContent.appendChild(orderDiv);
                    }
                }
            });
        }
    }
    modal.style.display = 'block';
});

// 月曆功能
calendarInput.addEventListener('change', async (e) => {
    selectedDate = e.target.value;
    selectedDateSpan.textContent = selectedDate;
    await initialize(); // 重新載入選定日期的管理員菜單
});

// 餐點設定
setDeadlineBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        const mealType = btn.dataset.mealType;
        const input = document.querySelector(`.deadline-input[data-meal-type="${mealType}"]`);
        const newDeadline = input.value;
        if (!newDeadline) {
            alert('請選擇一個有效的時間。');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/manager/update_deadline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: selectedDate, meal_type: mealType, deadline: newDeadline })
        });
        const data = await response.json();
        alert(data.message);
        if (response.ok) {
            // 更新本地數據並重新渲染
            await initialize();
        }
    });
});

addMealBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        const mealType = btn.dataset.mealType;
        const restaurantInput = document.querySelector(`.add-meal-restaurant[data-meal-type="${mealType}"]`);
        const nameInput = document.querySelector(`.add-meal-name[data-meal-type="${mealType}"]`);
        const priceInput = document.querySelector(`.add-meal-price[data-meal-type="${mealType}"]`);

        const restaurant = restaurantInput.value.trim();
        const item_name = nameInput.value.trim();
        const price = parseInt(priceInput.value);

        if (!restaurant || !item_name || isNaN(price) || price <= 0) {
            alert('請輸入有效的餐點資訊。');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/manager/add_meal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: selectedDate, meal_type: mealType, restaurant, item_name, price })
        });
        const data = await response.json();
        alert(data.message);
        if (response.ok) {
            restaurantInput.value = '';
            nameInput.value = '';
            priceInput.value = '';
            await initialize(); // 重新載入管理員介面的菜單
        }
    });
});

document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-meal-btn')) {
        const mealType = e.target.dataset.mealType;
        const itemName = e.target.dataset.itemName;
        if (confirm(`確定要刪除 ${itemName} 嗎？`)) {
            const response = await fetch(`${API_BASE_URL}/manager/delete_meal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: selectedDate, meal_type: mealType, item_name: itemName })
            });
            const data = await response.json();
            alert(data.message);
            if (response.ok) {
                await initialize();
            }
        }
    }
});


// --- 懸浮視窗的關閉事件 ---
modalCloseBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// 頁面載入時的初始化 (但登入後會再次初始化)
// 這裡保留，但實際的資料載入會在登入邏輯中執行
// initialize();