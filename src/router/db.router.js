const router = require("express").Router();
const DatabaseController = require("../controller/databaseController");

// Main API information endpoint
router.get("/", (req, res) => {
    res.send({
        name: "OtakuDesu Anime API with MySQL Database",
        version: "v2.0",
        author: "KaegaDeXter",
        endpoints: {
            getOngoingAnime: "/api/v2/ongoing/:page",
            getCompletedAnime: "/api/v2/completed/:page",
            getAnimeSearch: "/api/v2/search/:q",
            getAnimeList: "/api/v2/anime-list",
            getAnimeDetail: "/api/v2/detail/:endpoint",
            getAnimeEpisode: "/api/v2/episode/:endpoint",
            getBatchLink: "/api/v2/batch/:endpoint",
            getGenreList: "/api/v2/genres",
            getGenrePage: "/api/v2/genres/:genre/:page",
            getStats: "/api/v2/stats",
            // adminTriggerJob: "/api/v2/admin/trigger/:job",
        }
    });
});

// Regular API endpoints
router.get("/api/v2/ongoing/:page", DatabaseController.getOngoing);
router.get("/api/v2/completed/:page", DatabaseController.getCompleted);
router.get("/api/v2/search/:q", DatabaseController.getSearch);
router.get("/api/v2/anime-list", DatabaseController.getAnimeList);
router.get("/api/v2/detail/:endpoint", DatabaseController.getAnimeDetail);
router.get("/api/v2/episode/:endpoint", DatabaseController.getAnimeEpisode);
router.get("/api/v2/batch/:endpoint", DatabaseController.getBatchLink);
router.get("/api/v2/genres", DatabaseController.getGenreList);
router.get("/api/v2/genres/:genre/:page", DatabaseController.getGenrePage);

// Stats and admin endpoints
router.get("/api/v2/stats", DatabaseController.getStats);
router.get("/api/v2/admin/trigger/:job", DatabaseController.runScraperJob);

module.exports = router;