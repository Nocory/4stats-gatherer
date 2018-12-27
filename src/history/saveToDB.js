const cachedHistory = require("./cachedHistory")
const getDataFromDB = require("./getDataFromDB")

const config = require("../config")
const db = require("../db")

const pino = require("../pino")

const triggerTime = {}

const init = async () => {
	pino.info("saveToDB.init")

	for(let board of config.boardList){
		pino.info(`saveToDB.init - Recreating history for /${board}/`)
		const timestamps = []
		await new Promise((resolve,reject)=>{
			db.createValueStream({
				gte: [board,"cycle",0],
				lte: [board,"cycle",Number.MAX_SAFE_INTEGER],
				fillCache : false
			})
				.on("data",data => {
					if(!triggerTime[board]){
						triggerTime[board] = {
							day : (new Date(data[0]).setUTCHours(9,0,0,0)) + 1000 * 60 * 60 * 24,
							//hour : (new Date(data[0]).setUTCMinutes(30,0,0)) + 1000 * 60 * 60
							hour : (new Date(Date.now()).setUTCMinutes(30,0,0)) - 1000 * 60 * 60 * 24 * 30
						}
						//pino.debug(`Setting tt to ${triggerTime[board].day} - ${triggerTime[board].hour}`)
					}
					timestamps.push(data[0])
				})
				.on("error",reject)
				.on("end",() => {
					resolve()
				})
		})
		for(let time of timestamps){
			await calcLongTerm(board,time)
		}
		pino.info(`saveToDB.init - Done recreating history for /${board}/. days: ${cachedHistory.get(board,"day").length} - hours: ${cachedHistory.get(board,"hour").length}`)
	}
}

const saveCycle = async (board,cycleData) => {
	pino.trace("saveCycle /%s/",board)
	const cycleDBArr = [cycleData.time,cycleData.timeCovered,cycleData.newPosts,cycleData.newThreads,cycleData.latestPostID,cycleData.latestThreadID]
	cachedHistory.add(board,"cycle",cycleDBArr)
	await db.put([board,"cycle",cycleData.time],cycleDBArr)
}

let singleDebug = false;

const calcLongTerm = async (board,cycleTo) => {
	const affectedHistory = {}

	for(let term of [
		{
			name: "hour",
			coverLength: 1000 * 60 * 60,
			triggerTime: triggerTime[board].hour,
			saveOffset: 1000 * 60 * 30
		},{
			name: "day",
			coverLength: 1000 * 60 * 60 * 24,
			triggerTime: triggerTime[board].day,
			saveOffset: 0
		}
	]){
		if(cycleTo >= term.triggerTime){
			// Reset termCycle if cycleTo is more than half a cover length ahead of the current trigger time
			// This can be the case when going through old cycles from the DB where the Gatherer was offline for a longer duration
			while(cycleTo > term.triggerTime + term.coverLength / 2){
				cachedHistory.updateTermCycle(board,term.name,[0,0,0,0,0,0])
				term.triggerTime += term.coverLength
			}
			triggerTime[board][term.name] = term.triggerTime + term.coverLength

			// Get the last cycle and termCycle. Check the DB if there was no fetched catalog for the current cycle.
			let prevTermCycle = cachedHistory.getLastTermCycle(board,term.name)
			let lastCycle = cachedHistory.getLastCycle(board)
			if(lastCycle[0] != cycleTo){
				lastCycle = (await getDataFromDB(board,"cycle",0,cycleTo,1,true))[0]
				lastCycle[0] = cycleTo // Use the current time to make up a new cycle from previous data
			}

			// Early exit if cycle is from an older DB entry that didn't record the latest post number yet.
			if(!lastCycle[4]) break

			// Term cycle can now be updated
			cachedHistory.updateTermCycle(board,term.name,lastCycle)

			// Exit if the previous termCycle is/was zeroed
			if(!prevTermCycle[0]) break

			/*
			// Newest valid cycle is older than the last term? newest cycle and term become the same
			// This probably indicates a 4chan downtime or worse a Gatherer connection issue
			if(lastCycle[0] < prevTermCycle[0]){
				lastCycle = prevTermCycle
				lastCycle[0] = cycleTo
			}
			*/

			const timeCovered = lastCycle[0] - prevTermCycle[0]
			const postCount = (lastCycle[4] - prevTermCycle[4]) * (term.coverLength / timeCovered)
			const ppm = (lastCycle[4] - prevTermCycle[4])  / (timeCovered / 60000)

			const toSave = [(term.triggerTime - term.coverLength) + term.saveOffset,timeCovered,postCount,ppm]
			cachedHistory.add(board,term.name,toSave)
			
			affectedHistory[term.name] = cachedHistory.get(board,term.name)
		}
	}
	affectedHistory.cycle = cachedHistory.get(board,"cycle")
	return affectedHistory
}

module.exports = {
	init,
	saveCycle,
	calcLongTerm
}