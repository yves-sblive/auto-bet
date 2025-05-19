# Betting Automation Script

This Node.js script automates betting on a sabong betting platform. It uses Playwright for browser automation and allows manual login before starting the automation process.

## Installation

1. Make sure you have Node.js installed (version 14 or higher recommended)
2. Install dependencies:
   ```
   npm install
   ```

## Configuration

The script uses environment variables from a `.env` file for configuration. You can modify the following settings:

### URL Configuration
- `TARGET_URL` - The URL of the betting page (default: http://192.168.1.2:5174/home)
- `INITIAL_URL` - The initial URL to open for login (default: http://192.168.1.2:5174)

### Betting Configuration
- `MIN_BET_AMOUNT` - Minimum bet amount (default: 50)
- `MAX_BET_AMOUNT` - Maximum bet amount (default: 1000)
- `BET_SIDE` - Which side to bet on: 'MERON', 'WALA', or 'DRAW' (default: MERON)
- `DELAY_BETWEEN_BETS` - Delay between bets in milliseconds (default: 5000)
- `MAX_BETS` - Number of bets to place (0 for infinite, default: 0)
- `USE_PRESET_AMOUNTS` - Whether to use preset amount buttons (true/false, default: true)

### Additional Options
- `RANDOM_BET_SIDE` - Randomize which side to bet on (true/false, default: false)

### Browser Options
- `KIOSK_MODE` - Enable kiosk mode for Chrome (true/false, default: false)
- `SILENT_PRINTING` - Enable silent printing without dialogs (true/false, default: false)
- `DISABLE_NOTIFICATIONS` - Disable browser notifications (true/false, default: false)

## Usage

1. Configure your settings in the `.env` file
2. Run the script:
   ```
   node betting-automation.js
   ```
3. The script will open a browser window
4. Manually log in to the betting site
5. Navigate to the betting page
6. Return to the terminal and confirm when ready to start automation
7. The script will verify settings and start the automation process
8. Press Ctrl+C in the terminal to stop the automation

## Features

- Manual login process
- Configurable betting amounts and sides
- Option to use preset amount buttons or enter custom amounts
- Random delays between bets to appear more human-like
- Error handling for when betting is closed
- Option to randomize which side to bet on
- Confirmation of bets through modal dialogs

## Troubleshooting

If the script fails to interact with elements on the page:
1. Check that the selectors match the actual elements on the page
2. Try increasing the timeout values
3. Check the console for error messages

## Example .env file

```
# Betting URL
TARGET_URL=http://192.168.1.2:5174/home
INITIAL_URL=http://192.168.1.2:5174

# Betting configuration
MIN_BET_AMOUNT=50
MAX_BET_AMOUNT=1000
BET_SIDE=MERON
DELAY_BETWEEN_BETS=5000
MAX_BETS=0
USE_PRESET_AMOUNTS=true

# Additional options
RANDOM_BET_SIDE=false

# Browser options
KIOSK_MODE=true
SILENT_PRINTING=true
DISABLE_NOTIFICATIONS=true
```
