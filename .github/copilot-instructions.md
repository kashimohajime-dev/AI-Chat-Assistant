# AI Chat Application - OpenRouter Integration

A full-featured application for chatting with AI through OpenRouter API.

## Project Created

- **Project Type:** Node.js Express Web App + CLI Application
- **Language:** JavaScript
- **Main Dependencies:** express, axios, dotenv

## Project Files

- `app.js` - Main application (CLI + Express server)
- `package.json` - npm dependencies
- `.env` - Environment variables (add your OpenRouter API key)
- `public/index.html` - Web interface
- `public/style.css` - Styles
- `public/script.js` - Client-side JavaScript
- `README.md` - Full documentation

## Quick Start

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Add your OpenRouter API key to `.env` file:**

   ```
   OPENROUTER_API_KEY=your_key_here
   ```

3. **Run the application:**
   - CLI mode (default): `npm start`
   - Web mode: `npm start -- --web`
   - Development mode: `npm run dev`

## API Endpoints

- `POST /api/chat` - Send message
- `GET /api/history` - Get history
- `POST /api/clear` - Clear history

## Features

✅ Interactive chat with AI
✅ Web interface with beautiful design
✅ CLI mode for terminal
✅ Message history preservation
✅ REST API for integration
✅ Responsive design

## Configured

- Model: gpt-4o-mini
- Temperature: 0.7
- Max tokens: 1024
- History length: 10 messages
