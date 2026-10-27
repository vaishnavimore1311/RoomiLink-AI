import os
from app import create_app, db

app = create_app(os.getenv("FLASK_ENV", "development"))

def sync_schema():
    with app.app_context():
        # Ensure database tables exist
        db.create_all()
        try:
            from sqlalchemy import inspect, text
            inspector = inspect(db.engine)
            if "rooms" in inspector.get_table_names():
                columns = [col["name"] for col in inspector.get_columns("rooms")]
                migrations = [
                    ("listing_purpose", "ALTER TABLE rooms ADD COLUMN listing_purpose VARCHAR(30) DEFAULT 'landlord'"),
                    ("current_occupants", "ALTER TABLE rooms ADD COLUMN current_occupants INT DEFAULT 1"),
                    ("max_occupants", "ALTER TABLE rooms ADD COLUMN max_occupants INT DEFAULT 2"),
                    ("preferred_gender", "ALTER TABLE rooms ADD COLUMN preferred_gender VARCHAR(20) DEFAULT 'any'"),
                    ("utility_split_desc", "ALTER TABLE rooms ADD COLUMN utility_split_desc VARCHAR(255) NULL"),
                    ("household_id", "ALTER TABLE rooms ADD COLUMN household_id INT NULL"),
                ]
                for col_name, sql in migrations:
                    if col_name not in columns:
                        try:
                            db.session.execute(text(sql))
                            db.session.commit()
                            print(f"[SCHEMA] Added missing column '{col_name}' to rooms table.")
                        except Exception as ex:
                            db.session.rollback()
                            print(f"[SCHEMA WARNING] Could not add '{col_name}': {ex}")
        except Exception as e:
            print(f"[SCHEMA WARNING] Schema check: {e}")

sync_schema()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"RoomiLink AI Backend running at http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=app.config.get("DEBUG", True))

