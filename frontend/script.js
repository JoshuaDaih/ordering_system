document.addEventListener('DOMContentLoaded', () => {
    // 帳號密碼，此處為前端測試版，正式環境應從後端驗證
    const testAccounts = {
        'manager': '80208020',
        'member': '12345678'
    };

    // 取得 DOM 元素
    const loginContainer = document.getElementById('login-container');
    const mainContainer = document.getElementById('main-container');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    // 移除原有的 loginMessage 變數
    const welcomeMsg = document.getElementById('welcome-msg');
    const calendarContainer = document.getElementById('calendar-container');
    const modal = document.getElementById('modal');
    const modalCloseBtn = document.querySelector('.close-btn');
    const modalDate = document.getElementById('modal-date');
    const modalContentArea = document.getElementById('modal-content-area');

    let currentRole = null;
    let selectedDate = null;
    let currentMonth = new Date();

    // 初始化儲存餐點和訂單的 localStorage
    if (!localStorage.getItem('meals')) {
        localStorage.setItem('meals', JSON.stringify({}));
    }
    if (!localStorage.getItem('orders')) {
        localStorage.setItem('orders', JSON.stringify({}));
    }

    // 登入功能
    loginBtn.addEventListener('click', () => {
        const username = usernameInput.value;
        const password = passwordInput.value;

        if (testAccounts[username] === password) {
            currentRole = username;
            welcomeMsg.textContent = `歡迎回來，${currentRole}!`;
            loginContainer.style.display = 'none';
            mainContainer.style.display = 'block';
            renderCalendar();
        } else {
            // 使用 alert 顯示錯誤訊息
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
        // 移除原有的 loginMessage 內容清空
    });

    // 動態生成月曆
    function renderCalendar() {
        calendarContainer.innerHTML = '';
        const today = new Date();
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const lastDateOfMonth = new Date(year, month + 1, 0).getDate();

        // 建立月曆標題
        const calendarTitle = document.createElement('h2');
        calendarTitle.textContent = `${year}年 ${month + 1}月`;
        calendarTitle.style.gridColumn = '1 / -1';
        calendarContainer.appendChild(calendarTitle);

        // 建立星期標題
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        weekdays.forEach(day => {
            const weekdayEl = document.createElement('div');
            weekdayEl.textContent = day;
            weekdayEl.classList.add('calendar-day');
            weekdayEl.style.cursor = 'default';
            weekdayEl.style.backgroundColor = '#eef';
            calendarContainer.appendChild(weekdayEl);
        });

        // 填補上個月的空白
        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.classList.add('calendar-day', 'not-current-month');
            calendarContainer.appendChild(emptyDay);
        }

        // 渲染本月日期
        for (let i = 1; i <= lastDateOfMonth; i++) {
            const dayEl = document.createElement('div');
            dayEl.textContent = i;
            dayEl.classList.add('calendar-day');
            
            const fullDate = new Date(year, month, i);
            const dateKey = `${year}-${month + 1}-${i}`;

            if (fullDate.toDateString() === today.toDateString()) {
                dayEl.classList.add('today');
            }

            dayEl.addEventListener('click', () => {
                selectedDate = dateKey;
                modalDate.textContent = dateKey;
                showModal();
            });

            calendarContainer.appendChild(dayEl);
        }
    }

    // 顯示彈出視窗 (Modal)
    function showModal() {
        modal.style.display = 'block';
        if (currentRole === 'manager') {
            renderManagerModal();
        } else if (currentRole === 'member') {
            renderMemberModal();
        }
    }

    // Manager 角色視窗
    function renderManagerModal() {
        modalContentArea.innerHTML = `
            <h3>新增當日餐點選項 (${selectedDate})</h3>
            <label for="lunch-name">午餐名稱:</label>
            <input type="text" id="lunch-name">
            <label for="dinner-name">晚餐名稱:</label>
            <input type="text" id="dinner-name">
            <button id="save-meal-btn">儲存</button>
            <hr>
            <h3>目前餐點選項</h3>
            <div id="current-meals"></div>
        `;

        const meals = JSON.parse(localStorage.getItem('meals')) || {};
        const currentMeals = meals[selectedDate] || { lunch: '未設定', dinner: '未設定' };
        document.getElementById('current-meals').innerHTML = `
            <p>午餐: ${currentMeals.lunch}</p>
            <p>晚餐: ${currentMeals.dinner}</p>
        `;

        document.getElementById('save-meal-btn').addEventListener('click', () => {
            const lunchName = document.getElementById('lunch-name').value;
            const dinnerName = document.getElementById('dinner-name').value;
            
            meals[selectedDate] = {
                lunch: lunchName || '未設定',
                dinner: dinnerName || '未設定'
            };
            localStorage.setItem('meals', JSON.stringify(meals));
            alert('餐點選項已儲存！');
            showModal(); // 更新 modal 顯示
        });
    }

    // Member 角色視窗
    function renderMemberModal() {
        const meals = JSON.parse(localStorage.getItem('meals')) || {};
        const orders = JSON.parse(localStorage.getItem('orders')) || {};
        const currentMeals = meals[selectedDate] || { lunch: '今日無餐點', dinner: '今日無餐點' };
        const currentOrder = orders[selectedDate] && orders[selectedDate][currentRole] ? orders[selectedDate][currentRole] : { lunch: '未訂', dinner: '未訂' };

        modalContentArea.innerHTML = `
            <h3>訂購今日餐點 (${selectedDate})</h3>
            <p>午餐選項: ${currentMeals.lunch}</p>
            <p>晚餐選項: ${currentMeals.dinner}</p>
            <hr>
            <h4>你的訂單</h4>
            <p>午餐: ${currentOrder.lunch}</p>
            <p>晚餐: ${currentOrder.dinner}</p>
            <hr>
            <label for="lunch-order">午餐:</label>
            <select id="lunch-order">
                <option value="">不訂購</option>
                <option value="${currentMeals.lunch}">${currentMeals.lunch}</option>
            </select>
            <label for="dinner-order">晚餐:</label>
            <select id="dinner-order">
                <option value="">不訂購</option>
                <option value="${currentMeals.dinner}">${currentMeals.dinner}</option>
            </select>
            <button id="save-order-btn">送出訂單</button>
        `;

        // 動態更新 select 選項
        const lunchSelect = document.getElementById('lunch-order');
        const dinnerSelect = document.getElementById('dinner-order');

        // 如果 manager 尚未設定餐點，則將選項設為無效
        if(currentMeals.lunch === '今日無餐點') {
            lunchSelect.innerHTML = '<option value="">今日無餐點</option>';
            lunchSelect.disabled = true;
        }
        if(currentMeals.dinner === '今日無餐點') {
            dinnerSelect.innerHTML = '<option value="">今日無餐點</option>';
            dinnerSelect.disabled = true;
        }

        document.getElementById('save-order-btn').addEventListener('click', () => {
            const lunchOrder = document.getElementById('lunch-order').value || '不訂購';
            const dinnerOrder = document.getElementById('dinner-order').value || '不訂購';
            
            // 建立訂單物件
            const newOrder = { lunch: lunchOrder, dinner: dinnerOrder };
            
            // 更新 orders
            orders[selectedDate] = orders[selectedDate] || {};
            orders[selectedDate][currentRole] = newOrder;
            localStorage.setItem('orders', JSON.stringify(orders));
            alert('訂單已送出！');
            showModal(); // 更新 modal 顯示
        });
    }

    // 關閉彈出視窗
    modalCloseBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // 點擊視窗外關閉
    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });
});