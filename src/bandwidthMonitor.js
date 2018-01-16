const pino = require("./pino")

let bytesReceived = 0
let initTime = Date.now()

let addBytes = bytes => {
	pino.trace("bandwidthMonitor.addBytes +%dB. Now %dkB",bytes,Math.round(bytesReceived / 1000))
	bytesReceived += bytes
}

let startNewCycle = () => {
	let now = Date.now()
	let elapsedSeconds = (now - initTime) / 1000
	let kBPerSecond = (bytesReceived / 1000 / elapsedSeconds).toFixed(2)
	pino.info("bandwidthMonitor.startNewCycle average bandwidth during last cycle was %dkB/s",kBPerSecond)
	initTime = now
	bytesReceived = 0
}

module.exports = {
	addBytes,
	startNewCycle
}