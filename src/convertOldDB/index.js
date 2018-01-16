const config = require("../config")

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

const db_old = require('level')('./db_backup_20180115', {
	valueEncoding: "json",
	cacheSize: 8 * 1024 * 1024
})

const db_new = require('level')('./db_converted', {
	keyEncoding: require("bytewise"),
	valueEncoding: normalArrayCodec,
	cacheSize: 8 * 1024 * 1024
})

const promises = []
let ops = []
let counter = 0

for(let board of config.boardList){
	promises.push(new Promise((resolve,reject)=>{
		let boardOps = []
		let readCounter = 0
		db_old.createReadStream({
			gte: `his_${board}_cycles_!`,
			lte: `his_${board}_cycles_~`,
			fillCache: false
		})
			.on("data",data=>{
				//console.log(board,"cycle",data.value)
				readCounter++
				if(++counter % 1000 == 0) console.log(counter,data.key)
				boardOps.push({
					type: "put",
					key: [board,"cycle",data.value.time],
					value: [data.value.time,data.value.timeCovered,data.value.postCount,data.value.threadCount,0,0]
				})
			})
			.on("error",()=>{
				reject()
			})
			.on("end",()=>{
				console.log("finished stream of board",board,"cycle",readCounter)
				db_old.get(`lastCycle_${board}`,(err,val)=>{
					if (err) reject()
					//console.log(val)
					boardOps[boardOps.length - 1].value[4] = val.newestPostID
					boardOps[boardOps.length - 1].value[5] = Math.max(...val.threadIDs)
					console.log(`last ${board} cycle`,boardOps[boardOps.length - 1])
					ops = ops.concat(boardOps)
					resolve()
				})
			})
	}))

	for(let term of [["hourly","hour"],["daily","day"]]){
		promises.push(new Promise((resolve,reject)=>{
			let readCounter = 0
			db_old.createReadStream({
				gte: `his_${board}_${term[0]}_!`,
				lte: `his_${board}_${term[0]}_~`,
				fillCache: false
			})
				.on("data",data=>{
					//console.log(board,term[1],data.value)
					readCounter++
					if(++counter % 1000 == 0) console.log(counter,data.key)
					ops.push({
						type: "put",
						key: [board,term[1],data.value.time],
						value: [data.value.time,data.value.timeCovered,data.value.postCount,data.value.postsPerMinute]
					})
				})
				.on("error",()=>{
					reject()
				})
				.on("end",()=>{
					console.log("finished stream of board",board,term[0],readCounter)
					resolve()
				})
		}))
	}
}

const main = async () => {
	await Promise.all(promises)
	console.log(promises.length,"promises resolved ✓")
	console.log("now batching...")
	await db_new.batch(ops)
	console.log(ops.length,"operations batched ✓")
	db_new.get(['y', 'day', 1514019600000 ]).then(console.log)
	db_new.get(['tv', 'cycle', 1515214567484 ]).then(console.log)
}

main()