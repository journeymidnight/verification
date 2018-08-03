const request = require('request');
const blessed = require('blessed');
const contrib = require('blessed-contrib');

var screen = blessed.screen();
var grid = new contrib.grid({rows: 12, cols: 12, screen: screen});

var map = grid.set(0, 0, 4, 4, contrib.map, {label: 'World Map'});

var box1 = grid.set(0, 4, 4, 4, blessed.box, {content: 'Ceph Status'});

var log = grid.set(0, 8, 4, 4, contrib.log, {fg: "red", label: 'server log'});

screen.render();


setTimeout(()=>{ 
	log.log("good happend");
	setTimeout(()=>log.log("bad happend"), 2000);
}, 2000);


request({
    uri:'http://10.70.161.10:30000',
    method: 'GET',
}, (err, response, body) => {
	  if (!err && response.statusCode === 200) {
			log.log(`request is ok`);
			box1.content=body;
			screen.render();
	  } else {
			log.log(`request failed: ${response}`);
	  }
});

