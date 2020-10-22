const { handleErrorPage } = require("./utils.js");
const sysInfo = require("systeminformation");
const path = require("path");
const fs = require("fs");

const port = 12444;
const diskSelected = 1; // SYSTEM DEPENDENT
const filePath = "/media/vebdata/Twitter";

const resultsPerPage = 100;

const { assetsURL } = require("./constants.js");

let currentStats = {
	cpuName:undefined,
	cpuCores:undefined,
	cpuUsage:[],
	cpuUsageTotal:undefined,
	storageUsage:undefined,
	storageCapacity:undefined,
	memoryUsage:undefined,
	memoryCapacity:undefined
}

function roundMe(num) {
	return (Math.round(num * 10) / 10)
}

function formatBytes(bytes) {
	if (bytes < 1024) {
		return (bytes) + " bytes"
	} else if (bytes < 1024 ** 2) {
		return (roundMe(bytes / 1024)) + " KiB"
	} else if (bytes < 1024 ** 3) {
		return (roundMe(bytes / 1024 ** 2)) + " MiB"
	} else if (bytes < 1024 ** 4) {
		return (roundMe(bytes / 1024 ** 3)) + " GiB"
	} else {
		return (roundMe(bytes / 1024 ** 4)) + " TiB"
	}
}


function initialStats() {
	sysInfo.cpu().then(stats => {
		currentStats.cpuName = `${stats.manufacturer} ${stats.brand}`;
		currentStats.cpuCores = stats.cores;
	});
	sysInfo.mem().then(stats => {
		currentStats.memoryUsage = formatBytes(stats.used);
		currentStats.memoryCapacity = formatBytes(stats.total);
		currentStats.memoryUsageRaw = stats.used;
		currentStats.memoryCapacityRaw = stats.total;

	});
	sysInfo.fsSize().then(stats => {
		currentStats.storageCapacity = formatBytes(stats[diskSelected].size);
		currentStats.storageUsage = formatBytes(stats[diskSelected].used);
		currentStats.storageCapacityRaw = stats[diskSelected].size;
		currentStats.storageUsageRaw = stats[diskSelected].used;
	});

	autoUpdateStats()
}

function autoUpdateStats() {
	// Check CPU/RAM every 2 seconds
	setInterval(() => {
		sysInfo.currentLoad().then(stats => {
			stats.cpus.forEach((cpu, i) => {
				currentStats.cpuUsage[i] = (Math.round(cpu.load * 10) / 10)
			});
			currentStats.cpuUsageTotal = (Math.round(stats.currentload * 10) / 10);
		})

		sysInfo.mem().then(stats => {
			currentStats.memoryUsage = formatBytes(stats.used);
			currentStats.memoryUsageRaw = stats.used;
		});
	}, 2000);

	// Check disk usage every minute
	setInterval(() => {
		sysInfo.fsSize().then(stats => {
			currentStats.storageUsage = formatBytes(stats[diskSelected].used);
			currentStats.storageUsageRaw = stats[diskSelected].used;
		});
	}, 60000);

}

function requestApi(req, res) {
	let cleanUrl = req.url.substr(1).replace(/\?.+/g, "");
	let url = new URL(req.url, "https://api.videoedit.bot");

	let username;
	let guildId;
	let fsPath;

	let ipOrigin = req.headers["cf-connecting-ip"];
	console.log(ipOrigin);
	console.log(req.url);

	switch(cleanUrl) {
		case "1/stats.json":
			res.writeHead(200, {"Access-Control-Allow-Origin":"https://beta.videoedit.bot", "Content-Type": "application/json", "Server":"videoeditbot"})
			res.write(JSON.stringify(currentStats));
			return res.end();
			break;
		case "1/user.json":


			if (url.searchParams.get("guild") && !isNaN(parseInt(url.searchParams.get("guild")))) {
				guildId = url.searchParams.get("guild").toLowerCase().replace(/\.\./g, "");
				fsPath = path.join(filePath, "@", guildId);
			} else if (url.searchParams.get("username")) {
				username = url.searchParams.get("username").toLowerCase().replace(/\.\./g, "");
				fsPath = path.join(filePath, username);
			} else {
				// Easter egg if you don't specify arguments
				handleErrorPage(418, port, res);
				return;
			}

			let page = parseInt(url.searchParams.get("page")) || 0; // page = page number

			// Read the user's files
			fs.readdir(fsPath, (err, files) => {

				// console.log(files);

				let filesReturned = 0;

				if (err) {
					handleErrorPage(404, port, res);
					console.error(err);
				}
				try {
					let results = [];

					// Return 204 No Content if the user exists but does not have files 
					if (files === null || typeof files === "undefined" || files.length < 1) {
						return handleErrorPage(204, port, res);
					}

					// Go from new to old, rather than old to new
					files.reverse();

					let thumbOffset = 0;

					try {
						thumbOffset = fs.readdirSync(path.join(fsPath, "thumb")) ? 1 : 0;
					} catch (e) {}

					// Starting file, dirty hack to ignore thumbs folder
					let start = thumbOffset + (page * resultsPerPage);

					// Goes through each file and generates the id, video file, thumbnail.
					for (let i = start; (i + 1) <= start + resultsPerPage; i++) {

						let file = files[i];

						// Corrupted listings are not returned
						if (!!file) {

							let id;

							if (username) {
								id = parseInt(file.match(/(?<=_[a-zA-Z0-9_]+_)\d+/));
								// console.log(file);
							} else if (guildId) {
								id = parseInt(file.match(/\d+/));
							} else {
								console.log(file);
							}
							let fileObj = {};
							let thumbFile = file.replace(/(?<=\.)[a-z0-9]{3}$/g, "jpg");

							// Listings without a valid ID are not returned
							if (!isNaN(id)) {

								filesReturned++;

								fileObj.id = id;
								if (username) {
									fileObj.url = `${assetsURL}/${username}/${file}`;
									fileObj.thumbnailUrl = `${assetsURL}/${username}/thumb/${thumbFile}`;
								} else if (guildId) {
									fileObj.url = `${assetsURL}/@/${guildId}/${file}`;
									fileObj.thumbnailUrl = `${assetsURL}/@/${guildId}/thumb/${thumbFile}`;
								}

								fileObj.extension = file.match(/(?<=\.)[a-z0-9]{3}$/g)[0];

								switch(fileObj.extension) {
									case "png":
									case "jpg":
									case "jpeg":
									case "gif":
									case "webm":
										fileObj.type = "image";
										break;
									case "mp4":
									case "mov":
									case "avi":
										fileObj.type = "video";
										break;
								}

								results.push(fileObj);

							} else {
								// console.log("Invalid ID " + id)
							}
						} else {
							// console.log("A file was corrupted or not found (" + i + ")")
						}
					}

					res.writeHead(200, {"Access-Control-Allow-Origin":"https://beta.videoedit.bot", "X-Page-Length": resultsPerPage, "X-Video-Count": files.length - thumbOffset, "Content-Type": "application/json", "Server": "videoeditbot"});
					// Convert to JSON for results
					res.write(JSON.stringify(results));

					return res.end();

				} catch(e) {
					console.error(e);
					handleErrorPage(500, port, res);
					return;
				}
			});
			break;
		case "1/video.json":
			let rawVideoId = url.searchParams.get("video") || "";

			if (rawVideoId.match(/_[a-zA-Z0-9_\-\.]+\.(mp4|jpg|png)/g) !== null) {
				rawVideoId = rawVideoId.match(/\d{5,15}(?=_20)/g)[0];
			}
			console.log(rawVideoId)
			let videoId = parseInt(rawVideoId.toLowerCase().replace(/\.\./g, "")); // videoId = video id;
			let foundVideo = false;

			// console.log(username,videoId);

			if (url.searchParams.get("guild") && !isNaN(parseInt(url.searchParams.get("guild")))) {
				guildId = url.searchParams.get("guild").toLowerCase().replace(/\.\./g, "");
				fsPath = path.join(filePath, "@", guildId);
			} else if (url.searchParams.get("username")) {
				username = url.searchParams.get("username").toLowerCase().replace(/\.\./g, "");
				fsPath = path.join(filePath, username);
			} else {
				// Easter egg if you don't specify arguments
				handleErrorPage(418, port, res);
				return;
			}

			fs.readdir(fsPath, (err, files) => {

				if (err) {
					handleErrorPage(404, port, res);
					console.error(err);
					return;
				}
				try {

					// Goes through files to find the one with the correct ID
					for (let i = 0; i < files.length; i++) {

						let file = files[i];

						// Corrupted listings are not returned
						if (!!file) {

							let id;

							if (username) {
								id = file.match(/(?<=_[a-zA-Z0-9_]+_)\d+/);
							} else if (guildId) {
								id = file.match(/\d+/);
							}

							if (id === null) {
								continue;
							}

							// Only the matching videoId will be returned
							// console.log(id[0], videoId);

							// console.log((id[0].toString()), "==", (videoId).toString(), "?", ((id[0].toString()) === (videoId).toString()));

							if ((id[0].toString()) === (videoId).toString()) {
								let thumbFile = file.replace(/(?<=\.)[a-z0-9]{3}$/g, "jpg");
								let result = {};
								foundVideo = true;

								result.id = parseInt(id[0]);
								if (username) {
									result.url = `${assetsURL}/${username}/${file}`;
									result.thumbnailUrl = `${assetsURL}/${username}/thumb/${thumbFile}`;
								} else if (guildId) {
									result.url = `${assetsURL}/@/${guildId}/${file}`;
									result.thumbnailUrl = `${assetsURL}/@/${guildId}/thumb/${thumbFile}`;
								}

								result.extension = file.match(/(?<=\.)[a-z0-9]{3}$/g)[0];

								switch(result.extension) {
									case "png":
									case "jpg":
									case "jpeg":
									case "gif":
									case "webm":
										result.type = "image";
										break;
									case "mp4":
									case "mov":
									case "avi":
										result.type = "video";
										break;
								}

								// console.log(result);

								fs.stat(path.join(fsPath, file), function(err, stats) {
									if (err) {
										result.timeCreated = 0;
									} else {
										if (stats.mtimeMs) {
											result.timeCreated = stats.mtimeMs;
										} else {
											result.timeCreated = 0;
										}
									}


									res.writeHead(200, {"Access-Control-Allow-Origin":"https://beta.videoedit.bot", "Content-Type": "application/json", "Server": "videoeditbot"});
									// Convert to JSON for results
									res.end(JSON.stringify(result));

								});

							}
						}
					}


					if (!foundVideo) {
						handleErrorPage(404, port, res);
					}

				} catch(e) {
					console.error(e);
					handleErrorPage(500, port, res);
					return;
				}

			});
			break;
		default:
			return handleErrorPage(404, port, res);
			break;
	}
}

try {
	initialStats();
} catch (e) {
	console.error(e);
}

exports.requestApi = requestApi;

