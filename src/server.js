const pino = require('./pino')

const expressApp = require('express')()
const server = require('http').Server(expressApp)
const io = require('socket.io')(server)

const cors = require("cors")

expressApp.use(cors())
expressApp.use(require('helmet')())
expressApp.use(require('compression')()) // TODO: not needed? Maybe nginx handles it by itself

server.listen(4002)

io.on('connection', socket => {
	let ip = socket.request.headers["x-real-ip"] || socket.request.headers["x-forwarded-for"] || socket.handshake.address
	pino.info("New connection from %s",ip)
	socket.on('disconnect', reason => {
		pino.info("Socket %s disconnected: %s",ip,reason)
	})
})

module.exports = {
	expressApp,
	io
}