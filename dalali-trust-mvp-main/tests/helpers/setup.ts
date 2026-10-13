import "dotenv/config";

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret-123456";
process.env.STORAGE_DRIVER = "local";
process.env.EMAIL_PROVIDER = "none";
