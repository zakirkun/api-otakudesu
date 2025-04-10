const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Anime = require('./anime');

const Episode = sequelize.define('Episode', {
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
  episode_title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  episode_endpoint: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  episode_date: {
    type: DataTypes.STRING,
    allowNull: true
  },
  streamLink: {
    type: DataTypes.TEXT,
    allowNull: true
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
Episode.belongsTo(Anime, { foreignKey: 'animeId', onDelete: 'CASCADE' });
Anime.hasMany(Episode, { foreignKey: 'animeId' });

module.exports = Episode;