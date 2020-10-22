const https = require("https");
const http= require("http");
const fs = require("fs");
const { requestApi } = require("./api.js")
const { request } = require("./app.js")
const port = 12443;
const portApi = 12444;
const portHttp = 1280;
const portApiHttp = 1281;
const { handleErrorPage } = require("./utils.js");
let serverOptions;

try {
	serverOptions = {
		key:fs.readFileSync("/etc/ssl/private/videoedit.bot.pem"),
		cert:fs.readFileSync("/etc/ssl/certs/videoedit.bot.pem")
	};
} catch(e) {
	console.error(e);
}

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

let serverHttp = http.createServer(serverOptions, (req, res) => {
	try {
		request(req, res);
	} catch (e) {
		console.error(e);
		handleErrorPage(500, port, res);
	}
});

let serverApiHttp = http.createServer(serverOptions, (req, res) => {
	try {
		requestApi(req, res);
	} catch (e) {
		console.error(e);
		handleErrorPage(500, port, res);
	}
});

server.listen(port);
serverApi.listen(portApi);
serverHttp.listen(portHttp);
serverApiHttp.listen(portApiHttp);