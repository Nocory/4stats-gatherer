const pino = require("../pino")

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

/* eslint-disable no-await-in-loop */
const fnc = async board => {
	for(let attempt = 1; attempt <= 3; attempt++){
		let fetchTime = Date.now()
		pino.trace("getCatalog /%s/ requesting catalog from 4chan API",board)
		try{
			let response = await axios.get(`http://a.4cdn.org/${board}/catalog.json`)
			return response.data
		}catch(err){
			if(attempt == 3) throw `Failed the final attempt to fetch catalog of /${board}/`
			let delay = fetchTime + 5000 - Date.now()
			pino.warn(`${err.message} getCatalog /${board}/ fetching again in ${Math.max(1000,delay)}ms`)
			
			await new Promise(resolve => {
				setTimeout(resolve,delay)
			})
		}
	}
}

const main = async () => {
	try{
		await fnc("test")
	}catch(err){
		pino.error(err)
	}
}

main()