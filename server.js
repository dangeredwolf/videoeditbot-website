const http = require("http");
const https = require("https");
const http2 = require("http2");
const fs = require("fs");
const path = require("path");
const port = 12443;
const filePath = "/home/videoeditbot/vebdata/Twitter";

const { githubURL, assetsURL, defaultHTML, defaultHTMLFooter } = require("./constants.js");

const resultsPerPage = 20;

const sysInfo = require("systeminformation");
const diskSelected = 2; // SYSTEM DEPENDENT
const serverOptions = {
	key:fs.readFileSync("/etc/ssl/private/videoedit.bot.pem"),
	cert:fs.readFileSync("/etc/ssl/certs/videoedit.bot.pem")
};

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
	});
	sysInfo.fsSize().then(stats => {
		currentStats.storageCapacity = formatBytes(stats[diskSelected].size);
		currentStats.storageUsage = formatBytes(stats[diskSelected].used);
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
		});
	}, 2000);

	// Check disk usage every minute
	setInterval(() => {
		sysInfo.fsSize().then(stats => {
			currentStats.storageUsage = formatBytes(stats[diskSelected].used);
		});
	}, 60000);

}


function handleErrorPage(code, httpSrc, res) {
	// idk, sometimes this fails depending on who calls this code.
	try {
		res.writeHead(code, {'Content-Type': 'text/html'});
	} catch (e) {

	}

	return res.end(
		`${defaultHTML}
		<h1>${code} ${http.STATUS_CODES[code] || ""}</h1>
		${defaultHTMLFooter.replace("$PORT",httpSrc)}`
	);

}

function redirect(res, url) {
	res.writeHead(308, {"Location": url, "Server": "videoeditbot"});
	res.write(defaultHTML + "You are being redirected to <a href=" + url + ">" + url + "</a>");

	return res.end();
}

function respondWithFile(res, filePath, mimeType) {
	fs.readFile(filePath, {}, function(err, data) {
		try {
			res.writeHead(200, {"Content-Type": mimeType, "Server": "videoeditbot"});
			res.write(data);
			return res.end();
		} catch(e) {
			console.error(e);
			handleErrorPage(500, port, res);
		}
	});
}

function request(req, res) {
	// The domain doesn't matter: We just use it to parse query parameters in our URL
	let url = new URL(req.url, "https://example.com");
	// Remove slash and query string
	let cleanUrl = req.url.substr(1).replace(/\?.+/g, "");

	let username;
	let guildId;
	let fsPath;

	console.log(req.url);

	// Translate legacy URLs to the VideoEditBot Player
	if (cleanUrl.match(/[a-zA-Z0-9_]+\/_[a-zA-Z0-9_\-\.]+\.(mp4|jpg|png)/g) !== null) {
		redirect(res, cleanUrl.match(/\d{5,15}(?=_20)/g)[0]);
		return;
	}

	// Translate legacy discord video URL to the VideoEditBot Player
	if (cleanUrl.match(/@\/\d+\/\/?\d+\.(mp4|jpg|png)/g) !== null) {
		redirect(res, "/discord/" + cleanUrl.match(/(?<=@\/)\d+/g)[0] + "/" + cleanUrl.match(/(?<=@\/\d+\/\/?)\d+/g)[0]);
		return;
	}

	if (cleanUrl.match(/@\/\d+/g) !== null) {
		redirect(res, "/discord/" + cleanUrl.match(/(?<=@\/)\d+/g)[0]);
		return;
	}

	switch(cleanUrl) {
		// Redirects
		case "discord":
			redirect(res, "https://discord.gg/cHjgTZ2");
			break;
		case "twitter":
			redirect(res, "https://twitter.com/VideoEditBot");
			break;
		case "commands":
			redirect(res, "https://github.com/GanerCodes/videoEditBot/blob/master/COMMANDS.md");
			break;
		case "addDiscordBot":
			redirect(res, "https://discord.com/oauth2/authorize?client_id=704169521509957703&permissions=8&scope=bot");
			break;
		// Known files
		case "favicon.ico":
			respondWithFile(res, __dirname + "/content/favicon.ico", "image/x-icon");
			break;
		case "discord.svg":
			respondWithFile(res, __dirname + "/content/discord.svg", "image/svg+xml");
			break;
		case "memory.svg":
			respondWithFile(res, __dirname + "/content/memory.svg", "image/svg+xml");
			break;
		case "app.css":
			respondWithFile(res, __dirname + "/content/app.css", "text/css");
			break;
		case "app.js":
			respondWithFile(res, __dirname + "/content/app.js", "text/javascript");
			break;
		case "api/stats.json":
			res.write(JSON.stringify(currentStats));
			return res.end();
			break;
		case "api/user.json":


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

					// Starting file
					let start = page * (resultsPerPage + 1);

					// Goes through each file and generates the id, video file, thumbnail.
					for (let i = start; i < start + resultsPerPage; i++) {

						let file = files[i];

						// Corrupted listings are not returned
						if (!!file) {

							let id;

							if (username) {
								id = parseInt(file.match(/(?<=_[a-zA-Z0-9_]+_)\d+/));
							} else if (guildId) {
								id = parseInt(file.match(/\d+/));
							}
							let fileObj = {};
							let thumbFile = file.replace(/(?<=\.)[a-z0-9]{3}$/g, "jpg");

							// Listings without a valid ID are not returned
							if (!isNaN(id)) {

								fileObj.id = id;
								if (username) {
									fileObj.url = `${assetsURL}/${username}/${file}`;
									fileObj.thumbnailUrl = `${assetsURL}/${username}/thumb/${thumbFile}`;
								} else if (guildId) {
									fileObj.url = `${assetsURL}/@/${guildId}/${file}`;
									fileObj.thumbnailUrl = `${assetsURL}/@/${guildId}/thumb/${thumbFile}`;
								}

								results.push(fileObj);

							}
						}
					}

					res.writeHead(200, {"Content-Type": "application/json", "Server": "videoeditbot"});
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
		case "api/video.json":
			let videoId = parseInt((url.searchParams.get("video") || "").toLowerCase().replace(/\.\./g, "")); // videoId = video id;
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


									res.writeHead(200, {"Content-Type": "application/json", "Server": "videoeditbot"});
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
			fs.readFile(__dirname + "/content/index.html", {}, function(err, data) {
				try {
					res.writeHead(200, {"Content-Type": "text/html", "Server": "videoeditbot"});
					let page = data.toString();

					// console.log(cleanUrl);

					if (cleanUrl.match(/discord\/\d+\/\d+/g) || cleanUrl.match(/[a-zA-Z0-9_]+\/\d+/g)) {
						// console.log("Video page...");
						page = page.replace(/\$LOCATION\$/, "video");
					} else if (cleanUrl.match(/discord\/\d+\/?(?!.)/g) || cleanUrl.match(/[a-zA-Z0-9_]+\/?(?!.)/g)) {
						// console.log("User page...");
						page = page.replace(/\$LOCATION\$/, "user");
					}  else {
						page = page.replace(/\$LOCATION\$/, "start");
					}

					res.write(page);
					return res.end();
				} catch(e) {
					console.error(e);
					handleErrorPage(500, port, res);
				}
			});
			break;
	}
}

let server = https.createServer(serverOptions, (req, res) => {
	try {
		request(req, res);
	} catch (e) {
		console.error(e);
		handleErrorPage(500, port, res);
	}
});

server.listen(port);

try {
	initialStats();
} catch (e) {
	console.error(e);
}