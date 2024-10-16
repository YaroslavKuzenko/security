const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const serverUrl = 'http://localhost:3000';

const LEVELS = {
  UNCLASSIFIED: 0,
  CONFIDENTIAL: 1,
  SECRET: 2,
  TOP_SECRET: 3
};
const CATEGORIES = ['CATEGORY1', 'CATEGORY2', 'CATEGORY3', 'CATEGORY4'];
let currentUser = null;


async function register() {
  const userId = await question('Enter user ID: ');
  const password = await question('Enter password: ');
  const level = await question(`Enter security level (${Object.keys(LEVELS).join('/')}): `);
  const categories = await question(`Enter categories (comma-separated, options: ${CATEGORIES.join(', ')}): `);

  try {
    const response = await axios.post(`${serverUrl}/register`, 
      { 
        userId, 
        password, 
        level: LEVELS[level.toUpperCase()], 
        categories: categories.split(',').map(c => c.trim().toUpperCase()) 
      });
    console.log(response.data.message);
  } catch (error) {
    console.error('Registration failed:', error);
  }
}

async function authenticate() {
  const userId = await question('Enter user ID: ');
  const password = await question('Enter password: ');

  try {
    const response = await axios.post(`${serverUrl}/authenticate`, { userId, password });
    console.log(response.data.message);
    currentUser = response.data.user
  } catch (error) {
    console.error('Authentication failed:', error);
  }
}

async function createObject() {
  if(!currentUser){
    console.log('Please login first');
    return;
  }

  const objectName = await question('Enter object name: ');
  const content = await question('Enter object content: ');
  const level = await question(`Enter security level (${Object.keys(LEVELS).join('/')}): `);
  const categories = await question(`Enter categories (comma-separated, options: ${CATEGORIES.join(', ')}): `);

  try {
    const response = await axios.post(`${serverUrl}/object`, {
      userId: currentUser.userId,
      objectName,
      content,
      level: LEVELS[level.toUpperCase()],
      categories: categories.split(',').map(c => c.trim().toUpperCase())
    })

    console.log(response.data.message)
  } catch (error) {
    console.error('Object creation faild', error.response.data.error)
  }

}

async function readObject() {
  if (!currentUser) {
    console.log('Please login first.');
    return;
  }

  const objectName = await question('Enter object name to read: ');

  try {
    const response = await axios.get(`${serverUrl}/object/${objectName}`, {
      params: { userId: currentUser.userId }
    });
    console.log('Object content:', response.data.content);
  } catch (error) {
    console.error('Reading object failed:', error.response.data.error);
  }
}

async function updateObject() {
  if (!currentUser) {
    console.log('Please login first.');
    return;
  }

  const objectName = await question('Enter object name to update: ');
  const newContent = await question('Enter new content: ');

  try {
    const response = await axios.put(`${serverUrl}/object/${objectName}`, {
      userId: currentUser.userId,
      content: newContent
    });
    console.log(response.data.message);
  } catch (error) {
    console.error('Updating object failed:', error.response.data.error);
  }
}

async function deleteObject() {
  if (!currentUser) {
    console.log('Please login first.');
    return;
  }

  const objectName = await question('Enter object name to delete: ');

  try {
    const response = await axios.delete(`${serverUrl}/object/${objectName}`, {
      params: { userId: currentUser.userId }
    });
    console.log(response.data.message);
  } catch (error) {
    console.error('Deleting object failed:', error.response.data.error);
  }
}

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  while (true) {
    const command = await question('\nEnter command (register/login/create/read/update/delete/quit): ');

    switch (command.toLowerCase()) {
      case 'register':
        await register();
        break;
      case 'login':
        await authenticate();
        break;
      case 'create':
        await createObject();
        break;
      case 'read':
        await readObject();
        break;
      case 'update':
        await updateObject();
        break;
      case 'delete':
        await deleteObject();
        break;
      case 'quit':
        rl.close();
        return;
      default:
        console.log('Invalid command');
    }
  }
}

main().catch(console.error);
