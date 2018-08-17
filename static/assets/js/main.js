var vip = "";
var view = "";
const cephStatusUl = document.getElementById("ceph-status");
const vipInput = document.getElementById("vip");
const viewNameInput = document.getElementById("view-name");
const checkBtn = document.getElementById("check");

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
    xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            callback(xmlHttp.responseText);
        }
    }
    xmlHttp.open("GET", url, true); // true for asynchronous 
    xmlHttp.send(null);
}

httpGetAsync("/ceph_status", function (response) {
    var json = JSON.parse(response);
    document.querySelectorAll("#ceph-status li").forEach(
        function (li) {
            li.remove();
        }
    );

    cephStatusUl.appendChild(createLi("status:" + json.health.status));
    var mons = json.monmap.mons;
    mons.forEach(function (mon) {
        cephStatusUl.appendChild(createLi(mon.addr));
    });
    cephStatusUl.appendChild(createLi(
        "num osds: " + json.osdmap.osdmap.num_osds +
        " num up: " + json.osdmap.osdmap.num_up_osds +
        " num in: " + json.osdmap.osdmap.num_in_osds));
})

function createLi(text) {
    var node = document.createElement("li");
    var textNode = document.createTextNode(text);
    node.appendChild(textNode);
    return node;
}