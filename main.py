from flask import Flask, request, jsonify, render_template
import json
import os
from datetime import datetime

app = Flask(__name__)

# 全域變數
member_data = {}
order_data = {}
order_history = {}
order_deadline = "10:00"

# 檔案路徑
MEMBER_DATA_FILE = "memberdata.json"
ORDER_DATA_FILE = "orderdata.json"
ORDER_HISTORY_FILE = "orderhistory.json"

def save_data():
    """將資料儲存到檔案中"""
    with open(MEMBER_DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(member_data, f, ensure_ascii=False, indent=4)
    with open(ORDER_DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(order_data, f, ensure_ascii=False, indent=4)
    with open(ORDER_HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(order_history, f, ensure_ascii=False, indent=4)

def load_data():
    """從檔案載入資料"""
    global member_data, order_data, order_history
    if os.path.exists(MEMBER_DATA_FILE):
        with open(MEMBER_DATA_FILE, 'r', encoding='utf-8') as f:
            member_data = json.load(f)
    if os.path.exists(ORDER_DATA_FILE):
        with open(ORDER_DATA_FILE, 'r', encoding='utf-8') as f:
            order_data = json.load(f)
    if os.path.exists(ORDER_HISTORY_FILE):
        with open(ORDER_HISTORY_FILE, 'r', encoding='utf-8') as f:
            order_history = json.load(f)

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

@app.route('/member/info/<username>')
def get_member_info(username):
    user_info = member_data.get(username)
    if not user_info:
        return jsonify({'message': '會員不存在'}), 404
    
    current_orders = order_data.get(username, {})
    
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
    
    now = datetime.now()
    if now.strftime("%H:%M") > order_deadline:
        return jsonify({'message': '已超過截止時間，無法送出訂單。'}), 400
    
    user_info = member_data.get(username)
    if not user_info:
        return jsonify({'message': '會員不存在'}), 404
    
    total_cost = sum(item['price'] * item['quantity'] for item in new_orders.values())
    
    if user_info['remainingmoney'] < total_cost:
        return jsonify({'message': '餘額不足，無法送出訂單。'}), 400
    
    user_info['remainingmoney'] -= total_cost
    order_data[username] = new_orders
    
    order_history.setdefault(username, []).append({
        'date': now.strftime("%Y-%m-%d %H:%M"),
        'orders': new_orders,
        'cost': total_cost
    })
    
    save_data()
    return jsonify({'message': '訂單送出成功'}), 200

@app.route('/manager/all_orders')
def get_all_orders():
    return jsonify(order_data)

@app.route('/manager/clear_orders', methods=['POST'])
def clear_orders():
    global order_data
    order_data = {}
    save_data()
    return jsonify({'message': '訂單已清空'}), 200

@app.route('/member/history/<username>')
def get_member_history(username):
    history = order_history.get(username, [])
    return jsonify(history)

@app.route('/manager/history')
def get_all_history():
    return jsonify(order_history)

@app.route('/manager/order-summary')
def get_order_summary():
    """新增路由：查看每餐各項餐點的訂購數量及成員列表"""
    summary = {}
    
    for username, orders in order_data.items():
        for meal_id, order_info in orders.items():
            meal_name = order_info['meal_name']
            item_name = order_info['item_name']
            quantity = order_info['quantity']

            if meal_name not in summary:
                summary[meal_name] = {}
            
            if item_name not in summary[meal_name]:
                summary[meal_name][item_name] = {'total_quantity': 0, 'members': []}
            
            summary[meal_name][item_name]['total_quantity'] += quantity
            summary[meal_name][item_name]['members'].append(username)

    return jsonify(summary)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)