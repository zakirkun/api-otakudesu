const router = require("express").Router()
const route = router
const Services = require("../controller/services")


route.get("/", (req, res) => {
    res.send({
        endpoint: {
            getOngoingAnime: "/api/v1/ongoing/:page",
            getCompletedAnime: "/api/v1/completed/:page",
            getAnimeSearch: "/api/v1/search/:q",
            getAnimeList: "/api/v1/anime-list",
            getAnimeDetail: "/api/v1/detail/:endpoint",
            getAnimeEpisode: "/api/v1/episode/:endpoint",
            getBatchLink: "/api/v1/batch/:endpoint",
            getGenreList: "/api/v1/genres",
            getGenrePage: "/api/v1/genres/:genre/:page"
        }
    })
})


// Get Ongoing Anime -Done-
router.get("/api/v1/ongoing/:page", Services.getOngoing)
// Get Completed Anime -Done-
router.get("/api/v1/completed/:page", Services.getCompleted)
// Get Search Anime -Done-
router.get("/api/v1/search/:q", Services.getSearch)
// Get Anime List -Done-
router.get("/api/v1/anime-list", Services.getAnimeList)
// Get Anime Detail -Done-  
route.get("/api/v1/detail/:endpoint", Services.getAnimeDetail)
// Get Anime Episode -Done-
router.get("/api/v1/episode/:endpoint", Services.getAnimeEpisode)
// Get Batch Link -Done-
router.get("/api/v1/batch/:endpoint", Services.getBatchLink)
// Get Genre List -Done-
router.get("/api/v1/genres", Services.getGenreList) 
// Get Genre Page -Done-
router.get("/api/v1/genres/:genre/:page", Services.getGenrePage)
// Get EMbed Streaming 
router.get("/api/v1/streaming/:content", Services.getEmbedByContent)

module.exports = route