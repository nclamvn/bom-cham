# Viber Extension — Bờm Chăm

Viber Bot API channel for eldercare messaging.

## Setup

1. Create a Viber Bot: https://partners.viber.com/account/create-bot-account
2. Get Auth Token from Viber Admin Panel
3. Add to `.env`:
   ```
   VIBER_AUTH_TOKEN=your-viber-auth-token
   VIBER_BOT_NAME=Bờm Chăm
   VIBER_WEBHOOK_URL=https://your-domain.com/viber/webhook
   ```
4. Restart gateway
5. Viber registers webhook automatically on start

## Env Variables

| Variable | Required | Description |
|----------|----------|-------------|
| VIBER_AUTH_TOKEN | Yes | Bot auth token from Viber |
| VIBER_BOT_NAME | No | Bot display name (default: Bờm Chăm) |
| VIBER_WEBHOOK_URL | Yes | Public HTTPS webhook URL |

## Features

- Send/receive text messages
- Send/receive pictures
- Eldercare alerts (SOS, monitor, daily report)
- Webhook signature verification (HMAC SHA256)
- DM policy: open / pairing / disabled
- Welcome message on conversation start

## Message Flow

```
User -> Viber -> Webhook (POST) -> Gateway -> AI -> Gateway -> Viber API -> User
```

## Webhook Security

Viber signs all webhook payloads with HMAC SHA256 using the auth token.
The extension verifies `X-Viber-Content-Signature` header on every request.
