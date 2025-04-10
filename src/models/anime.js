const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Anime = sequelize.define('Anime', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  endpoint: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  thumb: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Ongoing', 'Completed'),
    allowNull: false
  },
  rating: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sinopsis: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  detail: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  total_episode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  updated_on: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Anime;