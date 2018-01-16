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

const main = async () => {

	let ops = []
	let arr= []
	let now = Date.now()
	for(let i = 0; i < 2000; i++){
		arr.push([i,now,now,0.1+0.2])
		ops.push({
			type: "put",
			key: [123,i],
			value: [i,now,now,0.1+0.2]
		})
	}

	console.log(arr.length)
	
	await db.batch(ops)
	console.log("batched")
	console.log(await db.get([123,55]))

	console.time("read_array")
	for(let i = 0; i < 100; i++){
		let result = []
		for(let i = arr.length - 1; i >= 0; i--){
			if(arr[i][0] >= 1990){
				result.push(arr[i])
			}else{
				break
			}
		}
	}
	console.timeEnd("read_array")

	console.time("read_db")
	let promiseArr = []
	for(let i = 0; i < 100; i++){
		let promise = new Promise((resolve,reject) => {
			let result = []
			db.createReadStream({
				gte: [123,1990],
				lte: [123,Number.MAX_SAFE_INTEGER]
			})
				.on("data",data => {
					result.push(data)
				})
				.on("end",resolve)
		})
		promiseArr.push(promise)
	}
	await Promise.all(promiseArr)
	console.timeEnd("read_db")
}

main()