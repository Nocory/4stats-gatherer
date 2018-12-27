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
let getTopPPM = board => {
	pino.trace("getTopPPM /%s/",board)
	const hourHistory = history.cachedHistory.get(board,"hour").slice()
	const percentile = 0.90 // percentile has to be >= 0.00 and < 1.00. A value of 1.00 will result in an out of bounds error.
	hourHistory.sort((a,b) => a[3] - b[3])
	const resIndex = Math.floor(hourHistory.length * percentile)
	return hourHistory[resIndex][3]
}

let getAvgPPMThisTime = async (board,cycleTo) => {
	pino.trace("getAvgPPMThisTime /%s/",board)
	let entries = []
	for(let i = 1; i <= 8; i++){
		entries.push(...(await history.getDataFromDB(board,"cycle",cycleTo - 1000 * 60 * 60 * 24 * i - config.boardStatsTime,cycleTo - 1000 * 60 * 60 * 24 * i + 1000 * 60 * 1)))
	}

	const debugTimeDiff = entries.map((x,index,arr) => {
		if(index){
			return (arr[index][0] - arr[index-1][0]) / (1000 * 60)
		}else{
			return 0
		}
	})

	entries = entries.map(x => x[2] / (x[1] / (1000 * 60)))
	entries.sort((a,b) => a - b)
	
	if(entries.length >= 3){
		entries = entries.slice((entries.length-1) / 2,(-entries.length+1) / 2)
	}

	const result = entries.reduce((acc,val) => acc + val / entries.length,0)
	
	return result
}

const getAvgPostsPerDay = async (board,cycleTo) => {
	pino.trace("getAvgPostsPerDay /%s/",board)
	let lastCycle = history.cachedHistory.getLastCycle(board)
	if(lastCycle[0] != cycleTo){
		lastCycle = await history.getDataFromDB(board,"cycle",0,cycleTo,1,reverse)[0]
		lastCycle[0] = cycleTo
	}

	const weekEntries = [lastCycle]
	for(let i = 1; i <= 4; i++){
		weekEntries.push((await history.getDataFromDB(board,"cycle",cycleTo - 1000 * 60 * 60 * 24 * 7 * i,Number.MAX_SAFE_INTEGER,1))[0])
	}
	
	let totalPosts = 0
	let totalDuration = 0
	let totalWeight = 0
	//console.log(weekEntries.length)
	for(let i = 0; i < weekEntries.length - 1; i++){
		let weight = Math.max(0,1 - i / 6)

		let start = weekEntries[i]
		let end = weekEntries[i+1]

		let postCount = start[4] - end[4]
		let duration = start[0] - end[0]

		totalPosts += postCount * weight
		totalDuration += duration * weight

		if(board == "biz") console.log(i, duration / (1000 * 60 * 60 * 24))
	}
	
	if(board == "biz") console.log(board,totalPosts,totalDuration,(totalDuration / (1000 * 60 * 60 * 24)))
	
	return totalPosts * ((1000 * 60 * 60 * 24) / totalDuration)
}

module.exports = async (board,cycleTo) => {
	pino.trace("getLiveBoardStats /%s/",board)

	const result = {
		postsPerMinute: -0,
		threadsPerHour: -0,
		avgPostsPerDay: -1,
		topPPM: -1,
		relativeActivity: -1
		//postCountDevelopment: -1 || calculateDevelopment(board)
	}

	const cycles = history.cachedHistory.get(board,"cycle")

	let postsCount = 0
	let postDuration = 0

	let threadCount = 0
	let threadDuration = 0

	for(let i = cycles.length - 1; i >= 0; i--){
		if(cycles[i][0] > cycleTo - config.boardStatsTime){
			postsCount += cycles[i][2]
			postDuration += cycles[i][1]
		}
		if(cycles[i][0] > cycleTo - 1000 * 60 * 61){
			threadCount += cycles[i][3]
			threadDuration += cycles[i][1]
		}

		if(cycles[i][0] < cycleTo - 1000 * 60 * 61) break
	}

	if(postsCount){
		result.postsPerMinute = postsCount / (postDuration / (1000 * 60))
	}

	if(threadCount){
		result.threadsPerHour = threadCount * ((1000 * 60 * 60) / threadDuration)
	}
	
	result.avgPostsPerDay = await getAvgPostsPerDay(board,cycleTo)
	result.topPPM = getTopPPM(board)
	result.relativeActivity = result.postsPerMinute / result.topPPM
	result.activityThisToD = result.postsPerMinute / await getAvgPPMThisTime(board,cycleTo)

	pino.trace("getLiveBoardStats /%s/ result",board,result)
	
	return result
}