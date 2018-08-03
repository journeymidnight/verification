const request = require('request');
const blessed = require('blessed');
const contrib = require('blessed-contrib');

var screen = blessed.screen();
var grid = new contrib.grid({ rows: 12, cols: 12, screen: screen });

var map = grid.set(0, 0, 4, 4, contrib.map, { label: 'World Map' });

var box1 = grid.set(0, 4, 4, 4, blessed.box, { content: 'Ceph Status' });

var log = grid.set(0, 8, 4, 4, contrib.log, { fg: "red", label: 'server log' });

var cephStatus = grid.set(4, 0, 4, 4, contrib.log, { fg: "green", label: 'Ceph Status' });

var cephOsdTree = grid.set(4, 4, 4, 4, contrib.log, { fg: "green", label: 'Ceph OSD Tree' });

var snmpInfo = grid.set(4, 8, 4, 4, contrib.log, { fg: "green", label: 'SNMP' });

var demo4 = grid.set(8, 0, 4, 4, contrib.map, { label: 'Demo4' });

var demo5 = grid.set(8, 4, 4, 4, contrib.map, { label: 'Demo5' });

var demo6 = grid.set(8, 8, 4, 4, contrib.map, { label: 'Demo6' });


screen.render();


setTimeout(() => {
	log.log("good happend");
	setTimeout(() => log.log("bad happend"), 2000);
}, 2000);

request({
	uri: 'http://10.70.161.10:30000/',
	method: 'GET',
}, (err, response, body) => {
	if (!err && response.statusCode === 200) {
		log.log(`request is ok`);
		box1.content = body;
		screen.render();
	} else {
		log.log(`request failed: ${response}`);
	}
});

setInterval(function () {
	request({
		uri: 'http://10.70.161.10:30000/ceph_status',
		method: 'GET',
	}, (err, response, body) => {
		if (!err && response.statusCode === 200) {
			cephStatus.log(body);
			screen.render();
		} else {
			cephStatus.log(`request failed: ${response}`);
		}
	})
}, 2000);

setInterval(function () {
	request({
		uri: 'http://10.70.161.10:30000/ceph_osd_df_tree',
		method: 'GET',
	}, (err, response, body) => {
		if (!err && response.statusCode === 200) {
			cephOsdTree.log(body);
			screen.render();
		} else {
			cephOsdTree.log(`request failed: ${response}`);
		}
	})
}, 2000);

setInterval(function () {
	request({
		uri: 'http://10.70.161.10:30000/snmp',
		method: 'GET',
	}, (err, response, body) => {
		if (!err && response.statusCode === 200) {
			snmpInfo.log(body);
			screen.render();
		} else {
			snmpInfo.log(`request failed: ${response}`);
		}
	})
}, 2000);
