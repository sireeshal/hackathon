module.exports = function(app)  {
  require('./consumer')(app);
  require('./googleApi')(app);
  require('./avatar')(app);
  require('./httpbind')(app);
  require('./data')(app);
  require('./status')(app);
  require('./auth')(app);
  require('./stats')(app);
  require('./log')(app);
};