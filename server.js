const http = require("http");
const fs = require("fs");
const path = require("path");
const port = 69;
const filePath = __dirname + "/Twitter";

const { githubURL, assetsURL, defaultHTML, defaultHTMLFooter } = require("./constants.js");

const resultsPerPage = 5;


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
		case "app.css":
			respondWithFile(res, __dirname + "/content/app.css", "text/css");
			break;
		case "app.js":
			respondWithFile(res, __dirname + "/content/app.js", "text/javascript");
			break;
		case "api/user.json":

			// Easter egg if you don't specify a username
			if (!url.searchParams.get("username")) {
				handleErrorPage(418, port, res);
			}

			let username = url.searchParams.get("username").toLowerCase().replace(/\.\./g, ""); // username = username
			let page = parseInt(url.searchParams.get("page")) || 0; // page = page number

			// Read the user's files
			fs.readdir(path.join(filePath, username), (err, files) => {

				if (err) {
					handleErrorPage(404, port, res);
					console.error(err);
				}
				try {
					let results = [];

					// Return 204 No Content if the user exists but does not have files 
					if (files === null || typeof files === "undefined" || files.length < 1) {
						handleErrorPage(204, port, res);
					}

					// Starting file
					let start = page * (resultsPerPage + 1);

					// Goes through each file and generates the id, video file, thumbnail.
					for (let i = start; i < start + resultsPerPage; i++) {

						let file = files[i];

						// Corrupted listings are not returned
						if (!!file) {

							let id = parseInt(file.match(/(?<=_[a-zA-Z0-9_]+_)\d+/));
							let fileObj = {};
							let thumbFile = file.replace(/(?<=\.)[a-z0-9]{3}$/g, "jpg");

							// Listings without a valid ID are not returned
							if (!isNaN(id)) {

								fileObj.id = id;
								fileObj.url = `${assetsURL}/${username}/${file}`;
								fileObj.thumbnailUrl = `${assetsURL}/${username}/thumb/${thumbFile}`;

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
				}
			});
			break;
		default:
			respondWithFile(res, __dirname + "/content/index.html", "text/html");
			break;
	}
}

let server = http.createServer((req, res) => {
	try {
		request(req, res);
	} catch (e) {
		console.error(e);
		handleErrorPage(500, port, res);
	}
});

server.listen(port);