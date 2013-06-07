var mongoose = require('mongoose')
  , util = require('util')
  , Schema = mongoose.Schema;

var Toolbar = null;

var ToolbarSchema = new Schema({
    key           : String
  , code          : String
  , timestamp     : Number
});

module.exports.init = function(conn) {
  Toolbar = conn.model('google.webflow.cache', ToolbarSchema);
  return Toolbar;
}