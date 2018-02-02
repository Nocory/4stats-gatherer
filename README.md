# 4stats-gatherer

The 4stats Gatherer is responsible for fetching information from the public 4chan API, calculating current live stats and keeping a history of past activity.

For history persistency [LevelDB](https://github.com/google/leveldb) is used.

---
[4stats API](http://github.com/nocory/4stats-api) servers can connect to the gatherer and receive a stream of continuously updating information, which are made avilable to any clients, that are connected to that API server.