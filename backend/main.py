from flask import Flask, request, jsonify, render_template
import json
import os
from datetime import datetime

app = Flask(__name__)

# 定義資料檔案路徑
MEMBER_DATA_FILE = 'memberdata.json'
CALENDAR_DATA_FILE = 'calendardata.json'
MEAL_DATA_FILE = 'mealdata.json' # 新增餐點資料檔案

def load_data(file_name):
    """從 JSON 檔案載入資料"""
    if os.path.exists(file_name):
        with open(file_name, 'r', encoding='utf-8') as f:
            return json.load(f)
    else:
        # 如果檔案不存在，則創建一個空字典
        return {}

def save_data(data, file_name):
    """將資料存回 JSON 檔案"""
    with open(file_name, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

# 載入所有資料
member_data = load_data(MEMBER_DATA_FILE)
calendar_data = load_data(CALENDAR_DATA_FILE)
meal_data = load_data(MEAL_DATA_FILE)

@app.route('/')
def index():
    """渲染前端的 HTML 頁面"""
    return render_template('index.html')

@app.route('/login', methods=['POST'])
def login():
    """處理登入請求"""
    username = request.json.get('username')
    password = request.json.get('password')
    
    if username in member_data and member_data[username]['password'] == password:
        return jsonify({
            'message': '登入成功', 
            'identity': member_data[username]['identity']
        }), 200
    else:
        return jsonify({'message': '帳號或密碼錯誤'}), 401

@app.route('/manager/meals', methods=['POST'])
def set_meals():
    """Manager 設定當日餐點"""
    # 這裡的邏輯需要您根據新架構自行設計
    # 例如，您可能需要將餐點資訊儲存到 `mealdata.json`
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

@app.route('/member/order', methods=['POST'])
def place_order():
    """會員送出訂單"""
    # 這裡的邏輯需要您根據新架構自行設計
    # 例如，您可能需要更新 `calendardata.json` 和 `memberdata.json`
    data = request.json
    username = data.get('username')
    selected_date = data.get('date')
    meal_name = data.get('meal_name')
    
    # 這裡只是範例，您需要根據實際需求處理訂單邏輯
    if not username or not selected_date or not meal_name:
        return jsonify({'message': '資料格式錯誤'}), 400
    
    if member_data.get(username, {}).get('identity') != 'member':
        return jsonify({'message': '非會員身分，無法訂餐'}), 403

    # 更新餘額...
    # 更新訂單...
    
    save_data(member_data, MEMBER_DATA_FILE)
    save_data(calendar_data, CALENDAR_DATA_FILE)
    
    return jsonify({'message': '訂單已送出'}), 200

@app.route('/member/balance/<string:username>', methods=['GET'])
def get_member_balance(username):
    """會員取得個人餘額"""
    balance = member_data.get(username, {}).get('remainingmoney', 0)
    return jsonify({'balance': balance}), 200

@app.route('/member/orders/<string:username>/<string:date>', methods=['GET'])
def get_member_order(username, date):
    """會員取得個人某日的訂單"""
    # 這裡的邏輯需要您根據新架構自行設計
    # 例如，從 `calendardata.json` 中讀取資料
    return jsonify({'order': {}}), 200 # 暫時返回空字典


if __name__ == '__main__':
    # 執行 Flask 伺服器
    app.run(debug=True, host='0.0.0.0', port=5000)