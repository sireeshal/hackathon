dojo.provide("ecollege.toolbar.Utils");

	var hasCorsResult = null;
	
dojo.declare("ecollege.toolbar.Utils", null, {

	/**
		Strips out all HTML tags from a string.
		@return The original string minus all HTML tags.
	*/
	stripHtmlTags: function(p_str, p_preserveLineBreaksAndPTags) {
	
		var str = p_str;
		
		// remove special chars such as \r\n, for some reason they are breaking the regex
		str = this.stripSpecialChars(str, {substitute:""});
		
		// clip out contents of head, script, style, iframe, and comment blocks
		str = str.replace(/\<head.+?\/head\>/igm, "");
		str = str.replace(/\<script.+?\/script\>/igm, "");
		str = str.replace(/\<style.+?\/style\>/igm, "");
		str = str.replace(/\<!--.+?--\>/igm, "");
		
		if (p_preserveLineBreaksAndPTags)
		{
			var startPTag = ":!@#,PARAGRAPH,#@!:";
			var endPTag = ":!@#,ENDPARAGRAPH,#@!:";
			var brTag = ":!@#,LINEBREAK,#@!:";
			str = str.replace(/<p>/g, startPTag);
			str = str.replace(/<\/p>/gi, endPTag);
			str = str.replace(/<br\/?>/gi, brTag);
			str = str.replace(/<\/?\w+((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)\/?>/gi, "");
			str = str.replace(new RegExp(startPTag, "g"), "<p>");
			str = str.replace(new RegExp(endPTag, "g"), "</p>");
			str = str.replace(new RegExp(brTag, "g"), "<br/>");
			return str;
		}
		else
		{
			return str.replace(/<\/?\w+((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)\/?>/gi, "");
		}
	},	
	
	/**
		Strips the following special characters from a string, optionally replacing them with a substitute string.
			- \r\n (linebreak variation)
			- \n (linebreak variation)
			- \r (linebreak variation)
			- \t (tab)
			- \f (formfeed)
			- \v (vertical tab)
			
		@author	GregT
		@param	{Object}	p_options		A list of options:
									- substitute:{String} (Substitute special chars with this string. Default: " " [space])
		@returns	{String}	Returns the new string
	*/
	stripSpecialChars: function(p_str, p_options) {
		
		var str = p_str;
		
		// configure options
		var options = p_options || {};
		options.substitute = options.substitute || " ";
		
		str = str.replace(/\r\n/gm, options.substitute).replace(/\\r\\n/gm, options.substitute).replace(/(\n|\\n|\r|\\r|\t|\\t|\f|\\f|\v|\\v)/gm, options.substitute);
		return str;
	},
	
	/**
		Takes an ISO8601 formatted string and returns a Date object that represents the date and time in that string.
		@return		{Date}	The date object derived from the ISO 8601 date string
	*/
	toDate: function(p_str) {
		
		var d = p_str.match(/([0-9]{4})(-([0-9]{2})(-([0-9]{2})(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\.([0-9]+))?)?(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?/);
		var offset = 0;
		var date = new Date(d[1], 0, 1);
	
		if (d[3]) { date.setMonth(d[3] - 1); }
		if (d[5]) { date.setDate(d[5]); }
		if (d[7]) { date.setHours(d[7]); }
		if (d[8]) { date.setMinutes(d[8]); }
		if (d[10]) { date.setSeconds(d[10]); }
		if (d[12]) { date.setMilliseconds(Number("0." + d[12]) * 1000); }
		if (d[14]) {
			offset = (Number(d[16]) * 60) + Number(d[17]);
			offset *= ((d[15] == '-') ? 1 : -1);
		}
	
		offset -= date.getTimezoneOffset();
		time = (Number(date) + (offset * 60 * 1000));
		date.setTime(Number(time));
		return date;
	},
	
	
	/**
		Returns a string that has been truncated to the given maxLength. This function will treat any
		character entity code (ie &amp;) in the string as occupying a single character when calculating
		the length. HTML tags and special characters (ie \r\n) are automatically stripped out (there is an
		option to disable this if you want to handle it yourself). Truncated string can be returned with a
		suffix (not calculated in the length) and whitespace and/or punctuation can optionally be trimmed
		from the beginning and end of the truncated string (not calculated in length).
		
		@author	GregT
		@param	{Object}	p_options		A list of options:
									- maxLength:{Number} (The string will be truncated to this character length, unless it already does not exceed it. Default: 70)
									- suffix:{String} (A string to be appended to the end of the truncated string. Only applied if the string is truncated. Default: "...")
									- trimWhitespace:{Boolean} (Whitespace will be trimmed from the start and end of the string after it has been truncated. Default: true)
									- trimPunctuation:{Boolean} (Punctuation will be trimmed from the end of the string after it has been truncated. Default: true)
									- stripHtmlTags:{Boolean} (HTML Tags will be stripped from the string before truncating. Explicity character entities excluded. Default: true)
									- stripSpecialChars:{Boolean} (All invisible linebreak characters will be stripped from the string before truncating. Default: true)
									- specialCharSub:{String} (Substitute special chars with this string. Only applies when stripSpecialChars is set to true. Default: " " [space])
		@returns	{String}	Returns the truncated string.
	*/
	truncate: function(p_str, p_options) {
		
		var str = p_str;
		
		// configure options
		var options = p_options || {};
		options.maxLength = options.maxLength || 70;
		options.suffix = options.suffix || "...";
		options.trimWhitespace = options.trimWhitespace || true;
		options.trimPunctuation = options.trimPunctuation || true;
		options.stripHtmlTags = options.stripHtmlTags || true;
		options.stripSpecialChars = options.stripSpecialChars || true;
		options.specialCharSub = options.specialCharSub || " ";
		
		if (options.stripHtmlTags) {
			str = this.stripHtmlTags(str);
		}
		
		if (options.stripSpecialChars) {
			str = this.stripSpecialChars(str, {substitute:options.specialCharSub});
		}
		
		// create the following regexp pattern: /^([^&]|&(?:.*?;)){0,[X]}/ig
		// where [X] will be substituted for the value of options.length
		// this pattern basically says: find me up to X occurences of the
		// preceding expression starting from the beginning of the string.
		// The preceeding exp is either a) any character that is not an ampersand,
		// or b) an ampersand followed by anything up to and including as
		// semi-colon (a character entity code). We use this as an alternative
		// to String.substr() so we can count entity codes as a single character.
		var pattern = new RegExp( "([^&]|&(?:.*?;)){0," + options.maxLength + "}", "gi" );
		var trunc = str.match(pattern)[0];
		
		// if the string was truncated
		if (trunc.length != str.length)
		{
			// trim whitespace from the start
			if (options.trimWhitespace) {
				trunc = trunc.replace(/^\s+|\s+$/g,"");
			}
			
			// trim punctuation from the end
			if (options.trimPunctuation) {
				trunc = trunc.replace(/['";:,!\.\?\-\+\/\\]+$/g,""); //'";:,\.\/\?\\-!
			}
			
			// trim whitespace from the end
			if (options.trimWhitespace) {
				trunc = trunc.replace(/^\s+|\s+$/g,"");
			}
			
			// append the suffix
			trunc += options.suffix;
		}
		
		return trunc;
	},
	
	affinityIdFromToken: function( token ) {
		var affinityToken = '';
		
		if ( token ) {
			affinityToken = token.split(":")[0];  
		}
		
		return affinityToken;
	},	

	/**
	* Format dates based on a VB string.
	* 
	* @param {date/string} value Date to be formatted 
	* @param {string} format VB Format string
	*/
	formatDate: function formatDate(value, format) {
		
		// constants for the formatDate method
		var _days = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ];
		var _months = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];	

		// if value is a string, convert it to a data object
		if (!(value instanceof Date)) {
			value = new Date(value);
		}		

		// Looking for AM/PM in the format string
		var hasAMPM = /A(M?)\/?P\1/i.test(format);
		// Splitting the format string into an array of tokens 
		var nextToken = /^(?:([DM])\1{0,3}|(?:Y{4}|YY?)|([WHNS])\2?|Q|(A)(M?)\/?P\4|\\?([^\\]))/i;  	

		function fixCase(value, token) {
			var checkCase = /^(?:([MD]+)|([md]+))$/;
			var result = token.match(checkCase);

			if (!result) return value;
			if (result[1]) return value.toUpperCase();

			return value.toLowerCase();
		}

		var parsedToken, curVal, result = [];

		// this will loop through all the matching regex statements
		while (parsedToken = format.match(nextToken)) {

			if (parsedToken[5]) { // Raw text case
				result.push(parsedToken[5]);
			} 
			else if (parsedToken[3]) { // Ante/Post Meridiem (a/p | A/P | am/pm | AM/PM)
				if (value.getHours() < 12) { 
					curVal = 'a' + parsedToken[4];
				} 
				else {
					curVal = 'p' + parsedToken[4];
				}
				result.push(parsedToken[3] == 'A' ? curVal.toUpperCase() : curVal.toLowerCase());
			} 
			else {
				parsedToken = parsedToken[0];

				switch (parsedToken.toLowerCase()) {

					case 'd': // Single digit day (1 - 31)
						result.push(value.getDate());
						break;

					case 'dd': // Two digit day (01 - 31)
						curVal = value.getDate();
						if (curVal < 10) result.push('0');
						result.push(curVal);
						break;

					case 'ddd': // Abbreviated day (Sun - Sat)
						result.push(fixCase(_days[value.getDay()].substring(0, 3), parsedToken));
						break;

					case 'dddd': // Full day (Sunday - Saturday)
						result.push(fixCase(_days[value.getDay()], parsedToken));
						break;

					case 'm': // Single digit month (1 - 12)
						result.push(value.getMonth() + 1);
						break;

					case 'mm': // Two digit month (01 - 12)
						curVal = value.getMonth() + 1;
						if (curVal < 10) result.push('0');
						result.push(curVal);
						break;

					case 'mmm': // Abbreviated month (Jan - Dec)
						result.push(fixCase(_months[value.getMonth()].substring(0, 3), parsedToken));
						break;

					case 'mmmm': // Full month (January - December)
						result.push(fixCase(_months[value.getMonth()], parsedToken));
						break;

					case 'y': // Day of the year (1 - 366)
						curVal = new Date(value.getFullYear(), 0, 1);
						result.push(Math.ceil((value - curVal) / 86400000) + 1);
						break;

					case 'yy': // Two digit year (00 - 99)
						curVal = value.getFullYear().toString();
						result.push(curVal.substring(curVal.length - 2));
						break;

					case 'yyyy': // Four digit year (100 - 9666)
						result.push(value.getFullYear());
						break;

					case 'w': // Day of the week (1 - 7)
						result.push(value.getDay() + 1);
						break;

					case 'ww': // Week of the year (1 - 53)
						curVal = new Date(value.getFullYear(), 0, 1);
						result.push(Math.ceil(((value - curVal) / 86400000 + curVal.getDay() + 1) / 7));
						break;

					case 'h': // Single digit (0 - 23)
						curVal = value.getHours();
						if (hasAMPM) {
							if (curVal == 0) {
								curVal = 12;
							} 
							else if (curVal > 12) {
								curVal -= 12;
							}
						}
						result.push(curVal);
						break;

					case 'hh': // Two digit (00 - 23)
						curVal = value.getHours();
						if (hasAMPM) {
							if (curVal == 0) {
								curVal = 12;
							} 
							else if (curVal > 12) {
								curVal -= 12;
							}
						}
						if(curVal < 10) result.push('0');
						result.push(curVal);
						break;

					case 'n': // Single digit (0 - 59)
						result.push(value.getMinutes());
						break;

					case 'nn': // Two digit (00 - 59)
						curVal = value.getMinutes();
						if (curVal < 10) result.push('0');
						result.push(curVal);
						break;

					case 's': // Single digit (0 - 59)
						result.push(value.getSeconds());
						break;

					case 'ss': // Two digit second (00 - 59)
						curVal = value.getSeconds();
						if (curVal < 10) result.push('0');
						result.push(curVal);
						break;

					case 'q': // Quarter of the year (1 - 4)
						result.push(Math.floor(value.getMonth() / 3) + 1);
						break;

					default:
						result.push(parsedToken);
				}
			}

			format = format.replace(nextToken, '');
		}

		return result.join('');
	},

	hasCors: function() {
        if(hasCorsResult == null) 
            hasCorsResult = XMLHttpRequest && (new XMLHttpRequest().withCredentials !== undefined);
        return hasCorsResult;
    },

    filterUrl: function(url) {
        return (!this.inDV() && this.inSocial()) ? new dojo._Url( url ).path : url;
    },

    inDV: function() {
        return !!window.dv;
    },

    inSocial: function() {
        return !!window.manhattanApp;
    },
	
	closestClass: function( cls, node ) {
		
		var cur = node && node.parentNode;
		
		while ( cur && !this.matchClass( cur, cls ) ) {
			cur = cur.parentNode;
		}
		
		return cur;
	},
	
	matchClass: function( node, cls ) {
		
		var c = node.className.split( ' ' );
		
		for ( var i = 0, l = c.length; i < l; i++ ) {
			
			if ( c[ i ] === cls ) {
				return true;
			}
		}
		
		return false;
	},

    log: function(err) {

        var url = '/log/client/' + encodeURIComponent(err);

        var xhrArgs = {
            url: url,
            preventCache: true,
            handleAs: "json",
            callbackParamName: 'callback',
            load: function(data){
                console.log('log successful');
            },
            error: function(error){
                console.log(error);
            }
        }

        try {
            dojo.io.script.get(xhrArgs);
        }
        catch( e ) {

        }
    }
});