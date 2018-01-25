const history = require("./history")
const config = require("./config")
const pino = require("./pino")

// TODO: io on connection

/*
const calculateDevelopment = board => {
	pino.trace("calculateDevelopment for /%s/",board)
	const dailyHistory = history.stats[board].daily
	if(dailyHistory.length < 60) return 1
	let thisMonth = dailyHistory.slice(-30)
	let prevMonth = dailyHistory.slice(-60,-30)
	return thisMonth.reduce((acc,val) => acc + val.postCount,0) / thisMonth.length / (prevMonth.reduce((acc,val) => acc + val.postCount,0) / prevMonth.length)
}
*/
let getTopPPM = (board,hourHistory) => {
	pino.trace("getTopPPM /%s/",board)
	const percentile = 0.90 // percentile has to be >= 0.00 and < 1.00. A value of 1.00 will result in an out of bounds error.
	hourHistory.sort((a,b) => a.postsPerMinute - b.postsPerMinute)
	const resIndex = Math.floor(hourHistory.length * percentile)
	return hourHistory[resIndex].postsPerMinute
}

let getAvgPostsPerDay = (board,hourHistory) => {
	pino.trace("getAvgPostsPerDay /%s/",board)
	let totalPosts = 0
	let totalWeight = 0
	let latestTime = hourHistory[hourHistory.length - 1].time
	for(let entry of hourHistory){
		let weeksAgo = Math.floor((latestTime - entry.time) / (1000*60*60*24*7))
		let weight = Math.max(0,1 - weeksAgo / 6)
		//pino.debug(board,weeksAgo,weight)
		totalPosts += entry.postCount * weight
		totalWeight += weight
	}
	//pino.warn(board,totalPosts / totalWeight * 24)
	return totalPosts / totalWeight * 24
}

module.exports = board => {
	pino.trace("getLiveBoardStats /%s/",board)
	
	let cycleHistory = history.cachedHistory.get(board,"cycle").map(el => ({
		time: el[0],
		timeCovered: el[1],
		postCount: el[2],
		threadCount: el[3]
	}))

	let hourlyHistory = history.cachedHistory.get(board,"hour").map(el => ({
		time: el[0],
		timeCovered: el[1],
		postCount: el[2],
		postsPerMinute: el[3]
	}))

	const lastCycleTime = history.cachedHistory.getLastCycle(board)[0]
	const earliestTime = lastCycleTime - config.boardStatsTime

	pino.debug("getLiveBoardStats /%s/ Cycle and Hourly lenght %j",board,[cycleHistory.length,hourlyHistory.length])

	const research = {
		timeCovered: 0,
		postCount: 0,
		threadCount: 0
	}
	
	for(let i = cycleHistory.length - 1; i >= 0; i--){
		let cycleData = cycleHistory[i]

		if(cycleData.time < earliestTime) break
		if(cycleData.timeCovered > config.maxValidCycleLength) continue
		//const dataStartTime = data.time - data.timeCovered
		const overTime = earliestTime - (cycleData.time - cycleData.timeCovered)
		let validRatio = 1 - overTime / cycleData.timeCovered
		validRatio = Math.max(0,Math.min(validRatio,1)) //Math.max should not be needed really
		
		research.timeCovered += cycleData.timeCovered * validRatio
		research.postCount += cycleData.postCount * validRatio
		research.threadCount += cycleData.threadCount * validRatio
		
		if(config.debugBoardList.includes(board)) pino.debug("getLiveBoardStats %j",{board,validRatio,timeCovered:cycleData.timeCovered})
	}

	if(config.debugBoardList.includes(board)) pino.debug("getLiveBoardStats %j",{board,totalTimeCovered:research.timeCovered})
	

	// only continue if some data has been gathered
	const result = {
		postsPerMinute: -1,
		threadsPerHour: -1,
		avgPostsPerDay: -1,
		topPPM: -1,
		relativeActivity: -1
		//postCountDevelopment: -1 || calculateDevelopment(board)
	}

	if(research.timeCovered){
		result.postsPerMinute = research.postCount / (research.timeCovered / 1000 / 60)
		result.threadsPerHour = research.threadCount / (research.timeCovered / 1000 / 60 / 60)
	}else{
		pino.warn("getLiveBoardStats /%s/ research.timeCovered is 0. This is ok, if this is the first cycle.",board)
	}

	if(hourlyHistory.length){
		result.avgPostsPerDay = getAvgPostsPerDay(board,hourlyHistory)
		result.topPPM = getTopPPM(board,hourlyHistory)
		result.relativeActivity = result.postsPerMinute / result.topPPM
	}

	pino.trace("getLiveBoardStats /%s/ result",board,result)
	
	//liveBoardStats[board] = result
	return result
}