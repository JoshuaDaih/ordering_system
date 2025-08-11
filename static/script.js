const API_BASE_URL = '';
const app = document.getElementById('app');

const loginContainer = document.getElementById('login-container');
const mainContainer = document.getElementById('main-container');

const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

const memberArea = document.getElementById('member-area');
const managerArea = document.getElementById('manager-area');

const welcomeInfo = document.getElementById('welcome-info');
const balanceInfo = document.getElementById('balance-info');

const orderDateInput = document.getElementById('order-date');

const restaurantNameInput = document.getElementById('restaurant-name-input');
const mealNameInput = document.getElementById('meal-name-input');
const mealPriceInput = document.getElementById('meal-price-input');
const addMealBtn = document.getElementById('add-meal-btn');
const currentMealsList = document.getElementById('current-meals-list');

const balanceList = document.getElementById('balance-list');

const historyModal = document.getElementById('history-modal');
const historyCloseBtn = document.getElementById('history-close-btn');
const showHistoryOrdersBtn = document.getElementById('show-history-orders-btn');

const memberMealsList = document.getElementById('member-meals-list');

const orderSummaryModal = document.getElementById('order-summary-modal');
const orderSummaryModalContent = document.getElementById('order-summary-modal-content');
const orderSummaryCloseBtn = document.getElementById('order-summary-close-btn');

const memberListModal = document.getElementById('member-list-modal');
const memberListModalContent = document.getElementById('member-list-modal-content');
const memberListCloseBtn = document.getElementById('member-list-close-btn');

let currentLoggedInUser = null;

// Helper function to render meals list
const renderManagerMeals = (meals) => {
    currentMealsList.innerHTML = '';
    const mealsByRestaurant = {};
    meals.forEach(meal => {
        if (!mealsByRestaurant[meal.restaurant]) {
            mealsByRestaurant[meal.restaurant] = [];
        }
        mealsByRestaurant[meal.restaurant].push(meal);
    });

    for (const restaurant in mealsByRestaurant) {
        const restaurantHeader = document.createElement('h5');
        restaurantHeader.textContent = `餐廳: ${restaurant}`;
        currentMealsList.appendChild(restaurantHeader);

        mealsByRestaurant[restaurant].forEach(meal => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${meal.name} - $${meal.price}</span>
                <span>
                    已點人數: 
                    <span class="order-count" data-meal-name="${meal.name}" data-restaurant-name="${meal.restaurant}">${meal.count}</span>
                    <button class="delete-meal-btn" data-meal-name="${meal.name}" data-restaurant-name="${meal.restaurant}">刪除</button>
                </span>
            `;
            currentMealsList.appendChild(li);
        });
    }

    // 新增點擊事件監聽器
    currentMealsList.querySelectorAll('.order-count').forEach(span => {
        span.addEventListener('click', async (e) => {
            const mealName = e.target.dataset.mealName;
            const restaurantName = e.target.dataset.restaurantName;
            const date = orderDateInput.value;

            try {
                const response = await fetch(`${API_BASE_URL}/order/summary?date=${date}`);
                if (!response.ok) {
                    throw new Error('無法取得訂單總結');
                }
                const summary = await response.json();

                const membersForMeal = summary.details
                    .filter(item => item.restaurant === restaurantName && item.meal === mealName)
                    .map(item => item.username);
                
                const totalCount = membersForMeal.length;

                renderMemberList(restaurantName, mealName, membersForMeal, totalCount);

            } catch (error) {
                alert('無法取得成員列表: ' + error.message);
            }
        });
    });
};

const renderMemberList = (restaurant, meal, members, totalCount) => {
    memberListModalContent.innerHTML = `
        <h4>${restaurant} - ${meal}</h4>
        <p>總計點餐人數: ${totalCount}</p>
        <ul>
            ${members.map(member => `<li>${member}</li>`).join('')}
        </ul>
    `;
    memberListModal.style.display = 'block';
};

// ... (其他函式保持不變)

// 登入事件監聽器
loginBtn.addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert('登入成功！');
            currentLoggedInUser = username;
            localStorage.setItem('loggedInUser', username);
            localStorage.setItem('userIdentity', data.identity);
            checkLoginStatus();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('登入失敗:', error);
        alert('登入失敗，請檢查伺服器連線。');
    }
});

// ... (其他事件監聽器和函式)

// Load data and set up event listeners on page load
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    const formattedDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    orderDateInput.value = formattedDate;

    // ... (其他初始化邏輯)
});

// 註冊新的事件監聽器
addMealBtn.addEventListener('click', async () => {
    const restaurantName = restaurantNameInput.value;
    const mealName = mealNameInput.value;
    const mealPrice = parseFloat(mealPriceInput.value);
    const date = orderDateInput.value;

    if (!restaurantName || !mealName || isNaN(mealPrice) || mealPrice <= 0) {
        alert('請輸入有效的餐廳名稱、餐點名稱和價格！');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/manager/add_meal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, restaurant: restaurantName, name: mealName, price: mealPrice })
        });
        const data = await response.json();
        if (response.ok) {
            alert('餐點新增成功！');
            restaurantNameInput.value = '';
            mealNameInput.value = '';
            mealPriceInput.value = '';
            // Update UI
            fetchMealsByDate(orderDateInput.value);
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('新增餐點失敗:', error);
    }
});

// 函式：取得特定日期的餐點資訊
async function fetchMealsByDate(date) {
    try {
        const response = await fetch(`${API_BASE_URL}/meals?date=${date}`);
        const data = await response.json();
        if (response.ok) {
            const identity = localStorage.getItem('userIdentity');
            if (identity === 'manager') {
                renderManagerMeals(data.meals);
            } else if (identity === 'member') {
                renderMemberMeals(data.meals);
            }
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('獲取餐點列表失敗:', error);
    }
}