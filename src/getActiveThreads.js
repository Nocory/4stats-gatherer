const pino = require("./pino")
const config = require("./config")

module.exports = threadList => {
	pino.trace("getActiveThreads")
	let result = threadList.sort((a, b) => a.sticky ? -1 : b.postsPerMinute - a.postsPerMinute).slice(0,config.popularThreads).map(thread => ({
		...thread,
		sub : thread.sub.replace(/<.+?>/gi, ""),
		com : thread.com.replace(/(<br>)+/gi, "<br>").replace(/<(?!br).+?>/gi, "")
	}))

	return result
}