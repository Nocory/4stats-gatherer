const cachedHistory = require("./cachedHistory")

const config = require("../config")
const db = require("../db")

const pino = require("../pino")

const triggerTime = {}

const init = async () => {
	pino.info("saveCycleToDB.init")

	const now = Date.now()
	let defaultTriggerTime = {
		day : new Date(now).setUTCHours(9,0,0,0),
		hour : new Date(now).setUTCMinutes(30,0,0)
	}
	
	// The initial trigger time should always be in the past, so calculation gets triggered in the first cycle
	if(defaultTriggerTime.day > now) defaultTriggerTime.day -= 1000 * 60 * 60 * 24
	if(defaultTriggerTime.hour > now) defaultTriggerTime.hour -= 1000 * 60 * 60

	for(let board of config.boardList){
		triggerTime[board] = {}
		for(let term of [{
			name: "day",
			advanceTime: 1000 * 60 * 60 * 24 * 2 // advance 2 days since savetime is at the start of the covered period and trigger at the end
		},{
			name: "hour",
			advanceTime: 1000 * 60 * 90
		}]){
			let historyArr = cachedHistory.get(board,term.name)
			let nextTriggerFromHistory = historyArr.length ? historyArr[historyArr.length - 1][0] + term.advanceTime : 0
			//pino.fatal("determine trigger: /%s/ %s %d",board,term.name,Math.max(defaultTriggerTime[term.name],nextTriggerFromHistory))
			//pino.warn("defaultTriggerTime %d",defaultTriggerTime[term.name])
			//pino.warn("nextTriggerFromHistory %d",nextTriggerFromHistory)
			triggerTime[board][term.name] = Math.max(defaultTriggerTime[term.name],nextTriggerFromHistory)
		}
	}
}

const calcLongTerm = (board,term) => {
	pino.trace("saveCycle.calcLongTerm /%s/ %s",board,term.name)

	const termStart = term.triggerTime - term.coverLength

	const cycleHistory = cachedHistory.get(board,"cycle")

	let timeCovered = 0
	let postCount = 0

	for(let i = cycleHistory.length - 1; i >= 0; i--){
		let entry = cycleHistory[i]
		
		const cycleStats = {
			time: entry[0],
			timeCovered: entry[1],
			newPosts: entry[2]
		}

		if(cycleStats.time < termStart) break
		if(!cycleStats.timeCovered || cycleStats.timeCovered > config.maxValidCycleLength) continue

		let under = Math.max(0,termStart - (cycleStats.time - cycleStats.timeCovered))
		let over = Math.max(0,cycleStats.time - term.triggerTime)
		let insideRatio = Math.max(0,(cycleStats.timeCovered - (under+over)) / cycleStats.timeCovered)
		
		timeCovered += cycleStats.timeCovered * insideRatio
		postCount += cycleStats.newPosts * insideRatio
	}

	if(timeCovered > term.coverLength * 0.67){
		let extrapolate = term.coverLength / timeCovered
		
		timeCovered *= extrapolate
		postCount *= extrapolate

		let toSave = [termStart + term.saveOffset,timeCovered,postCount,postCount / (timeCovered / 60000)]

		//pino.warn("day /%s/ final %j",board,{timeCovered,postCount,extrapolate})

		pino.info("history.calcLongTerm /%s/ coverlength: %d result: %j",board,term.coverLength,toSave)

		return toSave
		/*
		return {
			type: 'put',
			key: [board,term.name,toSave[0]],
			value: toSave
		}
		*/
	}
	pino.warn("saveCycle /%s/ %s timeCovered is not long enough %d/%d. This is ok, if the app just started gathering cycleData.",board,term.name,timeCovered,term.coverLength * 0.8)
	return null
}

const saveCycle = (board,cycleData) => {
	let affectedHistory = {}

	// SETUP
	pino.trace("saveCycle /%s/",board)
	const putOps = []

	// CYCLES
	const cycleDBArr = [cycleData.time,cycleData.timeCovered,cycleData.newPosts,cycleData.newThreads,cycleData.latestPostID,cycleData.latestThreadID]
	cachedHistory.add(board,"cycle",cycleDBArr)
	putOps.push({
		type: 'put',
		key: [board,"cycle",cycleData.time],
		value: cycleDBArr
	})

	// LONG TERM HOUR AND DAY
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
		if(cycleData.time >= term.triggerTime){
			let newLongTermData = calcLongTerm(board,term)
			
			if(newLongTermData){
				cachedHistory.add(board,term.name,newLongTermData)
				affectedHistory[term.name] = cachedHistory.get(board,term.name)
				putOps.push({
					type: 'put',
					key: [board,term.name,newLongTermData[0]],
					value: newLongTermData
				})
			}
			triggerTime[board][term.name] += term.coverLength
		}
	} // END FOR
	
	pino.debug("saveCycleToDB /%s/ batching %d %j",board,putOps.length,putOps)
	if(putOps.length){
		db.batch(putOps,err => {
			if (err) pino.error(err)
		})
	}
	return affectedHistory
}

module.exports = {
	init,
	saveCycle
}