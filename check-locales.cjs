const fs = require('fs');

const en = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'));
const am = JSON.parse(fs.readFileSync('src/locales/am.json', 'utf8'));

function getKeys(obj, prefix = '') {
  return Object.keys(obj).reduce((res, el) => {
    if(Array.isArray(obj[el])) {
      return res;
    } else if(typeof obj[el] === 'object' && obj[el] !== null) {
      return [...res, ...getKeys(obj[el], prefix + el + '.')];
    }
    return [...res, prefix + el];
  }, []);
}

const enKeys = new Set(getKeys(en));
const amKeys = new Set(getKeys(am));

let missingInAm = [];
for (let key of enKeys) {
  if (!amKeys.has(key)) missingInAm.push(key);
}

let missingInEn = [];
for (let key of amKeys) {
  if (!enKeys.has(key)) missingInEn.push(key);
}

console.log("Missing in AM:", missingInAm);
console.log("Missing in EN:", missingInEn);
