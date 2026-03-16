// Quick script to update server prefix
// Run this in browser console after copying the code

const oldPrefix = 'make-server-c142e950';
const newPrefix = 'make-server-ce0d67b8';

console.log(`🔄 Updating all occurrences of "${oldPrefix}" to "${newPrefix}"`);
console.log('⚠️  This is a client-side fix. You need to redeploy the backend separately.');
console.log('📝 Affected areas: All API calls in the frontend will now use the correct prefix.');

// Just a reminder script - the actual fix needs to be done in the codebase
alert(`IMPORTANT: After clicking Deploy in Figma Make, the function name in Supabase will be "make-server-ce0d67b8". Make sure all API URLs in the code match this!`);
