const request = require('request');
const blessed = require('blessed');
const contrib = require('blessed-contrib');
const ip = "10.70.160.138"
const url = "http://" + ip + ":30000";
const interval = 5000;

var screen = blessed.screen();

var grid = new contrib.grid({
	rows: 12,
	cols: 12,
	screen: screen
});

var cephStatus = grid.set(0, 0, 4, 6, contrib.log, {
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
	fg: "green",
	label: "OSD Tree"
});

var prometheus_ceph = grid.set(4, 0, 4, 6, contrib.log, {
	fg: "green",
	label: 'Prometheus Ceph'
});

var nier = grid.set(4, 6, 4, 6, contrib.log, {
	fg: "green",
	label: 'Nier'
});

var snmpInfo = grid.set(8, 0, 4, 6, contrib.log, {
	fg: "green",
	label: 'SNMP'
});

var prompt = grid.set(8, 6, 4, 6, blessed.prompt, {
	border: 'line',
	height: 'shrink',
	width: 'half',
	top: 'center',
	left: 'center',
	label: ' {blue-fg}Prompt{/blue-fg} ',
	tags: true,
	keys: true,
	vi: true
});

screen.render();

// check samba
prompt.input("Input the vip.", function (err, vip) {
	if (!err) {
		prompt.input("Input the view name.", function (err, view) {
			if (!err) {
				var mount = grid.set(8, 6, 4, 6, contrib.log, {
					fg: "green",
					label: 'SMB'
				});
				setInterval(function () {
					request({
						uri: url + '/smb_folder/' + vip + '/' + view,
						method: 'GET',
					}, (err, response, body) => {
						mount.logLines = [];
						if (!err && response.statusCode === 200) {
							mount.log(body);
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


setInterval(function () {
	request({
		uri: url + '/ceph_status',
		method: 'GET',
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
			cephStatus.log(`request failed: ${response}`);
		}
		screen.render();
	})
}, interval);

setInterval(function () {
	request({
		uri: url + '/ceph_osd_df_tree',
		method: 'GET',
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
	// 获取主机名列表
	request({
		uri: url + '/host_list',
		method: 'GET',
	}, (err, response, body) => {
		if (!err && response.statusCode === 200) {
			var json = JSON.parse(body);
			snmpInfo.logLines = [];
			prometheus_ceph.logLines = [];
			nier.logLines = [];
			json.forEach(function (hostname) {
				// 每个主机的snmp信息单独获取
				request({
					uri: url + '/snmp/' + hostname,
					method: 'GET',
				}, (err, response, body) => {
					if (!err && response.statusCode === 200) {
						snmpInfo.log(hostname);
						snmpInfo.log(body);
					} else {
						snmpInfo.log(`request failed: ${response}`);
					}
				});

				// 每个主机的ceph prometheus信息获取
				request({
					uri: url + '/prometheus_ceph/' + hostname,
					method: 'GET',
				}, (err, response, body) => {
					if (!err && response.statusCode === 200) {
						var cephJson = JSON.parse(body);
						// 每个主机的ceph memory prometheus信息获取
						request({
							uri: url + '/prometheus_mem/' + hostname,
							method: 'GET',
						}, (err, response, body) => {
							if (!err && response.statusCode === 200) {
								var memJson = JSON.parse(body);
								if (cephJson.status === 'success' && memJson.status === 'success') {
									prometheus_ceph.log(hostname + ": " + 'success');
								} else {
									prometheus_ceph.log(hostname + ": " + 'fail');
									prometheus_ceph.log("ceph status: " + cephJson.status);
									prometheus_ceph.log("ceph mem status: " + memJson.status);
								}
							} else {
								prometheus_ceph.log(`request failed: ${response}`);
							}
						});
					} else {
						prometheus_ceph.log(`request failed: ${response}`);
					}
				});

				// 提取nier token
				request({
					uri: url + '/nier_token/' + hostname,
					method: 'GET',
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
			snmpInfo.log(`request failed: ${response}`);
		}
		screen.render();
	})
}, interval);