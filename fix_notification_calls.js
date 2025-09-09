// Script to fix all createNotification calls in the comprehensive triggers file
const fs = require('fs');

const filePath = 'lib/notification-triggers-comprehensive.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Pattern to match createNotification calls with object syntax
const pattern = /createNotification\(\s*\{\s*user_id:\s*([^,]+),\s*type:\s*['"`]([^'"`]+)['"`],\s*title:\s*['"`]([^'"`]+)['"`],\s*message:\s*['"`]([^'"`]+)['"`],\s*priority:\s*['"`]([^'"`]+)['"`],\s*data:\s*([^}]+)\s*\}\s*\)/g;

// Replace with function call syntax
content = content.replace(pattern, (match, userId, type, title, message, priority, data) => {
  return `createNotification(\n    ${userId},\n    '${type}',\n    '${title}',\n    '${message}',\n    ${data},\n    '${priority}'\n  )`;
});

// Handle cases without data
const patternNoData = /createNotification\(\s*\{\s*user_id:\s*([^,]+),\s*type:\s*['"`]([^'"`]+)['"`],\s*title:\s*['"`]([^'"`]+)['"`],\s*message:\s*['"`]([^'"`]+)['"`],\s*priority:\s*['"`]([^'"`]+)['"`]\s*\}\s*\)/g;

content = content.replace(patternNoData, (match, userId, type, title, message, priority) => {
  return `createNotification(\n    ${userId},\n    '${type}',\n    '${title}',\n    '${message}',\n    undefined,\n    '${priority}'\n  )`;
});

// Handle cases with additional properties like action_url, action_label, expires_at
const patternWithExtras = /createNotification\(\s*\{\s*user_id:\s*([^,]+),\s*type:\s*['"`]([^'"`]+)['"`],\s*title:\s*['"`]([^'"`]+)['"`],\s*message:\s*['"`]([^'"`]+)['"`],\s*priority:\s*['"`]([^'"`]+)['"`],\s*action_url:\s*([^,]+),\s*action_label:\s*['"`]([^'"`]+)['"`],\s*data:\s*([^}]+)\s*\}\s*\)/g;

content = content.replace(patternWithExtras, (match, userId, type, title, message, priority, actionUrl, actionLabel, data) => {
  return `createNotification(\n    ${userId},\n    '${type}',\n    '${title}',\n    '${message}',\n    ${data},\n    '${priority}'\n  )`;
});

fs.writeFileSync(filePath, content);
console.log('✅ Fixed all createNotification calls in comprehensive triggers file');
