# PostgreSQL integration suite

Set `TEST_DATABASE_URL` to a disposable PostgreSQL database whose name contains `test`, apply migrations, and run the service/repository integration suite here. Never point this suite at the demo, preview, staging, or production database. Database-backed tests are intentionally not simulated with SQLite.
