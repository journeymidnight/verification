var express = require('express');
var app = express();
var exec = require('child_process').exec;
var snmp = require('snmp-native');
var util = require('util');

var cmdCeph_osd_df_tree = 'ceph osd df tree --format json-pretty';
var cmdCeph_status = 'ceph status --format json-pretty';

function getCephinfo (cmdStr,res) {
  exec(cmdStr,function(err,stdout,stderr){
    if(err){
      console.log('Execute ceph cmd err:' + stderr + ', cmd:' + cmdStr);
    }
    else{
      console.log('Execute ceph cmd success:' + cmdStr);
      res.send(stdout);
    }
  });  
}

app.get('/ceph_osd_df_tree', function (req, res) {
  getCephinfo(cmdCeph_osd_df_tree,res);
}

app.get('/ceph_status', function (req, res) {
  getCephinfo(cmdCeph_status,res);
});

var commuity = 'public';
var host = 'localhost';

app.get('/snmp', function (req, res) {
  
  var session = new snmp.Session({ host: host, community: commuity });
  var oid = [1,3,6,1,4,1,51052,1,1];

  session.get({ oid: oid}, function(err, varbinds) {
    if(err) {
      console.log('SNMP error:' + err);
    }
    else {
      varbinds.forEach(function(vb) {
        res.send(vb.oid + ' = ' + vb.value + ' (' + vb.type + ')');
      });
    }
    session.close();
  });
});

var server = app.listen(30000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});