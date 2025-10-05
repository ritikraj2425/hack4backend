// debug.js
const authController = require('./src/controller/auth.controller');

console.log('🔍 Checking authController exports:');
console.log('githubCallback:', typeof authController.githubCallback);
console.log('checkAuth:', typeof authController.checkAuth);
console.log('getCurrentUser:', typeof authController.getCurrentUser);
console.log('getUserPRs:', typeof authController.getUserPRs);
console.log('logout:', typeof authController.logout);

// Check if any are undefined
Object.keys(authController).forEach(key => {
    if (typeof authController[key] !== 'function') {
        console.error(`❌ ${key} is not a function!`);
    }
});