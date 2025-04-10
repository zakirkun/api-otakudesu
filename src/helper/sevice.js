const axios = require("axios")
const HttpsProxyAgent = require('https-proxy-agent')
const cheerio = require('cheerio')

const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/120.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
]


const getRandomUserAgent = () => {
    return userAgents[Math.floor(Math.random() * userAgents.length)]
}

const getRandomDelay = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

const Service = {
    fetchService: async (url, maxRetries = 3) => {
        let retries = 0;
        while (retries < maxRetries) {
            try {
                // Add random delay between requests
                await new Promise(resolve => setTimeout(resolve, getRandomDelay(2000, 5000)))

                const response = await axios({
                    url,
                    method: 'get',
                    timeout: 15000, // 15 seconds timeout
                    headers: {
                        'User-Agent': getRandomUserAgent(),
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive',
                        'Cache-Control': 'max-age=0',
                        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                        'Sec-Ch-Ua-Mobile': '?0',
                        'Sec-Ch-Ua-Platform': '"Windows"',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-User': '?1',
                        'Upgrade-Insecure-Requests': '1',
                        'DNT': '1'
                    },
                    // Uncomment and add your proxy if needed
                    // httpsAgent: new HttpsProxyAgent('http://your-proxy-ip:port'),
                    validateStatus: function (status) {
                        return status >= 200 && status < 500
                    }
                })
                
                if (response.status === 200) {
                    // Check if this is the last page
                    const $ = cheerio.load(response.data)
                    const pagination = $('.pagination')
                    const isLastPage = pagination.length === 0 || !pagination.find('a:contains("Next")').length
                    
                    return {
                        ...response,
                        isLastPage
                    }
                }
                
                retries++
                if (retries < maxRetries) {
                    const backoffDelay = Math.min(1000 * Math.pow(2, retries), 10000)
                    await new Promise(resolve => setTimeout(resolve, backoffDelay))
                }
            } catch (error) {
                console.log(`Attempt ${retries + 1} failed:`, error.message)
                retries++
                if (retries < maxRetries) {
                    const backoffDelay = Math.min(1000 * Math.pow(2, retries), 10000)
                    await new Promise(resolve => setTimeout(resolve, backoffDelay))
                } else {
                    return {
                        status: false,
                        code: error.code || 500,
                        message: error.message || "Failed to fetch data after multiple attempts"
                    }
                }
            }
        }
    }
}

module.exports = Service