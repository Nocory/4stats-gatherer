const getDataFromDB = require("./getDataFromDB")
const config = require("../config")
const pino = require("../pino")

const cachedHistoryArrays = {
	cycle: {},
	hour: {},
	day: {}
}

const cachedTermCycles = {
	cycle: {},
	hour: {},
	day: {}
}

for(let board of config.boardList){
	cachedHistoryArrays.cycle[board] = []
	cachedHistoryArrays.hour[board] = []
	cachedHistoryArrays.day[board] = []

	cachedTermCycles.cycle[board] = [0,0,0,0,0,0]
	cachedTermCycles.hour[board] = [0,0,0,0,0,0]
	cachedTermCycles.day[board] = [0,0,0,0,0,0]
}

const init = async () => {
	pino.info("cachedHistory.init")
	//const allPromises = []
	const now = Date.now()
	for(let board of config.boardList){
		const firstHourEntryTime = cachedHistoryArrays.hour[board].length ? cachedHistoryArrays.hour[board][0][0] - 1 : Math.MAX_SAFE_INTEGER
		const firstDayEntryTime = cachedHistoryArrays.day[board].length ? cachedHistoryArrays.day[board][0][0] - 1 : Math.MAX_SAFE_INTEGER
		cachedHistoryArrays["cycle"][board] = await getDataFromDB(board,"cycle",now - config.cachedHistoryLength["cycle"])
		cachedHistoryArrays["hour"][board].unshift(...(await getDataFromDB(board,"hour",now - config.cachedHistoryLength["hour"],firstHourEntryTime)))
		cachedHistoryArrays["day"][board].unshift(...(await getDataFromDB(board,"day",now - config.cachedHistoryLength["day"],firstDayEntryTime)))
		//cachedHistoryArrays["hour"][board] = [...(await getDataFromDB(board,"hour",now - config.cachedHistoryLength["hour"],firstHourEntryTime)),cachedHistoryArrays["hour"][board]]
		//cachedHistoryArrays["day"][board] = [...(await getDataFromDB(board,"day",now - config.cachedHistoryLength["day"],firstDayEntryTime)),cachedHistoryArrays["day"][board]]
	}
}

const removeOldEntries = (board,term) => {
	pino.trace("cachedHistory.removeOldEntries /%s/ %s,%j",board,term)
	let removedEntries = 0
	let minDate = Date.now() - config.cachedHistoryLength[term] - (term == "hour" ? 1000 * 60 * 30 : 0)
	while(cachedHistoryArrays[term][board].length && cachedHistoryArrays[term][board][0][0] < minDate){
		cachedHistoryArrays[term][board].shift()
		removedEntries++
	}
	if(removedEntries) pino.trace("cachedHistory.removeOldEntries /%s/ %s, removed %d entries",board,term,removedEntries)
}

const add = (board,term,newEntry) => {
	pino.trace("cachedHistory.add %s,%s,%j",board,term,newEntry)
	/*
	const historyLength = cachedHistoryArrays[term][board].length
	const latestTime = historyLength ? cachedHistoryArrays[term][board][historyLength - 1][0] : 0
	if(["hour","day"].includes(term)){
		if(newEntry[0] > latestTime){
			pino.debug("later")
			cachedHistoryArrays[term][board].push(newEntry)
		}else{
			const foundIndex = cachedHistoryArrays[term][board].findIndex(el => el[0] == newEntry[0])
			pino.debug("foundIndex",foundIndex)
			if(foundIndex != 0){
				cachedHistoryArrays[term][board][foundIndex] = newEntry
			}
		}
	}
	*/
	cachedHistoryArrays[term][board].push(newEntry)

	//pino.debug("now remove")
	removeOldEntries(board,term)
}

const get = (board,term) => {
	pino.trace("cachedHistory.get /%s/ %s",board,term)
	return cachedHistoryArrays[term][board]
}

const getLastTermCycle = (board,term) => {
	pino.trace("cachedHistory.getLast /%s/ %s",board,term)
	let arrLength = cachedTermCycles[term][board].length
	return arrLength ? cachedTermCycles[term][board] : [0,Number.MAX_SAFE_INTEGER,0,0,0,0]
}

const updateTermCycle = (board,term,cycle) => {
	pino.trace("cachedHistory.updateTermCycle /%s/ %s",board,term,cycle)
	cachedTermCycles[term][board] = cycle
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
	getLastTermCycle,
	updateTermCycle,
	getLastCycle,
	getAll : term => cachedHistoryArrays[term]
}