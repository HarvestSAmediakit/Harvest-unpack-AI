# DigiMagAI Podcast – Complete Platform

## Deploy

1. Copy `.env.example` to `.env` and fill all secrets.
2. Run `docker-compose up -d`
3. Run `scripts/init_db.sh`
4. Access API at `https://app.digimag.ai`
5. Embed script: `<script src="https://app.digimag.ai/embed.js"></script>`

## Environment Variables

See `.env.example` for all required keys (OpenAI, Deepgram, Cartesia, AWS, LiveKit).
