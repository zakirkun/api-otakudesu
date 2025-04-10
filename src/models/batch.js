const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Anime = require('./anime');

const Batch = sequelize.define('Batch', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  animeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Anime,
      key: 'id'
    }
  },
  batch_title: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  batch_endpoint: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  // Store quality options as JSON
  download_links: {
    type: DataTypes.TEXT, // Stores JSON string
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('download_links');
      return rawValue ? JSON.parse(rawValue) : null;
    },
    set(value) {
      this.setDataValue('download_links', value ? JSON.stringify(value) : null);
    }
  }
}, {
  timestamps: true
});

// Set up relationship
Batch.belongsTo(Anime, { foreignKey: 'animeId', onDelete: 'CASCADE' });
Anime.hasOne(Batch, { foreignKey: 'animeId' });

module.exports = Batch;