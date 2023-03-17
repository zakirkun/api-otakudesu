const { default: Axios } = require("axios");
const cheerio = require("cheerio");
const baseUrl = require("../constant/url");
const qs = require("qs");

const episodeHelper = {
    getNonce: async () => {
        let payload = {
            action: "aa1208d27f29ca340c92c66d1926f13f"
        }

        try {
            let url = `${baseUrl}/wp-admin/admin-ajax.php`
            const response = await Axios.post(url, qs.stringify(payload), {
                headers: {
                    'Origin': baseUrl,
                    'Cookie':'_ga=GA1.2.826878888.1673844093; _gid=GA1.2.1599003702.1674031831; _gat=1',
                    'Referer': baseUrl,
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:101.0) Gecko/20100101 Firefox/101.0',
                    'X-Requested-With': 'XMLHttpRequest',
                    // 'Host': baseUrl,
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                }
            })
            
            return response.data.data
        } catch (error) {
            console.log(error)
            return null
        }
    },
    getUrlAjax: async (content, nonce) => {
        try {
            let _e = JSON.parse(atob(content))
            let payload = {
                ..._e,
                nonce: nonce,
                action: "2a3505c93b0035d3f455df82bf976b84"
            }

            let url = `${baseUrl}/wp-admin/admin-ajax.php`
            const response = await Axios.post(url, qs.stringify(payload), {
                headers: {
                    'Origin': baseUrl,
                    'Cookie':'_ga=GA1.2.826878888.1673844093; _gid=GA1.2.1599003702.1674031831; _gat=1',
                    'Referer': baseUrl,
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:101.0) Gecko/20100101 Firefox/101.0',
                    'X-Requested-With': 'XMLHttpRequest',
                    // 'Host': baseUrl,
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                }
            })
            

            return atob(response.data.data)
        } catch (error) {
            console.log(error.message)
            return null;
        }
    },
    get: async (url) => {
        try {
          const response = await Axios.get(url);
          const $ = cheerio.load(response.data);
          let source1 = $.html().search('"file":');
          let source2 = $.html().search("'file':");
       
          if (source1 !== -1) {
            const end = $.html().indexOf('","');
            return $.html().substring(source1 + 8, end);
          } else if (source2 !== -1) {
            const end = $.html().indexOf("','");
            return $.html().substring(source2 + 8, end);
          }
          return "-";
        } catch (error) {
          return "-";
        }
    },
    notFoundQualityHandler: (res, num) => {
        const $ = cheerio.load(res);
        const download_links = [];
        const element = $('.download')
        let response;
    
        element.filter(function () {
            if ($(this).find('.anime-box > .anime-title').eq(0).text() === '') {
                $(this).find('.yondarkness-box').filter(function () {
                    const quality = $(this).find('.yondarkness-title').eq(num).text().split('[')[1].split(']')[0];
                    const size = $(this).find('.yondarkness-title').eq(num).text().split(']')[1].split('[')[1];
                    $(this).find('.yondarkness-item').eq(num).find('a').each((idx, el) => {
                        const _list = {
                            host: $(el).text(),
                            link: $(el).attr("href"),
                        };
                        download_links.push(_list);
                        response = { quality, size, download_links };
                    })
                })
            } else {
                $(this).find('.anime-box').filter(function () {
                    const quality = $(this).find('.anime-title').eq(num).text().split('[')[1].split(']')[0];
                    const size = $(this).find('.anime-title').eq(num).text().split(']')[1].split('[')[1];
                    $(this).find('.anime-item').eq(num).find('a').each((idx, el) => {
                        const _list = {
                            host: $(el).text(),
                            link: $(el).attr("href"),
                        };
                        download_links.push(_list);
                        response = { quality, size, download_links };
                    })
                })
            }
        })
        return response;
    
    },
    epsQualityFunction: (num, res) => {
        const $ = cheerio.load(res);
        const element = $(".download");
        const download_links = [];
        let response;
    
        element.find("ul").filter(function () {
            const quality = $(this).find("li").eq(num).find("strong").text();
            const size = $(this).find("li").eq(num).find("i").text();
            $(this).find("li").eq(num).find("a").each(function () {
                const _list = {
                    host: $(this).text(),
                    link: $(this).attr("href"),
                };
                download_links.push(_list);
                response = { quality, size, download_links };
    
            });
        });
        return response;
    },
    batchQualityFunction: (num, res) => {
        const $ = cheerio.load(res);
        const element = $(".batchlink");
        const download_links = [];
        let response;
        element.find("ul").filter(function () {
          const quality = $(this).find("li").eq(num).find("strong").text();
          const size = $(this).find("li").eq(num).find("i").text();
          $(this)
            .find("li")
            .eq(num)
            .find("a")
            .each(function () {
              const _list = {
                host: $(this).text(),
                link: $(this).attr("href"),
              };
              download_links.push(_list);
              response = { quality, size, download_links };
            });
        });
        return response;
      }
}

module.exports = episodeHelper
