const https = require("https");
const fs = require("fs");
const { requestApi } = require("./api.js")
const { request } = require("./app.js")
const port = 12443;
const portApi = 12444;
const { handleErrorPage } = require("./utils.js");

const serverOptions = {
	key:fs.readFileSync("/etc/ssl/private/videoedit.bot.pem"),
	cert:fs.readFileSync("/etc/ssl/certs/videoedit.bot.pem")
};

let server = https.createServer(serverOptions, (req, res) => {
	try {
		request(req, res);
	} catch (e) {
		console.error(e);
		handleErrorPage(500, port, res);
	}
});

let serverApi = https.createServer(serverOptions, (req, res) => {
	try {
		requestApi(req, res);
	} catch (e) {
		console.error(e);
		handleErrorPage(500, port, res);
	}
});

server.listen(port);
serverApi.listen(portApi);