let currentUsername;
let idData = {};
let pageCount = 0;
let pageCountPlayer = 0;
let videoId = 0;
let reachedEnd = false;
let reachedEndPlayer = false;
let canGoBackHomeRegardless = false;
let isGuild = false;
let queuedAlert = {};

function make(tagName) {
	return $(document.createElement(tagName));
}

function loadVideos() {
	$(".yourVideos>.preloader-wrapper").removeClass("hidden");

	$.ajax({
		url:location.origin + "/api/user.json?" + (isGuild ? "guild" : "username") + "=" + normalizeUsername(currentUsername) + "&page=" + pageCount,
		accepts: [
			"application/json"
		]
	}).done((data, status) => {
		console.log(data);

		if (!data || data.length === 0) {
			$(".yourVideos>.preloader-wrapper").addClass("hidden");
			$(".informationBottom").removeClass("hidden");
			reachedEnd = true;
		}

		data.forEach(file => {
			// Don't overwrite existing data (for example from video player, which includes extended data)
			if (!idData[data.id]) {
				idData[file.id] = file;
			}

			let article = make("article").addClass("waves-effect").addClass("waves-light");

			$(".yourVideos>.scroller").append(
				article.append(
					make("img").attr("src", file.thumbnailUrl).attr("onerror", "this.onerror=null; $(this).parent().remove();")
				).click(() => {
					history.pushState({}, undefined, (isGuild ? "/discord/" : "/") + currentUsername + "/" + file.id);
					loadVideo(file.id)
				})
			);

			Waves.attach(article[0], null);
		})

		pageCount++;


		// Do a double check.
		setTimeout(() => {
			userScrollCheck();
		}, 100)
		setTimeout(() => {
			userScrollCheck();
		}, 300)
	}).fail((response, error, responseText) => {
		switch(response.status) {
			case 404:
				if (isGuild) {
					createAlert("Discord server not found", "Please make sure you entered the Discord server correctly and try again.", undefined, goHome);
				} else {
					createAlert("User not found", "Please make sure you entered your username correctly and try again.", undefined, goHome);
				}
				break;
			case 500:
				createAlert("Server error", "A server error occurred while trying to fetch your content. Please try again later.", undefined, goHome);
				break;
			default:
				createAlert("Unknown error", responseText, undefined, goHome);
				break;
		}
	})
}



function loadVideosPlayer() {
	$(".moreVideos>.preloader-wrapper").removeClass("hidden");

	$.ajax({
		url:location.origin + "/api/user.json?" + (isGuild ? "guild" : "username") + "=" + normalizeUsername(currentUsername) + "&page=" + pageCountPlayer,
		accepts: [
			"application/json"
		]
	}).done((data, status) => {
		console.log(data);

		if (data.length === 0) {
			$(".moreVideos>.preloader-wrapper").addClass("hidden");
			reachedEndPlayer = true;
		}

		data.forEach(file => {
			// Don't overwrite existing data (for example from video player, which includes extended data)
			if (!idData[data.id]) {
				idData[file.id] = file;
			}

			let article = make("article").addClass("waves-effect").addClass("waves-light");

			$(".moreVideos>.scroller").append(
				article.append(
					make("img").attr("src", file.thumbnailUrl).attr("onerror", "this.onerror=null; $(this).parent().remove();")
				).click(() => {
					history.pushState({}, undefined, (isGuild ? "/discord/" : "/") + currentUsername + "/" + file.id);
					loadVideo(file.id)
				})
			);

			Waves.attach(article[0], null);
		})

		pageCountPlayer++;

		// Do a double check.
		setTimeout(() => {
			userScrollCheckPlayer();
		}, 100)
		setTimeout(() => {
			userScrollCheckPlayer();
		}, 300)
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
}

function setUsername(name) {
	console.debug("setUsername " + name);
	if (!name) {
		return;
	}
	currentUsername = name;
	pageCount = 0;
	pageCountPlayer = 0;
	reachedEnd = false;
	reachedEndPlayer = false;
	$(".informationBottom").addClass("hidden");
	if ($("html").attr("data-location") === "start") {
		$("html").attr("data-location", "user")
	}
	$(".yourVideos>.scroller>article, .moreVideos>.scroller>article").remove();

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

function userScrollCheckPlayer() {
	if (reachedEndPlayer) {
		return;
	}
	console.log($(".moreVideos").scrollTop(), $(".moreVideos").innerHeight(), $(".moreVideos").scrollTop() + $(".moreVideos").innerHeight() + 50, $(".moreVideos")[0].scrollHeight)
	if($(".moreVideos").scrollTop() + $(".moreVideos").innerHeight() + 50 >= $(".moreVideos")[0].scrollHeight) {
		loadVideosPlayer();
	}
}

function createAlert(title, message, buttonText, callback) {

	if ($(".alert").length > 0) {
		queuedAlert = {title:title, message:message, buttonText:buttonText, callback:callback};
		return;
	}

	$(".alert").remove();

	let button =
		make("button").addClass("alertDismiss waves-effect waves-dark").html("OK" || buttonText).click(() => {
			$(".alertContainer").addClass("hidden");
			$(".alert").addClass("hidden");
			setTimeout(() => {
				$(".alert").remove();
				if (queuedAlert.title) {
					createAlert(queuedAlert.title, queuedAlert.message, queuedAlert.buttonText, queuedAlert.callback);
					queuedAlert = {};
				}
			}, 500);
			if (typeof callback === "function") {
				callback();
			}
		}).focus();

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

function finishLoadVideo(videoId, data) {
	console.log("Playing video " + videoId);
	console.log(data);
	videoId = videoId;
	let videoFile = data.url;
	$("#videoPlayerSource").attr("src", videoFile).removeClass("hidden");
	// Both Chrome and Firefox broke the download parameter for me and stackoverflow won't help me so...
	$("#downloadButton").attr("href", videoFile + "?name=" + videoId + videoFile.match(/\.[mp4jgn]{3}/g)[0])//.attr("download", videoId + videoFile.match(/\.[mp4jgn]{3}/g)[0])

	if (isGuild) {
		$(".videoInfoTitle").text(
			`Video from ` + new Date(data.timeCreated).toLocaleString("en-CA")
		)
	} else {
		$(".videoInfoTitle").text(
			`${currentUsername}'s Video from ` + new Date(videoId).toLocaleString("en-CA")
		)
	}

	// Try to autoplay the video
	try {
		$("#videoPlayerSource")[0].play();
	} catch(e) {

	}

	$(".videoPlayer>.preloader-wrapper").addClass("hidden");

	// $(".moreVideos>.scroller>article").remove();
	// pageCountPlayer = 0;
	loadVideosPlayer();
}

function loadVideo(videoId) {
	$("html").attr("data-location", "video");
	$(".videoPlayer>.preloader-wrapper").removeClass("hidden");
	$("#videoPlayerSource").addClass("hidden");
	console.log("Loading video " + videoId);

	if (idData[parseInt(videoId)] && idData[parseInt(videoId)].timeCreated) {
		console.log("Video data already loaded " + videoId);
		finishLoadVideo(parseInt(videoId), idData[parseInt(videoId)])
	} else {
		$.ajax({
			url:location.origin + "/api/video.json?" + (isGuild ? "guild" : "username") + "=" + normalizeUsername(currentUsername) + "&video=" + videoId,
			accepts: [
				"application/json"
			]
		}).done((data, status) => {
			console.log(data);

			if (data.length === 0) {
				$(".videoPlayer>.preloader-wrapper").addClass("hidden");
				createAlert("Video not found", "Sorry, this video wasn't found. Videos are deleted after 30 days, so make sure you download what you want to keep beforehand.", undefined, goToUser);
				return;
			}

			idData[data.id] = data;
			console.log(idData[data.id])
			finishLoadVideo(parseInt(videoId), data);
		}).fail((response, error, responseText) => {
			$(".videoPlayer>.preloader-wrapper").addClass("hidden");
			switch(response.status) {
				case 404:
					createAlert("Video not found", "Sorry, this video wasn't found. Videos are deleted after 30 days, so make sure you download what you want to keep beforehand.", undefined, goToUser);
					break;
				case 500:
					createAlert("Server error", "A server error occurred while trying to fetch your content. Please try again later.", undefined, goToUser);
					break;
				default:
					createAlert("Unknown error", responseText, undefined, goToUser);
					break;
			}
		})
	}

	
}

function goHome() {
	$("html").attr("data-location", "start");
	$("#videoPlayerSource")[0].pause();
	currentUsername = undefined;
	// history.pushState({}, undefined, "/");
}

function goToUser() {
	if (typeof currentUsername === "undefined") {
		goHome();
		return;
	}
	$("html").attr("data-location", "user");
	$("#videoPlayerSource")[0].pause();
	history.pushState({}, undefined, (isGuild ? "/discord/" : "/") + currentUsername);
}

function normalizeUsername(name) {
	return name.replace(/ /g, "").toLowerCase().replace(/\@/g,"");
}



function updateStats() {
	if (!$("html").hasClass("statsOpen")) {
		return;
	}

	$.ajax({
		url:location.origin + "/api/stats.json",
		accepts: [
			"application/json"
		]
	}).done((data, status) => {
		console.log(data);

		let stats;

		try {
			stats = JSON.parse(data);
		} catch(e) {
			return createAlert("An error occurred while fetching statistics", e, undefined, goHome);
		}

		if (stats.cpuName) {
			$("#cpuName").text(stats.cpuName);
		}

		if (stats.cpuUsage) {
			// $("#cpuUsage").empty();

			stats.cpuUsage.forEach((cpu, i) => {

				let obj;

				if (!!$("#cpuUsage>.cpuMonitor")[i]) {
					obj = $($("#cpuUsage>.cpuMonitor")[i])
				} else {
					obj = make("div").addClass("cpuMonitor")
					$("#cpuUsage").append(obj);
				}

				obj.text(cpu).css("background", `rgba(255, 193, 7, ${cpu / 100})`)
				
			})
		}

		if (stats.cpuUsageTotal) {
			$("#cpuUsageTotal").text(stats.cpuUsageTotal).css("background", `rgba(255, 193, 7, ${stats.cpuUsageTotal / 100})`)
		}

		if (stats.memoryUsage) {
			$("#memory").text(stats.memoryUsage)
		}

		if (stats.memoryCapacity) {
			$("#memoryTotal").text(stats.memoryCapacity)
		}

		if (stats.storageUsage) {
			$("#storage").text(stats.storageUsage)
		}

		if (stats.storageCapacity) {
			$("#storageTotal").text(stats.storageCapacity)
		}

		
	}).fail((response, error, responseText) => {
		switch(response.status) {
			case 500:
				createAlert("An error occurred while fetching statistics", "The server encountered an internal error while fetching server statistics. Please try again later.", undefined, goHome);
				break;
			default:
				createAlert("An error occurred while fetching statistics", responseText, undefined, goHome);
				break;
		}
	})
}


// function updateStats() {
// 	fetch(location.origin + "/@stats?" + Date.now())
// 		.then(response => response.json())
// 		.then(data => {
// 			document.querySelector(".cpu").innerText = data.cpu + "%";
// 			document.querySelector(".memory").innerText = data.ramUsed + " of " + data.totalRam;
// 			document.querySelector(".storage").innerText = data.diskused + " of " + data.disksize;
// 		});
// }

function processPath() {
	let entries = location.pathname.substr(1).split("/");
	console.log(location.pathname);
	console.log(entries)

	if (entries[0] === "discord") {
		isGuild = true;

		console.log(entries.length)

		if (entries.length > 2) {
			setUsername(entries[1]);
			loadVideo(entries[2]);
		} else if (entries.length === 2) {
			setUsername(entries[1]);
		}
	} else if (location.href.match(/#[a-z]+/)) {
		if (location.href.match(/#[a-z]+/)[0] === "#discord") {
			$("#discordButton").click();
		}
		if (location.href.match(/#[a-z]+/)[0] === "#statistics") {
			$("#statisticsButton").click();
		}
	} else {
		if (entries[0] === currentUsername && !entries[1]) {
			$("html").attr("data-location", "user");
			try {
				$("#videoPlayerSource")[0].pause();
			} catch(e) {

			}

			return;
		}

		// if (entries[0] === currentUsername) {
		// }

		if (entries[0] === "") {
			if (localStorage.getItem("username") && !canGoBackHomeRegardless) {
				history.pushState({}, undefined, "/" + localStorage.getItem("username"));
				setUsername(localStorage.getItem("username"));
				return;
			}
			goHome();
			return;
		}

		if (entries.length === 1) {
			setUsername(entries[0]);
		} else if (entries.length > 1) {
			setUsername(entries[0]);
			loadVideo(entries[1]);
		}
	}

	
}

function enterUsernameFunc() {
	if ($(".enterUsernameBox").val() === "") {
		createAlert("Alert", "Please enter a username.", undefined, goHome);
		return;
	}

	if ($("#rememberMeCheckbox")[0].checked) {
		localStorage.setItem("username", normalizeUsername($(".enterUsernameBox").val()));
		$("#switchAccountButton").removeClass("hidden");
	}

	history.pushState({}, undefined, "/" + normalizeUsername($(".enterUsernameBox").val()));
	setUsername(normalizeUsername($(".enterUsernameBox").val()))
	console.log(enterUsernameFunc)
}

function enterDiscordGuildFunc() {
	if ($(".enterDiscordGuildIDBox").val() === "") {
		createAlert("Alert", "Please enter a Discord Server ID.", undefined, goHome);
		return;
	}

	isGuild = true;

	history.pushState({}, undefined, "/discord/" + normalizeUsername($(".enterDiscordGuildIDBox").val()));
	setUsername(normalizeUsername($(".enterDiscordGuildIDBox").val()))
	console.log(enterUsernameFunc)
}

setInterval(updateStats, 3000);

Waves.init({
	duration: 500,
	delay: 200
});

Waves.attach(".waves", null);

$(".yourVideos").scroll(userScrollCheck);

$(".moreVideos,.videoPlayer").scroll(userScrollCheckPlayer);

$(".menuButton,.navClickOutDetector").click(() => {
	$("html").toggleClass("menuOpen")
});

$("#switchAccountButton").click(() => {
	localStorage.removeItem("username");
	$("html").removeClass("menuOpen");
	$("#switchAccountButton").addClass("hidden");
	history.pushState({}, undefined, "/");
	goHome();
});

$("#yourVideosButton").click(() => {
	$("html").removeClass("menuOpen discordOpen statsOpen");
	console.log(currentUsername);
	history.pushState({}, undefined, "/");

	if (isGuild) {
		isGuild = false;
		goHome();
	} else if (!currentUsername) {
		goHome();
	} else {
		goToUser();
	}
});

$("#discordButton").click(() => {
	$("html").removeClass("menuOpen statsOpen");
	$("html").addClass("discordOpen");
	$("html").attr("data-location", "start");
	history.pushState({}, undefined, "/#discord");

	goHome();
});

$("#statisticsButton").click(() => {
	if (!$("html").hasClass("statsOpen")) {
		setTimeout(() => updateStats())
	}
	$("html").removeClass("menuOpen discordOpen");
	$("html").addClass("statsOpen");
	$("html").attr("data-location", "start");
	history.pushState({}, undefined, "/#statistics");

	goHome();
});

$("#discordAddServer").click(e => {
	e.preventDefault();
	open("https://discord.com/oauth2/authorize?client_id=704169521509957703&permissions=8&scope=bot");
})

$("#discordJoinVEBServer").click(e => {
	e.preventDefault();
	open("https://discord.gg/cHjgTZ2");
})

$("#rememberMeSpan").click(() => {
	$("#rememberMeCheckbox").click()
})

if (localStorage.getItem("username")) {
	$("#switchAccountButton").removeClass("hidden")
}


$(document).on("keydown", function(e) {
	console.log(e);
	if ($("html").attr("data-location") === "video") {
		console.log(e.ctrlKey, e.keyCode === 83);
		if ((window.navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey) && e.keyCode == 83) {
			e.preventDefault();
			$("#downloadButton")[0].click();
		}
	}
});


processPath();

$(window).on("popstate", event => {
	canGoBackHomeRegardless = false;
	processPath();
})

$(".enterUsernameBox").on("keypress", (e) => {
	if (e.code === "Enter" || e.code === "") {
		e.preventDefault();
		enterUsernameFunc();
	}
})

$(".enterDiscordGuildIDBox").on("keypress", (e) => {
	if (e.code === "Enter" || e.code === "") {
		e.preventDefault();
		enterDiscordGuildFunc();
	}
})

try {
	new mdc.textField.MDCTextField(document.querySelector(".twitterUsernameTextbox"));
	new mdc.textField.MDCTextField(document.querySelector(".discordGuildIDTextbox"));
	new mdc.checkbox.MDCCheckbox(document.querySelector(".mdc-checkbox"));
} catch(e) {

}