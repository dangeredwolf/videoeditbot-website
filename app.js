const { handleErrorPage } = require("./utils.js");
const { defaultHTML } = require("./constants.js");
const filePath = "/home/videoeditbot/vebdata/Twitter";

const fs = require("fs");
const path = require("path");

const port = 12443;

const { assetsURL } = require("./constants.js");


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

function searchForVideo(isGuild, username, videoId) {
	let foundVideo = false;
	let fsPath;

	// console.log(isGuild, username, videoId);

	try {

		if (isGuild) {
			fsPath = path.join(filePath, "@", username);
		} else {
			fsPath = path.join(filePath, username);
		}

		let files = fs.readdirSync(fsPath);
		// console.log(files);

			// Goes through files to find the one with the correct ID
		for (let i = 0; i < files.length; i++) {

			let file = files[i];

			// console.log(file, typeof file)

			// Corrupted listings are not returned
			if (typeof file !== "string") {
				// console.log("File doesn't exist")
				continue;
			}

			let id;

			if (isGuild) {
				id = file.match(/\d+/);
			} else {
				id = file.match(/(?<=_[a-zA-Z0-9_]+_)\d+/);
			}

			if (id === null) {
				// console.log("Invalid ID for file " + file)
				continue;
			}

			// console.log(id[0], videoId);

			if ((id[0].toString()) === (videoId).toString()) {
				// console.log("i found a file!!");
				let thumbFile = file.replace(/(?<=\.)[a-z0-9]{3}$/g, "jpg");
				let result = {};
				foundVideo = true;

				result.id = parseInt(id[0]);
				if (isGuild) {
					result.url = `${assetsURL}/@/${username}/${file}`;
					result.thumbnailUrl = `${assetsURL}/@/${username}/thumb/${thumbFile}`;
				} else {
					result.url = `${assetsURL}/${username}/${file}`;
					result.thumbnailUrl = `${assetsURL}/${username}/thumb/${thumbFile}`;
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

				let stats = fs.statSync(path.join(fsPath, file));

				if (stats.mtimeMs) {
					result.timeCreated = stats.mtimeMs;
				} else {
					result.timeCreated = 0;
				}

				return result;

			}

		}
	} catch(e) {
		console.error(e);
	}

	return {};
}

function request(req, res) {
	// console.log(req);
	// The domain doesn't matter: We just use it to parse query parameters in our URL
	let url = new URL(req.url, "https://beta.videoedit.bot");
	let ipOrigin = req.headers["cf-connecting-ip"];
	console.log(ipOrigin);
	console.log(req.url);
	// Remove slash and query string
	let cleanUrl = req.url.substr(1).replace(/\?.+/g, "");

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
		case "eos.js":
			respondWithFile(res, __dirname + "/content/eos.js", "text/javascript");
			break;
		default:
			fs.readFile(__dirname + "/content/index.html", {}, function(err, data) {
				try {
					res.writeHead(200, {"Content-Type": "text/html", "Server": "videoeditbot"});
					let page = data.toString();

					// console.log(cleanUrl);

					let isDiscordVideo = cleanUrl.match(/(?<=discord\/\d+\/)\d+/g);
					let isUserVideo = cleanUrl.match(/(?<=[a-zA-Z0-9_]+\/)\d+/g);
					let isDiscordPage = cleanUrl.match(/discord\/\d+\/?(?!.)/g);
					let isUserPage = cleanUrl.match(/[a-zA-Z0-9_]+\/?(?!.)/g);
					let discordName = cleanUrl.match(/^(?<=discord\/)\d+/g);
					let userName = cleanUrl.match(/^[a-zA-Z0-9_]+/g);

					if (isUserPage) {
						isUserPage[0] = isUserPage[0].replace(/\//g, "")
					}

					if ((isDiscordVideo || isUserVideo) && !isDiscordPage) {
						console.log("Video page...");
						console.log(isDiscordVideo, isUserVideo)
						page = page.replace(/\$LOCATION\$/, "video");
						if (isDiscordVideo) {
							page = page.replace(/\$DESCRIPTION\$/g, "Watch Video from your Discord server");
						} else if (isUserVideo) {
							page = page.replace(/\$DESCRIPTION\$/g, `Watch ${isUserVideo[0]}'s video`);
						}
						let video = searchForVideo(!!isDiscordVideo, discordName ? discordName[0] : userName[0], isDiscordVideo || isUserVideo);

						page = page.replace(/\$VIDEOTAG\$/g, `<meta property="og:${video.type}" content="${video.url}"><meta property="og:${video.type}:secure_url" content="${video.url}">`)

					} else if (isDiscordPage || isUserPage) {
						console.log("User page...");
						console.log(isDiscordPage, isUserPage)
						page = page.replace(/\$LOCATION\$/, "user");

						if (isDiscordPage) {
							page = page.replace(/\$DESCRIPTION\$/g, "View Videos from your Discord server");
						} else if (isUserPage) {
							console.log("Here");
							page = page.replace(/\$DESCRIPTION\$/g, `View ${isUserPage[0]}'s videos`);
						}

					}  else {
						page = page.replace(/\$LOCATION\$/, "start");
					}

					// Fallback if special descriptor not matched
					page = page.replace(/\$DESCRIPTION\$/g, "Browse your Video Edit Bot creations at videoedit.bot").replace(/\$VIDEOTAG\$/g,
						`<meta property="og:image" content="https://github.com/GanerCodes/videoEditBot/raw/master/icons/VideoEditBot256.png"/>
						<meta property="og:image:alt" content="Video Edit Bot logo"/>`)

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

exports.request = request;