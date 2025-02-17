# Telegram LLM Chat Bot

A Node.js-based Telegram bot that provides access to various AI language models through OpenRouter.ai integration, with administrative controls and usage tracking.

## Features

- Multiple AI model support (Claude, GPT-4, GPT-3.5, Mistral)
- User whitelist system
- Conversation management
- Usage tracking and analytics
- Administrative controls
- Rate limiting
- Error handling

## Prerequisites

- Docker and Docker Compose
- Telegram Bot Token
- OpenRouter API Key
- Admin Telegram IDs

For local development without Docker:
- Node.js v18+
- MongoDB v6+

## Docker Deployment

1. Clone the repository and navigate to the project directory:
```bash
git clone [repository-url]
cd llm-chat-bot
```

2. Create a .env file with your configuration (see Environment Variables section below).

3. Build and start the containers:
```bash
docker-compose up -d
```

4. Monitor the logs:
```bash
docker-compose logs -f
```

5. Stop the containers:
```bash
docker-compose down
```

To rebuild the application after changes:
```bash
docker-compose up -d --build
```

## Local Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd llm-chat-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create .env file with required configuration:
```bash
# Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
OPENROUTER_API_KEY=your_openrouter_api_key
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/llm-chat-bot

# Security
JWT_SECRET=your_jwt_secret
JWT_EXPIRY=24h
ENCRYPTION_KEY=your_encryption_key

# Admin Configuration
ADMIN_TELEGRAM_IDS=123456,789012

# OpenRouter Configuration
DEFAULT_MODEL=claude-2
MAX_TOKENS=2000
TEMPERATURE=0.7

# Rate Limiting
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=logs/app.log
```

4. Build the project:
```bash
npm run build
```

## Development

Start the development server:
```bash
npm run dev
```

Run tests:
```bash
npm test
```

Lint code:
```bash
npm run lint
```

Format code:
```bash
npm run format
```

## Project Structure

```
src/
  ├── config/       # Configuration files
  │   ├── env.config.ts
  │   ├── logger.config.ts
  │   ├── db.config.ts
  │   └── openrouter.config.ts
  │
  ├── models/       # Database models
  │   ├── user.model.ts
  │   ├── conversation.model.ts
  │   └── usage.model.ts
  │
  ├── controllers/  # Request handlers
  │   ├── bot.controller.ts
  │   ├── admin.controller.ts
  │   └── usage.controller.ts
  │
  ├── services/     # Business logic
  │   ├── bot.service.ts
  │   ├── user.service.ts
  │   └── model.service.ts
  │
  ├── middleware/   # Express middleware
  │   ├── auth.middleware.ts
  │   ├── rate-limit.middleware.ts
  │   └── error.middleware.ts
  │
  ├── types/        # TypeScript types
  │   └── errors.ts
  │
  └── utils/        # Helper functions
      ├── validation.ts
      └── formatting.ts
```

## Available Commands

- `/newchat` - Start a fresh conversation
- `/clearchat` - Clear conversation history
- `/changemodel` - Switch between available models
- `/usage` - View personal usage stats
- `/help` - List available commands

## Admin Commands

- `/whitelist <user_id>` - Add user to whitelist
- `/unwhitelist <user_id>` - Remove user from whitelist
- `/stats` - View global usage statistics
- `/models` - Manage available models

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Acknowledgments

- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api)
- [OpenRouter](https://openrouter.ai/)
- [Mongoose](https://mongoosejs.com/)
- [Express](https://expressjs.com/)
