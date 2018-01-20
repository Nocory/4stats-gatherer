const history = require("./history")
const pino = require("./pino")

module.exports = (board, catalog) => {
	pino.trace("processCatalog /%s/",board)

	const lastCycleArr = history.cachedHistory.getLastCycle(board)
	const lastCycle =  {
		time: lastCycleArr[0],
		timeCovered: lastCycleArr[1],
		newPosts: lastCycleArr[2],
		newThreads: lastCycleArr[3],
		latestPostID: lastCycleArr[4],
		latestThreadID: lastCycleArr[5]
	}

	const cycleData = {
		time: Date.now(),
		timeCovered: 0,
		newPosts: 0,
		newThreads: 0,
		latestPostID: 0,
		latestThreadID: 0,
		imagesPerReply: 0
	}
	cycleData.timeCovered = cycleData.time - lastCycle.time

	let totalReplyCount = 0
	let totalImageCount = 0
	const threadList = []
	const prevlatestThreadID = lastCycle.latestThreadID || lastCycle.latestPostID
	
	for (const page of catalog) {
		for(const thread of page.threads){
			if (!thread.closed) {
				if(thread.no > prevlatestThreadID) cycleData.newThreads++
				cycleData.latestPostID = Math.max(cycleData.latestPostID, thread.last_replies ? thread.last_replies[thread.last_replies.length - 1].no : thread.no)
				cycleData.latestThreadID = Math.max(thread.no,cycleData.latestThreadID)

				threadList.push({
					no: thread.no,
					age: cycleData.time - thread.tim,
					postsPerMinute: cycleData.time - thread.tim > 300000 && thread.replies > 5 ? thread.replies / ((cycleData.time - thread.tim) / 60000) : -1, //dont add ultra-new threads to activity list
					replies: thread.sticky ? 9001 : thread.replies,
					sub: thread.sub || "",
					com: thread.com || "",
					image: `https://i.4cdn.org/${board}/${thread.tim}s.jpg`
				})
				totalReplyCount += thread.replies
				totalImageCount += thread.images
			}
		}
	}

	cycleData.imagesPerReply = totalImageCount / totalReplyCount

	// sometimes when a post on very slow boards os removed, the post rate could become negative
	cycleData.latestPostID = Math.max(cycleData.latestPostID,lastCycle.latestPostID)
	cycleData.latestThreadID = Math.max(cycleData.latestThreadID,lastCycle.latestThreadID)
	
	cycleData.newPosts = cycleData.latestPostID - lastCycle.latestPostID

	return {
		cycleData,
		threadList
	}
}