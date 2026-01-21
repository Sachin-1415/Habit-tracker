const fs = require('fs').promises;
const path = require('path');

const FILE = path.join(__dirname, '..', '..', 'data', 'habits.json');

async function read() {
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    if (e.code === 'ENOENT') {
      await write([]);
      return [];
    }
    throw e;
  }
}

async function write(data) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { read, write };

