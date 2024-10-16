const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(bodyParser.json());

const users = new Map();
const objects = new Map();

const logFile = path.join(__dirname, 'audit.log');

function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] - ${message}\n`;
  fs.appendFile(logFile, logEntry, (err) => {
    if (err) {
      console.error('Failed to write to log file:', err);
    }
  })}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

app.post('/register', (req, res) => {
  const { userId, password, level, categories } = req.body;

  if (users.has(userId)) {
    log(`Failed registration attempt: User ${userId} already exists`);
    return res.status(400).json({ error: 'User already exists' });
  }

  const hashedPassword = hashPassword(password);
  users.set(userId, {hashedPassword, level, categories});

  log(`User registered successfully: ${userId}`);
  res.json({ message: 'User registered successfully' });
});

app.post('/authenticate', (req, res) => {
  const { userId, password } = req.body;

  if (!users.has(userId)) {
    log(`Failed authentication attempt: User ${userId} not found`);
    return res.status(401).json({ error: 'User not found' });
  }

  const user = users.get(userId);
  const inputHashedPassword = hashPassword(password);

  if (inputHashedPassword === user.hashedPassword) {
    log(`Successful authentication: ${userId}`);
    res.json({ message: 'Authentication successful' , user: {userId, level: user.level, categories: user.categories}});
  } else {
    log(`Failed authentication attempt: ${userId} (incorrect password)`);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

app.post('/object', (req, res) => {
  const { userId, objectName, content, level, categories } = req.body;

  if (!users.has(userId)) {
    log(`Failed object creation attempt: User ${userId} not found`);
    return res.status(401).json({ error: 'User not found' });
  }

  const user = users.get(userId);

  if (user.level < level) {
    log(`Failed object creation attempt: ${userId} lacks sufficient security level for ${objectName}`);
    return res.status(403).json({ error: 'User doesn\'t have access to this method' });
  }

  if (!categories.every(cat => user.categories.includes(cat))) {
    log(`Failed object creation attempt: ${userId} lacks required categories for ${objectName}`);
    return res.status(403).json({ error: 'User lacks required categories' });
  }

  objects.set(objectName, { content, level, categories, owner: userId });
  log(`Object created successfully: ${objectName} by ${userId}`);
  res.json({ message: 'Object created successfully' });
});

app.get('/object/:objectName', (req, res) => {
  const { userId } = req.query;
  const { objectName } = req.params;

  if (!users.has(userId) || !objects.has(objectName)) {
    log(`Failed object read attempt: User ${userId} or object ${objectName} not found`);
    return res.status(404).json({ error: 'User or object not found' });
  }

  const user = users.get(userId);
  const object = objects.get(objectName);

  if (user.level < object.level) {
    log(`Failed object read attempt: ${userId} lacks sufficient security level for ${objectName}`);
    return res.status(403).json({ error: 'User doesn\'t have access to this method' });
  }

  if (!object.categories.every(cat => user.categories.includes(cat))) {
    log(`Failed object read attempt: ${userId} lacks required categories for ${objectName}`);
    return res.status(403).json({ error: 'User lacks required categories' });
  }

  log(`Successful object read: ${objectName} by ${userId}`);
  res.json({ content: object.content });
});

app.put('/object/:objectName', (req, res) => {
  const { userId, content } = req.body;
  const { objectName } = req.params;

  if (!users.has(userId) || !objects.has(objectName)) {
    log(`Failed object update attempt: User ${userId} or object ${objectName} not found`);
    return res.status(404).json({ error: 'User or object not found' });
  }

  const user = users.get(userId);
  const object = objects.get(objectName);

  if (user.level !== object.level) {
    return res.status(403).json({ error: 'Cannot write to an object with a different security level' });
  }

  if (user.level < object.level) {
    log(`Failed object update attempt: ${userId} cannot write to a higher security level for ${objectName}`);
    return res.status(403).json({ error: 'Cannot write to a higher security level' });
  }

  if (!object.categories.every(cat => user.categories.includes(cat))) {
    log(`Failed object update attempt: ${userId} lacks required categories for ${objectName}`);
    return res.status(403).json({ error: 'User lacks required categories' });
  }

  object.content = content;
  log(`Object updated successfully: ${objectName} by ${userId}`);
  res.json({ message: 'Object updated successfully' });
});

app.delete('/object/:objectName', (req, res) => {
  const { userId } = req.query;
  const { objectName } = req.params;

  if (!users.has(userId) || !objects.has(objectName)) {
    log(`Failed object delete attempt: User ${userId} or object ${objectName} not found`);
    return res.status(404).json({ error: 'User or object not found' });
  }

  const user = users.get(userId);
  const object = objects.get(objectName);

  if (object.owner !== userId && user.level <= object.level) {
    log(`Failed object delete attempt: ${userId} has insufficient rights to delete ${objectName}`);
    return res.status(403).json({ error: 'Insufficient rights to delete object' });
  }

  objects.delete(objectName);
  log(`Object deleted successfully: ${objectName} by ${userId}`);
  res.json({ message: 'Object deleted successfully' });
});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  log(`Server started on port ${port}`);
});
