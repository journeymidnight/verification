var vip = "";
var view = "";
var vipInput = document.getElementById("vip");
var viewNameInput = document.getElementById("view-name");
var checkBtn = document.getElementById("check");

vipInput.addEventListener("keypress", function (event) {
    if (event.which === 13) {
        vip = vipInput.textContent;
    }
});

viewNameInput.addEventListener("keypress", function (event) {
    if (evnet.which === 13) {
        view = viewNameInput.textContent;
    }
});

checkBtn.addEventListener("click", function () {


});

function httpGetAsync(url, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            callback(xmlHttp.responseText);
        }
    }
    xmlHttp.open("GET", url, true); // true for asynchronous 
    xmlHttp.send(null);
}

httpGetAsync("/ceph_status", function(response) {
    var json = JSON.parse(response);
    var info = "status:" + json.health.status + "\n";
    info = info + json.osdmap.osdmap.num_osds + "\n";

    document.getElementById("ceph-status").textContent = info;
})