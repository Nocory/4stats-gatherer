const getDataFromDB = require("./getDataFromDB")
const cachedHistory = require("./cachedHistory")
const saveCycleToDB = require("./saveCycleToDB")
const pino = require("../pino")

const init = async () => {
	pino.info("history.init")
	await cachedHistory.init()
	await saveCycleToDB.init()
}

module.exports = {
	init,
	saveCycle : saveCycleToDB.saveCycle,
	getDataFromDB,
	cachedHistory
}