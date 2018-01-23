const config = require("../config")
const db = require("../db")
const getDataFromDB = require("./getDataFromDB")
const pino = require("../pino")

const cleanDB = async board => {
	pino.trace("cleanDB for board /%s/",board)
	pino.fatal("cleanDB should not be called right now!!")
	try{
		const now = Date.now()
		let cycleOps = await getDataFromDB(board,"cycle",0,now - config.cycleHistoryLength)
		let hourOps = await getDataFromDB(board,"hour",0,now - config.hourHistoryLength)

		cycleOps = cycleOps.map(el => ({
			type: "del",
			key: ["cycle",board,el[0]]
		}))
		hourOps = hourOps.map(el => ({
			type: "del",
			key: ["hour",board,el[0]]
		}))
		
		pino.warn("cleanDB would delete %j entries",cycleOps.length + hourOps.length)

		/*
		if(cycleOps.length || hourOps.length){
			db.batch([...cycleOps,...hourOps], err => {
				if (err) pino.error(err)
			})
		}
		*/
	}catch(err){
		pino.error(err)
	}
}

//module.exports = cleanDB
module.exports = () => false