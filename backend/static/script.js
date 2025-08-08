document.addEventListener('DOMContentLoaded', () => {
    // 取得 DOM 元素
    const loginContainer = document.getElementById('login-container');
    const mainContainer = document.getElementById('main-container');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const welcomeMsg = document.getElementById('welcome-msg');
    const balanceInfo = document.getElementById('balance-info');
    const managerDashboard = document.getElementById('manager-dashboard');
    const datePicker = document.getElementById('date-picker');
    const memberOrderArea = document.getElementById('member-order-area');
    
    // 重新引入 Manager Modal 相關的 DOM 元素
    const managerModal = document.getElementById('manager-modal');
    const modalDate = document.getElementById('modal-date');
    const modalContentArea = document.getElementById('modal-content-area');
    const closeModalBtn = document.querySelector('.close-btn');

    // 新增的 DOM 元素
    const memberBalanceListArea = document.getElementById('member-balance-list-area');
    
    // 全域變數
    let currentRole = null;
    let selectedDate = null;
    
    // API 基礎 URL，如果後端在本機，通常是 http://127.0.0.1:5000
    const API_BASE_URL = 'http://127.0.0.1:5000';

    // 登入功能
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
                currentRole = username;
                welcomeMsg.textContent = `歡迎回來，${currentRole}!`;
                loginContainer.style.display = 'none';
                mainContainer.style.display = 'block';

                if (data.identity === 'manager') {
                    managerDashboard.style.display = 'block';
                    memberOrderArea.style.display = 'none';
                    balanceInfo.style.display = 'none';
                    
                    const today = new Date();
                    const todayFormatted = today.toISOString().split('T')[0];
                    datePicker.value = todayFormatted;
                    selectedDate = todayFormatted;
                    modalDate.textContent = `當日餐點與餘額管理 (${selectedDate})`;
                    
                    // 登入後，渲染餘額列表
                    renderMemberBalanceList();

                } else if (data.identity === 'member') {
                    managerDashboard.style.display = 'none';
                    memberOrderArea.style.display = 'block';
                    balanceInfo.style.display = 'inline';
                    
                    updateBalanceInfo();
                    const today = new Date();
                    selectedDate = today.toISOString().split('T')[0];
                    renderMemberOrderArea();
                }
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('登入失敗:', error);
            alert('登入失敗，請檢查伺服器連線。');
        }
    });

    // 登出功能
    logoutBtn.addEventListener('click', () => {
        currentRole = null;
        loginContainer.style.display = 'block';
        mainContainer.style.display = 'none';
        usernameInput.value = '';
        passwordInput.value = '';
        managerDashboard.style.display = 'none';
        balanceInfo.style.display = 'none';
        datePicker.value = '';
        managerModal.style.display = 'none';
        // 登出時清空餘額列表
        memberBalanceListArea.innerHTML = '';
    });

    // 顯示個人餘額
    async function updateBalanceInfo() {
        try {
            const response = await fetch(`${API_BASE_URL}/member/balance/${currentRole}`);
            const data = await response.json();
            if (response.ok) {
                balanceInfo.textContent = `餘額: $${data.balance}`;
            } else {
                console.error('無法取得餘額:', data.message);
                balanceInfo.textContent = `餘額: 錯誤`;
            }
        } catch (error) {
            console.error('無法取得餘額:', error);
        }
    }

    // Manager 選擇日期後，顯示懸浮視窗
    datePicker.addEventListener('change', (e) => {
        selectedDate = e.target.value;
        modalDate.textContent = `當日餐點與餘額管理 (${selectedDate})`;
        showManagerModal();
    });

    // 顯示 Manager 的懸浮視窗 (只處理餐點)
    async function showManagerModal() {
        managerModal.style.display = 'block';

        let currentMeals = [];
        try {
            // 取得當日餐點
            const mealsResponse = await fetch(`${API_BASE_URL}/manager/meals/${selectedDate}`);
            if (mealsResponse.ok) {
                const mealsData = await mealsResponse.json();
                currentMeals = mealsData.meals;
            }
        } catch (error) {
            console.error('取得後端資料失敗:', error);
        }

        let currentMealsHTML = '<h4>目前餐點選項</h4>';
        if (currentMeals.length > 0) {
            currentMealsHTML += '<ul id="current-meals-list">';
            currentMeals.forEach((meal, index) => {
                currentMealsHTML += `
                    <li>
                        <span>${meal.name} ($${meal.price})</span>
                        <button class="delete-meal-btn" data-index="${index}">刪除</button>
                    </li>
                `;
            });
            currentMealsHTML += '</ul>';
        } else {
            currentMealsHTML += '<p>尚未設定餐點</p>';
        }

        modalContentArea.innerHTML = `
            <h3>新增當日餐點選項</h3>
            <div id="new-meal-inputs">
                <div id="meal-input-group">
                    <input type="text" id="new-meal-name" placeholder="餐點名稱">
                    <input type="number" id="new-meal-price" placeholder="價格" min="0">
                </div>
                <button id="add-meal-btn">新增餐點</button>
            </div>
            <hr>
            ${currentMealsHTML}
        `;
        
        // 新增餐點按鈕事件
        document.getElementById('add-meal-btn').addEventListener('click', async () => {
            const mealName = document.getElementById('new-meal-name').value;
            const mealPrice = document.getElementById('new-meal-price').value;
            if (mealName && mealPrice && mealPrice >= 0) {
                currentMeals.push({ name: mealName, price: parseFloat(mealPrice) });
                
                try {
                    const response = await fetch(`${API_BASE_URL}/manager/meals`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ date: selectedDate, meals: currentMeals })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        showManagerModal(); // 重新渲染內容
                    } else {
                        alert(data.message);
                    }
                } catch (error) {
                    console.error('新增餐點失敗:', error);
                }
            } else {
                alert('請輸入有效的餐點名稱和價格。');
            }
        });

        // 刪除餐點按鈕事件
        document.querySelectorAll('.delete-meal-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const indexToDelete = e.target.dataset.index;
                currentMeals.splice(indexToDelete, 1);
                
                try {
                    const response = await fetch(`${API_BASE_URL}/manager/meals`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ date: selectedDate, meals: currentMeals })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        showManagerModal(); // 重新渲染內容
                    } else {
                        alert(data.message);
                    }
                } catch (error) {
                    console.error('刪除餐點失敗:', error);
                }
            });
        });
    }

    // 新增：渲染所有會員餘額列表
    async function renderMemberBalanceList() {
        let memberBalances = {};
        try {
            const balancesResponse = await fetch(`${API_BASE_URL}/manager/balances`);
            if (balancesResponse.ok) {
                const balancesData = await balancesResponse.json();
                memberBalances = balancesData.balances;
            }
        } catch (error) {
            console.error('取得後端資料失敗:', error);
        }

        let balanceListHTML = '<h3>所有 Member 餘額</h3><ul id="balance-list">';
        for (const member in memberBalances) {
            balanceListHTML += `
                <li data-member-name="${member}">
                    <span>${member}: $${memberBalances[member]}</span>
                    <div class="recharge-controls">
                        <input type="number" class="recharge-amount-input" placeholder="金額" min="1">
                        <button class="recharge-btn">儲值</button>
                    </div>
                </li>
            `;
        }
        balanceListHTML += '</ul>';
        
        memberBalanceListArea.innerHTML = balanceListHTML;

        // 儲值按鈕事件監聽器，現在放在這裡
        document.querySelectorAll('.recharge-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const memberLi = e.target.closest('li');
                const memberName = memberLi.dataset.memberName;
                const amountInput = memberLi.querySelector('.recharge-amount-input');
                const amount = parseFloat(amountInput.value);

                if (amount > 0) {
                    try {
                        const response = await fetch(`${API_BASE_URL}/member/recharge`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username: memberName, amount })
                        });
                        const data = await response.json();
                        if (response.ok) {
                            amountInput.value = '';
                            alert(`已成功為 ${memberName} 儲值 $${amount}`);
                            renderMemberBalanceList(); // 重新渲染以更新餘額
                        } else {
                            alert(data.message);
                        }
                    } catch (error) {
                        console.error('儲值失敗:', error);
                    }
                } else {
                    alert('請輸入有效的儲值金額。');
                }
            });
        });
    }

    // 關閉懸浮視窗的事件監聽器
    closeModalBtn.addEventListener('click', () => {
        managerModal.style.display = 'none';
    });
    
    // 點擊懸浮視窗以外的地方也會關閉
    window.addEventListener('click', (e) => {
        if (e.target == managerModal) {
            managerModal.style.display = 'none';
        }
    });

    // 顯示 Member 的訂餐畫面
    async function renderMemberOrderArea() {
        let currentMeals = [];
        let currentOrder = {};

        try {
            const mealsResponse = await fetch(`${API_BASE_URL}/manager/meals/${selectedDate}`);
            if (mealsResponse.ok) {
                const mealsData = await mealsResponse.json();
                currentMeals = mealsData.meals;
            }

            const orderResponse = await fetch(`${API_BASE_URL}/member/orders/${currentRole}/${selectedDate}`);
            if (orderResponse.ok) {
                const orderData = await orderResponse.json();
                currentOrder = orderData.order;
            }
        } catch (error) {
            console.error('取得訂單資料失敗:', error);
        }

        let totalCost = 0;
        let orderSummaryHTML = '';
        currentMeals.forEach(meal => {
            const orderedItem = currentOrder[meal.name] || { count: 0, price: meal.price };
            if (orderedItem.count > 0) {
                totalCost += orderedItem.count * orderedItem.price;
                orderSummaryHTML += `<p>${meal.name}: ${orderedItem.count} 份</p>`;
            }
        });

        if (orderSummaryHTML === '') {
            orderSummaryHTML = '<p>尚無訂單</p>';
        }

        memberOrderArea.innerHTML = `
            <h3>訂購今日餐點 (${selectedDate})</h3>
            <h4>你的訂單 (總計: $${totalCost})</h4>
            <div id="order-summary">${orderSummaryHTML}</div>
            <hr>
            <h4>選擇餐點</h4>
            <div id="meal-options-area"></div>
            <button id="save-order-btn">送出訂單</button>
        `;

        const mealOptionsArea = document.getElementById('meal-options-area');

        if (currentMeals.length > 0) {
            currentMeals.forEach(meal => {
                const orderedCount = (currentOrder[meal.name] && currentOrder[meal.name].count) || 0;
                const orderItem = document.createElement('div');
                orderItem.classList.add('order-item');
                orderItem.innerHTML = `
                    <span>${meal.name} ($${meal.price})</span>
                    <div class="order-controls">
                        <button class="quantity-btn minus-btn" data-meal-name="${meal.name}">-</button>
                        <input type="text" class="quantity" data-meal-name="${meal.name}" value="${orderedCount}" readonly>
                        <button class="quantity-btn plus-btn" data-meal-name="${meal.name}">+</button>
                    </div>
                `;
                mealOptionsArea.appendChild(orderItem);
            });
        } else {
            mealOptionsArea.innerHTML = '<p>今日無餐點可供訂購。</p>';
        }

        memberOrderArea.querySelectorAll('.quantity-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const mealName = event.target.dataset.mealName;
                const quantityInput = document.querySelector(`#member-order-area .quantity[data-meal-name="${mealName}"]`);
                let currentQuantity = parseInt(quantityInput.value);

                if (event.target.classList.contains('plus-btn')) {
                    currentQuantity++;
                } else if (event.target.classList.contains('minus-btn') && currentQuantity > 0) {
                    currentQuantity--;
                }
                quantityInput.value = currentQuantity;
            });
        });

        document.getElementById('save-order-btn').addEventListener('click', async () => {
            const newOrder = {};
            let newTotalCost = 0;
            
            // 取得會員當前餘額
            let userBalance = 0;
            try {
                const balanceResponse = await fetch(`${API_BASE_URL}/member/balance/${currentRole}`);
                const balanceData = await balanceResponse.json();
                userBalance = balanceData.balance;
            } catch (error) {
                console.error('無法取得餘額，無法送出訂單:', error);
                alert('無法取得餘額，請稍後再試。');
                return;
            }
            
            // 計算新訂單總價
            memberOrderArea.querySelectorAll('.quantity').forEach(input => {
                const mealName = input.dataset.mealName;
                const meal = currentMeals.find(m => m.name === mealName);
                const count = parseInt(input.value);

                if (count > 0) {
                    newOrder[mealName] = { name: mealName, count: count, price: meal.price };
                    newTotalCost += count * meal.price;
                }
            });

            if (newTotalCost > userBalance) {
                alert('餘額不足，無法送出訂單。');
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/member/order`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: currentRole, date: selectedDate, order: newOrder })
                });
                const data = await response.json();
                if (response.ok) {
                    alert('訂單已送出！');
                    updateBalanceInfo();
                    renderMemberOrderArea();
                } else {
                    alert(data.message);
                }
            } catch (error) {
                console.error('送出訂單失敗:', error);
            }
        });
    }
});