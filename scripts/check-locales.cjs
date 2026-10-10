const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '../src/locales/en.json');
const amPath = path.join(__dirname, '../src/locales/am.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const am = JSON.parse(fs.readFileSync(amPath, 'utf8'));

function getKeys(obj, prefix = '') {
  let keys = [];
  for (const k in obj) {
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      keys = keys.concat(getKeys(obj[k], `${prefix}${k}.`));
    } else {
      keys.push(`${prefix}${k}`);
    }
  }
  return keys;
}

const enKeys = getKeys(en).sort();
const amKeys = getKeys(am).sort();

const missingInAm = enKeys.filter(k => !amKeys.includes(k));
const missingInEn = amKeys.filter(k => !enKeys.includes(k));

if (missingInAm.length > 0 || missingInEn.length > 0) {
  console.error('❌ Locale synchronization check failed.');
  if (missingInAm.length > 0) {
    console.error('Keys missing in am.json:', missingInAm);
  }
  if (missingInEn.length > 0) {
    console.error('Keys missing in en.json:', missingInEn);
  }
  process.exit(1);
}

// Check for empty values in Amharic
const emptyValues = [];
function checkEmpty(obj, prefix = '') {
  for (const k in obj) {
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      checkEmpty(obj[k], `${prefix}${k}.`);
    } else if (typeof obj[k] === 'string' && obj[k].trim() === '') {
      emptyValues.push(`${prefix}${k}`);
    }
  }
}
checkEmpty(am);

if (emptyValues.length > 0) {
  console.error('❌ Empty translations found in am.json:', emptyValues);
  process.exit(1);
}

console.log('✅ Locales are perfectly synchronized.');
