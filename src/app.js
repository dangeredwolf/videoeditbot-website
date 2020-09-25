
let currentUsername;
let idData = {};
let pageCount = 0;
let reachedEnd = false;
const spinner = `<div class="preloader-wrapper active"><div class="spinner-layer"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div>`

function make(tagName) {
	return $(document.createElement(tagName));
}

function loadVideos() {
	$(".yourVideos>.preloader-wrapper").removeClass("hidden");

	$.ajax({
		url:location.origin + "/api/user.json?username=" + normalizeUsername(currentUsername) + "&page=" + pageCount,
		accepts: [
			"application/json"
		]
	}).done((data, status) => {
		console.log(data);

		if (data.length === 0) {
			$(".yourVideos>.preloader-wrapper").addClass("hidden");
			reachedEnd = true;
		}

		data.forEach(file => {
			idData[file.id] = file;

			let article = make("article").addClass("waves-effect").addClass("waves-dark");

			$(".yourVideos>.scroller").append(
				article.append(
					make("img").attr("src", file.thumbnailUrl)
				).click(() => {
					history.pushState({}, undefined, "/" + currentUsername + "/" + file.id);
					loadVideo(file.id)
				})
			);

			Waves.attach(article[0], null);
		})

		pageCount++;


		setTimeout(() => {
			userScrollCheck();
		}, 100)
	}).fail((response, error, responseText) => {
		switch(response.status) {
			case 404:
				createAlert("User not found", "Please make sure you entered your username correctly and try again.", undefined, goHome);
				break;
			case 500:
				createAlert("Server error", "A server error occurred while trying to fetch your content. Please try again later.", undefined, goHome);
				break;
			default:
				createAlert("Unknown error", responseText, undefined, goHome);
				break;
		}
	})

	// fetch(location.origin + "/api/user.json?username=" + normalizeUsername(currentUsername) + "&page=" + pageCount)
	// 	.then(response => response.json())
	// 	.then(data => {
	// 		console.log(data);

	// 		if (data.length === 0) {
	// 			reachedEnd = true;
	// 		}

	// 		data.forEach(file => {
	// 			idData[file.id] = file;

	// 			let article = make("article").addClass("waves-effect").addClass("waves-dark");

	// 			$(".yourVideos>.scroller").append(
	// 				article.append(
	// 					make("img").attr("src", file.thumbnailUrl)
	// 				)
	// 			);

	// 			Waves.attach(article[0], null);
	// 		})

	// 		pageCount++;


	// 		setTimeout(() => {
	// 			userScrollCheck();
	// 		}, 100)
	// 	}).catch(e => {
	// 		console.log(e);
	// 	});
}

function setUsername(name) {
	currentUsername = name;
	pageCount = 0;
	reachedEnd = false;
	if ($("html").attr("data-location") === "start") {
		$("html").attr("data-location", "user")
	}
	$(".videoThumbnail").remove();
	loadVideos();
}

function userScrollCheck() {
	if (reachedEnd) {
		return;
	}
	if($(".yourVideos").scrollTop() + $(".yourVideos").innerHeight() + 50 >= $(".yourVideos")[0].scrollHeight) {
		loadVideos();
	}
}

function createAlert(title, message, buttonText, callback) {
	let button =
		make("button").addClass("alertDismiss waves-effect waves-dark").html("OK" || buttonText).click(() => {
			$(".alertContainer").addClass("hidden");
			$(".alert").addClass("hidden");
			setTimeout(() => {
				$(".alert").remove();
			}, 500);
			if (typeof callback === "function") {
				callback();
			}
		});

	$(".alertContainer").removeClass("hidden").append(
		make("div").addClass("alert").append(
			make("header").append(
				make("span").addClass("alertTitle").html(title)
			),
			make("div").addClass("alertBody").html(message),
			button
		)
	)

	Waves.attach(button, null);
}

function loadVideo(videoId) {

}

function goHome() {
	$("html").attr("data-location", "start");
	history.pushState({}, undefined, "/");
}

function normalizeUsername(name) {
	return name.replace(/ /g, "").toLowerCase();
}

function updateStats() {
	fetch(location.origin + "/@stats?" + Date.now())
		.then(response => response.json())
		.then(data => {
			document.querySelector(".cpu").innerText = data.cpu + "%";
			document.querySelector(".memory").innerText = data.ramUsed + " of " + data.totalRam;
			document.querySelector(".storage").innerText = data.diskused + " of " + data.disksize;
		});
}

function processPath() {
	let entries = location.pathname.substr(1).split("/");

	if (entries[0] === "") {
		return;
	}

	if (entries.length === 1) {
		setUsername(entries[0]);
	}
	if (entries.length > 1) {
		setUsername(entries[0]);
		loadVideo(entries[1]);
	}
}

// setInterval(updateStats, 2000);
// updateStats();

Waves.init({
	duration: 500,
	delay: 200
});

Waves.attach(".waves", null);

$(".yourVideos").scroll(userScrollCheck);

processPath();