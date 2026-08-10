const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'database.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static frontend files
app.use(express.static(__dirname));

// Default initial state
const defaultState = {
  members: [],
  collections: [],
  utilities: [],
  expenses: [],
  settings: {
    currency: 'LKR',
    defaultContribution: 1000,
    financialYear: 2026,
    startMonth: 'April',
    maxMembers: 8,
    theme: 'light',
    username: 'yasith',
    password: '1234'
  }
};

// In-memory store for active session tokens
const activeTokens = new Set();

// Helper: Read database file
function readDatabase() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      // Create directories if missing
      fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultState, null, 2), 'utf8');
      return defaultState;
    }
    const rawData = fs.readFileSync(DB_FILE, 'utf8');
    const data = JSON.parse(rawData);
    
    // Ensure settings and credentials exist
    if (!data.settings) {
      data.settings = {};
    }
    let modified = false;
    if (!data.settings.username) {
      data.settings.username = 'yasith';
      modified = true;
    }
    if (!data.settings.password) {
      data.settings.password = '1234';
      modified = true;
    }
    if (modified) {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    }
    return data;
  } catch (err) {
    console.error('Error reading database file:', err);
    return defaultState;
  }
}

// Helper: Write database file
function writeDatabase(data) {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing database file:', err);
    return false;
  }
}

// Authentication Middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized access' });
  }
  const token = authHeader.split(' ')[1];
  if (!activeTokens.has(token)) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }
  next();
}

// Endpoint: Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }
  
  const data = readDatabase();
  const dbUsername = data.settings.username || 'yasith';
  const dbPassword = data.settings.password || '1234';
  
  if (username === dbUsername && password === dbPassword) {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    activeTokens.add(token);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, message: 'Incorrect username or password' });
  }
});

// Endpoint: Logout
app.post('/api/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    activeTokens.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// Endpoint: Retrieve global state
app.get('/api/state', authenticate, (req, res) => {
  const state = readDatabase();
  res.json(state);
});

// Endpoint: Update global state
app.post('/api/state', authenticate, (req, res) => {
  const existingData = readDatabase();
  const newData = req.body;
  if (newData.settings) {
    if (!newData.settings.username) {
      newData.settings.username = existingData.settings.username || 'yasith';
    }
    if (!newData.settings.password) {
      newData.settings.password = existingData.settings.password || '1234';
    }
  }
  const success = writeDatabase(newData);
  if (success) {
    res.json({ success: true, message: 'Database synchronized successfully' });
  } else {
    res.status(500).json({ success: false, message: 'Failed to write to database file' });
  }
});

// Catch-all route to serve index.html for undefined routes (supporting SPA style navigation if any)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Boarding House Utility Management Server running on port ${PORT}`);
  console.log(`Local Access: http://localhost:${PORT}`);
});
