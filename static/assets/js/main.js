var vip = "";
var view = "";
var interval = 5000;
var sambaChecked = false;
const cephStatusUl = document.getElementById("ceph-status");
const osdTreeUl = document.getElementById("osd-tree");
const snmpUl = document.getElementById("snmp");
const prometheusCephUl = document.getElementById("prometheus-ceph");
const nierUl = document.getElementById("nier");
const sambaUl = document.getElementById("samba");
const address = document.getElementById("address");

const vipInput = document.getElementById("vip");
const viewNameInput = document.getElementById("view-name");
const checkBtn = document.getElementById("check");

vipInput.addEventListener("keypress", function (event) {
    if (event.which === 13) {
        vip = vipInput.value;
        view = viewNameInput.value;
        if (vip !== "" && view !== "") {
            sambaChecked = true;
            sambaVerification();
        }
    }
});

viewNameInput.addEventListener("keypress", function (event) {
    if (event.which === 13) {
        vip = vipInput.value;
        view = viewNameInput.value;
        if (vip !== "" && view !== "") {
            sambaChecked = true;
            sambaVerification();
        }
    }
});

checkBtn.addEventListener("click", function () {
    vip = vipInput.value;
    view = viewNameInput.value;
    if (vip !== "" && view !== "") {
        sambaChecked = true;
        sambaVerification();
    } else {
        alert("请先输入VIP地址及视图名称。");
    }
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

function sambaVerification() {
    vip = vipInput.value;
    view = viewNameInput.value;
    if (vip !== "" && view !== "") {
        address.textContent = "服务地址： smb://" + vip + '/' + view;
        httpGetAsync("/smb_folder/" + vip + '/' + view, function (response) {
            clearAllLi("#samba li");
            response.split(/[\r\n]/).forEach(function (file) {
                sambaUl.appendChild(createLi(file));
            });
        });
    }
}

function cephStatusVerification() {
    httpGetAsync("/ceph_status", function (response) {
        var json = JSON.parse(response);

        clearAllLi("#ceph-status li");

        cephStatusUl.appendChild(createLi("ceph 状态：" + json.health.status));
        var mons = json.monmap.mons;
        mons.forEach(function (mon) {
            cephStatusUl.appendChild(createLi("服务地址： " + mon.addr));
        });
        cephStatusUl.appendChild(createLi(
            "osd总数: " + json.osdmap.osdmap.num_osds +
            "  osd启动数: " + json.osdmap.osdmap.num_up_osds +
            "  osd接入数: " + json.osdmap.osdmap.num_in_osds));
    });
}


function cephOsdTreeVerification() {
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
                textData.push("主机 " + node.name);
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
}

function hostWalkVerification() {

    httpGetAsync("/host_list", function (response) {
        var json = JSON.parse(response);
        clearAllLi("#snmp li");
        clearAllLi("#prometheus-ceph li");
        clearAllLi("#nier li")

        json.forEach(function (hostname) {
            httpGetAsync("/snmp/" + hostname, function (response) {
                var contents = response.replace(/1,3,6,1,4,1,51052/g, "\n" + "1,3,6,1,4,1,51052").split(/[\n]/g);
                var token = true;
                var list = [];
                for (var i = 0; i < contents.length; i++) {
                    if (contents[i] !== "") {
                        if (contents[i].search("noSuchObject") >= 0) {
                            token = false;
                            list.push(contents[i]);
                        }
                    }
                }
                if (token) {
                    snmpUl.appendChild(createLi("主机 " + hostname + ": 检查通过"));
                } else {
                    snmpUl.appendChild(createLi("主机 " + hostname + ": 检查不通过, 失败响应信息："));
                    list.forEach(function (content) {
                        snmpUl.appendChild(createLi(content))
                    });
                }
            });

            httpGetAsync("/prometheus_ceph/" + hostname, function (response) {
                var cephJson = JSON.parse(response);
                httpGetAsync("/prometheus_mem/" + hostname, function (respnose) {
                    var memJson = JSON.parse(respnose);
                    if (cephJson.status === 'success' && memJson.status === 'success') {
                        prometheusCephUl.appendChild(createLi("主机 " + hostname + ": 检查通过"));
                    } else {
                        prometheusCephUl.appendChild(createLi("主机 " + hostname + ": 检查不通过"));
                        prometheusCephUl.appendChild(createLi("ceph检查状态: " + cephJson.status));
                        prometheusCephUl.appendChild(createLi("ceph内存检查状态: " + memJson.status));
                    }
                });

            });

            httpGetAsync("/nier_token/" + hostname, function (response) {
                var json = JSON.parse(response);
                nierUl.appendChild(createLi("主机 " + hostname + ": 检查" + (json.Token.replace(/\-/g, "").search(/^[0-9a-f]{32}$/) >= 0 ? "通过" : "不通过")));
            });
        });
    });
}

cephStatusVerification();
cephOsdTreeVerification();
hostWalkVerification();

function verificationAll() {
    cephStatusVerification();
    cephOsdTreeVerification();
    hostWalkVerification();
    if (sambaChecked) {
        sambaVerification();
    }
}

setInterval(verificationAll, interval);