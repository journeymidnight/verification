var express = require('express');
var app = express();
var exec = require('child_process').exec;
var snmp = require('snmp-native');
var util = require('util');
var http = require('http');

//cmds to get ceph status from os
var cmdCeph_osd_df_tree = 'ceph osd df tree --format json-pretty';
var cmdCeph_status = 'ceph status --format json-pretty';

//snmp community string
var community = 'public';

/*
   urls to get info from prometheus api 
   makesure prometheus is working
*/
var urlCeph_health = '/api/v1/query\?query\=ceph_health_status';
var urlNode_mem_free = '/api/v1/query\?query\=node_memory_MemFree';
var prometheus_port = '9090';

/*
  describe: Get CEPH info by executing commands on the operating system.
  input: cmdStr. example:ceph status --format json-pretty
  output: ceph status or ceph osd df tree etc.
*/
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

/*
  describe: Get the host(node) list through CEPH
  input: cmdStr. example:ceph status --format json-pretty
  output: host(node) list.
*/
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

/*
  describe: Get information about the related oid of the specified host by SNMP
  input: host(node)_name, snmp_community
  output: snmp info
  ps: By adding OID to oids array, you can get more data.
*/
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
      if(--oids.length == 0) {
        session.close();
        console.log('Get oids snmpinfo success:' + snmpStr);
        callback(snmpStr);
      }
    });
  });
}

/*
  descirbe: Get the CEPH and MEM free information of the specified host through the Prometheus API
  to ensure that Prometheus works properly.
  input: host(node)_name, snmp_community
  output: snmp info
*/
function getPrometheusinfo (host, path, callback) {
  var URL = 'http://' + host + ':' + prometheus_port + path;
  //console.log('URL:' + URL);
  http.get(URL, function(res) {
    var size = 0;
    var chunks = [];
    res.on('data', function(chunk){
      size += chunk.length;
      chunks.push(chunk);
    });
    res.on('end', function(){
      var data = Buffer.concat(chunks, size);
      callback(data.toString());
    });
  }).on('error', function(e) {
      console.log("Got error: " + e.message);
    });
}


/*
  descirbe: The following is to accept the HTTP request section
  get ceph_osd_df_tree
  example: http://ip:port/ceph_osd_df_tree
*/
app.get('/ceph_osd_df_tree', function (req, res) {
  getCephinfo(cmdCeph_osd_df_tree,function(ceph_osd_df_tree){
    res.send(ceph_osd_df_tree);
  });
});

/*
get ceph_status
example: http://ip:port/status
*/
app.get('/ceph_status', function (req, res) {
  getCephinfo(cmdCeph_status,function(ceph_status){
    res.send(ceph_status);
  });
});

/*
  get host_list
  example: http://ip:port/host_list
*/
app.get('/host_list', function (req, res) {
  getHost(cmdCeph_status,function(host_list){
    res.send(host_list);
  });
});

/*
  Getting the SNMP information of the specified host
  example: http://ip:port/snmp/hostname
*/
app.get('/snmp/:hostname', function (req, res) {
  var host = req.params.hostname;
  console.log('snmphost:' + host);
  getSnmpinfo(host, community, function(snmpInfo) {
    res.send(snmpInfo);
  });
});

/*
  Getting the Prometheus ceph monitoring information of the specified host
  example: http://ip:port/prometheus_ceph/hostname
*/
app.get('/prometheus_ceph/:hostname', function (req, res) {
  var host = req.params.hostname;
  console.log('host:' + host);
  getPrometheusinfo(host, urlCeph_health, function(prometheusInfo) {
    res.send(prometheusInfo);
  });
});

/*
  Getting the Prometheus mem monitoring information of the specified host
  example: http://ip:port/prometheus_mem/hostname
*/
app.get('/prometheus_mem/:hostname', function (req, res) {
  var host = req.params.hostname;
  console.log('host:' + host);
  getPrometheusinfo(host, urlNode_mem_free, function(prometheusInfo) {
    res.send(prometheusInfo);
  });
});


var server = app.listen(30000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});