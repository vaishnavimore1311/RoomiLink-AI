import os
from app import create_app, db

app = create_app(os.getenv("FLASK_ENV", "development"))

if __name__ == "__main__":
    with app.app_context():
        # Ensure database tables exist
        db.create_all()
    port = int(os.getenv("PORT", 5000))
    print(f"RoomiLink AI Backend running at http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=app.config.get("DEBUG", True))
