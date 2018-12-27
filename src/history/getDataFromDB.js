const db = require("../db")
const pino = require("../pino")

module.exports = (board,term,from = 0,to = Number.MAX_SAFE_INTEGER,limit = -1,reverse = false)=>{
	pino.trace("getDataFromDB -> %j",{board,term,from,to,limit,reverse})
	return new Promise((resolve,reject)=>{
		const resultArr = []
		db.createValueStream({
			gte: [board,term,from],
			lte: [board,term,to],
			limit,
			reverse,
			fillCache : true
		})
			.on("data",data=>{
				resultArr.push(data)
			})
			.on("error",reject)
			.on("end",()=>{
				resolve(resultArr)
			})
	})
}