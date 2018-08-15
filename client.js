const request = require('request');
const blessed = require('blessed');
const contrib = require('blessed-contrib');
const url = "http://127.0.0.1:30000";
const interval = 5000;

var screen = blessed.screen();
let exit = () => {
	process.exit();
};

screen.key(['escape', 'q', 'C-c'], () => {
	screen.destroy();
	exit();
});

process.on('SIGINT', exit);

process.on('SIGTERM', exit);

var grid = new contrib.grid({
	rows: 12,
	cols: 12,
	screen: screen
});

var cephStatus = grid.set(0, 0, 4, 6, contrib.log, {
	align: "center",
	fg: "green",
	label: 'Ceph Status'
});

var cephOsdDfTreeGraph = grid.set(0, 6, 4, 3, contrib.bar, {
	label: 'Ceph OSD Df Tree',
	barWidth: 6,
	barSpacing: 6,
	xOffset: 0,
	maxHeight: 30
});

var cephOsdDfTreeData = grid.set(0, 9, 4, 3, contrib.log, {
	align: "center",
	fg: "green",
	label: "OSD Tree"
});

var prometheusCeph = grid.set(4, 0, 4, 6, contrib.log, {
	align: "center",
	fg: "green",
	label: 'Prometheus Ceph'
});

var nier = grid.set(4, 6, 4, 6, contrib.log, {
	align: "center",
	fg: "green",
	label: 'Nier'
});

var snmpInfo = grid.set(8, 0, 4, 6, contrib.log, {
	align: "center",
	fg: "green",
	label: 'SNMP'
});

var prompt = grid.set(8, 6, 4, 6, blessed.prompt, {
	align: "center",
	border: 'line',
	height: 'shrink',
	width: 'half',
	top: 'center',
	left: 'center',
	fg: "green",
	label: ' {green-fg}Prompt{/green-fg} ',
	tags: true,
	keys: true,
	vi: true
});

screen.render();

setInterval(function () {
	request({
		uri: url + '/ceph_status',
		method: 'GET'
	}, (err, response, body) => {
		if (!err && response.statusCode === 200) {
			var json = JSON.parse(body);
			var list = [];
			list.push("status: " + json.health.status);

			var mons = json.monmap.mons;
			mons.forEach(function (mon) {
				list.push(mon.addr)
			});

			list.push("num osds: " + json.osdmap.osdmap.num_osds +
				" num up: " + json.osdmap.osdmap.num_up_osds +
				" num in: " + json.osdmap.osdmap.num_in_osds);

			cephStatus.logLines = [];
			list.forEach(function (info) {
				cephStatus.log(info);
			});
		} else {
			cephStatus.logLines = [];
			cephStatus.log(`request failed: ${response}`);
		}
		screen.render();
	})
}, interval);

setInterval(function () {
	request({
		uri: url + '/ceph_osd_df_tree',
		method: 'GET'
	}, (err, response, body) => {
		screen.append(cephOsdDfTreeGraph);
		if (!err && response.statusCode === 200) {
			var json = JSON.parse(body)
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
			textData.push("");
			cephOsdDfTreeGraph.setData({
				titles: hostList,
				data: hostOsdNum
			});
			cephOsdDfTreeData.logLines = [];
			textData.forEach(function (data) {
				cephOsdDfTreeData.log(data);
			});
		} else {
			cephOsdDfTreeGraph.setData({
				titles: [],
				data: []
			});
		}
		screen.render();
	})
}, interval);

setInterval(function () {
	// get hostname list
	request({
		uri: url + '/host_list',
		method: 'GET'
	}, (err, response, body) => {
		if (!err && response.statusCode === 200) {
			var json = JSON.parse(body);
			snmpInfo.logLines = [];
			prometheusCeph.logLines = [];
			nier.logLines = [];
			json.forEach(function (hostname) {
				// get every host's snmp info.
				request({
					uri: url + '/snmp/' + hostname,
					method: 'GET'
				}, (err, response, body) => {
					if (!err && response.statusCode === 200) {
						snmpInfo.log(hostname);
						var contents = body.replace(/1,3,6,1,4,1,51052/g, "\n" + "1,3,6,1,4,1,51052").split(/[\n]/g);
						contents.forEach(function (content) {
							if(content !== "") {
								snmpInfo.log(content);
							}
						});
					} else {
						snmpInfo.log(`request failed: ${response}`);
					}
				});

				// every host's ceph prometheus info
				request({
					uri: url + '/prometheus_ceph/' + hostname,
					method: 'GET'
				}, (err, response, body) => {
					if (!err && response.statusCode === 200) {
						var cephJson = JSON.parse(body);
						// get every host's memory prometheus info
						request({
							uri: url + '/prometheus_mem/' + hostname,
							method: 'GET'
						}, (err, response, body) => {
							if (!err && response.statusCode === 200) {
								var memJson = JSON.parse(body);
								if (cephJson.status === 'success' && memJson.status === 'success') {
									prometheusCeph.log(hostname + ": " + 'success');
								} else {
									prometheusCeph.log(hostname + ": " + 'fail');
									prometheusCeph.log("ceph status: " + cephJson.status);
									prometheusCeph.log("ceph memory status: " + memJson.status);
								}
							} else {
								prometheusCeph.log(`request failed: ${response}`);
							}
						});
					} else {
						prometheusCeph.log(`request failed: ${response}`);
					}
				});

				// get every host's nier token
				request({
					uri: url + '/nier_token/' + hostname,
					method: 'GET'
				}, (err, response, body) => {
					if (!err && response.statusCode === 200) {
						var json = JSON.parse(body);
						nier.log(hostname + ": " + json.Token);
					} else {
						nier.log(`request failed: ${response}`);
					}
				});
			});
		} else {
			snmpInfo.logLines = [];
			snmpInfo.log(`request failed: ${response}`);
		}
		screen.render();
	})
}, interval);

// check samba connection
prompt.input("Input the vip.", function (err, vip) {
	if (!err) {
		prompt.input("Input the view name.", function (err, view) {
			if (!err) {
				// replace the prompt
				var mount = grid.set(8, 6, 4, 6, contrib.log, {
					align: "center",
					fg: "green",
					label: 'Samba'
				});
				setInterval(function () {
					request({
						uri: url + '/smb_folder/' + vip + '/' + view,
						method: 'GET'
					}, (err, response, body) => {
						mount.logLines = [];
						mount.log('smb://' + vip + '/' + view);
						if (!err && response.statusCode === 200) {
							body.split(/[\r\n]/).forEach(function (file) {
								mount.log(file);
							});
						} else {
							mount.log(`request failed: ${response}`);
						}
						screen.render();
					})
				}, interval);
			}
		});
	}
});
