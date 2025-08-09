# 使用官方的 Python 映像檔作為基礎
# 建議使用帶有 Alpine Linux 的映像檔，因為它體積小
FROM python:3.9-alpine

# 設定工作目錄
WORKDIR /app

# 將 requirements.txt 複製到容器中
# 由於這個檔案不太會變動，先複製並安裝可以利用 Docker 快取機制，加速後續建置
COPY requirements.txt .

# 安裝所有 Python 套件
RUN pip install --no-cache-dir -r requirements.txt

# 將專案所有檔案複製到容器中
COPY . .

# 暴露應用程式使用的 port
EXPOSE 5000

# 定義容器啟動時執行的指令
# 這裡使用 gunicorn 作為生產環境的 WSGI 伺服器
# -b 0.0.0.0:5000 讓應用程式可以從外部存取
# main:app 代表執行 main.py 中的 app 實例
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "main:app"]