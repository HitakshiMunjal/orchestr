const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'orchestr.db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-Memory Storage Cache with Mutex for concurrency safety
let memoryDb = {
  users: [],
  resources: [],
  bookings: [],
  events: [],
  registrations: [],
  checkoutLogs: [],
  auditLogs: []
};

// Mutex lock for concurrency-safe transactions
let isLocked = false;
const lockQueue = [];

function acquireLock() {
  return new Promise((resolve) => {
    if (!isLocked) {
      isLocked = true;
      resolve();
    } else {
      lockQueue.push(resolve);
    }
  });
}

function releaseLock() {
  if (lockQueue.length > 0) {
    const nextResolve = lockQueue.shift();
    nextResolve();
  } else {
    isLocked = false;
  }
}

/**
 * Persist in-memory state to disk
 */
function saveDisk() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryDb, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write orchestr.db.json:', err);
  }
}

/**
 * Load initial state from disk if exists
 */
function loadDisk() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      memoryDb = { ...memoryDb, ...parsed };
      console.log('📦 Loaded existing Orchestr database from disk.');
      return true;
    }
  } catch (err) {
    console.warn('Could not read existing db file, initializing fresh:', err.message);
  }
  return false;
}

/**
 * Generic Collection wrapper that provides Mongoose-like syntax:
 * find, findOne, findById, create, insertMany, updateOne, findByIdAndUpdate, deleteOne, countDocuments
 */
class DocCollection {
  constructor(collectionName) {
    this.name = collectionName;
  }

  get items() {
    return memoryDb[this.name] || [];
  }

  set items(val) {
    memoryDb[this.name] = val;
  }

  async find(query = {}) {
    return this.items.filter(item => matchQuery(item, query)).map(i => deepClone(i));
  }

  async findOne(query = {}) {
    const item = this.items.find(item => matchQuery(item, query));
    return item ? deepClone(item) : null;
  }

  async findById(id) {
    const item = this.items.find(item => item.id === id || item._id === id);
    return item ? deepClone(item) : null;
  }

  async create(doc) {
    const id = doc.id || doc._id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newDoc = {
      ...doc,
      id,
      _id: id,
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.items.push(newDoc);
    saveDisk();
    return deepClone(newDoc);
  }

  async insertMany(docs) {
    const created = [];
    for (const d of docs) {
      const id = d.id || d._id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newDoc = {
        ...d,
        id,
        _id: id,
        createdAt: d.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.items.push(newDoc);
      created.push(deepClone(newDoc));
    }
    saveDisk();
    return created;
  }

  async updateOne(query, update) {
    const index = this.items.findIndex(item => matchQuery(item, query));
    if (index === -1) return { matchedCount: 0, modifiedCount: 0 };
    applyUpdate(this.items[index], update);
    this.items[index].updatedAt = new Date().toISOString();
    saveDisk();
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async findByIdAndUpdate(id, update, options = { new: true }) {
    const index = this.items.findIndex(item => item.id === id || item._id === id);
    if (index === -1) return null;
    applyUpdate(this.items[index], update);
    this.items[index].updatedAt = new Date().toISOString();
    saveDisk();
    return deepClone(this.items[index]);
  }

  async deleteOne(query) {
    const index = this.items.findIndex(item => matchQuery(item, query));
    if (index === -1) return { deletedCount: 0 };
    this.items.splice(index, 1);
    saveDisk();
    return { deletedCount: 1 };
  }

  async countDocuments(query = {}) {
    return this.items.filter(item => matchQuery(item, query)).length;
  }
}

function matchQuery(item, query) {
  for (const key of Object.keys(query)) {
    const val = query[key];
    if (key === '$or' && Array.isArray(val)) {
      if (!val.some(subQuery => matchQuery(item, subQuery))) return false;
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      // Handle operators: $in, $ne, $gte, $lte, $gt, $lt
      if ('$in' in val && Array.isArray(val.$in)) {
        if (!val.$in.includes(item[key])) return false;
      }
      if ('$ne' in val) {
        if (item[key] === val.$ne) return false;
      }
      if ('$gte' in val) {
        if (!(item[key] >= val.$gte)) return false;
      }
      if ('$lte' in val) {
        if (!(item[key] <= val.$lte)) return false;
      }
      if ('$gt' in val) {
        if (!(item[key] > val.$gt)) return false;
      }
      if ('$lt' in val) {
        if (!(item[key] < val.$lt)) return false;
      }
    } else {
      if (item[key] !== val) return false;
    }
  }
  return true;
}

function applyUpdate(item, update) {
  if (update.$set) {
    Object.assign(item, update.$set);
  }
  if (update.$inc) {
    for (const key of Object.keys(update.$inc)) {
      item[key] = (item[key] || 0) + update.$inc[key];
    }
  }
  if (update.$push) {
    for (const key of Object.keys(update.$push)) {
      if (!Array.isArray(item[key])) item[key] = [];
      item[key].push(update.$push[key]);
    }
  }
  // If update is simple object without operators
  if (!update.$set && !update.$inc && !update.$push) {
    Object.assign(item, update);
  }
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Exported Models
const db = {
  users: new DocCollection('users'),
  resources: new DocCollection('resources'),
  bookings: new DocCollection('bookings'),
  events: new DocCollection('events'),
  registrations: new DocCollection('registrations'),
  checkoutLogs: new DocCollection('checkoutLogs'),
  auditLogs: new DocCollection('auditLogs'),
  acquireLock,
  releaseLock,
  loadDisk,
  saveDisk,
  getMemoryDb: () => memoryDb,
  resetDb: () => {
    memoryDb = {
      users: [],
      resources: [],
      bookings: [],
      events: [],
      registrations: [],
      checkoutLogs: [],
      auditLogs: []
    };
    saveDisk();
  }
};

/**
 * Connect / Initialize Database
 */
async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (uri) {
    try {
      console.log('Attempting MongoDB connection to URI...');
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
      console.log('✅ Connected to MongoDB via Mongoose!');
      return;
    } catch (err) {
      console.warn('⚠️ MongoDB URI connection failed, falling back to embedded robust document engine:', err.message);
    }
  }
  
  const hasExisting = loadDisk();
  console.log('✅ Orchestr Embedded Document Engine active (Persistence: server/data/orchestr.db.json)');
  return hasExisting;
}

module.exports = {
  connectDb,
  db
};
