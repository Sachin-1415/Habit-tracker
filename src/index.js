require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const habitsRouter = require('./routes/habits');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Static UI for quick testing
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/', habitsRouter);

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Habit Tracker API listening on http://localhost:${PORT}`);
});

