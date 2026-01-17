from flask import Flask, request, jsonify, render_template, send_file
import json
import os
from datetime import datetime

app = Flask(__name__)

# 檔案路徑與資料初始化
FILES = {
    'member': 'memberdata.json',
    'order': 'orderdata.json',
    'history': 'orderhistory.json',
    'meals': 'meal_options.json',
    'deadlines': 'order_deadlines.json'
}

data = {key: {} for key in FILES}

def load_data():
    global data
    for key, path in FILES.items():
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                data[key] = json.load(f)

def save_all():
    for key, path in FILES.items():
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data[key], f, ensure_ascii=False, indent=4)

load_data()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['POST'])
def login():
    req = request.json
    user = data['member'].get(req.get('username'))
    if user and user['password'] == req.get('password'):
        return jsonify({'message': '成功', 'identity': user['identity']}), 200
    return jsonify({'message': '帳號或密碼錯誤'}), 401

@app.route('/member/meal_options')
def get_member_meal_options():
    today = datetime.now().strftime("%Y-%m-%d")
    return jsonify({
        'meal_options': data['meals'].get(today, {}),
        'order_deadlines': data['deadlines'].get(today, {})
    })

@app.route('/member/info/<username>')
def get_member_info(username):
    user = data['member'].get(username)
    if not user: return jsonify({'message': '無此會員'}), 404
    today = datetime.now().strftime("%Y-%m-%d")
    return jsonify({
        'remainingmoney': user.get('remainingmoney', 0),
        'current_orders': data['order'].get(today, {}).get(username, {})
    })

@app.route('/manager/all_balances')
def get_all_balances():
    return jsonify({u: info['remainingmoney'] for u, info in data['member'].items() if info['identity'] == 'member'})

@app.route('/manager/recharge', methods=['POST'])
def recharge():
    req = request.json
    user = req.get('username')
    if user in data['member']:
        data['member'][user]['remainingmoney'] += req.get('amount')
        save_all()
        return jsonify({'message': '儲值成功'}), 200
    return jsonify({'message': '失敗'}), 400

@app.route('/member/order', methods=['POST'])
def submit_order():
    req = request.json
    user = req.get('username')
    new_orders = req.get('orders', {})
    today = datetime.now().strftime("%Y-%m-%d")
    now_time = datetime.now().strftime("%H:%M")
    
    # 檢查截止時間
    for meal, items in new_orders.items():
        deadline = data['deadlines'].get(today, {}).get(meal, "23:59")
        if items and now_time > deadline:
            return jsonify({'message': f'{meal}已過截止時間'}), 400

    total_cost = sum(item['price'] * item['quantity'] for m in new_orders.values() for item in m.values())
    if data['member'][user]['remainingmoney'] < total_cost:
        return jsonify({'message': '餘額不足'}), 400
    
    data['member'][user]['remainingmoney'] -= total_cost
    if today not in data['order']: data['order'][today] = {}
    data['order'][today][user] = new_orders
    
    data['history'].setdefault(user, []).append({
        'date': datetime.now().strftime("%Y-%m-%d %H:%M"),
        'orders': new_orders,
        'cost': total_cost
    })
    save_all()
    return jsonify({'message': '訂單成功'}), 200

@app.route('/manager/meal_options/<date>')
def get_manager_meals(date):
    return jsonify({'meal_options': data['meals'].get(date, {}), 'order_deadlines': data['deadlines'].get(date, {})})

@app.route('/manager/add_meal', methods=['POST'])
def add_meal():
    req = request.json
    d, m = req.get('date'), req.get('meal_type')
    data['meals'].setdefault(d, {}).setdefault(m, []).append({
        'restaurant': req.get('restaurant'), 'item_name': req.get('item_name'), 'price': req.get('price')
    })
    save_all()
    return jsonify({'message': '已新增'}), 200

@app.route('/manager/update_deadline', methods=['POST'])
def update_deadline():
    req = request.json
    data['deadlines'].setdefault(req.get('date'), {})[req.get('meal_type')] = req.get('deadline')
    save_all()
    return jsonify({'message': '更新成功'}), 200

@app.route('/manager/all_orders')
def get_all_orders():
    today = datetime.now().strftime("%Y-%m-%d")
    return jsonify(data['order'].get(today, {}))

@app.route('/manager/download_order_data')
def download_order_data():
    path = FILES['order']  # 指向 orderdata.json
    if os.path.exists(path):
        return send_file(
            path,
            as_attachment=True,
            download_name=f"current_orders_{datetime.now().strftime('%Y%m%d')}.json",
            mimetype='application/json'
        )
    return jsonify({'message': '檔案不存在'}), 404

@app.route('/manager/download_member_data')
def download_member_data():
    path = FILES['member']  # 指向 memberdata.json
    if os.path.exists(path):
        return send_file(
            path,
            as_attachment=True,
            download_name=f"member_data_{datetime.now().strftime('%Y%m%d')}.json",
            mimetype='application/json'
        )
    return jsonify({'message': '檔案不存在'}), 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)