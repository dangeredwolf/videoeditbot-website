var eosHtml = "<div class='alert alertNoDelay'><header><span class='alertTitle'>End of Support</span></header><div class='alertBody'>Video Edit Bot has ended support for Internet Explorer, and other older web browsers.<br><br>Please upgrade your browser to use Video Edit Bot.<br><br>The latest versions of Chrome, Firefox, Safari, or Microsoft Edge will work.</div></div>";

try {
	eval("()=>{}");
} catch(e) {
	document.getElementById("alertContainer").innerHTML = eosHtml;
	document.getElementById("alertContainer").setAttribute("class", "alertContainer")
}