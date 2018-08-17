var vip = "";
var view = "";
const cephStatusUl = document.getElementById("ceph-status");
const osdTreeUl = document.getElementById("osd-tree");
const snmpUl = document.getElementById("snmp");
const prometheusCephUl = document.getElementById("prometheus-ceph");
const nierUl = document.getElementById("nier");

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

    clearAllLi("#ceph-status li");

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


httpGetAsync("/host_list", function (response) {
    var json = JSON.parse(response);
    clearAllLi("#snmp li");
    clearAllLi("#prometheus-ceph li");
    clearAllLi("#nier li")

    json.forEach(function (hostname) {
        httpGetAsync("/snmp/" + hostname, function (respnose) {
            snmpUl.appendChild(createLi(hostname));
            var contents = respnose.replace(/1,3,6,1,4,1,51052/g, "\n" + "1,3,6,1,4,1,51052").split(/[\n]/g);
            contents.forEach(function (content) {
                if (content !== "") {
                    snmpUl.appendChild(createLi(content));
                }
            });

            httpGetAsync("/prometheus_ceph/" + hostname, function (response) {
                var cephJson = JSON.parse(response);
                httpGetAsync("/prometheus_mem/" + hostname, function (respnose) {
                    var memJson = JSON.parse(respnose);
                    if (cephJson.status === 'success' && memJson.status === 'success') {
                        prometheusCephUl.appendChild(createLi(hostname + ": " + 'success'));
                    } else {
                        prometheusCephUl.appendChild(createLi(hostname + ": " + 'fail'));
                        prometheusCephUl.appendChild(createLi("ceph status: " + cephJson.status));
                        prometheusCephUl.appendChild(createLi("ceph memory status: " + memJson.status));
                    }
                });

            });
            httpGetAsync("/nier_token/" + hostname, function (response) {
                var json = JSON.parse(response);
                nierUl.appendChild(createLi(hostname + json.Token));
            });
        });
    });
});


httpGetAsync("/ceph_osd_df_tree", function (response) {
    var json = JSON.parse(response);

    var nodes = json.nodes;
    var hostList = [];
    var hostOsdNum = [];
    var textData = [];
    var osds = "";
    nodes.forEach(function (node) {
        var type = node.type;
        if (type === "host") {
            hostList.push(node.name.replace(/.*node/g, "node"));
            hostOsdNum.push(0);
            if (osds.length !== 0) {
                textData.push(osds);
                osds = "";
            }
            textData.push(node.name);
        } else if (type === "osd") {
            hostOsdNum[hostOsdNum.length - 1] += 1;
            osds += "  " + node.name;
        }
    });
    textData.push(osds);

    //TODO: Graph

    document.querySelectorAll("#osd-tree li").forEach(
        function (li) {
            li.remove();
        }
    )
    textData.forEach(
        function (text) {
            osdTreeUl.appendChild(createLi(text));
        }
    );
});

function createLi(text) {
    var node = document.createElement("li");
    var textNode = document.createTextNode(text);
    node.appendChild(textNode);
    return node;
}

function clearAllLi(cssSelector) {
    document.querySelectorAll(cssSelector).forEach(
        function (li) {
            li.remove();
        }
    )
}