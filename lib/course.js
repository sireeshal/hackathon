var nconf = require( 'nconf' );
var date = require( 'date-utils' );
var async = require( 'async' );
var logger = require( './logger.js' );
var statsd = require( './statsd' );

module.exports = function ( app ) {
  var course = {};

  var wsod = app.get( 'wsod' );

  course.init = function ( whittaker ) {
    course.whittaker = whittaker;
  };

  course.getCourses = function getCourses( id, token, done ) {
    var tasks = [
      function ( callback ) {
        course._getCourses( id, token, callback );
      },
      function ( callback ) {
        var wsodTimer = statsd.timer( 'toolbar.server.data.mapCourseId' );
        wsod.mapCourseId( token, function ( error, response, body ) {
          wsodTimer.end();
          if ( !error && response.statusCode == 200 ) {
            callback( false, body.courseIdMap );
          }
          else {
            logger.log( "error", "Get mapCourseId call failed: " + error + ", " + body );
            var status = "error";
            callback( false, [] );
          }
        } );
      }
    ];

    async.parallel( tasks,
      function ( error, parallelResults ) {
        if ( error ) {
          return callback( false, { courses: [], status: status } );
        }

        var courseResult = parallelResults[0];
        var courses = courseResult.courses;
        var courseMap = parallelResults[1];

        courseMap.forEach( function ( map ) {
          courses.forEach( function ( course ) {
            if ( course.sectionId === map.berlinId ) {
              course.campusId = map.campusId;
            }
          } );
        } );

        //logger.log("debug1", "Toolbar result", result);
        done( false, { courses: courses } );
      } );
  };

  course._getCourses = function ( id, token, callback ) {
    var timer = statsd.timer( 'toolbar.server.data.courseRegistration' );
    course.whittaker.courseRegistration.getAll( id, token, function ( error, response, data ) {
      timer.end();

      if ( !error && response.statusCode == 200 ) {
        logger.log( "debug2", "Whittaker get course registrations successful" + JSON.stringify( data ) );

        var courses = [];

        data.forEach( function ( courseData ) {

          try {
            var links = courseData.xlinks;
            var courseSection = links && links.courseSectionId;

            var course = {};
            course.sectionId = courseSection.id;
            course.title = courseSection.courseTitle;
            course.displayCourseCode = courseSection.courseCode;
            course.courseCode = courseSection.courseCode;
            course.startDate = courseSection.startDate;
            course.endDate = courseSection.endDate;

            courses.push( course );
          }
          catch ( e ) {
            logger.log( 'error', 'Exception while processing : ' + JSON.stringify( courseData ) + ': ' + JSON.stringify( e ) );
          }
        } );

        var filterCourses = courses.filter( function ( course ) {
          if ( !course.startDate || !course.endDate ) {
            return true;
          }

          var today = Date.today().clearTime();
          var buffer = nconf.get( 'COURSE_FILTER_BUFFER' );
          var startDate = new Date( course.startDate ).clearTime();
          var endDate = new Date( course.endDate ).clearTime();
          endDate.add( {days: buffer} );

          return today.equals( startDate ) || today.between( startDate, endDate );
        } );

        filterCourses.sort( function ( a, b ) {
          var atitle = a.title.toLowerCase();
          var btitle = b.title.toLowerCase();
          var acourseCode = a.courseCode;
          var bcourseCode = a.courseCode;

          if ( atitle < btitle || acourseCode < bcourseCode ) {
            return -1;
          }

          if ( atitle > btitle || acourseCode > bcourseCode ) {
            return 1;
          }

          return 0;
        } );

        callback( false, { courses: filterCourses} );
      }
      else {
        // if there is an error, don't bail
        var status;
        if ( error && error.code === 'ETIMEDOUT' ) {
          logger.log( "error", "Whittaker get course registrations call timed out" );
          status = "timedout";
        }
        else {
          logger.log( "error", "Whittaker get course registrations call failed: " + error + ", " + JSON.stringify( data ) );
          status = "error";
        }

        logger.log( "debug1", "toolbar result", data );
        callback( false, { courses: [], status: status } );
      }

    } );
  };

  return course;
};
