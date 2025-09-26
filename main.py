from flask import Flask, request, jsonify, render_template
import json
import os
from datetime import datetime

app = Flask(__name__)

# 全域變數
member_data = {}
order_data = {}
order_history = {}
meal_options = {}  # 儲存每日的餐點選項，鍵為日期字串 "YYYY-MM-DD"
order_deadlines = {} # 儲存每日的訂餐截止時間，鍵為日期字串 "YYYY-MM-DD"

# 檔案路徑
MEMBER_DATA_FILE = "memberdata.json"
ORDER_DATA_FILE = "orderdata.json"
ORDER_HISTORY_FILE = "orderhistory.json"
MEAL_OPTIONS_FILE = "meal_options.json"
ORDER_DEADLINES_FILE = "order_deadlines.json"

def save_data():
    """將資料儲存到檔案中"""
    with open(MEMBER_DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(member_data, f, ensure_ascii=False, indent=4)
    with open(ORDER_DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(order_data, f, ensure_ascii=False, indent=4)
    with open(ORDER_HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(order_history, f, ensure_ascii=False, indent=4)
    with open(MEAL_OPTIONS_FILE, 'w', encoding='utf-8') as f:
        json.dump(meal_options, f, ensure_ascii=False, indent=4)
    with open(ORDER_DEADLINES_FILE, 'w', encoding='utf-8') as f:
        json.dump(order_deadlines, f, ensure_ascii=False, indent=4)

def load_data():
    """從檔案載入資料"""
    global member_data, order_data, order_history, meal_options, order_deadlines
    if os.path.exists(MEMBER_DATA_FILE):
        with open(MEMBER_DATA_FILE, 'r', encoding='utf-8') as f:
            member_data = json.load(f)
    if os.path.exists(ORDER_DATA_FILE):
        with open(ORDER_DATA_FILE, 'r', encoding='utf-8') as f:
            order_data = json.load(f)
    if os.path.exists(ORDER_HISTORY_FILE):
        with open(ORDER_HISTORY_FILE, 'r', encoding='utf-8') as f:
            order_history = json.load(f)
    if os.path.exists(MEAL_OPTIONS_FILE):
        with open(MEAL_OPTIONS_FILE, 'r', encoding='utf-8') as f:
            meal_options = json.load(f)
    if os.path.exists(ORDER_DEADLINES_FILE):
        with open(ORDER_DEADLINES_FILE, 'r', encoding='utf-8') as f:
            order_deadlines = json.load(f)

load_data()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['POST'])
def login():
    username = request.json.get('username')
    password = request.json.get('password')
    
    user_info = member_data.get(username)
    
    if user_info and user_info['password'] == password:
        return jsonify({
            'message': '登入成功', 
            'identity': user_info['identity']
        }), 200
    else:
        return jsonify({'message': '帳號或密碼錯誤'}), 401

@app.route('/logout', methods=['POST'])
def logout():
    return jsonify({'message': '登出成功'}), 200

# 新增這個 API endpoint，讓會員介面可以取得當日菜單與截止時間
@app.route('/member/meal_options')
def get_member_meal_options():
    today_date = datetime.now().strftime("%Y-%m-%d")
    return jsonify({
        'meal_options': meal_options.get(today_date, {}),
        'order_deadlines': order_deadlines.get(today_date, {})
    })

@app.route('/member/info/<username>')
def get_member_info(username):
    user_info = member_data.get(username)
    if not user_info:
        return jsonify({'message': '會員不存在'}), 404
    
    today_date = datetime.now().strftime("%Y-%m-%d")
    # 這裡的 order_data 結構是 order_data[date][username]
    current_orders = order_data.get(today_date, {}).get(username, {})
    
    return jsonify({
        'username': username,
        'remainingmoney': user_info.get('remainingmoney', 0),
        'current_orders': current_orders
    })

@app.route('/manager/all_balances')
def get_all_balances():
    balances = {user: info['remainingmoney'] for user, info in member_data.items() if info['identity'] == 'member'}
    return jsonify(balances)

@app.route('/manager/recharge', methods=['POST'])
def recharge():
    data = request.json
    username = data.get('username')
    amount = data.get('amount')
    
    if username in member_data and member_data[username]['identity'] == 'member':
        member_data[username]['remainingmoney'] += amount
        save_data()
        return jsonify({'message': f'{username} 成功儲值 {amount} 元'}), 200
    
    return jsonify({'message': '儲值失敗'}), 400

@app.route('/member/order', methods=['POST'])
def submit_order():
    data = request.json
    username = data.get('username')
    new_orders = data.get('orders', {})
    today_date = datetime.now().strftime("%Y-%m-%d")
    
    now = datetime.now().strftime("%H:%M")
    
    # 檢查訂單是否已過截止時間
    for meal_type, items in new_orders.items():
        if items and now > order_deadlines.get(today_date, {}).get(meal_type, "23:59"):
            return jsonify({'message': f'{meal_type}已超過截止時間，無法送出訂單。'}), 400

    user_info = member_data.get(username)
    if not user_info:
        return jsonify({'message': '會員不存在'}), 404
    
    total_cost = sum(item['price'] * item['quantity'] for meal in new_orders.values() for item in meal.values())
    
    if user_info['remainingmoney'] < total_cost:
        return jsonify({'message': '餘額不足，無法送出訂單。'}), 400
    
    user_info['remainingmoney'] -= total_cost
    
    # 更新當日訂單
    if today_date not in order_data:
        order_data[today_date] = {}
    order_data[today_date][username] = new_orders
    
    # 更新歷史訂單
    history_entry = {
        'date': datetime.now().strftime("%Y-%m-%d %H:%M"),
        'orders': new_orders,
        'cost': total_cost
    }
    order_history.setdefault(username, []).append(history_entry)
    
    save_data()
    return jsonify({'message': '訂單送出成功'}), 200


@app.route('/manager/all_orders')
def get_all_orders():
    today_date = datetime.now().strftime("%Y-%m-%d")
    return jsonify(order_data.get(today_date, {}))

@app.route('/member/history/<username>')
def get_member_history(username):
    history = order_history.get(username, [])
    return jsonify(history)

@app.route('/manager/history')
def get_all_history():
    return jsonify(order_history)

@app.route('/manager/meal_options/<date>', methods=['GET'])
def get_meal_options_by_date(date):
    return jsonify({
        'meal_options': meal_options.get(date, {}),
        'order_deadlines': order_deadlines.get(date, {})
    })

@app.route('/manager/update_deadline', methods=['POST'])
def update_deadline():
    data = request.json
    date = data.get('date')
    meal_type = data.get('meal_type')
    new_deadline = data.get('deadline')
    
    if date not in order_deadlines:
        order_deadlines[date] = {}
    
    order_deadlines[date][meal_type] = new_deadline
    save_data()
    return jsonify({'message': f'{date}的{meal_type}截止時間已更新'}), 200

@app.route('/manager/add_meal', methods=['POST'])
def add_meal():
    data = request.json
    date = data.get('date')
    meal_type = data.get('meal_type')
    restaurant = data.get('restaurant')
    item_name = data.get('item_name')
    price = data.get('price')

    if date not in meal_options:
        meal_options[date] = {}
    if meal_type not in meal_options[date]:
        meal_options[date][meal_type] = []
    
    meal_options[date][meal_type].append({
        'restaurant': restaurant,
        'item_name': item_name,
        'price': price
    })
    save_data()
    return jsonify({'message': f'已新增 {item_name}'}), 200

@app.route('/manager/delete_meal', methods=['POST'])
def delete_meal():
    data = request.json
    date = data.get('date')
    meal_type = data.get('meal_type')
    item_name = data.get('item_name')

    if date in meal_options and meal_type in meal_options[date]:
        meal_options[date][meal_type] = [
            item for item in meal_options[date][meal_type] if item['item_name'] != item_name
        ]
        save_data()
        return jsonify({'message': f'已刪除 {item_name}'}), 200
    
    return jsonify({'message': '刪除失敗'}), 400

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)