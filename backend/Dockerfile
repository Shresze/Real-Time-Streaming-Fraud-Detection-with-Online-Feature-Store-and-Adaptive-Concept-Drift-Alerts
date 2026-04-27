FROM python:3.9

WORKDIR /app

# Removed apt-get rustc to speed up build

COPY requirements.txt .
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "main.py"]
