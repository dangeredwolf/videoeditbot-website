const { handleErrorPage } = require("./utils.js");
const { defaultHTML } = require("./constants.js");

const fs = require("fs");


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
	// console.log(req);
	// The domain doesn't matter: We just use it to parse query parameters in our URL
	let url = new URL(req.url, "https://beta.videoedit.bot");
	let ipOrigin = req.headers["cf-connecting-ip"];
	console.log(ipOrigin);
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
		default:
			fs.readFile(__dirname + "/content/index.html", {}, function(err, data) {
				try {
					res.writeHead(200, {"Content-Type": "text/html", "Server": "videoeditbot"});
					let page = data.toString();

					// console.log(cleanUrl);

					let isDiscordVideo = cleanUrl.match(/discord\/(?=\d+\/\d+)/g);
					let isUserVideo = cleanUrl.match(/[a-zA-Z0-9_]+(?=\/\d+)/g);
					let isDiscordPage = cleanUrl.match(/discord\/\d+\/?(?!.)/g);
					let isUserPage = cleanUrl.match(/[a-zA-Z0-9_]+\/?(?!.)/g);

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
					page = page.replace(/\$DESCRIPTION\$/g, "Browse your Video Edit Bot creations at videoedit.bot")

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