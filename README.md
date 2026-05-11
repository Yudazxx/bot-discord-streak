# Discord Streak Bot

A minimal Discord.js bot that creates the same kind of daily streak flow shown in the screenshot: a member runs a command, mentions a partner, the bot stores the pair's streak, and `!istreak` shows that member's streak info.

## Features

- `streak @user` or `!streak @user` starts or continues today's streak for a pair.
- `istreak` or `!istreak` shows your streak partners and total streak days.
- `istreak @user` or `!istreak @user` shows another member's streak info.
- A pair can only be counted once per calendar day.
- Consecutive days increase the current streak; missed days reset the current streak to 1 while keeping the best streak.
- Streaks persist in `data/streaks.json` by default.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a bot in the Discord Developer Portal and enable these privileged gateway intents:

   - Server Members Intent
   - Message Content Intent

3. Invite the bot with permissions to read messages and send messages.

4. Start the bot:

   ```bash
   DISCORD_TOKEN="your-bot-token" npm start
   ```

## Configuration

Environment variables:

| Variable | Default | Description |
| --- | --- | --- |
| `DISCORD_TOKEN` | Required | Your Discord bot token. |
| `PREFIX` | `!` | Optional command prefix. The bot also accepts bare `streak` and `istreak` to match the screenshot. |
| `STREAK_TIMEZONE` | `UTC` | Calendar timezone for daily streak resets, for example `Asia/Jakarta`. |
| `STREAK_DATA_FILE` | `data/streaks.json` | JSON file used for persistence. |

## How the streak system works

1. User sends `streak @partner` or `!streak @partner`.
2. The bot creates a stable pair key from both user IDs, so `A + B` and `B + A` update the same streak.
3. If that pair has already been counted today, the bot rejects the duplicate.
4. If the previous count was yesterday, the bot adds one day.
5. If the pair missed a day, the current streak resets to `1`.
6. The bot replies with an embed showing current, best, and total streak counts.

## Making it look closer to the screenshot

The included bot uses Discord embeds because they are simple and reliable. To make a custom image card like the lower message in the screenshot, generate a PNG with a package such as `@napi-rs/canvas`, attach it to the reply, and reuse the `recordStreak` result for the number displayed on the card.
