document.addEventListener('DOMContentLoaded', () => {
    // 預設的使用者帳號資料
    // 注意：這裡使用 localStorage 模擬資料庫，實際後端應從資料庫讀取
    const initialUserAccounts = {
        'manager': {
            password: '80208020',
            remainingmoney: 0,
            identity: 'manager'
        },
        'memberA': {
            password: 'passwordA',
            remainingmoney: 1000,
            identity: 'member'
        },
        'memberB': {
            password: 'passwordB',
            remainingmoney: 850,
            identity: 'member'
        },
        'memberC': {
            password: 'passwordC',
            remainingmoney: 1200,
            identity: 'member'
        }
    };

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

    let currentRole = null;
    let selectedDate = null;

    // 初始化儲存餐點、訂單和使用者帳號的 localStorage
    if (!localStorage.getItem('meals')) {
        localStorage.setItem('meals', JSON.stringify({}));
    }
    if (!localStorage.getItem('orders')) {
        localStorage.setItem('orders', JSON.stringify({}));
    }
    if (!localStorage.getItem('userAccounts')) {
        localStorage.setItem('userAccounts', JSON.stringify(initialUserAccounts));
    }

    // 登入功能
    loginBtn.addEventListener('click', () => {
        const username = usernameInput.value;
        const password = passwordInput.value;
        const userAccounts = JSON.parse(localStorage.getItem('userAccounts'));

        if (userAccounts[username] && userAccounts[username].password === password) {
            currentRole = username;
            welcomeMsg.textContent = `歡迎回來，${currentRole}!`;
            loginContainer.style.display = 'none';
            mainContainer.style.display = 'block';

            if (userAccounts[currentRole].identity === 'manager') {
                managerDashboard.style.display = 'block';
                memberOrderArea.style.display = 'none';
                balanceInfo.style.display = 'none'; // Manager 不顯示個人餘額
                
                const today = new Date();
                const todayFormatted = today.toISOString().split('T')[0];
                datePicker.value = todayFormatted;
                selectedDate = todayFormatted;
                modalDate.textContent = selectedDate;
                showManagerModal();
            } else if (userAccounts[currentRole].identity === 'member') {
                managerDashboard.style.display = 'none';
                memberOrderArea.style.display = 'block';
                balanceInfo.style.display = 'inline'; // Member 顯示個人餘額
                updateBalanceInfo();
                const today = new Date();
                const year = today.getFullYear();
                const month = today.getMonth() + 1;
                const day = today.getDate();
                selectedDate = `${year}-${month}-${day}`;
                renderMemberOrderArea();
            }
        } else {
            alert('帳號或密碼錯誤。');
        }
    });

    // 登出功能
    logoutBtn.addEventListener('click', () => {
        currentRole = null;
        loginContainer.style.display = 'block';
        mainContainer.style.display = 'none';
        usernameInput.value = '';
        passwordInput.value = '';
        managerModal.style.display = 'none';
        balanceInfo.style.display = 'none';
        datePicker.value = '';
    });

    // 顯示個人餘額
    function updateBalanceInfo() {
        const userAccounts = JSON.parse(localStorage.getItem('userAccounts'));
        balanceInfo.textContent = `餘額: $${userAccounts[currentRole].remainingmoney}`;
    }

    // Manager 選擇日期後，顯示彈出視窗
    datePicker.addEventListener('change', (e) => {
        selectedDate = e.target.value;
        modalDate.textContent = selectedDate;
        showManagerModal();
    });

    // 顯示 Manager 的彈出視窗
    function showManagerModal() {
        managerModal.style.display = 'block';
        
        const meals = JSON.parse(localStorage.getItem('meals')) || {};
        let currentMeals = meals[selectedDate] || [];

        // 動態渲染餐點列表
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

        // 動態渲染 Member 餘額列表及儲值功能
        const userAccounts = JSON.parse(localStorage.getItem('userAccounts'));
        let balanceListHTML = '<h3>所有 Member 餘額</h3><ul id="balance-list">';
        
        // 篩選出所有身分為 'member' 的使用者
        const membersOnly = Object.keys(userAccounts).filter(user => userAccounts[user].identity === 'member');

        membersOnly.forEach(member => {
            balanceListHTML += `
                <li data-member-name="${member}">
                    <span>${member}: $${userAccounts[member].remainingmoney}</span>
                    <div class="recharge-controls">
                        <input type="number" class="recharge-amount-input" placeholder="金額" min="1">
                        <button class="recharge-btn">儲值</button>
                    </div>
                </li>
            `;
        });
        balanceListHTML += '</ul>';

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
            <hr>
            <div id="member-balance-list">${balanceListHTML}</div>
        `;
        
        // 新增餐點按鈕事件
        document.getElementById('add-meal-btn').addEventListener('click', () => {
            const mealName = document.getElementById('new-meal-name').value;
            const mealPrice = document.getElementById('new-meal-price').value;
            if (mealName && mealPrice && mealPrice >= 0) {
                currentMeals.push({ name: mealName, price: parseFloat(mealPrice) });
                meals[selectedDate] = currentMeals;
                localStorage.setItem('meals', JSON.stringify(meals));
                showManagerModal(); // 重新渲染 modal
            } else {
                alert('請輸入有效的餐點名稱和價格。');
            }
        });

        // 刪除餐點按鈕事件
        document.querySelectorAll('.delete-meal-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const indexToDelete = e.target.dataset.index;
                currentMeals.splice(indexToDelete, 1);
                meals[selectedDate] = currentMeals;
                localStorage.setItem('meals', JSON.stringify(meals));
                showManagerModal();
            });
        });

        // 儲值按鈕事件
        document.querySelectorAll('.recharge-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const memberLi = e.target.closest('li');
                const memberName = memberLi.dataset.memberName;
                const amountInput = memberLi.querySelector('.recharge-amount-input');
                const amount = parseFloat(amountInput.value);

                if (amount > 0) {
                    const userAccounts = JSON.parse(localStorage.getItem('userAccounts'));
                    userAccounts[memberName].remainingmoney = (userAccounts[memberName].remainingmoney || 0) + amount;
                    localStorage.setItem('userAccounts', JSON.stringify(userAccounts));
                    amountInput.value = ''; // 清空輸入框
                    alert(`已成功為 ${memberName} 儲值 $${amount}`);
                    showManagerModal(); // 重新渲染 modal 以更新餘額
                } else {
                    alert('請輸入有效的儲值金額。');
                }
            });
        });
    }

    // 顯示 Member 的訂餐畫面
    function renderMemberOrderArea() {
        const meals = JSON.parse(localStorage.getItem('meals')) || {};
        const orders = JSON.parse(localStorage.getItem('orders')) || {};
        const currentMeals = meals[selectedDate] || [];
        const currentOrder = orders[selectedDate] && orders[selectedDate][currentRole] ? orders[selectedDate][currentRole] : {};
        
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
                const mealName = event.target.dataset.meal-name;
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

        document.getElementById('save-order-btn').addEventListener('click', () => {
            const newOrder = {};
            let newTotalCost = 0;
            const userAccounts = JSON.parse(localStorage.getItem('userAccounts'));
            
            memberOrderArea.querySelectorAll('.quantity').forEach(input => {
                const mealName = input.dataset.mealName;
                const meal = currentMeals.find(m => m.name === mealName);
                const count = parseInt(input.value);
                
                if (count > 0) {
                    newOrder[mealName] = { name: mealName, count: count, price: meal.price };
                    newTotalCost += count * meal.price;
                }
            });

            if (newTotalCost > (userAccounts[currentRole].remainingmoney || 0)) {
                alert('餘額不足，無法送出訂單。');
                return;
            }

            if (Object.keys(newOrder).length > 0) {
                const oldOrder = orders[selectedDate] && orders[selectedDate][currentRole] ? orders[selectedDate][currentRole] : {};
                let oldTotalCost = 0;
                for (const mealName in oldOrder) {
                    oldTotalCost += oldOrder[mealName].count * oldOrder[mealName].price;
                }

                const paymentDifference = newTotalCost - oldTotalCost;
                
                userAccounts[currentRole].remainingmoney -= paymentDifference;
                localStorage.setItem('userAccounts', JSON.stringify(userAccounts));
                updateBalanceInfo();
            }
            
            orders[selectedDate] = orders[selectedDate] || {};
            orders[selectedDate][currentRole] = newOrder;
            localStorage.setItem('orders', JSON.stringify(orders));
            alert('訂單已送出！');
            renderMemberOrderArea();
        });
    }
});