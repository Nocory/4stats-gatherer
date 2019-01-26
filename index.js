const config = require("./src/config")
const pino = require("./src/pino")
const bandwidthMonitor = require("./src/bandwidthMonitor")
const getLiveBoardStats = require("./src/getLiveBoardStats")
const getActiveThreads = require("./src/getActiveThreads")
const history = require("./src/history")
const {io,expressApp} = require("./src/server")

const getCatalog = require("./src/getCatalog")
const processCatalog = require("./src/processCatalog")

const liveBoardStats = {}
const activeThreads = {}

for(let board of config.boardList){
	liveBoardStats[board] = {}
	activeThreads[board] = []
}

const initAPI = () => {
	pino.info("Setting up API")
	io.on("connect",socket => {
		socket.emit("initialData",{
			liveBoardStats,
			activeThreads,
			history : {
				cycle : history.cachedHistory.getAll("cycle"),
				hour : history.cachedHistory.getAll("hour"),
				day : history.cachedHistory.getAll("day"),
			}
		})
	})
	
	expressApp.get('/initialData', function (req, res) {
		pino.debug("expressApp.get /initialData from: %s",req.get('x-real-ip') || req.ip)
		res.send({
			liveBoardStats,
			activeThreads,
			history : {
				cycle : history.cachedHistory.getAll("cycle"),
				hour : history.cachedHistory.getAll("hour"),
				day : history.cachedHistory.getAll("day"),
			}
		})
	})

	// send data to all distributor-clients, that might already have connected earlier
	io.emit("initialData",{
		liveBoardStats,
		activeThreads,
		history : {
			cycle : history.cachedHistory.getAll("cycle"),
			hour : history.cachedHistory.getAll("hour"),
			day : history.cachedHistory.getAll("day")
		}
	})
}

/*
expressApp.get('/boardStats', function (req, res) {
	pino.debug("expressApp.get /boardStats from: %s query: %s",req.get('x-real-ip') || req.ip,req.query.board)
	res.send(liveBoardStats[req.query.board] || [])
})

expressApp.get('/allboardStats', function (req, res) {
	pino.debug("expressApp.get /boardStats from: %s",req.get('x-real-ip') || req.ip)
	res.send(liveBoardStats)
})

expressApp.get('/activeThreads', function (req, res) {
	pino.debug("expressApp.get /activeThreads from: %s query: %s",req.get('x-real-ip') || req.ip,req.query.board)
	res.send(activeThreads[req.query.board] || [])
})

expressApp.get('/allActiveThreads', function (req, res) {
	pino.debug("expressApp.get /allActiveThreads from: %s",req.get('x-real-ip') || req.ip)
	res.send(activeThreads)
})
*/

let boardIndex = 0

const processBoard = async () => {
	if (boardIndex == 0) bandwidthMonitor.startNewCycle()
	let board = config.boardList[boardIndex]
	boardIndex = (boardIndex + 1) % config.boardList.length

	let catalogResult = {}

	try{
		pino.trace("- - - - - /%s/ START - - - - -",board)
		const catalog = await getCatalog(board)
		catalogResult = processCatalog(board,catalog)
		await history.saveCycle(board,catalogResult.cycleData)
		//if(Object.keys(toEmit.history).length) pino.debug("io.emit /%s/ history keys: %j",board,Object.keys(toEmit.history))
		pino.trace("- - - - - /%s/ END - - - - - -",board)
	}catch(err){
		pino.error(err)
		io.emit("gathererError",err)
	}
	// This always runs, even if 4chan servers error out
	// TODO: check if time crossed the hour/day mark and calculate a new longterm entry
	//affectedHistory = history.saveCycle(board,catalogResult.cycleData)
	try{
		const affectedHistory = await history.calcLongTerm(board,catalogResult.cycleData ? catalogResult.cycleData.time : Date.now())
		
		const newBoardStats = await getLiveBoardStats(board,catalogResult.cycleData ? catalogResult.cycleData.time : Date.now())
		newBoardStats.imagesPerReply = catalogResult.cycleData ? catalogResult.cycleData.imagesPerReply : liveBoardStats[board].imagesPerReply
		liveBoardStats[board] = newBoardStats
		
		const newActiveThreads = catalogResult.threadList ? getActiveThreads(catalogResult.threadList) : activeThreads[board]
		activeThreads[board] = newActiveThreads
		
		io.emit("update",{
			board,
			newBoardStats,
			newActiveThreads,
			history: affectedHistory
		})
	}catch(err){
		pino.error(err)
		io.emit("gathererError",err.message)
	}
}

const main = async () => {

	const oldestLastCycle = {
		board: "NONE",
		time: Number.MAX_SAFE_INTEGER
	}

	try{
		await history.init()
		pino.info("Now determining oldest stats and calculating stats for all boards")
		for(let board of config.boardList){
			let cycleTime = history.cachedHistory.getLastCycle(board)[0]
			if(cycleTime < oldestLastCycle.time){
				oldestLastCycle.board = board
				oldestLastCycle.time = cycleTime
			}
			liveBoardStats[board] = await getLiveBoardStats(board,cycleTime)
		}
		boardIndex = Math.max(0, config.boardList.indexOf(oldestLastCycle.board))
		pino.info("Finished determining oldest board and calculating stats for all boards")
		pino.info("Starting from board /%s/",oldestLastCycle.board)
		
		initAPI()
		
		const delayBetweenBoards = Math.max(2000,config.cycleTime / config.boardList.length)
		setInterval(processBoard,delayBetweenBoards)
	}catch(err){
		pino.error(err)
	}
	// // //getBoard(Math.max(0, config.boardList.indexOf(oldestLastCycle.board))) // still start from 0 in case board is no longer in the configuration
}

pino.info("process.env.NODE_ENV is %s",process.env.NODE_ENV)
pino.info("process.env.DEBUG is %s",process.env.DEBUG)
pino.info("process.env.PINO_LEVEL is %s",process.env.PINO_LEVEL)

main()