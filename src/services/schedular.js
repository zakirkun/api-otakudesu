const cron = require('node-cron');
const ScraperService = require('./scraper');
const { sequelize } = require('../config/database');
const { initModels } = require('../models');

class Scheduler {
  constructor() {
    this.jobs = {};
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      console.log('Initializing database models...');
      await initModels();

      console.log('Initializing scheduler...');
      // Schedule scraper jobs
      this.setupJobs();
      this.initialized = true;
      console.log('Scheduler initialized successfully.');
    } catch (error) {
      console.error('Error initializing scheduler:', error);
    }
  }

  setupJobs() {
    // Initial data collection (run once at startup)
    this.runInitialScrape();

    // Check for new episodes every hour
    this.jobs.hourlyCheck = cron.schedule('0 * * * *', async () => {
      console.log(`[${new Date().toISOString()}] Running hourly check for new episodes...`);
      await this.runEpisodeCheck();
    });

    // Update ongoing anime list every day at 1 AM
    this.jobs.dailyOngoingUpdate = cron.schedule('0 1 * * *', async () => {
      console.log(`[${new Date().toISOString()}] Running daily ongoing anime update...`);
      await this.scrapeUntilLastPage('ongoing');
    });

    // Update completed anime list every week on Sunday at 2 AM
    this.jobs.weeklyCompletedUpdate = cron.schedule('0 2 * * 0', async () => {
      console.log(`[${new Date().toISOString()}] Running weekly completed anime update...`);
      await this.scrapeUntilLastPage('completed');
    });

    // Update genre list once a month (1st day of month at 3 AM)
    this.jobs.monthlyGenreUpdate = cron.schedule('0 3 1 * *', async () => {
      console.log(`[${new Date().toISOString()}] Running monthly genre update...`);
      await ScraperService.scrapeGenres();
    });
  }

  async scrapeUntilLastPage(type) {
    let page = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
      try {
        console.log(`[${new Date().toISOString()}] Scraping ${type} anime page ${page}...`);
        const result = await (type === 'ongoing' 
          ? ScraperService.scrapeOngoingAnime(page)
          : ScraperService.scrapeCompletedAnime(page));
        
        if (result.isLastPage) {
          console.log(`[${new Date().toISOString()}] Reached last page of ${type} anime at page ${page}`);
          hasMorePages = false;
        } else {
          page++;
          // Add a delay between pages to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (error) {
        console.error(`Error scraping ${type} anime page ${page}:`, error);
        hasMorePages = false;
      }
    }
  }

  async runInitialScrape() {
    try {
      console.log('Starting initial data scraping...');
      
      // Start with genres
      console.log('Scraping genres...');
      await ScraperService.scrapeGenres();
      
      // Scrape ongoing anime until last page
      console.log('Scraping ongoing anime...');
      await this.scrapeUntilLastPage('ongoing');
      
      // Scrape completed anime until last page
      console.log('Scraping completed anime...');
      await this.scrapeUntilLastPage('completed');
      
      console.log('Initial data scraping completed.');
    } catch (error) {
      console.error('Error during initial scraping:', error);
    }
  }

  async runEpisodeCheck() {
    try {
      const results = await ScraperService.checkNewEpisodes();
      console.log('New episode check completed:', results);
      return results;
    } catch (error) {
      console.error('Error checking for new episodes:', error);
      return [];
    }
  }

  // Force immediate run of a specific job
  async runJob(jobName) {
    switch(jobName) {
      case 'initial':
        return this.runInitialScrape();
      case 'episodes':
        return this.runEpisodeCheck();
      case 'ongoing':
        return this.scrapeUntilLastPage('ongoing');
      case 'completed':
        return this.scrapeUntilLastPage('completed');
      case 'genres':
        return ScraperService.scrapeGenres();
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }

  // Stop all scheduled jobs
  stopAll() {
    Object.values(this.jobs).forEach(job => job.stop());
    console.log('All scheduler jobs stopped.');
  }
}

// Create a singleton instance
const scheduler = new Scheduler();

module.exports = scheduler;