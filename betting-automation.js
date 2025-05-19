const { chromium } = require('playwright');
const readline = require('readline');
require('dotenv').config();

// Load configuration from .env file with fallbacks
const config = {
  // URLs
  targetUrl: process.env.TARGET_URL || 'http://192.168.1.2:5174/home',  // The URL pattern to look for before starting automation
  initialUrl: process.env.INITIAL_URL || 'http://192.168.1.2:5174',     // Initial URL to open
  
  // Betting configuration
  minBetAmount: parseInt(process.env.MIN_BET_AMOUNT) || 50,            // Minimum bet amount
  maxBetAmount: parseInt(process.env.MAX_BET_AMOUNT) || 1000,          // Maximum bet amount
  betSide: process.env.BET_SIDE || 'MERON',                           // Which side to bet on: 'MERON', 'WALA', or 'DRAW'
  delayBetweenBets: parseInt(process.env.DELAY_BETWEEN_BETS) || 5000,  // Delay between bets in milliseconds
  maxBets: parseInt(process.env.MAX_BETS) || 0,                        // 0 for infinite, or set a number to limit total bets
  usePresetAmounts: process.env.USE_PRESET_AMOUNTS === 'true',         // Use the preset amount buttons
  
  // Additional options
  randomBetSide: process.env.RANDOM_BET_SIDE === 'true',              // Randomize which side to bet on
  
  // Browser options
  kioskMode: process.env.KIOSK_MODE === 'true',                       // Enable kiosk mode
  silentPrinting: process.env.SILENT_PRINTING === 'true',             // Enable silent printing
  disableNotifications: process.env.DISABLE_NOTIFICATIONS === 'true'   // Disable notifications
};

// Display loaded configuration
console.log('===== Configuration Loaded from .env =====');
console.log(JSON.stringify(config, null, 2));
console.log('=========================================');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to generate a random bet amount
function getRandomBetAmount(min, max) {
  // Generate a random number between min and max
  const randomAmount = Math.floor(Math.random() * (max - min + 1) + min);
  
  // Round to nearest multiple of 50 for more realistic betting
  return Math.round(randomAmount / 50) * 50;
}

// Function to randomly select one of the preset amount buttons
async function clickRandomPresetAmount(page) {
  const presetAmounts = ['50', '100', '500', '1K', '2K', '5K', '10K', '12K'];
  const eligibleAmounts = presetAmounts.filter(amount => {
    const numValue = parseInt(amount.replace('K', '000'));
    return numValue >= config.minBetAmount && numValue <= config.maxBetAmount;
  });
  
  if (eligibleAmounts.length === 0) {
    console.log('No preset amounts within specified range. Using custom amount instead.');
    return false;
  }
  
  const selectedAmount = eligibleAmounts[Math.floor(Math.random() * eligibleAmounts.length)];
  console.log(`Selecting preset amount: ${selectedAmount}`);
  
  try {
    // Click the preset amount button
    await page.click(`button:has-text("${selectedAmount}")`);
    return true;
  } catch (error) {
    console.log(`Failed to click preset amount button: ${error.message}`);
    return false;
  }
}

// Ask user for confirmation to start betting automation
function askForStartConfirmation() {
  return new Promise((resolve) => {
    rl.question('\nReady to start betting automation? (yes/no): ', (answer) => {
      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

// Add an option to randomize which side to bet on
function randomizeBetSide() {
  const sides = ['MERON', 'WALA', 'DRAW'];
  const weights = [0.45, 0.45, 0.1]; // 45% chance for MERON, 45% for WALA, 10% for DRAW
  
  let random = Math.random();
  let cumulativeWeight = 0;
  
  for (let i = 0; i < sides.length; i++) {
    cumulativeWeight += weights[i];
    if (random <= cumulativeWeight) {
      return sides[i];
    }
  }
  
  return sides[0]; // Fallback to first option
}

async function runBettingBot() {
  console.log('Starting browser for manual login...');
  
  // Prepare browser arguments based on config
  const browserArgs = [];
  
  // Add kiosk mode if enabled
  if (config.kioskMode) {
    browserArgs.push('--kiosk-printing');
    browserArgs.push('--start-maximized');
  }
  
  // Add silent printing if enabled
  if (config.silentPrinting) {
    browserArgs.push('--disable-print-preview');
    browserArgs.push('--disable-prompt-on-repost');
  }
  
  // Disable notifications if enabled
  if (config.disableNotifications) {
    browserArgs.push('--disable-notifications');
  }
  
  // Add some recommended flags for automation
  browserArgs.push('--disable-extensions');
  browserArgs.push('--disable-component-extensions-with-background-pages');
  browserArgs.push('--disable-default-apps');
  browserArgs.push('--disable-popup-blocking');
  
  // Launch the browser with custom arguments
  const browser = await chromium.launch({ 
    headless: false,
    args: browserArgs
  });
  
  console.log('Browser launched with arguments:', browserArgs.join(' '));
  
  // Create a new context with viewport settings
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  // Open a new page
  const page = await context.newPage();
  
  try {
    // Navigate to a starting page (can be any page on the site)
    await page.goto(config.initialUrl);
    console.log('Browser launched. Please log in manually and navigate to the betting page.');
    console.log(`Once you're on the betting page (${config.targetUrl}), confirm to start automation.`);
    
    // Wait for user to confirm they've logged in and navigated to the betting page
    const startAutomation = await askForStartConfirmation();
    if (!startAutomation) {
      console.log('Automation cancelled by user.');
      await browser.close();
      rl.close();
      return;
    }
    
    // Verify we're on the right page
    const currentUrl = page.url();
    if (!currentUrl.includes('home')) {
      console.log(`Warning: Current URL (${currentUrl}) doesn't match the expected betting page.`);
      const continueAnyway = await new Promise(resolve => {
        rl.question('Continue anyway? (yes/no): ', answer => {
          resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
        });
      });
      
      if (!continueAnyway) {
        console.log('Automation cancelled by user.');
        await browser.close();
        rl.close();
        return;
      }
    }
    
    console.log('Starting betting automation...');
    console.log(`Configuration: Betting on ${config.betSide}, amounts between ₱${config.minBetAmount} and ₱${config.maxBetAmount}`);
    
    // Confirm betting settings before starting
    const betSettings = await new Promise(resolve => {
      rl.question(`Bet on ${config.betSide} with amounts ${config.minBetAmount}-${config.maxBetAmount}? (yes/no/edit): `, answer => {
        resolve(answer.toLowerCase());
      });
    });
    
    if (betSettings === 'no') {
      console.log('Automation cancelled by user.');
      await browser.close();
      rl.close();
      return;
    } else if (betSettings === 'edit') {
      // Allow user to edit settings
      config.betSide = await new Promise(resolve => {
        rl.question('Bet side (MERON/WALA/DRAW): ', answer => {
          resolve(answer.toUpperCase() || config.betSide);
        });
      });
      
      const minAmount = await new Promise(resolve => {
        rl.question(`Minimum bet amount (current: ${config.minBetAmount}): `, answer => {
          resolve(parseInt(answer) || config.minBetAmount);
        });
      });
      config.minBetAmount = minAmount;
      
      const maxAmount = await new Promise(resolve => {
        rl.question(`Maximum bet amount (current: ${config.maxBetAmount}): `, answer => {
          resolve(parseInt(answer) || config.maxBetAmount);
        });
      });
      config.maxBetAmount = maxAmount;
      
      console.log(`Updated settings: Betting on ${config.betSide}, amounts between ₱${config.minBetAmount} and ₱${config.maxBetAmount}`);
    }
    
    // Create a hotkey to stop the automation
    console.log('\n=== AUTOMATION STARTED ===');
    console.log('Press Ctrl+C in this terminal to stop the automation.');
    
    let betCount = 0;
    let running = true;
    
    // Set up a hotkey to pause/resume (optional implementation)
    
    // Main betting loop
    while (running && (config.maxBets === 0 || betCount < config.maxBets)) {
      console.log(`\n--- Starting bet #${betCount + 1} ---`);
      
      // Check if betting is open
      try {
        await page.waitForSelector('text=BETTING: OPEN', { timeout: 10000 });
        console.log('Betting is open!');
      } catch (error) {
        console.log('Betting is currently closed. Waiting...');
        try {
          await page.waitForSelector('text=BETTING: OPEN', { timeout: 60000 });
          console.log('Betting is now open!');
        } catch (timeoutError) {
          console.log('Timed out waiting for betting to open. Still trying...');
          continue; // Skip this iteration and check again
        }
      }
      
      let betAmount;
      
      // Either use preset amounts or enter a custom amount
      if (config.usePresetAmounts) {
        const usedPreset = await clickRandomPresetAmount(page);
        if (!usedPreset) {
          // If preset failed, use custom amount as fallback
          betAmount = getRandomBetAmount(config.minBetAmount, config.maxBetAmount);
          console.log(`Entering custom amount: ₱${betAmount}`);
          
          // Clear input field and type new amount
          await page.click('input[placeholder="Enter amount"]', { clickCount: 3 });
          await page.fill('input[placeholder="Enter amount"]', betAmount.toString());
        }
      } else {
        // Always use custom amount
        betAmount = getRandomBetAmount(config.minBetAmount, config.maxBetAmount);
        console.log(`Placing ₱${betAmount} bet on ${config.betSide}`);
        
        // Clear input field and type new amount
        await page.click('input[placeholder="Enter amount"]', { clickCount: 3 });
        await page.fill('input[placeholder="Enter amount"]', betAmount.toString());
      }
      
      // Determine which side to bet on (use randomization if enabled)
      let currentBetSide = config.betSide;
      if (config.randomBetSide) {
        currentBetSide = randomizeBetSide();
        console.log(`Randomly selected bet side: ${currentBetSide}`);
      }
      
      // Determine which button to click based on selected side
      let buttonSelector;
      if (currentBetSide === 'MERON') {
        buttonSelector = 'button >> text=BET MERON';
      } else if (currentBetSide === 'WALA') {
        buttonSelector = 'button >> text=BET WALA';
      } else if (currentBetSide === 'DRAW') {
        buttonSelector = 'button >> text=BET DRAW';
      } else {
        throw new Error(`Invalid betSide: ${currentBetSide}`);
      }
      
      // Click the betting button
      console.log(`Clicking ${currentBetSide} button`);
      try {
        await page.click(buttonSelector);
      } catch (error) {
        console.log(`Failed to click ${currentBetSide} button: ${error.message}`);
        console.log('Waiting a bit and trying again...');
        await page.waitForTimeout(2000);
        continue; // Skip to next iteration
      }
      
      // Wait for confirmation modal
      try {
        await page.waitForSelector('text=Confirm your bet', { timeout: 5000 });
        console.log('Confirmation modal appeared');
        
        // Click the confirm button
        await page.click('button:has-text("Confirm Bet")');
        console.log('Bet confirmed!');
        
        // Increment bet count
        betCount++;
      } catch (error) {
        console.log(`No confirmation modal appeared: ${error.message}`);
        console.log('Moving to next bet...');
      }
      
      // Random delay before the next bet (adds variance to appear more human-like)
      const randomDelay = config.delayBetweenBets + (Math.random() * 2000 - 1000); // +/- 1 second
      console.log(`Waiting ${Math.round(randomDelay / 1000)} seconds before next bet...`);
      await page.waitForTimeout(randomDelay);
    }
    
    console.log(`Bot stopped after ${betCount} bets.`);
  } catch (error) {
    console.error(`An error occurred: ${error.message}`);
    console.error(error.stack);
  } finally {
    // Close the browser
    await browser.close();
    rl.close();
    console.log('Browser closed.');
  }
}

// Run the bot when this script is executed
(async () => {
  try {
    await runBettingBot();
  } catch (error) {
    console.error('Fatal error:', error);
    rl.close();
    process.exit(1);
  }
})();
