const config = require("./config")
const bandwidthMonitor = require("./bandwidthMonitor")
const pino = require("./pino")

const axios = require("axios").create({
	timeout: 10000,
	headers: {
		'Accept-Encoding': 'gzip',
		"Cache-Control"	: "max-age=0"
	},
	validateStatus: function(status) {
		return status === 200 || status === 304
	}
})
// Gathering info about response sizes and figure out kb/s over the cycle
axios.interceptors.response.use(function(response) {
	bandwidthMonitor.addBytes(parseInt(response.headers["content-length"] || 0))
	return response
}, function(error) {
	return Promise.reject(error)
})

const catalogCache = {}
for(let board of config.boardList){
	catalogCache[board] = {
		etag: "",
		data: []
	}
}

/* eslint-disable no-await-in-loop */
module.exports = async board => {
	for(let attempt = 1; attempt <= 3; attempt++){
		let fetchTime = Date.now()
		pino.trace("getCatalog /%s/ requesting catalog from 4chan API",board)
		try{
			let response = await axios.get(`http://a.4cdn.org/${board}/catalog.json`,{
				headers: {
					"If-None-Match" : catalogCache[board].etag || ""
				}
			})
			pino.trace("getCatalog /%s/ response has status %d",board,response.status)
			if(response.status === 200){
				catalogCache[board].etag = response.headers.etag
				catalogCache[board].data = response.data
			}
			if(response.status === 304){
				response.data = catalogCache[board].data
			}
			return response.data
		}catch(err){
			if(attempt == 3) throw new Error(`Failed the final attempt to fetch catalog of /${board}/`)
			let delay = fetchTime + 5000 - Date.now()
			pino.warn(`${err.message} getCatalog /${board}/ fetching again in ${Math.max(1000,delay)}ms`)
			
			await new Promise(resolve => {
				setTimeout(resolve,delay)
			})
		}
	}
}