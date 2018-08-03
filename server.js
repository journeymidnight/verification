var express = require('express');
var app = express();
var exec = require('child_process').exec;
var snmp = require('snmp-native');
var util = require('util');

var host = 'localhost';
var commuity = 'public';

var cmdCeph_osd_df_tree = 'ceph osd df tree --format json-pretty';
var cmdCeph_status = 'ceph status --format json-pretty';

app.get('/ceph_osd_df_tree', function (req, res) {

  exec(cmdCeph_osd_df_tree,function(err,stdout,stderr){
    if(err){
      console.log('get ceph osd df tree error:' + stderr);
    }
    else{
      var strCeph_osd_df_tree = JSON.parse(stdout);
      res.send(strCeph_osd_df_tree);
    }
  });
});

app.get('/ceph_status', function (req, res) {

  exec(cmdCeph_status,function(err,stdout,stderr){
    if(err){
      console.log('get ceph status error:' + stderr);
    }
    else{
      var strCeph_status = JSON.parse(stdout);
      res.send(strCeph_status);
    }
  });
});


app.get('/snmp', function (req, res) {
  
  var session = new snmp.Session({ host: host, community: commuity });
  var oid = [1.3.6.1.2.1.1.1.0];

  session.get({ oid: oid}, function(err, varbinds) {
    var vb;
    if(err) {
      console.log('SNMP error:' + err);
    }
    else {
      vb = varbinds[0];
      res.send('The system description is "' + vb.value + '"');
    }
    session.close();
  });
});


var server = app.listen(30000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});