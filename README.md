# Xiaobai's Happy Match (Happy Xiaoxiaole)

[中文文档 (Chinese Documentation)](./README_zh.md)

A classic Match-3 puzzle game built with modern Web technologies, featuring user registration, cloud progress saving, and a global leaderboard.

## Introduction

This project uses Vanilla JavaScript for the frontend and Cloudflare Workers (Pages Functions) for the backend, with Cloudflare D1 as the persistent SQL database. It features smooth animations, dynamic difficulty scaling, and a special "Super Tile" mechanic.

## Features

- **Classic Gameplay**: Support for both click-to-swap and swipe-to-swap mechanics.
- **Dynamic Difficulty**: Increasing number of tile types and target scores as you progress through levels.
- **Super Tiles**: Rare tiles (`🌟`) that clear entire rows and columns when matched.
- **Account System**: Secure registration and login, with auto-login via `localStorage`.
- **Cloud Sync**: Real-time synchronization of game level and total score to the cloud.
- **Global Leaderboard**: Compete with players worldwide based on level and score.
- **Profile Management**: Update nickname, password, and secure logout.
- **Responsive Design**: Fully optimized for both Desktop and Mobile devices.

## Tech Stack

- **Frontend**: HTML5, CSS3 (Flexbox, CSS Variables, Keyframe Animations), ES6+ JavaScript.
- **Backend**: Cloudflare Workers (Pages Functions).
- **Database**: Cloudflare D1 (SQLite-compatible SQL database).

## Project Structure

```text
d:/A_project_01/xiaoxiaole
├── index.html              # Main UI structure
├── style.css               # Visual styles and animations
├── script.js               # Game logic and API integration
├── schema.sql              # Database initialization script
├── functions/              # Cloudflare Workers API
│   └── api/
│       ├── login.js        # User authentication
│       ├── register.js     # New user registration
│       ├── rank.js         # Fetch leaderboard
│       ├── save_progress.js # Sync game data
│       └── update_profile.js# Manage user account
└── README_zh.md            # Chinese documentation
```

## Setup & Deployment

This project is optimized for the Cloudflare ecosystem (Pages + Workers + D1).

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (LTS recommended).
- A [Cloudflare Account](https://dash.cloudflare.com/).
- Install Wrangler (Cloudflare CLI):
  ```bash
  npm install -g wrangler
  ```

### 2. D1 Database Configuration
1. Create a D1 database via dashboard or CLI:
   ```bash
   npx wrangler d1 create xiaoxiaole
   ```
2. **Initialize Schema**:
   ```bash
   # Local environment
   npx wrangler d1 execute xiaoxiaole --local --file=./schema.sql
   
   # Remote (Production) environment
   npx wrangler d1 execute xiaoxiaole --remote --file=./schema.sql
   ```

### 3. Local Development
1. **Start Dev Server**:
   Cloudflare Pages can simulate Workers and D1 locally:
   ```bash
   npx wrangler pages dev . --d1 xiaoxiaole
   ```
2. Open `http://localhost:8788` in your browser.

### 4. Production Deployment
1. **GitHub Integration (Recommended)**:
   - Push your code to a GitHub repository.
   - Create a new Pages project in Cloudflare dashboard and link the repo.
   - Go to **Settings** -> **Functions** -> **D1 Database Bindings**:
     - **Variable name**: `xiaoxiaole` (must match your code's binding).
     - **D1 database**: Select `xiaoxiaole`.
2. **Manual Deployment**:
   ```bash
   npx wrangler pages deploy . --project-name xiaoxiaole
   ```

## D1 Database Management

Use the following commands to manage your database via Wrangler CLI.

- **Delete a User**:
  ```bash
  npx wrangler d1 execute xiaoxiaole --command="DELETE FROM users WHERE username = 'PlayerName';"
  npx wrangler d1 execute xiaoxiaole --command="DELETE FROM user_progress WHERE username = 'PlayerName';"
  ```

- **Reset All Progress**:
  ```bash
  ```bash
  npx wrangler d1 execute xiaoxiaole --command="UPDATE user_progress SET level = 1, total_score = 0;"
  ```

- **Clear Leaderboard**:
  ```bash
  npx wrangler d1 execute xiaoxiaole --command="DELETE FROM user_progress;"
  ```

- **Check Statistics**:
  ```bash
  npx wrangler d1 execute xiaoxiaole --command="SELECT COUNT(*) FROM users;"
  ```

- **Check Leaderboard**:
  ```bash
  npx wrangler d1 execute xiaoxiaole --command="SELECT username, level, total_score FROM user_progress ORDER BY level DESC, total_score DESC LIMIT 10;"
  ```

## Game Rules

1. **Matching**: Connect 3 or more identical tiles to clear them.
2. **Super Tiles**: Matches involving a `🌟` tile trigger a massive cross-explosion.
3. **Objective**: Reach the target score within the limited number of moves.
4. **Shuffling**: The board will automatically shuffle if no potential matches are available.

---
*Enjoy the game!*
