/*
const floatArray = {
	type: "Float64BufferCodec",
	encode: function (data) {
		return Buffer.from(Float64Array.from(data).buffer)
	},
	decode: function (data) {
		return new Float64Array(data.buffer)
	},
	buffer: true
}
*/

// see dbPerformanceTest.js
const normalArrayCodec = {
	type: "Float64BufferCodec",
	encode: function (data) {
		return Buffer.from(Float64Array.from(data).buffer)
	},
	decode: function (data) {
		let resultArr = []
		let fa = new Float64Array(data.buffer)
		for(let i = 0; i < fa.length; i++){
			resultArr[i] = fa[i]
		}
		return resultArr
	},
	buffer: true
}

const db = require('level')('./db', {
	keyEncoding: require("bytewise"),
	//valueEncoding: "json",
	valueEncoding: normalArrayCodec,
	cacheSize: 256 * 1024 * 1024
})

module.exports = db