const config = {
	enforcedClientVersion: 10,
	debugLevelDevelopment: "debug", // ["fatal","error","warn","info","debug","trace"]
	debugLevelProduction: "info",

	cycleTime: 1000 * 60 * 5, // time it takes to cycle through the list of boards

	maxValidCycleLength : 1000 * 60 * 20, // cycles that are covering a time longer than this are ignored during stat calculations

	cachedHistoryLength : {
		cycle: 1000 * 60 * 60 * 24 * 3,
		hour: 1000 * 60 * 60 * 24 * 28,
		day: 1000 * 60 * 60 * 24 * 365 * 10,
	},
	
	boardStatsTime: 1000 * 60 * 60, // time to go back in history to calculate board stats
	
	popularThreads: 8,
	//noDubsBoards: ["v","vg","vr"], //handled client side instead
	debugBoardList: ["biz","k","tv","x"],
	boardList: [
		'3',
		'a',
		'aco',
		'adv',
		'an',
		'asp',
		'b',
		'bant',
		'biz',
		'c',
		'cgl',
		'ck',
		'cm',
		'co',
		'd',
		'diy',
		'e',
		'f',
		'fa',
		'fit',
		'g',
		'gd',
		'gif',
		'h',
		'hc',
		'his',
		'hm',
		'hr',
		'i',
		'ic',
		'int',
		'jp',
		'k',
		'lgbt',
		'lit',
		'm',
		'mlp',
		'mu',
		'n',
		'news',
		'o',
		'out',
		'p',
		'po',
		'pol',
		'qa',
		'qst',
		'r',
		'r9k',
		's',
		's4s',
		'sci',
		'soc',
		'sp',
		't',
		'tg',
		'toy',
		'trash',
		'trv',
		'tv',
		'u',
		'v',
		'vg',
		'vip',
		'vp',
		'vr',
		'w',
		'wg',
		'wsg',
		'wsr',
		'x',
		'y'
	]
}

config.boardList.sort()

module.exports = config