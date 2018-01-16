//run with node

var array = [Date.now(),0.1+0.2,Date.now(),0.1+0.2,Date.now(),0.1+0.2]
var buffer = Float64Array.from(array).buffer
var nodeBuf = Buffer.from(buffer)
var jsonString = JSON.stringify(array)

const main = () => {
	console.time("pure_Float64Array")
	for(let i = 0; i < 1000000; i++){
		new Float64Array(nodeBuf.buffer)
	}
	console.timeEnd("pure_Float64Array")
	
	console.time("Array_for_Float64Array")
	for(let i = 0; i < 1000000; i++){
		let resultArr = []
		let fa = new Float64Array(nodeBuf.buffer)
		for(let i = 0; i < fa.length; i++){
			resultArr[i] = fa[i]
		}
	}
	console.timeEnd("Array_for_Float64Array")
	
	console.time("Array_forPush_Float64Array")
	for(let i = 0; i < 1000000; i++){
		let resultArr = []
		let fa = new Float64Array(nodeBuf.buffer)
		for(let i = 0; i < fa.length; i++){
			resultArr.push(fa[i])
		}
	}
	console.timeEnd("Array_forPush_Float64Array")
	
	console.time("Array_forOf_Float64Array")
	for(let i = 0; i < 1000000; i++){
		let resultArr = []
		for(let el of new Float64Array(nodeBuf.buffer)){
			resultArr.push(el)
		}
	}
	console.timeEnd("Array_forOf_Float64Array")
	
	console.time("Array_forEach_Float64Array")
	for(let i = 0; i < 1000000; i++){
		let resultArr = []
		let fa = new Float64Array(nodeBuf.buffer)
		fa.forEach(el=>{
			resultArr.push(el)
		})
	}
	console.timeEnd("Array_forEach_Float64Array")
	
	console.time("Array_for_DataView")
	for(let i = 0; i < 1000000; i++){
		let dv = new DataView(nodeBuf.buffer)
		let resultArr = []
		let entries = dv.byteLength / 8
		for(let i = 0;i < entries;i++){
			resultArr.push(dv.getFloat64(i*8,true))
		}
	}
	console.timeEnd("Array_for_DataView")
	
	console.time("Array_for_nodeBuf")
	for(let i = 0; i < 1000000; i++){
		let resultArr = []
		for(let i = 0;i < nodeBuf.length / 8;i++){
			resultArr.push(nodeBuf.readDoubleLE(i*8))
		}
		//console.log(resultArr)
	}
	console.timeEnd("Array_for_nodeBuf")
	
	console.time("Array.from")
	for(let i = 0; i < 1000000; i++){
		Array.from(new Float64Array(nodeBuf.buffer))
	}
	console.timeEnd("Array.from")
	
	console.time("JSON.parse")
	for(let i = 0; i < 1000000; i++){
		JSON.parse(jsonString)
	}
	console.timeEnd("JSON.parse")
}

setTimeout(main,1000)