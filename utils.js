const http = require("http");

const { defaultHTML, defaultHTMLFooter } = require("./constants.js");

function handleErrorPage(code, httpSrc, res) {
	// idk, sometimes this fails depending on who calls this code.
	try {
		res.writeHead(code, {"Access-Control-Allow-Origin":"https://beta.videoedit.bot", "Content-Type": "text/html"});
	} catch (e) {

	}

	return res.end(
		`${defaultHTML}
		<h1>${code} ${http.STATUS_CODES[code] || ""}</h1>
		${defaultHTMLFooter.replace("$PORT",httpSrc)}`
	);

}

exports.handleErrorPage = handleErrorPage;