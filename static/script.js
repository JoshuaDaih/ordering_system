// --- 網站配置與資料模型 ---
const API_BASE_URL = '';
let memberMeals = {};
let orderDeadlines = {};
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
const showAllOrdersBtn = document.getElementById('show-all-orders-btn');
const allOrdersListArea = document.getElementById('all-orders-list-area');
const allOrdersList = document.getElementById('all-orders-list');
const showAllHistoryOrdersBtn = document.getElementById('show-all-history-orders-btn');

// 餐點設定
const deadlineInputs = document.querySelectorAll('.deadline-input');
const setDeadlineBtns = document.querySelectorAll('.set-deadline-btn');
const addMealBtns = document.querySelectorAll('.add-meal-btn');

// 懸浮視窗
const historyModal = document.getElementById('history-modal');
const historyModalContent = document.getElementById('history-modal-content');
const historyCloseBtn = document.getElementById('history-close-btn');

let currentUser = null;
let currentIdentity = null;
let currentOrders = {};

// 初始化
async function initialize() {
    try {
        const response = await fetch(`${API_BASE_URL}/manager/meal_options`);
        const data = await response.json();
        memberMeals = data.meal_options;
        orderDeadlines = data.order_deadlines;

        // 設定管理員介面的截止時間
        for (const mealType in orderDeadlines) {
            const input = document.querySelector(`.deadline-input[data-meal-type="${mealType}"]`);
            if (input) {
                input.value = orderDeadlines[mealType];
            }
        }
    } catch (error) {
        console.error('初始化失敗:', error);
    }
}

// --- 輔助函式 ---
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
    
    for (const meal in memberMeals) {
        if (memberMeals[meal].length === 0) continue;

        const mealDiv = document.createElement('div');
        mealDiv.classList.add('meal-section');
        
        // 取得截止時間並顯示
        const deadline = orderDeadlines[meal] || '未設定';
        mealDiv.innerHTML = `<h4>${meal} <span class="deadline">(截止時間: ${deadline})</span></h4>`;
        
        memberMeals[meal].forEach(item => {
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
        
        // 初始化餐別訂單
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

        // 如果餐別內沒有任何訂單，則刪除該餐別
        if (Object.keys(currentOrders[mealName]).length === 0) {
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
                const memberInfoRes = await fetch(`${API_BASE_URL}/member/info/${currentUser}`);
                const memberInfoData = await memberInfoRes.json();
                balanceInfo.textContent = memberInfoData.remainingmoney;
                renderMemberMeals(memberInfoData.current_orders);
            } else if (currentIdentity === 'manager') {
                showPage('manager-dashboard');
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
    allOrdersList.innerHTML = '';
    allBalancesListArea.style.display = 'none';
    allOrdersListArea.style.display = 'none';
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
            // 更新餘額
            const memberInfoRes = await fetch(`${API_BASE_URL}/member/info/${currentUser}`);
            const memberInfoData = await memberInfoRes.json();
            balanceInfo.textContent = memberInfoData.remainingmoney;
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
    
    historyModalContent.innerHTML = '';
    if (historyData.length === 0) {
        historyModalContent.innerHTML = '<p>尚無歷史訂單。</p>';
    } else {
        historyData.forEach(entry => {
            const dateDiv = document.createElement('div');
            dateDiv.classList.add('history-order-date');
            dateDiv.textContent = `日期: ${entry.date}`;
            historyModalContent.appendChild(dateDiv);
            
            for (const mealType in entry.orders) {
                const mealHeader = document.createElement('h5');
                mealHeader.textContent = mealType;
                historyModalContent.appendChild(mealHeader);
                
                for (const orderId in entry.orders[mealType]) {
                    const order = entry.orders[mealType][orderId];
                    const orderDiv = document.createElement('div');
                    orderDiv.classList.add('history-order-item');
                    orderDiv.textContent = `${order.restaurant} - ${order.item_name}: ${order.quantity}份 (NT$ ${order.price * order.quantity})`;
                    historyModalContent.appendChild(orderDiv);
                }
            }
        });
    }
    historyModal.style.display = 'block';
});

// --- 管理員功能 ---
showAllBalancesBtn.addEventListener('click', async () => {
    allOrdersListArea.style.display = 'none';
    allBalancesListArea.style.display = 'block';
    
    const response = await fetch(`${API_BASE_URL}/manager/all_balances`);
    const balances = await response.json();
    
    balanceList.innerHTML = '';
    for (const user in balances) {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${user}: NT$ ${balances[user]}</span>
            <div class="recharge-controls">
                <input type="number" placeholder="金額" class="recharge-input" data-user="${user}">
                <button class="recharge-btn">儲值</button>
            </div>
        `;
        balanceList.appendChild(li);
    }
    
    balanceList.addEventListener('click', async (e) => {
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

showAllOrdersBtn.addEventListener('click', async () => {
    allBalancesListArea.style.display = 'none';
    allOrdersListArea.style.display = 'block';
    
    const response = await fetch(`${API_BASE_URL}/manager/all_orders`);
    const orders = await response.json();
    
    allOrdersList.innerHTML = '';
    if (Object.keys(orders).length === 0) {
        allOrdersList.innerHTML = '<li>目前沒有訂單。</li>';
        return;
    }
    
    for (const username in orders) {
        const userOrders = orders[username];
        const userHeader = document.createElement('h4');
        userHeader.textContent = `會員: ${username}`;
        allOrdersList.appendChild(userHeader);
        
        const orderList = document.createElement('ul');
        for (const mealType in userOrders) {
            const mealHeader = document.createElement('li');
            mealHeader.innerHTML = `<strong>${mealType}:</strong>`;
            orderList.appendChild(mealHeader);

            for (const orderId in userOrders[mealType]) {
                const order = userOrders[mealType][orderId];
                const li = document.createElement('li');
                li.textContent = `${order.restaurant} - ${order.item_name}: ${order.quantity}份 (NT$ ${order.price * order.quantity})`;
                orderList.appendChild(li);
            }
        }
        allOrdersList.appendChild(orderList);
    }
});

showAllHistoryOrdersBtn.addEventListener('click', async () => {
    const response = await fetch(`${API_BASE_URL}/manager/history`);
    const historyData = await response.json();
    
    historyModalContent.innerHTML = '';
    if (Object.keys(historyData).length === 0) {
        historyModalContent.innerHTML = '<p>尚無歷史訂單。</p>';
    } else {
        for(const username in historyData) {
            const userHistory = historyData[username];
            const userHeader = document.createElement('h4');
            userHeader.textContent = `會員: ${username}`;
            historyModalContent.appendChild(userHeader);

            userHistory.forEach(entry => {
                const dateDiv = document.createElement('div');
                dateDiv.classList.add('history-order-date');
                dateDiv.textContent = `日期: ${entry.date}`;
                historyModalContent.appendChild(dateDiv);
                
                for (const mealType in entry.orders) {
                    const mealHeader = document.createElement('h5');
                    mealHeader.textContent = mealType;
                    historyModalContent.appendChild(mealHeader);
                    
                    for (const orderId in entry.orders[mealType]) {
                        const order = entry.orders[mealType][orderId];
                        const orderDiv = document.createElement('div');
                        orderDiv.classList.add('history-order-item');
                        orderDiv.textContent = `${order.restaurant} - ${order.item_name}: ${order.quantity}份 (NT$ ${order.price * order.quantity})`;
                        historyModalContent.appendChild(orderDiv);
                    }
                }
            });
        }
    }
    historyModal.style.display = 'block';
});

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
            body: JSON.stringify({ meal_type: mealType, deadline: newDeadline })
        });
        const data = await response.json();
        alert(data.message);
        if (response.ok) {
            // 更新本地數據並重新渲染會員介面
            orderDeadlines[mealType] = newDeadline;
            const memberInfoRes = await fetch(`${API_BASE_URL}/member/info/${currentUser}`);
            const memberInfoData = await memberInfoRes.json();
            renderMemberMeals(memberInfoData.current_orders);
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
            body: JSON.stringify({ meal_type: mealType, restaurant, item_name, price })
        });
        const data = await response.json();
        alert(data.message);
        if (response.ok) {
            restaurantInput.value = '';
            nameInput.value = '';
            priceInput.value = '';
            // 重新載入餐點選項
            await initialize();
            const memberInfoRes = await fetch(`${API_BASE_URL}/member/info/${currentUser}`);
            const memberInfoData = await memberInfoRes.json();
            renderMemberMeals(memberInfoData.current_orders);
        }
    });
});


// --- 懸浮視窗的關閉事件 ---
historyCloseBtn.addEventListener('click', () => {
    historyModal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === historyModal) {
        historyModal.style.display = 'none';
    }
});

initialize();