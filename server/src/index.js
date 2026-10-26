const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { connectDb, db } = require('./config/db');
const { seedDatabase } = require('./utils/seeds');
const { startCronWorkers } = require('./services/cronService');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'Orchestr API Server',
    tagline: 'Every Event. Perfectly Coordinated.',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend build from client/dist if present
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res) => {
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('Orchestr API Server running. Build client or visit client dev server.');
    }
  });
});

// Boot server
async function startServer() {
  try {
    await connectDb();
    await seedDatabase(db);
    startCronWorkers(db);

    app.listen(PORT, () => {
      console.log(`🚀 Orchestr Server listening on http://localhost:${PORT}`);
      console.log(`🎯 "Every Event. Perfectly Coordinated."`);
    });
  } catch (err) {
    console.error('Fatal server boot error:', err);
    process.exit(1);
  }
}

startServer();
