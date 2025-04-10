const { sequelize } = require('../config/database');
const Anime = require('./anime');
const Episode = require('./episode');
const Batch = require('./batch');
const { Genre, AnimeGenre } = require('./genre');

// Initialize all models
const initModels = async () => {
  try {
    // Sync all models with the database
    // Using force: false to avoid dropping tables if they already exist
    await sequelize.sync({ force: false, alter: true });
    console.log('All models were synchronized successfully.');
    return true;
  } catch (error) {
    console.error('Failed to synchronize models:', error);
    return false;
  }
};

module.exports = {
  initModels,
  Anime,
  Episode,
  Batch,
  Genre,
  AnimeGenre
};