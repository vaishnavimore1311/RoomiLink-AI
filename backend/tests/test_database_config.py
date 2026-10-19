"""
Tests for Database Configuration, Connection Pooling, and Engine Options (Issue #25)
"""

import os
from config import Config, DevelopmentConfig, TestingConfig
from app import create_app

def test_testing_config_engine_options():
    """Verify TestingConfig has empty engine options for memory SQLite."""
    assert TestingConfig.TESTING is True
    assert TestingConfig.SQLALCHEMY_DATABASE_URI == "sqlite:///:memory:"
    assert TestingConfig.SQLALCHEMY_ENGINE_OPTIONS == {}

def test_engine_options_presence_on_config():
    """Verify Config provides pool_pre_ping and resilience options."""
    assert "pool_pre_ping" in Config.SQLALCHEMY_ENGINE_OPTIONS
    assert Config.SQLALCHEMY_ENGINE_OPTIONS["pool_pre_ping"] is True

def test_health_check_endpoint():
    """Verify /api/v1/health endpoint responds with database status."""
    app = create_app("testing")
    client = app.test_client()
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert "database_status" in data
    assert "database_engine" in data
