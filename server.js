var express = require('express');
var app = express();
var exec = require('child_process').exec;
var snmp = require('snmp-native');
var util = require('util');

var cmdCeph_osd_df_tree = 'ceph osd df tree --format json-pretty';
var cmdCeph_status = 'ceph status --format json-pretty';

var community = 'public';
var host = 'localhost';

function getCephinfo (cmdStr,callback) {
  exec(cmdStr,function(err,stdout,stderr){
    if(err){
      console.log('Execute ceph cmd err:' + stderr + ', cmd:' + cmdStr);
    }
    else{
      console.log('Execute ceph cmd success:' + cmdStr);
      callback(stdout);
    }
  });  
}

function getHost (cmdStr, callback) {
  exec(cmdStr,function(err,stdout,stderr){
    if(err){
      console.log('Get host list err:' + stderr + ', cmd:' + cmdStr);
    }
    else{
      console.log('Get host list success:' + cmdStr);
      var tmpList = JSON.parse(stdout);
      callback(tmpList.quorum_names);
    }
  });  
}

function getSnmpinfo (host, community, callback) {
  var session = new snmp.Session({ 
    host: host, 
    community: community });
  var oids = [[1,3,6,1,4,1,51052,1,1,0],[1,3,6,1,4,1,51052,1,2,0]];
  var snmpStr = '';
  oids.forEach(function(oid) {
    session.get({ oid: oid}, function(err, varbinds) {
      if(err) {
        console.log('Get SNMP info error:' + err);
      }
      else {
        varbinds.forEach(function(vb) {
          snmpStr = snmpStr + vb.oid + '=' + vb.value + '(' + vb.type + ')';
        });
      }
      session.close();
    });
});
  callback(snmpStr);
}

app.get('/ceph_osd_df_tree', function (req, res) {
  getCephinfo(cmdCeph_osd_df_tree,function(ceph_osd_df_tree){
    res.send(ceph_osd_df_tree);
  });
});

app.get('/ceph_status', function (req, res) {
  getCephinfo(cmdCeph_status,function(ceph_status){
    res.send(ceph_status);
  });
});

app.get('/host_list', function (req, res) {
  getHost(cmdCeph_status,function(host_list){
    res.send(host_list);
  });
});

app.get('/snmp/:hostname', function (req, res) {
  var host = req.param.hostname;
  getSnmpinfo(host, community, function(snmpInfo) {
    res.send(snmpInfo);
  });
});

var server = app.listen(30000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});