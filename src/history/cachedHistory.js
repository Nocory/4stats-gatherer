const getDataFromDB = require("./getDataFromDB")
const config = require("../config")
const pino = require("../pino")

const cachedHistoryArrays = {
	cycle: {},
	hour: {},
	day: {}
}
for(let board of config.boardList){
	cachedHistoryArrays.cycle[board] = []
	cachedHistoryArrays.hour[board] = []
	cachedHistoryArrays.day[board] = []
}

const init = async () => {
	pino.info("cachedHistory.init")
	const allPromises = []
	const now = Date.now()
	for(let board of config.boardList){
		for(let term of ["day","hour","cycle"]){
			let promise = getDataFromDB(board,term,now - config.cachedHistoryLength[term] - (term == "hour" ? 1000 * 60 * 30 : 0),Number.MAX_SAFE_INTEGER)
			promise.then(result=>{
				cachedHistoryArrays[term][board] = result
				//cachedHistoryArrays[board][term] = result.length ? result[0] : [0,Number.MAX_SAFE_INTEGER,0,0,0,0]
			})
			allPromises.push(promise)
		}
	}
	await Promise.all(allPromises)
}

const removeOldEntries = (board,term) => {
	pino.trace("cachedHistory.removeOldEntries /%s/ %s,%j",board,term)
	let removedEntries = 0
	let minDate = Date.now() - config.cachedHistoryLength[term] - (term == "hour" ? 1000 * 60 * 30 : 0)
	while(cachedHistoryArrays[term][board].length && cachedHistoryArrays[term][board][0][0] < minDate){
		cachedHistoryArrays[term][board].shift()
		removedEntries++
	}
	if(removedEntries) pino.debug("cachedHistory.removeOldEntries /%s/ %s, removed %d entries",board,term,removedEntries)
}

const add = (board,term,newEntry) => {
	pino.trace("cachedHistory.add %s,%s,%j",board,term,newEntry)
	const historyLength = cachedHistoryArrays[term][board].length
	const latestTime = historyLength ? cachedHistoryArrays[term][board][historyLength - 1][0] : 0
	if(newEntry[0] > latestTime){
		cachedHistoryArrays[term][board].push(newEntry)
	}
	removeOldEntries(board,term)
}

const get = (board,term) => {
	pino.trace("cachedHistory.get /%s/ %s",board,term)
	return cachedHistoryArrays[term][board]
}

const getLastCycle = board => {
	pino.trace("cachedHistory.getLastCycle /%s/",board)
	let cycleArrLength = cachedHistoryArrays.cycle[board].length
	return cycleArrLength ? cachedHistoryArrays.cycle[board][cycleArrLength - 1] : [0,Number.MAX_SAFE_INTEGER,0,0,0,0]
}

module.exports = {
	init,
	add,
	get,
	getLastCycle,
	getAll : term => cachedHistoryArrays[term]
}