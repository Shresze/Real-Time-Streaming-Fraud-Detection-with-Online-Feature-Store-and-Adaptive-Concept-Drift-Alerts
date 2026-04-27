import pytest
from inference.main import app
from fastapi.testclient import TestClient
import re

client = TestClient(app)

def test_email_validation_regex():
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    assert re.match(email_regex, "test@gmail.com")
    assert re.match(email_regex, "user.name+tag@sub.example.co")
    assert not re.match(email_regex, "a@dd")
    assert not re.match(email_regex, "test@gmail")
    assert not re.match(email_regex, "test.com")

def test_login_invalid_email():
    response = client.post("/auth/login", json={"email": "a@dd", "password": "password123"})
    assert response.status_code == 400
    assert "Invalid email format" in response.json()["detail"]

def test_login_wrong_domain():
    response = client.post("/auth/login", json={"email": "test@outlook.com", "password": "password123"})
    assert response.status_code == 403
    assert "Only @gmail.com accounts" in response.json()["detail"]

def test_login_short_password():
    response = client.post("/auth/login", json={"email": "valid@gmail.com", "password": "123"})
    assert response.status_code == 400
    assert "at least 6 characters" in response.json()["detail"]

def test_login_success():
    response = client.post("/auth/login", json={"email": "admin@gmail.com", "password": "password123"})
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert response.json()["user"]["email"] == "admin@gmail.com"
