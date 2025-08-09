# 使用官方 Python 映像檔作為基礎，選擇輕量級的 Alpine 版本
FROM python:3.9-alpine

# 設定容器內的工作目錄
WORKDIR /app

# 先複製 requirements.txt 並安裝依賴，以利用 Docker 的快取功能
COPY requirements.txt .

# 安裝所有 Python 套件
RUN pip install --no-cache-dir -r requirements.txt

# 複製專案所有檔案到容器中
COPY . .

# 暴露應用程式使用的 Port
EXPOSE 8080

# 容器啟動時，使用 gunicorn 啟動 Flask 應用程式
# gunicorn 是用於生產環境的高效能 WSGI 伺服器
# --bind 0.0.0.0:8080 讓應用程式能從外部存取
# main:app 代表執行 main.py 檔案中的 app 實例
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "main:app"]