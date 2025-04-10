const { Anime, Episode, Batch, Genre, AnimeGenre } = require('../models');
const { Op } = require('sequelize');
const ScraperService = require('../services/scraper');
const scheduler = require('../services/schedular');

const DatabaseController = {
  // Get ongoing anime from database
  getOngoing: async (req, res) => {
    try {
      const page = parseInt(req.params.page) || 1;
      const limit = 20;
      const offset = (page - 1) * limit;

      const { count, rows: ongoing } = await Anime.findAndCountAll({
        where: { status: 'Ongoing' },
        limit,
        offset,
        order: [['updatedAt', 'DESC']]
      });

      return res.status(200).json({
        status: true,
        message: 'success',
        ongoing,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count
      });
    } catch (error) {
      console.error('Error fetching ongoing anime:', error);
      return res.status(500).json({
        status: false,
        message: error.message,
        ongoing: []
      });
    }
  },

  // Get completed anime from database
  getCompleted: async (req, res) => {
    try {
      const page = parseInt(req.params.page) || 1;
      const limit = 20;
      const offset = (page - 1) * limit;

      const { count, rows: completed } = await Anime.findAndCountAll({
        where: { status: 'Completed' },
        limit,
        offset,
        order: [['updatedAt', 'DESC']]
      });

      return res.status(200).json({
        status: true,
        message: 'success',
        completed,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count
      });
    } catch (error) {
      console.error('Error fetching completed anime:', error);
      return res.status(500).json({
        status: false,
        message: error.message,
        completed: []
      });
    }
  },

  // Search anime from database
  getSearch: async (req, res) => {
    try {
      const query = req.params.q;
      const search = await Anime.findAll({
        where: {
          title: {
            [Op.like]: `%${query}%`
          }
        },
        include: [{
          model: Genre,
          through: { attributes: [] }, // Don't include join table
        }],
        limit: 30,
        order: [['title', 'ASC']]
      });

      return res.status(200).json({
        status: true,
        message: 'success',
        search,
        query
      });
    } catch (error) {
      console.error('Error searching anime:', error);
      return res.status(500).json({
        status: false,
        message: error.message,
        search: []
      });
    }
  },

  // Get anime list from database
  getAnimeList: async (req, res) => {
    try {
      // Get all anime, but only select necessary fields to reduce data transfer
      const anime_list = await Anime.findAll({
        attributes: ['id', 'title', 'endpoint'],
        order: [['title', 'ASC']]
      });

      return res.status(200).json({
        status: true,
        message: 'success',
        anime_list
      });
    } catch (error) {
      console.error('Error fetching anime list:', error);
      return res.status(500).json({
        status: false,
        message: error.message,
        anime_list: []
      });
    }
  },

  // Get anime detail from database
  getAnimeDetail: async (req, res) => {
    try {
      const endpoint = req.params.endpoint;

      // First check if anime exists in our database
      let anime = await Anime.findOne({
        where: { endpoint },
        include: [{
          model: Genre,
          through: { attributes: [] }, // Don't include join table
        }]
      });

      // If not found, try to scrape it
      if (!anime) {
        console.log(`Anime ${endpoint} not found in database, attempting to scrape...`);
        await ScraperService.scrapeAnimeDetail(endpoint);
        
        // Try to find it again
        anime = await Anime.findOne({
          where: { endpoint },
          include: [{
            model: Genre,
            through: { attributes: [] },
          }]
        });
        
        // If still not found, return error
        if (!anime) {
          return res.status(404).json({
            status: false,
            message: 'Anime not found',
            anime_detail: null,
            episode_list: []
          });
        }
      }

      // Get episodes
      const episode_list = await Episode.findAll({
        where: { animeId: anime.id },
        order: [['episode_title', 'DESC']]
      });

      // Format the response in the same format as the original API
      const anime_detail = {
        title: anime.title,
        thumb: anime.thumb,
        sinopsis: anime.sinopsis ? anime.sinopsis.split('\n') : [],
        detail: anime.detail ? anime.detail.split('\n') : [],
        genres: anime.Genres ? anime.Genres.map(g => g.name) : []
      };

      return res.status(200).json({
        status: true,
        message: 'success',
        anime_detail,
        episode_list,
        endpoint
      });
    } catch (error) {
      console.error('Error fetching anime detail:', error);
      return res.status(500).json({
        status: false,
        message: error.message,
        anime_detail: null,
        episode_list: []
      });
    }
  },

  // Get anime episode from database
  getAnimeEpisode: async (req, res) => {
    try {
      const endpoint = req.params.endpoint;

      // Check if episode exists in database
      let episode = await Episode.findOne({
        where: { episode_endpoint: endpoint },
        include: [{
          model: Anime,
          attributes: ['title', 'endpoint']
        }]
      });

      // If not found, try to scrape it
      if (!episode) {
        console.log(`Episode ${endpoint} not found in database, attempting to scrape...`);
        
        // First we need to find the anime ID
        // Extract anime endpoint from episode endpoint (assuming format like: anime-name-episode-1)
        const animeEndpointMatch = endpoint.match(/^(.*?)(?:-episode-\d+.*$|$)/);
        let animeEndpoint = animeEndpointMatch ? animeEndpointMatch[1] : null;
        
        if (animeEndpoint) {
          // Find the anime
          const anime = await Anime.findOne({ where: { endpoint: animeEndpoint } });
          
          if (anime) {
            // Scrape the episode
            await ScraperService.scrapeEpisode(endpoint, anime.id);
            
            // Try to find the episode again
            episode = await Episode.findOne({
              where: { episode_endpoint: endpoint },
              include: [{
                model: Anime,
                attributes: ['title', 'endpoint']
              }]
            });
          }
        }
        
        // If still not found, return error
        if (!episode) {
          return res.status(404).json({
            status: false,
            message: 'Episode not found',
          });
        }
      }

      // Get related episodes
      const relatedEpisodes = await Episode.findAll({
        where: { 
          animeId: episode.animeId,
          id: { [Op.ne]: episode.id } // Not the current episode
        },
        limit: 5,
        order: [['createdAt', 'DESC']]
      });

      // Format response to match original API
      const response = {
        title: episode.episode_title,
        baseUrl: `${req.protocol}://${req.get('host')}/api/v1/episode/${endpoint}`,
        id: episode.id,
        streamLink: episode.streamLink,
        relative: relatedEpisodes.map(ep => ({
          title_ref: ep.episode_title,
          link_ref: ep.episode_endpoint
        })),
        list_episode: []
      };

      // Get all episodes for this anime for the episode list
      const allEpisodes = await Episode.findAll({
        where: { animeId: episode.animeId },
        order: [['episode_title', 'DESC']]
      });

      response.list_episode = allEpisodes.map(ep => ({
        list_episode_title: ep.episode_title,
        list_episode_endpoint: ep.episode_endpoint
      }));

      // Parse download links from JSON
      if (episode.download_links) {
        const downloadLinks = typeof episode.download_links === 'string' 
          ? JSON.parse(episode.download_links) 
          : episode.download_links;
          
        response.quality = {
          low_quality: downloadLinks.low_quality,
          medium_quality: downloadLinks.medium_quality,
          high_quality: downloadLinks.high_quality
        };
      }

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching anime episode:', error);
      return res.status(500).json({
        status: false,
        message: error.message
      });
    }
  },

  // Get batch link from database
  getBatchLink: async (req, res) => {
    try {
      const endpoint = req.params.endpoint;

      // Check if batch exists in database
      let batch = await Batch.findOne({
        where: { batch_endpoint: endpoint },
        include: [{
          model: Anime,
          attributes: ['title', 'endpoint']
        }]
      });

      // If not found, try to scrape it
      if (!batch) {
        console.log(`Batch ${endpoint} not found in database, attempting to scrape...`);
        
        // First we need to find the anime ID
        // Extract anime endpoint from batch endpoint
        const animeEndpointMatch = endpoint.match(/^(.*?)(?:-batch.*$|$)/);
        let animeEndpoint = animeEndpointMatch ? animeEndpointMatch[1] : null;
        
        if (animeEndpoint) {
          // Find the anime
          const anime = await Anime.findOne({ where: { endpoint: animeEndpoint } });
          
          if (anime) {
            // Scrape the batch
            await ScraperService.scrapeBatchEpisode(endpoint, anime.id);
            
            // Try to find the batch again
            batch = await Batch.findOne({
              where: { batch_endpoint: endpoint },
              include: [{
                model: Anime,
                attributes: ['title', 'endpoint']
              }]
            });
          }
        }
        
        // If still not found, return error
        if (!batch) {
          return res.status(404).json({
            status: false,
            message: 'Batch not found',
            batch: null
          });
        }
      }

      // Format response to match original API
      const response = {
        status: true,
        message: 'success',
        batch: {
          title: batch.batch_title,
          status: 'success',
          baseUrl: `${req.protocol}://${req.get('host')}/api/v1/batch/${endpoint}`
        }
      };

      // Parse download links from JSON
      if (batch.download_links) {
        const downloadLinks = typeof batch.download_links === 'string' 
          ? JSON.parse(batch.download_links) 
          : batch.download_links;
          
        response.batch.download_list = {
          low_quality: downloadLinks.low_quality,
          medium_quality: downloadLinks.medium_quality,
          high_quality: downloadLinks.high_quality
        };
      }

      return res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching batch link:', error);
      return res.status(500).json({
        status: false,
        message: error.message,
        batch: null
      });
    }
  },

  // Get genre list from database
  getGenreList: async (req, res) => {
    try {
      const genres = await Genre.findAll({
        order: [['name', 'ASC']]
      });

      // Format to match original API
      const formattedGenres = genres.map(genre => ({
        genre: genre.name,
        endpoint: genre.endpoint
      }));

      return res.status(200).json({
        status: true,
        message: 'success',
        genres: formattedGenres
      });
    } catch (error) {
      console.error('Error fetching genre list:', error);
      return res.status(500).json({
        status: false,
        message: error.message,
        genres: []
      });
    }
  },

  // Get anime by genre from database
  getGenrePage: async (req, res) => {
    try {
      const genreEndpoint = req.params.genre;
      const page = parseInt(req.params.page) || 1;
      const limit = 20;
      const offset = (page - 1) * limit;

      // Find the genre first
      const genre = await Genre.findOne({
        where: { endpoint: genreEndpoint }
      });

      if (!genre) {
        return res.status(404).json({
          status: false,
          message: 'Genre not found',
          genreAnime: []
        });
      }

      // Get anime for this genre with pagination
      const anime = await genre.getAnimes({
        limit,
        offset,
        order: [['title', 'ASC']],
        include: [{
          model: Genre,
          through: { attributes: [] }
        }]
      });

      // Count total anime with this genre
      const count = await genre.countAnimes();

      // Format the response
      const genreAnime = anime.map(a => ({
        title: a.title,
        link: a.endpoint,
        studio: '', // This might need to be extracted from details
        episode: a.total_episode,
        rating: a.rating,
        thumb: a.thumb,
        genre: a.Genres.map(g => g.name),
        sinopsis: a.sinopsis
      }));

      return res.status(200).json({
        status: true,
        message: 'success',
        genreAnime,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count
      });
    } catch (error) {
      console.error('Error fetching genre page:', error);
      return res.status(500).json({
        status: false,
        message: error.message,
        genreAnime: []
      });
    }
  },

  // Admin endpoints for controlling the scraper
  
  // Manually trigger a scraper job
  runScraperJob: async (req, res) => {
    try {
      const { job } = req.params;
      
      if (!job) {
        return res.status(400).json({
          status: false,
          message: 'Job parameter is required'
        });
      }
      
      console.log(`Manually triggering job: ${job}`);
      const result = await scheduler.runJob(job);
      
      return res.status(200).json({
        status: true,
        message: `Job ${job} triggered successfully`,
        result
      });
    } catch (error) {
      console.error(`Error running scraper job ${req.params.job}:`, error);
      return res.status(500).json({
        status: false,
        message: error.message
      });
    }
  },

  // Get database stats
  getStats: async (req, res) => {
    try {
      const stats = {
        anime: {
          total: await Anime.count(),
          ongoing: await Anime.count({ where: { status: 'Ongoing' } }),
          completed: await Anime.count({ where: { status: 'Completed' } })
        },
        episodes: {
          total: await Episode.count()
        },
        batches: {
          total: await Batch.count()
        },
        genres: {
          total: await Genre.count()
        },
        last_updated: new Date().toISOString()
      };
      
      return res.status(200).json({
        status: true,
        message: 'success',
        stats
      });
    } catch (error) {
      console.error('Error getting database stats:', error);
      return res.status(500).json({
        status: false,
        message: error.message
      });
    }
  }
};

module.exports = DatabaseController;