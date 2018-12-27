const getDataFromDB = require("./getDataFromDB")
const cachedHistory = require("./cachedHistory")
const saveToDB = require("./saveToDB")
const pino = require("../pino")

const init = async () => {
	pino.info("history.init")
	await saveToDB.init()
	await cachedHistory.init()
}

module.exports = {
	init,
	saveCycle : saveToDB.saveCycle,
	calcLongTerm : saveToDB.calcLongTerm,
	getDataFromDB,
	cachedHistory
}