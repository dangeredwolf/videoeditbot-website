const http = require("http");
const fs = require("fs");
const path = require("path");
const port = 69;
const filePath = __dirname + "/Twitter";

const {httpCodes, githubURL} = require("./constants.js");
const {config} = require("./config.js");

const defaultHTML = `<!doctype html>
<html>
<head>
<style>
${config.style}
</style>
</head>
<body>`;

const defaultHTMLFooter = `<h3><a href="${githubURL}">videoeditbot ($PORT)</a></h3>`;


function handleErrorPage(code, httpSrc, res) {
	try {
		res.writeHead(code, {'Content-Type': 'text/html'});
	} catch (e) {

	}
	return res.end(
		`${defaultHTML}
		<h1>${code} ${httpCodes[code] || ""}</h1>
		${defaultHTMLFooter.replace("$PORT",httpSrc)}`
	);
}

function redirect(res, url) {
	res.writeHead(308, {"Location": url, "Server": "videoeditbot"});
	res.write(defaultHTML + "You are being redirected to <a href=" + url + ">" + url + "</a>");
	return res.end();
}

function request(req, res) {
	let url = new URL(req.url, "https://example.com");
	if (req.url === "/discord") {
		redirect(res, "https://discord.gg/cHjgTZ2");
	} else if (req.url === "/twitter") {
		redirect(res, "https://twitter.com/VideoEditBot");
	} else if (req.url === "/commands") {
		redirect(res, "https://github.com/GanerCodes/videoEditBot/blob/master/COMMANDS.md");
	} else if (req.url === "/addDiscordBot") {
		redirect(res, "https://discord.com/oauth2/authorize?client_id=704169521509957703&permissions=8&scope=bot");
	} else if (req.url === "/favicon.ico") {
		fs.readFile(__dirname + "/favicon.ico", {}, function(err, data) {
			try {
				res.writeHead(200, {"Content-Type": "image/x-icon", "Server": "videoeditbot"});
				res.write(data);
				return res.end();
			} catch(e) {
				console.error(e);
				handleErrorPage(500, port, res);
			}
		});
	} else if (req.url.match(/\/api\/user\.json\?user\=/g) !== null) {
		let username = url.searchParams.get("user").toLowerCase();
		// let username = req.url.match(/(?<=\/api\/user\.json\?user\=)[a-zA-Z0-9_]+/g)[0].toLowerCase();
		console.log(username);
		fs.readdir(path.join(filePath, username), (err, files) => {
			if (err) {
				handleErrorPage(404, port, res);
				console.log(err);
			}
			try {
				console.log(files);
				let results = [];
				if (files === null || typeof files === "undefined" || files.length < 1) {
					handleErrorPage(204, port, res);
				}
				files.forEach(file => {
					let id = parseInt(file.match(/(?<=_[a-zA-Z0-9_]+_)\d+/));
					if (!isNaN(id)) {
							
					}
				});
			} catch(e) {
				console.error(e);
				handleErrorPage(500, port, res);
			}
		})
	}
	else
	{
		fs.readFile(__dirname + "/index.html", {}, function(err, data) {
			try {
				res.writeHead(200, {"Content-Type": "text/html", "Server": "videoeditbot"});
				res.write(data);
				return res.end();
			} catch(e) {
				console.error(e);
				handleErrorPage(500, port, res);
			}
		});
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