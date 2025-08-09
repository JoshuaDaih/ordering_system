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
    
    const managerModal = document.getElementById('manager-modal');
    const modalDate = document.getElementById('modal-date');
    const modalContentArea = document.getElementById('modal-content-area');
    const closeModalBtn = document.querySelector('.close-btn');

    const memberBalanceListArea = document.getElementById('member-balance-list-area');
    
    let currentRole = null;
    let selectedDate = null;
    
    const API_BASE_URL = 'http://127.0.0.1:5000';

    // 格式化日期為 YYYY-MM-DD
    function getTodayFormatted() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

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
                    
                    datePicker.value = '';
                    selectedDate = null;
                    managerModal.style.display = 'none';
                    
                    renderMemberBalanceList();

                } else if (data.identity === 'member') {
                    managerDashboard.style.display = 'none';
                    memberOrderArea.style.display = 'block';
                    balanceInfo.style.display = 'inline';
                    
                    updateBalanceInfo();
                    selectedDate = getTodayFormatted(); // 確保會員登入後立即設定當日日期
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
        memberBalanceListArea.innerHTML = '';
        memberOrderArea.innerHTML = '';
    });

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

    datePicker.addEventListener('change', (e) => {
        selectedDate = e.target.value;
        if (selectedDate) {
            modalDate.textContent = `當日餐點與餘額管理 (${selectedDate})`;
            showManagerModal();
        } else {
            managerModal.style.display = 'none';
        }
    });

    async function showManagerModal() {
        managerModal.style.display = 'block';
        
        let meals = { 
            lunch: { meals: [], deadline: '11:30' }, 
            dinner: { meals: [], deadline: '17:00' } 
        };

        try {
            const mealsResponse = await fetch(`${API_BASE_URL}/manager/meals/${selectedDate}`);
            if (mealsResponse.ok) {
                const data = await mealsResponse.json();
                meals.lunch = data.lunch || meals.lunch;
                meals.dinner = data.dinner || meals.dinner;
            } else {
                console.error('後端回傳錯誤:', await mealsResponse.json());
            }
        } catch (error) {
            console.error('取得後端餐點資料失敗:', error);
        }

        const renderMealList = (mealType) => {
            const mealsList = meals[mealType].meals;
            const deadline = meals[mealType].deadline;

            let html = `
                <div class="meal-section-header">
                    <h4>${mealType === 'lunch' ? '午餐' : '晚餐'} 選項</h4>
                    <label>
                        截止時間：
                        <input type="time" class="deadline-input" data-meal-type="${mealType}" value="${deadline}">
                    </label>
                </div>
            `;
            if (mealsList && mealsList.length > 0) {
                html += `<ul id="current-meals-list-${mealType}">`;
                mealsList.forEach((meal, index) => {
                    html += `
                        <li>
                            <span>${meal.name} ($${meal.price})</span>
                            <button class="delete-meal-btn" data-index="${index}" data-meal-type="${mealType}">刪除</button>
                        </li>
                    `;
                });
                html += '</ul>';
            } else {
                html += '<p>尚未設定餐點</p>';
            }
            return html;
        };

        modalContentArea.innerHTML = `
            <h3>新增當日餐點選項</h3>
            <div id="new-meal-inputs">
                <div id="meal-input-group">
                    <input type="text" id="new-meal-name" placeholder="餐點名稱">
                    <input type="number" id="new-meal-price" placeholder="價格" min="0">
                    <select id="new-meal-type">
                        <option value="lunch">午餐</option>
                        <option value="dinner">晚餐</option>
                    </select>
                </div>
                <button id="add-meal-btn">新增餐點</button>
            </div>
            <hr>
            ${renderMealList('lunch')}
            <hr>
            ${renderMealList('dinner')}
        `;
        
        document.querySelectorAll('.deadline-input').forEach(input => {
            input.addEventListener('change', async (e) => {
                const mealType = e.target.dataset.mealType;
                const newDeadline = e.target.value;
                
                const currentMeals = meals[mealType].meals || [];
                try {
                    const response = await fetch(`${API_BASE_URL}/manager/meals`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ date: selectedDate, meals: currentMeals, mealType: mealType, deadline: newDeadline })
                    });
                    if (!response.ok) {
                        const data = await response.json();
                        alert(data.message);
                    }
                } catch (error) {
                    console.error('更新截止時間失敗:', error);
                }
            });
        });

        document.getElementById('add-meal-btn').addEventListener('click', async () => {
            const mealName = document.getElementById('new-meal-name').value;
            const mealPrice = document.getElementById('new-meal-price').value;
            const mealType = document.getElementById('new-meal-type').value;

            if (mealName && mealPrice && mealPrice >= 0) {
                const currentMeals = meals[mealType].meals || [];
                const deadline = meals[mealType].deadline;
                currentMeals.push({ name: mealName, price: parseFloat(mealPrice) });
                
                try {
                    const response = await fetch(`${API_BASE_URL}/manager/meals`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ date: selectedDate, meals: currentMeals, mealType: mealType, deadline: deadline })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        showManagerModal();
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

        document.querySelectorAll('.delete-meal-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const indexToDelete = e.target.dataset.index;
                const mealType = e.target.dataset.mealType;
                
                const currentMeals = meals[mealType].meals || [];
                const deadline = meals[mealType].deadline;
                currentMeals.splice(indexToDelete, 1);
                
                try {
                    const response = await fetch(`${API_BASE_URL}/manager/meals`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ date: selectedDate, meals: currentMeals, mealType: mealType, deadline: deadline })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        showManagerModal();
                    } else {
                        alert(data.message);
                    }
                } catch (error) {
                    console.error('刪除餐點失敗:', error);
                }
            });
        });
    }

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
                            renderMemberBalanceList();
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

    closeModalBtn.addEventListener('click', () => {
        managerModal.style.display = 'none';
        datePicker.value = '';
        selectedDate = null;
    });
    
    window.addEventListener('click', (e) => {
        if (e.target == managerModal) {
            managerModal.style.display = 'none';
            datePicker.value = '';
            selectedDate = null;
        }
    });

    async function renderMemberOrderArea() {
        if (!selectedDate) {
            memberOrderArea.innerHTML = '<h3>請先選擇日期。</h3>';
            return;
        }

        let meals = { lunch: { meals: [], deadline: '11:30' }, dinner: { meals: [], deadline: '17:00' } };
        let orders = { lunch: {}, dinner: {} };

        try {
            const mealsResponse = await fetch(`${API_BASE_URL}/manager/meals/${selectedDate}`);
            if (mealsResponse.ok) {
                const data = await mealsResponse.json();
                meals.lunch = data.lunch || meals.lunch;
                meals.dinner = data.dinner || meals.dinner;
            } else {
                console.error('後端餐點資料回傳錯誤:', await mealsResponse.json());
            }

            const orderResponse = await fetch(`${API_BASE_URL}/member/orders/${currentRole}/${selectedDate}`);
            if (orderResponse.ok) {
                const data = await orderResponse.json();
                orders.lunch = data.lunch || orders.lunch;
                orders.dinner = data.dinner || orders.dinner;
            } else {
                console.error('後端訂單資料回傳錯誤:', await orderResponse.json());
            }
        } catch (error) {
            console.error('取得訂餐資訊失敗:', error);
            memberOrderArea.innerHTML = '<h3>無法載入訂餐資訊。</h3>';
            return;
        }

        const renderMealSection = (mealType) => {
            const mealsList = meals[mealType].meals;
            const currentOrder = orders[mealType];
            const deadline = meals[mealType].deadline;

            let totalCost = 0;
            let orderSummaryHTML = '';
            
            if (mealsList && Array.isArray(mealsList)) {
                mealsList.forEach(meal => {
                    const orderedItem = currentOrder[meal.name] || { count: 0, price: meal.price };
                    if (orderedItem.count > 0) {
                        totalCost += orderedItem.count * orderedItem.price;
                        orderSummaryHTML += `<p>${meal.name}: ${orderedItem.count} 份</p>`;
                    }
                });
            }

            if (orderSummaryHTML === '') {
                orderSummaryHTML = '<p>尚無訂單</p>';
            }
            
            let mealOptionsHTML = '';
            if (mealsList && mealsList.length > 0) {
                mealsList.forEach(meal => {
                    const orderedCount = (currentOrder[meal.name] && currentOrder[meal.name].count) || 0;
                    mealOptionsHTML += `
                        <div class="order-item">
                            <span>${meal.name} ($${meal.price})</span>
                            <div class="order-controls">
                                <button class="quantity-btn minus-btn" data-meal-type="${mealType}" data-meal-name="${meal.name}">-</button>
                                <input type="text" class="quantity" data-meal-type="${mealType}" data-meal-name="${meal.name}" value="${orderedCount}" readonly>
                                <button class="quantity-btn plus-btn" data-meal-type="${mealType}" data-meal-name="${meal.name}">+</button>
                            </div>
                        </div>
                    `;
                });
            } else {
                mealOptionsHTML = '<p>今日無餐點可供訂購。</p>';
            }

            return `
                <h3>訂購今日${mealType === 'lunch' ? '午餐' : '晚餐'} (${selectedDate})</h3>
                <p><strong>截止時間: ${deadline} (UTC+8)</strong></p>
                <h4>你的訂單 (總計: $${totalCost})</h4>
                <div id="order-summary-${mealType}">${orderSummaryHTML}</div>
                <hr>
                <h4>選擇餐點</h4>
                <div id="meal-options-area-${mealType}">${mealOptionsHTML}</div>
                <button class="save-order-btn" data-meal-type="${mealType}">送出訂單</button>
                <br><br>
            `;
        };

        memberOrderArea.innerHTML = `
            ${renderMealSection('lunch')}
            <hr>
            ${renderMealSection('dinner')}
        `;

        memberOrderArea.querySelectorAll('.quantity-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const mealType = event.target.dataset.mealType;
                const mealName = event.target.dataset.mealName;
                const quantityInput = document.querySelector(`#member-order-area .quantity[data-meal-type="${mealType}"][data-meal-name="${mealName}"]`);
                let currentQuantity = parseInt(quantityInput.value);

                if (event.target.classList.contains('plus-btn')) {
                    currentQuantity++;
                } else if (event.target.classList.contains('minus-btn') && currentQuantity > 0) {
                    currentQuantity--;
                }
                quantityInput.value = currentQuantity;
            });
        });

        memberOrderArea.querySelectorAll('.save-order-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const mealType = e.target.dataset.mealType;
                const newOrder = {};
                
                const currentMeals = meals[mealType].meals;
                const quantityInputs = memberOrderArea.querySelectorAll(`.quantity[data-meal-type="${mealType}"]`);

                quantityInputs.forEach(input => {
                    const mealName = input.dataset.mealName;
                    const meal = currentMeals.find(m => m.name === mealName);
                    const count = parseInt(input.value);

                    if (count > 0 && meal) {
                        newOrder[mealName] = { name: mealName, count: count, price: meal.price };
                    }
                });

                const now = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Taipei"}));
                const [deadlineHour, deadlineMinute] = meals[mealType].deadline.split(':').map(Number);
                const deadlineTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), deadlineHour, deadlineMinute);

                if (now > deadlineTime) {
                    alert('已超過訂餐截止時間，無法送出訂單。');
                    return;
                }
                
                let newTotalCost = 0;
                for (const mealName in newOrder) {
                    const item = newOrder[mealName];
                    newTotalCost += item.count * item.price;
                }

                if (newTotalCost < 0) {
                    alert('訂單總金額不能為負數。');
                    return;
                }

                try {
                    const response = await fetch(`${API_BASE_URL}/member/order`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: currentRole, date: selectedDate, mealType: mealType, order: newOrder })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        alert(`訂單已送出！新餘額為: $${data.balance}`);
                        updateBalanceInfo();
                        renderMemberOrderArea();
                    } else {
                        alert(data.message);
                    }
                } catch (error) {
                    console.error('送出訂單失敗:', error);
                }
            });
        });
    }
});