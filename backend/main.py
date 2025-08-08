from flask import Flask, request, jsonify, render_template
import json
import os
from datetime import datetime

app = Flask(__name__)

# 定義資料檔案路徑
# 請確保這三個檔案在同一個資料夾中
MEMBER_DATA_FILE = 'memberdata.json'
MEAL_DATA_FILE = 'mealdata.json'
CALENDAR_DATA_FILE = 'calendardata.json'

def load_data(file_name):
    """
    從 JSON 檔案載入資料。
    如果檔案不存在，則創建預設資料並返回。
    """
    if os.path.exists(file_name) and os.path.getsize(file_name) > 0:
        with open(file_name, 'r', encoding='utf-8') as f:
            return json.load(f)
    else:
        # 根據檔案名稱創建預設空資料
        if file_name == MEMBER_DATA_FILE:
            return {
                'manager': {
                    'password': '80208020',
                    'remainingmoney': 0,
                    'identity': 'manager'
                },
                'memberA': {
                    'password': 'passwordA',
                    'remainingmoney': 1000,
                    'identity': 'member'
                }
            }
        else:
            return {}

def save_data(data, file_name):
    """將資料存回 JSON 檔案"""
    with open(file_name, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

# 在應用程式啟動時載入所有資料
member_data = load_data(MEMBER_DATA_FILE)
meal_data = load_data(MEAL_DATA_FILE)
calendar_data = load_data(CALENDAR_DATA_FILE)

# 確保資料檔案已經被寫入，如果它們不存在的話
save_data(member_data, MEMBER_DATA_FILE)
save_data(meal_data, MEAL_DATA_FILE)
save_data(calendar_data, CALENDAR_DATA_FILE)


@app.route('/')
def index():
    """渲染前端的 HTML 頁面"""
    # 這裡假設你的前端檔案在一個名為 'templates' 的資料夾中
    return render_template('index.html')

@app.route('/login', methods=['POST'])
def login():
    """處理登入請求"""
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

@app.route('/manager/meals', methods=['POST'])
def set_meals():
    """Manager 設定或更新當日餐點"""
    data = request.json
    selected_date = data.get('date')
    meals_list = data.get('meals')
    
    if not selected_date or not isinstance(meals_list, list):
        return jsonify({'message': '資料格式錯誤'}), 400
    
    meal_data[selected_date] = meals_list
    save_data(meal_data, MEAL_DATA_FILE)
    
    return jsonify({'message': '餐點已更新', 'meals': meals_list}), 200

@app.route('/manager/meals/<string:date>', methods=['GET'])
def get_meals_by_date(date):
    """Manager 取得當日已設定餐點"""
    meals = meal_data.get(date, [])
    return jsonify({'meals': meals}), 200

@app.route('/manager/balances', methods=['GET'])
def get_all_member_balances():
    """Manager 取得所有會員餘額，並排除 Manager 自身"""
    member_balances = {}
    for user, data in member_data.items():
        if data['identity'] == 'member':
            member_balances[user] = data['remainingmoney']
    return jsonify({'balances': member_balances}), 200

@app.route('/member/recharge', methods=['POST'])
def recharge_member():
    """為會員儲值"""
    data = request.json
    username = data.get('username')
    amount = data.get('amount')

    if not username or not amount or not isinstance(amount, (int, float)) or amount <= 0:
        return jsonify({'message': '資料格式錯誤'}), 400

    user_info = member_data.get(username)
    if user_info and user_info['identity'] == 'member':
        user_info['remainingmoney'] += amount
        save_data(member_data, MEMBER_DATA_FILE)
        return jsonify({'message': '儲值成功', 'new_balance': user_info['remainingmoney']}), 200
    
    return jsonify({'message': '會員不存在或身分不正確'}), 404

@app.route('/member/balance/<string:username>', methods=['GET'])
def get_member_balance(username):
    """會員取得個人餘額"""
    balance = member_data.get(username, {}).get('remainingmoney', 0)
    return jsonify({'balance': balance}), 200

@app.route('/member/order', methods=['POST'])
def place_order():
    """會員送出訂單"""
    data = request.json
    username = data.get('username')
    selected_date = data.get('date')
    new_order = data.get('order')
    
    if not username or not selected_date or not isinstance(new_order, dict):
        return jsonify({'message': '資料格式錯誤'}), 400
        
    user_info = member_data.get(username)
    if not user_info or user_info['identity'] != 'member':
        return jsonify({'message': '非會員身分，無法訂餐'}), 403

    # 計算訂單總價
    new_total_cost = sum(item.get('count', 0) * item.get('price', 0) for item in new_order.values())
    
    # 檢查餘額
    if user_info['remainingmoney'] < new_total_cost:
        return jsonify({'message': '餘額不足，無法送出訂單'}), 402

    # 處理舊訂單，並計算差額
    old_orders_for_date = calendar_data.get(selected_date, {})
    old_order = old_orders_for_date.get(username, {})
    old_total_cost = sum(item.get('count', 0) * item.get('price', 0) for item in old_order.values())
    
    payment_difference = new_total_cost - old_total_cost
    
    # 更新餘額
    user_info['remainingmoney'] -= payment_difference
    
    # 儲存新訂單到 calendar_data
    if selected_date not in calendar_data:
        calendar_data[selected_date] = {}
    
    calendar_data[selected_date][username] = new_order
    
    save_data(member_data, MEMBER_DATA_FILE)
    save_data(calendar_data, CALENDAR_DATA_FILE)
    
    return jsonify({'message': '訂單已送出', 'balance': user_info['remainingmoney']}), 200

@app.route('/member/orders/<string:username>/<string:date>', methods=['GET'])
def get_member_order(username, date):
    """會員取得個人某日的訂單"""
    order = calendar_data.get(date, {}).get(username, {})
    return jsonify({'order': order}), 200


if __name__ == '__main__':
    # 執行 Flask 伺服器
    # 記得在專案目錄下創建一個 templates 資料夾，並將 index.html 放在裡面
    app.run(debug=True, host='0.0.0.0', port=5000)