const cheerio = require('cheerio');
const services = require('../helper/sevice');
const baseUrl = require('../constant/url');
const episodeHelper = require('../helper/episodeHelper');
const { Anime, Episode, Batch, Genre, AnimeGenre } = require('../models');
const { Op } = require('sequelize');

const ScraperService = {
  // Scrape and save genre list
  scrapeGenres: async () => {
    try {
      const url = `${baseUrl}/genre-list/`;
      const response = await services.fetchService(url);
      
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        const genrePromises = [];
        
        $('.genres').find("a").each((index, el) => {
          const name = $(el).text();
          const endpoint = $(el).attr('href').replace("/genres/", "").replace("/", "");
          
          genrePromises.push(
            Genre.findOrCreate({
              where: { endpoint },
              defaults: { name, endpoint }
            })
          );
        });
        
        const results = await Promise.all(genrePromises);
        console.log(`Scraped ${results.length} genres.`);
        return results.map(([genre]) => genre);
      }
    } catch (error) {
      console.error('Error scraping genres:', error);
      return [];
    }
  },
  
  // Scrape ongoing anime
  scrapeOngoingAnime: async (pages = 1) => {
    try {
      const animeList = [];
      
      for (let page = 1; page <= pages; page++) {
        const url = page === 1 ? `${baseUrl}/ongoing-anime/` : `${baseUrl}/ongoing-anime/page/${page}/`;
        const response = await services.fetchService(url);
        
        if (response.status === 200) {
          const $ = cheerio.load(response.data);
          const element = $(".rapi");
          
          element.find("ul > li").each((index, el) => {
            const title = $(el).find("h2").text().trim();
            const thumb = $(el).find("img").attr("src");
            const total_episode = $(el).find(".epz").text();
            const updated_on = $(el).find(".newnime").text();
            const endpoint = $(el).find(".thumb > a").attr("href").replace(`${baseUrl}/anime/`, "").replace("/", "");
            
            animeList.push({
              title,
              thumb,
              total_episode,
              updated_on,
              endpoint,
              status: 'Ongoing'
            });
          });
        }
      }
      
      console.log(`Found ${animeList.length} ongoing anime to process.`);
      
      // Save to database
      const savedAnime = [];
      for (const anime of animeList) {
        const [animeRecord, created] = await Anime.findOrCreate({
          where: { endpoint: anime.endpoint },
          defaults: anime
        });
        
        if (!created) {
          // Update anime if not created
          await animeRecord.update(anime);
        }
        
        // Fetch and save detailed information
        await ScraperService.scrapeAnimeDetail(anime.endpoint);
        savedAnime.push(animeRecord);
      }
      
      return savedAnime;
    } catch (error) {
      console.error('Error scraping ongoing anime:', error);
      return [];
    }
  },
  
  // Scrape completed anime
  scrapeCompletedAnime: async (pages = 1) => {
    try {
      const animeList = [];
      
      for (let page = 1; page <= pages; page++) {
        const url = page === 1 ? `${baseUrl}/complete-anime/` : `${baseUrl}/complete-anime/page/${page}/`;
        const response = await services.fetchService(url);
        
        if (response.status === 200) {
          const $ = cheerio.load(response.data);
          const element = $(".rapi");
          
          element.find("ul > li").each((index, el) => {
            const title = $(el).find("h2").text().trim();
            const thumb = $(el).find("img").attr("src");
            const total_episode = $(el).find(".epz").text();
            const updated_on = $(el).find(".newnime").text();
            const rating = $(el).find(".epztipe").text().trim();
            const endpoint = $(el).find(".thumb > a").attr("href").replace(`${baseUrl}/anime/`, "").replace("/", "");
            
            animeList.push({
              title,
              thumb,
              total_episode,
              updated_on,
              rating,
              endpoint,
              status: 'Completed'
            });
          });
        }
      }
      
      console.log(`Found ${animeList.length} completed anime to process.`);
      
      // Save to database
      const savedAnime = [];
      for (const anime of animeList) {
        const [animeRecord, created] = await Anime.findOrCreate({
          where: { endpoint: anime.endpoint },
          defaults: anime
        });
        
        if (!created) {
          // Update anime if not created
          await animeRecord.update(anime);
        }
        
        // Fetch and save detailed information
        await ScraperService.scrapeAnimeDetail(anime.endpoint);
        savedAnime.push(animeRecord);
      }
      
      return savedAnime;
    } catch (error) {
      console.error('Error scraping completed anime:', error);
      return [];
    }
  },
  
  // Scrape anime details and episodes
  scrapeAnimeDetail: async (endpoint) => {
    try {
      const url = `${baseUrl}/anime/${endpoint}/`;
      const response = await services.fetchService(url);
      
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        const infoElement = $(".fotoanime");
        const episodeElement = $(".episodelist");
        
        let thumb, sinopsisArray = [], detailArray = [];
        
        infoElement.each((index, el) => {
          thumb = $(el).find("img").attr("src");
          $(el).find(".sinopc > p").each((index, el) => {
            sinopsisArray.push($(el).text());
          });
          $(el).find(".infozingle >  p").each((index, el) => {
            detailArray.push($(el).text());
          });
        });
        
        const title = $(".jdlrx > h1").text();
        const sinopsis = sinopsisArray.join('\n');
        const detail = detailArray.join('\n');
        
        // Find or create the anime
        const [anime, created] = await Anime.findOrCreate({
          where: { endpoint },
          defaults: {
            title,
            endpoint,
            thumb,
            sinopsis,
            detail,
            status: detail.includes('Ongoing') ? 'Ongoing' : 'Completed'
          }
        });
        
        // Update if anime already exists
        if (!created) {
          await anime.update({
            title,
            thumb,
            sinopsis,
            detail,
            status: detail.includes('Ongoing') ? 'Ongoing' : 'Completed'
          });
        }
        
        // Extract genre information from detail
        const genreRegex = /Genre:\s*([^\\n]+)/i;
        const genreMatch = detail.match(genreRegex);
        
        if (genreMatch && genreMatch[1]) {
          const genreNames = genreMatch[1].split(',').map(g => g.trim());
          
          for (const genreName of genreNames) {
            // Skip empty genres
            if (!genreName) continue;
            
            // Find the genre
            const genre = await Genre.findOne({
              where: {
                name: {
                  [Op.like]: genreName
                }
              }
            });
            
            if (genre) {
              // Add the genre to the anime
              await anime.addGenre(genre);
            }
          }
        }
        
        // Scrape episodes
        const episodePromises = [];
        
        episodeElement.find("li").each((index, el) => {
          const episode_title = $(el).find("span > a").text();
          const episode_endpoint = $(el).find("span > a").attr("href")
            .replace(`${baseUrl}/episode/`, "")
            .replace(`${baseUrl}/batch/`, "")
            .replace(`${baseUrl}/lengkap/`, "")
            .replace("/", "");
          const episode_date = $(el).find(".zeebr").text();
          
          if (episode_endpoint.includes('batch')) {
            // Handle batch episodes
            episodePromises.push(
              ScraperService.scrapeBatchEpisode(episode_endpoint, anime.id)
            );
          } else {
            // Handle regular episodes
            episodePromises.push(
              ScraperService.scrapeEpisode(episode_endpoint, anime.id, {
                episode_title,
                episode_date
              })
            );
          }
        });
        
        // Wait for all episode scraping to complete
        await Promise.all(episodePromises);
        
        return anime;
      }
    } catch (error) {
      console.error(`Error scraping anime detail (${endpoint}):`, error);
      return null;
    }
  },
  
  // Scrape episode details
  scrapeEpisode: async (endpoint, animeId, additionalData = {}) => {
    try {
      // Check if episode already exists
      const existingEpisode = await Episode.findOne({
        where: { episode_endpoint: endpoint }
      });
      
      // If it exists and we're not forcing update, skip
      if (existingEpisode) {
        console.log(`Episode ${endpoint} already exists, skipping.`);
        return existingEpisode;
      }
      
      const url = `${baseUrl}/episode/${endpoint}`;
      const response = await services.fetchService(url);
      
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        const streamElement = $("#lightsVideo").find("#embed_holder");
        
        const episodeData = {
          animeId,
          episode_title: $(".venutama > h1").text() || additionalData.episode_title || '',
          episode_endpoint: endpoint,
          episode_date: additionalData.episode_date || '',
          streamLink: streamElement.find(".responsive-embed-stream > iframe").attr("src") || ''
        };
        
        
        // Get download links
        let low_quality, medium_quality, high_quality;
        
        if ($('#venkonten > div.venser > div.venutama > div.download > ul > li:nth-child(1)').text() === '') {
          low_quality = episodeHelper.notFoundQualityHandler(response.data, 0);
          medium_quality = episodeHelper.notFoundQualityHandler(response.data, 1);
          high_quality = episodeHelper.notFoundQualityHandler(response.data, 2);
        } else {
          low_quality = episodeHelper.epsQualityFunction(0, response.data);
          medium_quality = episodeHelper.epsQualityFunction(1, response.data);
          high_quality = episodeHelper.epsQualityFunction(2, response.data);
        }
        
        episodeData.download_links = { 
          low_quality, 
          medium_quality, 
          high_quality 
        };
        
        // Save to database
        const [episode, created] = await Episode.findOrCreate({
          where: { episode_endpoint: endpoint },
          defaults: episodeData
        });
        
        if (!created) {
          // Update if episode already exists
          await episode.update(episodeData);
        }
        
        return episode;
      }
    } catch (error) {
      console.error(`Error scraping episode (${endpoint}):`, error);
      return null;
    }
  },
  
  // Scrape batch episode
  scrapeBatchEpisode: async (endpoint, animeId) => {
    try {
      // Check if batch already exists
      const existingBatch = await Batch.findOne({
        where: { batch_endpoint: endpoint }
      });
      
      // If it exists, skip
      if (existingBatch) {
        console.log(`Batch ${endpoint} already exists, skipping.`);
        return existingBatch;
      }
      
      const fullUrl = `${baseUrl}/batch/${endpoint}`;
      const response = await services.fetchService(fullUrl);
      
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        
        const batchData = {
          animeId,
          batch_title: $(".batchlink > h4").text(),
          batch_endpoint: endpoint
        };
        
        const low_quality = episodeHelper.batchQualityFunction(0, response.data);
        const medium_quality = episodeHelper.batchQualityFunction(1, response.data);
        const high_quality = episodeHelper.batchQualityFunction(2, response.data);
        
        batchData.download_links = { 
          low_quality, 
          medium_quality, 
          high_quality 
        };
        
        // Save to database
        const [batch, created] = await Batch.findOrCreate({
          where: { batch_endpoint: endpoint },
          defaults: batchData
        });
        
        if (!created) {
          // Update if batch already exists
          await batch.update(batchData);
        }
        
        return batch;
      }
    } catch (error) {
      console.error(`Error scraping batch (${endpoint}):`, error);
      return null;
    }
  },
  
  // Check for new episodes
  checkNewEpisodes: async () => {
    try {
      // Get ongoing anime from database
      const ongoingAnime = await Anime.findAll({
        where: { status: 'Ongoing' }
      });
      
      const newEpisodes = [];
      
      // Check each anime for new episodes
      for (const anime of ongoingAnime) {
        const animeDetail = await ScraperService.scrapeAnimeDetail(anime.endpoint);
        
        if (animeDetail) {
          // Get latest episodes for this anime
          const latestEpisodes = await Episode.findAll({
            where: { animeId: anime.id },
            order: [['createdAt', 'DESC']],
            limit: 5
          });
          
          newEpisodes.push({
            anime: anime.title,
            newEpisodesFound: latestEpisodes.length
          });
        }
      }
      
      return newEpisodes;
    } catch (error) {
      console.error('Error checking for new episodes:', error);
      return [];
    }
  }
};

module.exports = ScraperService;