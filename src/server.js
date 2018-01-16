const pino = require('./pino')

const app = require('express')()
const server = require('http').Server(app)
const io = require('socket.io')(server)

const cors = require("cors")

app.use(cors())
app.use(require('helmet')())
app.use(require('compression')()) // TODO: not needed? Maybe nginx handles it by itself

server.listen(4002)

io.on('connection', socket => {
	let ip = socket.request.headers["x-real-ip"] || socket.request.headers["x-forwarded-for"] || socket.handshake.address
	pino.info("New connection from %s",ip)
	socket.on('disconnect', reason => {
		pino.info("Socket %s disconnected: %s",ip,reason)
	})
})

module.exports = {
	expressApp : app,
	io
}