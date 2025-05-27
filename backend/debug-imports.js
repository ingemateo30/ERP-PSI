console.log('=== DEBUGGING IMPORTS ===\n');

// Test 1: authController
console.log('1. Testing authController...');
try {
  const authController = require('./controllers/authController');
  console.log('✓ authController imported successfully');
  console.log('  - Type:', typeof authController);
  console.log('  - Keys:', Object.keys(authController));
  console.log('  - register method:', typeof authController.register);
  console.log('  - login method:', typeof authController.login);
} catch (error) {
  console.log('✗ authController ERROR:', error.message);
}

console.log('\n2. Testing validation middleware...');
try {
  const validation = require('./middleware/validation');
  console.log('✓ validation imported successfully');
  console.log('  - Type:', typeof validation);
  console.log('  - Keys:', Object.keys(validation));
  
  const { validateAuth, validateLogin, validateRegister } = validation;
  console.log('  - validateRegister:', typeof validateRegister);
  console.log('  - validateLogin:', typeof validateLogin);
  console.log('  - validateAuth:', typeof validateAuth);
} catch (error) {
  console.log('✗ validation ERROR:', error.message);
}

console.log('\n3. Testing rateLimiter...');
try {
  const rateLimiterModule = require('./middleware/rateLimiter');
  console.log('✓ rateLimiter module imported successfully');
  console.log('  - Type:', typeof rateLimiterModule);
  console.log('  - Keys:', Object.keys(rateLimiterModule));
  
  const { rateLimiter } = rateLimiterModule;
  console.log('  - rateLimiter object:', typeof rateLimiter);
  if (rateLimiter) {
    console.log('  - rateLimiter keys:', Object.keys(rateLimiter));
    console.log('  - register method:', typeof rateLimiter.register);
    console.log('  - login method:', typeof rateLimiter.login);
  }
} catch (error) {
  console.log('✗ rateLimiter ERROR:', error.message);
}

console.log('\n4. Testing auth middleware...');
try {
  const authMiddleware = require('./middleware/auth');
  console.log('✓ authMiddleware imported successfully');
  console.log('  - Type:', typeof authMiddleware);
} catch (error) {
  console.log('✗ authMiddleware ERROR:', error.message);
}

console.log('\n5. Testing express-rate-limit package...');
try {
  const rateLimit = require('express-rate-limit');
  console.log('✓ express-rate-limit imported successfully');
  console.log('  - Type:', typeof rateLimit);
} catch (error) {
  console.log('✗ express-rate-limit ERROR:', error.message);
}

console.log('\n=== END DEBUG ===');