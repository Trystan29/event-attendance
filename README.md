<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/06d2523e-cebf-4f4a-866c-ef3367602f17

## Run Locally

**Prerequisites:** Node.js and MySQL


1. Install dependencies:
   `npm install`
2. Create the application database in MySQL:
   ```sql
   CREATE DATABASE qr_attendance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Copy `.env.example` to `.env` and set the MySQL connection values.
4. Run the app:
   `npm run dev`

The server creates the application tables on startup. If the MySQL database is empty, it imports the saved data from `data/db.json`. The JSON file is also kept as a local fallback when MySQL is unavailable.
