
/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module.exports) {
    var mod = {};
    mod.exports = {};
    mod.client = mod.component = true;
    module.call(this, mod.exports, require.relative(resolved), mod);
    module.exports = mod.exports;
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (require.modules.hasOwnProperty(path)) return path;
    if (require.aliases.hasOwnProperty(path)) return require.aliases[path];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!require.modules.hasOwnProperty(from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return require.modules.hasOwnProperty(localRequire.resolve(path));
  };

  return localRequire;
};
require.register("component-moment/index.js", function(exports, require, module){
// moment.js
// version : 2.0.0
// author : Tim Wood
// license : MIT
// momentjs.com

(function (undefined) {

    /************************************
        Constants
    ************************************/

    var moment,
        VERSION = "2.0.0",
        round = Math.round, i,
        // internal storage for language config files
        languages = {},

        // check for nodeJS
        hasModule = (typeof module !== 'undefined' && module.exports),

        // ASP.NET json date format regex
        aspNetJsonRegex = /^\/?Date\((\-?\d+)/i,

        // format tokens
        formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|YYYYY|YYYY|YY|a|A|hh?|HH?|mm?|ss?|SS?S?|X|zz?|ZZ?|.)/g,
        localFormattingTokens = /(\[[^\[]*\])|(\\)?(LT|LL?L?L?|l{1,4})/g,

        // parsing tokens
        parseMultipleFormatChunker = /([0-9a-zA-Z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+)/gi,

        // parsing token regexes
        parseTokenOneOrTwoDigits = /\d\d?/, // 0 - 99
        parseTokenOneToThreeDigits = /\d{1,3}/, // 0 - 999
        parseTokenThreeDigits = /\d{3}/, // 000 - 999
        parseTokenFourDigits = /\d{1,4}/, // 0 - 9999
        parseTokenSixDigits = /[+\-]?\d{1,6}/, // -999,999 - 999,999
        parseTokenWord = /[0-9]*[a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF]+\s*?[\u0600-\u06FF]+/i, // any word (or two) characters or numbers including two word month in arabic.
        parseTokenTimezone = /Z|[\+\-]\d\d:?\d\d/i, // +00:00 -00:00 +0000 -0000 or Z
        parseTokenT = /T/i, // T (ISO seperator)
        parseTokenTimestampMs = /[\+\-]?\d+(\.\d{1,3})?/, // 123456789 123456789.123

        // preliminary iso regex
        // 0000-00-00 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000
        isoRegex = /^\s*\d{4}-\d\d-\d\d((T| )(\d\d(:\d\d(:\d\d(\.\d\d?\d?)?)?)?)?([\+\-]\d\d:?\d\d)?)?/,
        isoFormat = 'YYYY-MM-DDTHH:mm:ssZ',

        // iso time formats and regexes
        isoTimes = [
            ['HH:mm:ss.S', /(T| )\d\d:\d\d:\d\d\.\d{1,3}/],
            ['HH:mm:ss', /(T| )\d\d:\d\d:\d\d/],
            ['HH:mm', /(T| )\d\d:\d\d/],
            ['HH', /(T| )\d\d/]
        ],

        // timezone chunker "+10:00" > ["10", "00"] or "-1530" > ["-15", "30"]
        parseTimezoneChunker = /([\+\-]|\d\d)/gi,

        // getter and setter names
        proxyGettersAndSetters = 'Month|Date|Hours|Minutes|Seconds|Milliseconds'.split('|'),
        unitMillisecondFactors = {
            'Milliseconds' : 1,
            'Seconds' : 1e3,
            'Minutes' : 6e4,
            'Hours' : 36e5,
            'Days' : 864e5,
            'Months' : 2592e6,
            'Years' : 31536e6
        },

        // format function strings
        formatFunctions = {},

        // tokens to ordinalize and pad
        ordinalizeTokens = 'DDD w W M D d'.split(' '),
        paddedTokens = 'M D H h m s w W'.split(' '),

        formatTokenFunctions = {
            M    : function () {
                return this.month() + 1;
            },
            MMM  : function (format) {
                return this.lang().monthsShort(this, format);
            },
            MMMM : function (format) {
                return this.lang().months(this, format);
            },
            D    : function () {
                return this.date();
            },
            DDD  : function () {
                return this.dayOfYear();
            },
            d    : function () {
                return this.day();
            },
            dd   : function (format) {
                return this.lang().weekdaysMin(this, format);
            },
            ddd  : function (format) {
                return this.lang().weekdaysShort(this, format);
            },
            dddd : function (format) {
                return this.lang().weekdays(this, format);
            },
            w    : function () {
                return this.week();
            },
            W    : function () {
                return this.isoWeek();
            },
            YY   : function () {
                return leftZeroFill(this.year() % 100, 2);
            },
            YYYY : function () {
                return leftZeroFill(this.year(), 4);
            },
            YYYYY : function () {
                return leftZeroFill(this.year(), 5);
            },
            a    : function () {
                return this.lang().meridiem(this.hours(), this.minutes(), true);
            },
            A    : function () {
                return this.lang().meridiem(this.hours(), this.minutes(), false);
            },
            H    : function () {
                return this.hours();
            },
            h    : function () {
                return this.hours() % 12 || 12;
            },
            m    : function () {
                return this.minutes();
            },
            s    : function () {
                return this.seconds();
            },
            S    : function () {
                return ~~(this.milliseconds() / 100);
            },
            SS   : function () {
                return leftZeroFill(~~(this.milliseconds() / 10), 2);
            },
            SSS  : function () {
                return leftZeroFill(this.milliseconds(), 3);
            },
            Z    : function () {
                var a = -this.zone(),
                    b = "+";
                if (a < 0) {
                    a = -a;
                    b = "-";
                }
                return b + leftZeroFill(~~(a / 60), 2) + ":" + leftZeroFill(~~a % 60, 2);
            },
            ZZ   : function () {
                var a = -this.zone(),
                    b = "+";
                if (a < 0) {
                    a = -a;
                    b = "-";
                }
                return b + leftZeroFill(~~(10 * a / 6), 4);
            },
            X    : function () {
                return this.unix();
            }
        };

    function padToken(func, count) {
        return function (a) {
            return leftZeroFill(func.call(this, a), count);
        };
    }
    function ordinalizeToken(func) {
        return function (a) {
            return this.lang().ordinal(func.call(this, a));
        };
    }

    while (ordinalizeTokens.length) {
        i = ordinalizeTokens.pop();
        formatTokenFunctions[i + 'o'] = ordinalizeToken(formatTokenFunctions[i]);
    }
    while (paddedTokens.length) {
        i = paddedTokens.pop();
        formatTokenFunctions[i + i] = padToken(formatTokenFunctions[i], 2);
    }
    formatTokenFunctions.DDDD = padToken(formatTokenFunctions.DDD, 3);


    /************************************
        Constructors
    ************************************/

    function Language() {

    }

    // Moment prototype object
    function Moment(config) {
        extend(this, config);
    }

    // Duration Constructor
    function Duration(duration) {
        var data = this._data = {},
            years = duration.years || duration.year || duration.y || 0,
            months = duration.months || duration.month || duration.M || 0,
            weeks = duration.weeks || duration.week || duration.w || 0,
            days = duration.days || duration.day || duration.d || 0,
            hours = duration.hours || duration.hour || duration.h || 0,
            minutes = duration.minutes || duration.minute || duration.m || 0,
            seconds = duration.seconds || duration.second || duration.s || 0,
            milliseconds = duration.milliseconds || duration.millisecond || duration.ms || 0;

        // representation for dateAddRemove
        this._milliseconds = milliseconds +
            seconds * 1e3 + // 1000
            minutes * 6e4 + // 1000 * 60
            hours * 36e5; // 1000 * 60 * 60
        // Because of dateAddRemove treats 24 hours as different from a
        // day when working around DST, we need to store them separately
        this._days = days +
            weeks * 7;
        // It is impossible translate months into days without knowing
        // which months you are are talking about, so we have to store
        // it separately.
        this._months = months +
            years * 12;

        // The following code bubbles up values, see the tests for
        // examples of what that means.
        data.milliseconds = milliseconds % 1000;
        seconds += absRound(milliseconds / 1000);

        data.seconds = seconds % 60;
        minutes += absRound(seconds / 60);

        data.minutes = minutes % 60;
        hours += absRound(minutes / 60);

        data.hours = hours % 24;
        days += absRound(hours / 24);

        days += weeks * 7;
        data.days = days % 30;

        months += absRound(days / 30);

        data.months = months % 12;
        years += absRound(months / 12);

        data.years = years;
    }


    /************************************
        Helpers
    ************************************/


    function extend(a, b) {
        for (var i in b) {
            if (b.hasOwnProperty(i)) {
                a[i] = b[i];
            }
        }
        return a;
    }

    function absRound(number) {
        if (number < 0) {
            return Math.ceil(number);
        } else {
            return Math.floor(number);
        }
    }

    // left zero fill a number
    // see http://jsperf.com/left-zero-filling for performance comparison
    function leftZeroFill(number, targetLength) {
        var output = number + '';
        while (output.length < targetLength) {
            output = '0' + output;
        }
        return output;
    }

    // helper function for _.addTime and _.subtractTime
    function addOrSubtractDurationFromMoment(mom, duration, isAdding) {
        var ms = duration._milliseconds,
            d = duration._days,
            M = duration._months,
            currentDate;

        if (ms) {
            mom._d.setTime(+mom + ms * isAdding);
        }
        if (d) {
            mom.date(mom.date() + d * isAdding);
        }
        if (M) {
            currentDate = mom.date();
            mom.date(1)
                .month(mom.month() + M * isAdding)
                .date(Math.min(currentDate, mom.daysInMonth()));
        }
    }

    // check if is an array
    function isArray(input) {
        return Object.prototype.toString.call(input) === '[object Array]';
    }

    // compare two arrays, return the number of differences
    function compareArrays(array1, array2) {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++) {
            if (~~array1[i] !== ~~array2[i]) {
                diffs++;
            }
        }
        return diffs + lengthDiff;
    }


    /************************************
        Languages
    ************************************/


    Language.prototype = {
        set : function (config) {
            var prop, i;
            for (i in config) {
                prop = config[i];
                if (typeof prop === 'function') {
                    this[i] = prop;
                } else {
                    this['_' + i] = prop;
                }
            }
        },

        _months : "January_February_March_April_May_June_July_August_September_October_November_December".split("_"),
        months : function (m) {
            return this._months[m.month()];
        },

        _monthsShort : "Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),
        monthsShort : function (m) {
            return this._monthsShort[m.month()];
        },

        monthsParse : function (monthName) {
            var i, mom, regex, output;

            if (!this._monthsParse) {
                this._monthsParse = [];
            }

            for (i = 0; i < 12; i++) {
                // make the regex if we don't have it already
                if (!this._monthsParse[i]) {
                    mom = moment([2000, i]);
                    regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
                    this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
                }
                // test the regex
                if (this._monthsParse[i].test(monthName)) {
                    return i;
                }
            }
        },

        _weekdays : "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),
        weekdays : function (m) {
            return this._weekdays[m.day()];
        },

        _weekdaysShort : "Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),
        weekdaysShort : function (m) {
            return this._weekdaysShort[m.day()];
        },

        _weekdaysMin : "Su_Mo_Tu_We_Th_Fr_Sa".split("_"),
        weekdaysMin : function (m) {
            return this._weekdaysMin[m.day()];
        },

        _longDateFormat : {
            LT : "h:mm A",
            L : "MM/DD/YYYY",
            LL : "MMMM D YYYY",
            LLL : "MMMM D YYYY LT",
            LLLL : "dddd, MMMM D YYYY LT"
        },
        longDateFormat : function (key) {
            var output = this._longDateFormat[key];
            if (!output && this._longDateFormat[key.toUpperCase()]) {
                output = this._longDateFormat[key.toUpperCase()].replace(/MMMM|MM|DD|dddd/g, function (val) {
                    return val.slice(1);
                });
                this._longDateFormat[key] = output;
            }
            return output;
        },

        meridiem : function (hours, minutes, isLower) {
            if (hours > 11) {
                return isLower ? 'pm' : 'PM';
            } else {
                return isLower ? 'am' : 'AM';
            }
        },

        _calendar : {
            sameDay : '[Today at] LT',
            nextDay : '[Tomorrow at] LT',
            nextWeek : 'dddd [at] LT',
            lastDay : '[Yesterday at] LT',
            lastWeek : '[last] dddd [at] LT',
            sameElse : 'L'
        },
        calendar : function (key, mom) {
            var output = this._calendar[key];
            return typeof output === 'function' ? output.apply(mom) : output;
        },

        _relativeTime : {
            future : "in %s",
            past : "%s ago",
            s : "a few seconds",
            m : "a minute",
            mm : "%d minutes",
            h : "an hour",
            hh : "%d hours",
            d : "a day",
            dd : "%d days",
            M : "a month",
            MM : "%d months",
            y : "a year",
            yy : "%d years"
        },
        relativeTime : function (number, withoutSuffix, string, isFuture) {
            var output = this._relativeTime[string];
            return (typeof output === 'function') ?
                output(number, withoutSuffix, string, isFuture) :
                output.replace(/%d/i, number);
        },
        pastFuture : function (diff, output) {
            var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
            return typeof format === 'function' ? format(output) : format.replace(/%s/i, output);
        },

        ordinal : function (number) {
            return this._ordinal.replace("%d", number);
        },
        _ordinal : "%d",

        preparse : function (string) {
            return string;
        },

        postformat : function (string) {
            return string;
        },

        week : function (mom) {
            return weekOfYear(mom, this._week.dow, this._week.doy);
        },
        _week : {
            dow : 0, // Sunday is the first day of the week.
            doy : 6  // The week that contains Jan 1st is the first week of the year.
        }
    };

    // Loads a language definition into the `languages` cache.  The function
    // takes a key and optionally values.  If not in the browser and no values
    // are provided, it will load the language file module.  As a convenience,
    // this function also returns the language values.
    function loadLang(key, values) {
        values.abbr = key;
        if (!languages[key]) {
            languages[key] = new Language();
        }
        languages[key].set(values);
        return languages[key];
    }

    // Determines which language definition to use and returns it.
    //
    // With no parameters, it will return the global language.  If you
    // pass in a language key, such as 'en', it will return the
    // definition for 'en', so long as 'en' has already been loaded using
    // moment.lang.
    function getLangDefinition(key) {
        if (!key) {
            return moment.fn._lang;
        }
        if (!languages[key] && hasModule) {
            require('./lang/' + key);
        }
        return languages[key];
    }


    /************************************
        Formatting
    ************************************/


    function removeFormattingTokens(input) {
        if (input.match(/\[.*\]/)) {
            return input.replace(/^\[|\]$/g, "");
        }
        return input.replace(/\\/g, "");
    }

    function makeFormatFunction(format) {
        var array = format.match(formattingTokens), i, length;

        for (i = 0, length = array.length; i < length; i++) {
            if (formatTokenFunctions[array[i]]) {
                array[i] = formatTokenFunctions[array[i]];
            } else {
                array[i] = removeFormattingTokens(array[i]);
            }
        }

        return function (mom) {
            var output = "";
            for (i = 0; i < length; i++) {
                output += typeof array[i].call === 'function' ? array[i].call(mom, format) : array[i];
            }
            return output;
        };
    }

    // format date using native date object
    function formatMoment(m, format) {
        var i = 5;

        function replaceLongDateFormatTokens(input) {
            return m.lang().longDateFormat(input) || input;
        }

        while (i-- && localFormattingTokens.test(format)) {
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
        }

        if (!formatFunctions[format]) {
            formatFunctions[format] = makeFormatFunction(format);
        }

        return formatFunctions[format](m);
    }


    /************************************
        Parsing
    ************************************/


    // get the regex to find the next token
    function getParseRegexForToken(token) {
        switch (token) {
        case 'DDDD':
            return parseTokenThreeDigits;
        case 'YYYY':
            return parseTokenFourDigits;
        case 'YYYYY':
            return parseTokenSixDigits;
        case 'S':
        case 'SS':
        case 'SSS':
        case 'DDD':
            return parseTokenOneToThreeDigits;
        case 'MMM':
        case 'MMMM':
        case 'dd':
        case 'ddd':
        case 'dddd':
        case 'a':
        case 'A':
            return parseTokenWord;
        case 'X':
            return parseTokenTimestampMs;
        case 'Z':
        case 'ZZ':
            return parseTokenTimezone;
        case 'T':
            return parseTokenT;
        case 'MM':
        case 'DD':
        case 'YY':
        case 'HH':
        case 'hh':
        case 'mm':
        case 'ss':
        case 'M':
        case 'D':
        case 'd':
        case 'H':
        case 'h':
        case 'm':
        case 's':
            return parseTokenOneOrTwoDigits;
        default :
            return new RegExp(token.replace('\\', ''));
        }
    }

    // function to convert string input to date
    function addTimeToArrayFromToken(token, input, config) {
        var a, b,
            datePartArray = config._a;

        switch (token) {
        // MONTH
        case 'M' : // fall through to MM
        case 'MM' :
            datePartArray[1] = (input == null) ? 0 : ~~input - 1;
            break;
        case 'MMM' : // fall through to MMMM
        case 'MMMM' :
            a = getLangDefinition(config._l).monthsParse(input);
            // if we didn't find a month name, mark the date as invalid.
            if (a != null) {
                datePartArray[1] = a;
            } else {
                config._isValid = false;
            }
            break;
        // DAY OF MONTH
        case 'D' : // fall through to DDDD
        case 'DD' : // fall through to DDDD
        case 'DDD' : // fall through to DDDD
        case 'DDDD' :
            if (input != null) {
                datePartArray[2] = ~~input;
            }
            break;
        // YEAR
        case 'YY' :
            datePartArray[0] = ~~input + (~~input > 68 ? 1900 : 2000);
            break;
        case 'YYYY' :
        case 'YYYYY' :
            datePartArray[0] = ~~input;
            break;
        // AM / PM
        case 'a' : // fall through to A
        case 'A' :
            config._isPm = ((input + '').toLowerCase() === 'pm');
            break;
        // 24 HOUR
        case 'H' : // fall through to hh
        case 'HH' : // fall through to hh
        case 'h' : // fall through to hh
        case 'hh' :
            datePartArray[3] = ~~input;
            break;
        // MINUTE
        case 'm' : // fall through to mm
        case 'mm' :
            datePartArray[4] = ~~input;
            break;
        // SECOND
        case 's' : // fall through to ss
        case 'ss' :
            datePartArray[5] = ~~input;
            break;
        // MILLISECOND
        case 'S' :
        case 'SS' :
        case 'SSS' :
            datePartArray[6] = ~~ (('0.' + input) * 1000);
            break;
        // UNIX TIMESTAMP WITH MS
        case 'X':
            config._d = new Date(parseFloat(input) * 1000);
            break;
        // TIMEZONE
        case 'Z' : // fall through to ZZ
        case 'ZZ' :
            config._useUTC = true;
            a = (input + '').match(parseTimezoneChunker);
            if (a && a[1]) {
                config._tzh = ~~a[1];
            }
            if (a && a[2]) {
                config._tzm = ~~a[2];
            }
            // reverse offsets
            if (a && a[0] === '+') {
                config._tzh = -config._tzh;
                config._tzm = -config._tzm;
            }
            break;
        }

        // if the input is null, the date is not valid
        if (input == null) {
            config._isValid = false;
        }
    }

    // convert an array to a date.
    // the array should mirror the parameters below
    // note: all values past the year are optional and will default to the lowest possible value.
    // [year, month, day , hour, minute, second, millisecond]
    function dateFromArray(config) {
        var i, date, input = [];

        if (config._d) {
            return;
        }

        for (i = 0; i < 7; i++) {
            config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
        }

        // add the offsets to the time to be parsed so that we can have a clean array for checking isValid
        input[3] += config._tzh || 0;
        input[4] += config._tzm || 0;

        date = new Date(0);

        if (config._useUTC) {
            date.setUTCFullYear(input[0], input[1], input[2]);
            date.setUTCHours(input[3], input[4], input[5], input[6]);
        } else {
            date.setFullYear(input[0], input[1], input[2]);
            date.setHours(input[3], input[4], input[5], input[6]);
        }

        config._d = date;
    }

    // date from string and format string
    function makeDateFromStringAndFormat(config) {
        // This array is used to make a Date, either with `new Date` or `Date.UTC`
        var tokens = config._f.match(formattingTokens),
            string = config._i,
            i, parsedInput;

        config._a = [];

        for (i = 0; i < tokens.length; i++) {
            parsedInput = (getParseRegexForToken(tokens[i]).exec(string) || [])[0];
            if (parsedInput) {
                string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
            }
            // don't parse if its not a known token
            if (formatTokenFunctions[tokens[i]]) {
                addTimeToArrayFromToken(tokens[i], parsedInput, config);
            }
        }
        // handle am pm
        if (config._isPm && config._a[3] < 12) {
            config._a[3] += 12;
        }
        // if is 12 am, change hours to 0
        if (config._isPm === false && config._a[3] === 12) {
            config._a[3] = 0;
        }
        // return
        dateFromArray(config);
    }

    // date from string and array of format strings
    function makeDateFromStringAndArray(config) {
        var tempConfig,
            tempMoment,
            bestMoment,

            scoreToBeat = 99,
            i,
            currentScore;

        for (i = config._f.length; i > 0; i--) {
            tempConfig = extend({}, config);
            tempConfig._f = config._f[i - 1];
            makeDateFromStringAndFormat(tempConfig);
            tempMoment = new Moment(tempConfig);

            if (tempMoment.isValid()) {
                bestMoment = tempMoment;
                break;
            }

            currentScore = compareArrays(tempConfig._a, tempMoment.toArray());

            if (currentScore < scoreToBeat) {
                scoreToBeat = currentScore;
                bestMoment = tempMoment;
            }
        }

        extend(config, bestMoment);
    }

    // date from iso format
    function makeDateFromString(config) {
        var i,
            string = config._i;
        if (isoRegex.exec(string)) {
            config._f = 'YYYY-MM-DDT';
            for (i = 0; i < 4; i++) {
                if (isoTimes[i][1].exec(string)) {
                    config._f += isoTimes[i][0];
                    break;
                }
            }
            if (parseTokenTimezone.exec(string)) {
                config._f += " Z";
            }
            makeDateFromStringAndFormat(config);
        } else {
            config._d = new Date(string);
        }
    }

    function makeDateFromInput(config) {
        var input = config._i,
            matched = aspNetJsonRegex.exec(input);

        if (input === undefined) {
            config._d = new Date();
        } else if (matched) {
            config._d = new Date(+matched[1]);
        } else if (typeof input === 'string') {
            makeDateFromString(config);
        } else if (isArray(input)) {
            config._a = input.slice(0);
            dateFromArray(config);
        } else {
            config._d = input instanceof Date ? new Date(+input) : new Date(input);
        }
    }


    /************************************
        Relative Time
    ************************************/


    // helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, lang) {
        return lang.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
    }

    function relativeTime(milliseconds, withoutSuffix, lang) {
        var seconds = round(Math.abs(milliseconds) / 1000),
            minutes = round(seconds / 60),
            hours = round(minutes / 60),
            days = round(hours / 24),
            years = round(days / 365),
            args = seconds < 45 && ['s', seconds] ||
                minutes === 1 && ['m'] ||
                minutes < 45 && ['mm', minutes] ||
                hours === 1 && ['h'] ||
                hours < 22 && ['hh', hours] ||
                days === 1 && ['d'] ||
                days <= 25 && ['dd', days] ||
                days <= 45 && ['M'] ||
                days < 345 && ['MM', round(days / 30)] ||
                years === 1 && ['y'] || ['yy', years];
        args[2] = withoutSuffix;
        args[3] = milliseconds > 0;
        args[4] = lang;
        return substituteTimeAgo.apply({}, args);
    }


    /************************************
        Week of Year
    ************************************/


    // firstDayOfWeek       0 = sun, 6 = sat
    //                      the day of the week that starts the week
    //                      (usually sunday or monday)
    // firstDayOfWeekOfYear 0 = sun, 6 = sat
    //                      the first week is the week that contains the first
    //                      of this day of the week
    //                      (eg. ISO weeks use thursday (4))
    function weekOfYear(mom, firstDayOfWeek, firstDayOfWeekOfYear) {
        var end = firstDayOfWeekOfYear - firstDayOfWeek,
            daysToDayOfWeek = firstDayOfWeekOfYear - mom.day();


        if (daysToDayOfWeek > end) {
            daysToDayOfWeek -= 7;
        }

        if (daysToDayOfWeek < end - 7) {
            daysToDayOfWeek += 7;
        }

        return Math.ceil(moment(mom).add('d', daysToDayOfWeek).dayOfYear() / 7);
    }


    /************************************
        Top Level Functions
    ************************************/

    function makeMoment(config) {
        var input = config._i,
            format = config._f;

        if (input === null || input === '') {
            return null;
        }

        if (typeof input === 'string') {
            config._i = input = getLangDefinition().preparse(input);
        }

        if (moment.isMoment(input)) {
            config = extend({}, input);
            config._d = new Date(+input._d);
        } else if (format) {
            if (isArray(format)) {
                makeDateFromStringAndArray(config);
            } else {
                makeDateFromStringAndFormat(config);
            }
        } else {
            makeDateFromInput(config);
        }

        return new Moment(config);
    }

    moment = function (input, format, lang) {
        return makeMoment({
            _i : input,
            _f : format,
            _l : lang,
            _isUTC : false
        });
    };

    // creating with utc
    moment.utc = function (input, format, lang) {
        return makeMoment({
            _useUTC : true,
            _isUTC : true,
            _l : lang,
            _i : input,
            _f : format
        });
    };

    // creating with unix timestamp (in seconds)
    moment.unix = function (input) {
        return moment(input * 1000);
    };

    // duration
    moment.duration = function (input, key) {
        var isDuration = moment.isDuration(input),
            isNumber = (typeof input === 'number'),
            duration = (isDuration ? input._data : (isNumber ? {} : input)),
            ret;

        if (isNumber) {
            if (key) {
                duration[key] = input;
            } else {
                duration.milliseconds = input;
            }
        }

        ret = new Duration(duration);

        if (isDuration && input.hasOwnProperty('_lang')) {
            ret._lang = input._lang;
        }

        return ret;
    };

    // version number
    moment.version = VERSION;

    // default format
    moment.defaultFormat = isoFormat;

    // This function will load languages and then set the global language.  If
    // no arguments are passed in, it will simply return the current global
    // language key.
    moment.lang = function (key, values) {
        var i;

        if (!key) {
            return moment.fn._lang._abbr;
        }
        if (values) {
            loadLang(key, values);
        } else if (!languages[key]) {
            getLangDefinition(key);
        }
        moment.duration.fn._lang = moment.fn._lang = getLangDefinition(key);
    };

    // returns language data
    moment.langData = function (key) {
        if (key && key._lang && key._lang._abbr) {
            key = key._lang._abbr;
        }
        return getLangDefinition(key);
    };

    // compare moment object
    moment.isMoment = function (obj) {
        return obj instanceof Moment;
    };

    // for typechecking Duration objects
    moment.isDuration = function (obj) {
        return obj instanceof Duration;
    };


    /************************************
        Moment Prototype
    ************************************/


    moment.fn = Moment.prototype = {

        clone : function () {
            return moment(this);
        },

        valueOf : function () {
            return +this._d;
        },

        unix : function () {
            return Math.floor(+this._d / 1000);
        },

        toString : function () {
            return this.format("ddd MMM DD YYYY HH:mm:ss [GMT]ZZ");
        },

        toDate : function () {
            return this._d;
        },

        toJSON : function () {
            return moment.utc(this).format('YYYY-MM-DD[T]HH:mm:ss.SSS[Z]');
        },

        toArray : function () {
            var m = this;
            return [
                m.year(),
                m.month(),
                m.date(),
                m.hours(),
                m.minutes(),
                m.seconds(),
                m.milliseconds()
            ];
        },

        isValid : function () {
            if (this._isValid == null) {
                if (this._a) {
                    this._isValid = !compareArrays(this._a, (this._isUTC ? moment.utc(this._a) : moment(this._a)).toArray());
                } else {
                    this._isValid = !isNaN(this._d.getTime());
                }
            }
            return !!this._isValid;
        },

        utc : function () {
            this._isUTC = true;
            return this;
        },

        local : function () {
            this._isUTC = false;
            return this;
        },

        format : function (inputString) {
            var output = formatMoment(this, inputString || moment.defaultFormat);
            return this.lang().postformat(output);
        },

        add : function (input, val) {
            var dur;
            // switch args to support add('s', 1) and add(1, 's')
            if (typeof input === 'string') {
                dur = moment.duration(+val, input);
            } else {
                dur = moment.duration(input, val);
            }
            addOrSubtractDurationFromMoment(this, dur, 1);
            return this;
        },

        subtract : function (input, val) {
            var dur;
            // switch args to support subtract('s', 1) and subtract(1, 's')
            if (typeof input === 'string') {
                dur = moment.duration(+val, input);
            } else {
                dur = moment.duration(input, val);
            }
            addOrSubtractDurationFromMoment(this, dur, -1);
            return this;
        },

        diff : function (input, units, asFloat) {
            var that = this._isUTC ? moment(input).utc() : moment(input).local(),
                zoneDiff = (this.zone() - that.zone()) * 6e4,
                diff, output;

            if (units) {
                // standardize on singular form
                units = units.replace(/s$/, '');
            }

            if (units === 'year' || units === 'month') {
                diff = (this.daysInMonth() + that.daysInMonth()) * 432e5; // 24 * 60 * 60 * 1000 / 2
                output = ((this.year() - that.year()) * 12) + (this.month() - that.month());
                output += ((this - moment(this).startOf('month')) - (that - moment(that).startOf('month'))) / diff;
                if (units === 'year') {
                    output = output / 12;
                }
            } else {
                diff = (this - that) - zoneDiff;
                output = units === 'second' ? diff / 1e3 : // 1000
                    units === 'minute' ? diff / 6e4 : // 1000 * 60
                    units === 'hour' ? diff / 36e5 : // 1000 * 60 * 60
                    units === 'day' ? diff / 864e5 : // 1000 * 60 * 60 * 24
                    units === 'week' ? diff / 6048e5 : // 1000 * 60 * 60 * 24 * 7
                    diff;
            }
            return asFloat ? output : absRound(output);
        },

        from : function (time, withoutSuffix) {
            return moment.duration(this.diff(time)).lang(this.lang()._abbr).humanize(!withoutSuffix);
        },

        fromNow : function (withoutSuffix) {
            return this.from(moment(), withoutSuffix);
        },

        calendar : function () {
            var diff = this.diff(moment().startOf('day'), 'days', true),
                format = diff < -6 ? 'sameElse' :
                diff < -1 ? 'lastWeek' :
                diff < 0 ? 'lastDay' :
                diff < 1 ? 'sameDay' :
                diff < 2 ? 'nextDay' :
                diff < 7 ? 'nextWeek' : 'sameElse';
            return this.format(this.lang().calendar(format, this));
        },

        isLeapYear : function () {
            var year = this.year();
            return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        },

        isDST : function () {
            return (this.zone() < moment([this.year()]).zone() ||
                this.zone() < moment([this.year(), 5]).zone());
        },

        day : function (input) {
            var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
            return input == null ? day :
                this.add({ d : input - day });
        },

        startOf: function (units) {
            units = units.replace(/s$/, '');
            // the following switch intentionally omits break keywords
            // to utilize falling through the cases.
            switch (units) {
            case 'year':
                this.month(0);
                /* falls through */
            case 'month':
                this.date(1);
                /* falls through */
            case 'week':
            case 'day':
                this.hours(0);
                /* falls through */
            case 'hour':
                this.minutes(0);
                /* falls through */
            case 'minute':
                this.seconds(0);
                /* falls through */
            case 'second':
                this.milliseconds(0);
                /* falls through */
            }

            // weeks are a special case
            if (units === 'week') {
                this.day(0);
            }

            return this;
        },

        endOf: function (units) {
            return this.startOf(units).add(units.replace(/s?$/, 's'), 1).subtract('ms', 1);
        },

        isAfter: function (input, units) {
            units = typeof units !== 'undefined' ? units : 'millisecond';
            return +this.clone().startOf(units) > +moment(input).startOf(units);
        },

        isBefore: function (input, units) {
            units = typeof units !== 'undefined' ? units : 'millisecond';
            return +this.clone().startOf(units) < +moment(input).startOf(units);
        },

        isSame: function (input, units) {
            units = typeof units !== 'undefined' ? units : 'millisecond';
            return +this.clone().startOf(units) === +moment(input).startOf(units);
        },

        zone : function () {
            return this._isUTC ? 0 : this._d.getTimezoneOffset();
        },

        daysInMonth : function () {
            return moment.utc([this.year(), this.month() + 1, 0]).date();
        },

        dayOfYear : function (input) {
            var dayOfYear = round((moment(this).startOf('day') - moment(this).startOf('year')) / 864e5) + 1;
            return input == null ? dayOfYear : this.add("d", (input - dayOfYear));
        },

        isoWeek : function (input) {
            var week = weekOfYear(this, 1, 4);
            return input == null ? week : this.add("d", (input - week) * 7);
        },

        week : function (input) {
            var week = this.lang().week(this);
            return input == null ? week : this.add("d", (input - week) * 7);
        },

        // If passed a language key, it will set the language for this
        // instance.  Otherwise, it will return the language configuration
        // variables for this instance.
        lang : function (key) {
            if (key === undefined) {
                return this._lang;
            } else {
                this._lang = getLangDefinition(key);
                return this;
            }
        }
    };

    // helper for adding shortcuts
    function makeGetterAndSetter(name, key) {
        moment.fn[name] = moment.fn[name + 's'] = function (input) {
            var utc = this._isUTC ? 'UTC' : '';
            if (input != null) {
                this._d['set' + utc + key](input);
                return this;
            } else {
                return this._d['get' + utc + key]();
            }
        };
    }

    // loop through and add shortcuts (Month, Date, Hours, Minutes, Seconds, Milliseconds)
    for (i = 0; i < proxyGettersAndSetters.length; i ++) {
        makeGetterAndSetter(proxyGettersAndSetters[i].toLowerCase().replace(/s$/, ''), proxyGettersAndSetters[i]);
    }

    // add shortcut for year (uses different syntax than the getter/setter 'year' == 'FullYear')
    makeGetterAndSetter('year', 'FullYear');

    // add plural methods
    moment.fn.days = moment.fn.day;
    moment.fn.weeks = moment.fn.week;
    moment.fn.isoWeeks = moment.fn.isoWeek;

    /************************************
        Duration Prototype
    ************************************/


    moment.duration.fn = Duration.prototype = {
        weeks : function () {
            return absRound(this.days() / 7);
        },

        valueOf : function () {
            return this._milliseconds +
              this._days * 864e5 +
              this._months * 2592e6;
        },

        humanize : function (withSuffix) {
            var difference = +this,
                output = relativeTime(difference, !withSuffix, this.lang());

            if (withSuffix) {
                output = this.lang().pastFuture(difference, output);
            }

            return this.lang().postformat(output);
        },

        lang : moment.fn.lang
    };

    function makeDurationGetter(name) {
        moment.duration.fn[name] = function () {
            return this._data[name];
        };
    }

    function makeDurationAsGetter(name, factor) {
        moment.duration.fn['as' + name] = function () {
            return +this / factor;
        };
    }

    for (i in unitMillisecondFactors) {
        if (unitMillisecondFactors.hasOwnProperty(i)) {
            makeDurationAsGetter(i, unitMillisecondFactors[i]);
            makeDurationGetter(i.toLowerCase());
        }
    }

    makeDurationAsGetter('Weeks', 6048e5);


    /************************************
        Default Lang
    ************************************/


    // Set default language, other languages will inherit from English.
    moment.lang('en', {
        ordinal : function (number) {
            var b = number % 10,
                output = (~~ (number % 100 / 10) === 1) ? 'th' :
                (b === 1) ? 'st' :
                (b === 2) ? 'nd' :
                (b === 3) ? 'rd' : 'th';
            return number + output;
        }
    });


    /************************************
        Exposing Moment
    ************************************/


    // CommonJS module is defined
    if (hasModule) {
        module.exports = moment;
    }
    /*global ender:false */
    if (typeof ender === 'undefined') {
        // here, `this` means `window` in the browser, or `global` on the server
        // add `moment` as a global object via a string identifier,
        // for Closure Compiler "advanced" mode
        this['moment'] = moment;
    }
    /*global define:false */
    if (typeof define === "function" && define.amd) {
        define("moment", [], function () {
            return moment;
        });
    }
}).call(this);

});
require.register("eugenicsarchivesca-overlay/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var Emitter = require('emitter')
  , classes = require('classes');

/**
 * Expose `Overlay`.
 */

module.exports = Overlay;

/**
 * Initialize a new `Overlay`.
 *
 * @param {Object} options
 * @api public
 */

function Overlay(options) {
  if (!(this instanceof Overlay)) return new Overlay(options);
  options || (options = {});
  this.duration = options.duration || 300;
}

/**
 * Mixin 'Emitter'
 */

Emitter(Overlay.prototype);

/**
 * Show the overlay.
 *
 * Emits "show" event.
 *
 * @return {Overlay}
 * @api public
 */

Overlay.prototype.show = function(){
  if (this.el) return;
  this.el = document.createElement('div');
  this.el.className = 'hide';
  this.el.id = 'overlay';
  document.getElementsByTagName('body')[0].appendChild(this.el);
  this.emit('show');
  var self = this;
  setTimeout(function(){
    classes(self.el).remove('hide');
  }, 0);
  return this;
};

/**
 * Hide the overlay.
 *
 * Emits "hide" event.
 *
 * @return {Overlay}
 * @api public
 */

Overlay.prototype.hide = function(){
  this.emit('hide');
  return this.remove();
};

/**
 * Remove the overlay from the DOM
 * Emits 'close' event.
 */

Overlay.prototype.remove = function(){
  if (!this.el) return;
  var self = this;
  classes(this.el).add('hide');
  setTimeout(function(){
    self.emit('close');
    self.el.parentNode.removeChild(self.el);
    delete self.el;
  }, this.duration);
  return this;
};

});
require.register("component-indexof/index.js", function(exports, require, module){

var indexOf = [].indexOf;

module.exports = function(arr, obj){
  if (indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
});
require.register("component-classes/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var index = require('indexof');

/**
 * Whitespace regexp.
 */

var re = /\s+/;

/**
 * toString reference.
 */

var toString = Object.prototype.toString;

/**
 * Wrap `el` in a `ClassList`.
 *
 * @param {Element} el
 * @return {ClassList}
 * @api public
 */

module.exports = function(el){
  return new ClassList(el);
};

/**
 * Initialize a new ClassList for `el`.
 *
 * @param {Element} el
 * @api private
 */

function ClassList(el) {
  this.el = el;
  this.list = el.classList;
}

/**
 * Add class `name` if not already present.
 *
 * @param {String} name
 * @return {ClassList}
 * @api public
 */

ClassList.prototype.add = function(name){
  // classList
  if (this.list) {
    this.list.add(name);
    return this;
  }

  // fallback
  var arr = this.array();
  var i = index(arr, name);
  if (!~i) arr.push(name);
  this.el.className = arr.join(' ');
  return this;
};

/**
 * Remove class `name` when present, or
 * pass a regular expression to remove
 * any which match.
 *
 * @param {String|RegExp} name
 * @return {ClassList}
 * @api public
 */

ClassList.prototype.remove = function(name){
  if ('[object RegExp]' == toString.call(name)) {
    return this.removeMatching(name);
  }

  // classList
  if (this.list) {
    this.list.remove(name);
    return this;
  }

  // fallback
  var arr = this.array();
  var i = index(arr, name);
  if (~i) arr.splice(i, 1);
  this.el.className = arr.join(' ');
  return this;
};

/**
 * Remove all classes matching `re`.
 *
 * @param {RegExp} re
 * @return {ClassList}
 * @api private
 */

ClassList.prototype.removeMatching = function(re){
  var arr = this.array();
  for (var i = 0; i < arr.length; i++) {
    if (re.test(arr[i])) {
      this.remove(arr[i]);
    }
  }
  return this;
};

/**
 * Toggle class `name`.
 *
 * @param {String} name
 * @return {ClassList}
 * @api public
 */

ClassList.prototype.toggle = function(name){
  // classList
  if (this.list) {
    this.list.toggle(name);
    return this;
  }

  // fallback
  if (this.has(name)) {
    this.remove(name);
  } else {
    this.add(name);
  }
  return this;
};

/**
 * Return an array of classes.
 *
 * @return {Array}
 * @api public
 */

ClassList.prototype.array = function(){
  var arr = this.el.className.split(re);
  if ('' === arr[0]) arr.pop();
  return arr;
};

/**
 * Check if class `name` is present.
 *
 * @param {String} name
 * @return {ClassList}
 * @api public
 */

ClassList.prototype.has =
ClassList.prototype.contains = function(name){
  return this.list
    ? this.list.contains(name)
    : !! ~index(this.array(), name);
};

});
require.register("ecarter-css-emitter/index.js", function(exports, require, module){
/**
 * Module Dependencies
 */

var events = require('event');

// CSS events

var watch = [
  'transitionend'
, 'webkitTransitionEnd'
, 'oTransitionEnd'
, 'MSTransitionEnd'
, 'animationend'
, 'webkitAnimationEnd'
, 'oAnimationEnd'
, 'MSAnimationEnd'
];

/**
 * Expose `CSSnext`
 */

module.exports = CssEmitter;

/**
 * Initialize a new `CssEmitter`
 *
 */

function CssEmitter(element){
  if (!(this instanceof CssEmitter)) return new CssEmitter(element);
  this.el = element;
}

/**
 * Bind CSS events.
 *
 * @api public
 */

CssEmitter.prototype.bind = function(fn){
  for (var i=0; i < watch.length; i++) {
    events.bind(this.el, watch[i], fn);
  }
};

/**
 * Unbind CSS events
 * 
 * @api public
 */

CssEmitter.prototype.unbind = function(fn){
  for (var i=0; i < watch.length; i++) {
    events.unbind(this.el, watch[i], fn);
  }
};



});
require.register("component-once/index.js", function(exports, require, module){

/**
 * Identifier.
 */

var n = 0;

/**
 * Global.
 */

var global = (function(){ return this })();

/**
 * Make `fn` callable only once.
 *
 * @param {Function} fn
 * @return {Function}
 * @api public
 */

module.exports = function(fn) {
  var id = n++;
  var called;

  function once(){
    // no receiver
    if (this == global) {
      if (called) return;
      called = true;
      return fn.apply(this, arguments);
    }

    // receiver
    var key = '__called_' + id + '__';
    if (this[key]) return;
    this[key] = true;
    return fn.apply(this, arguments);
  }

  return once;
};

});
require.register("eugenicsarchivesca-has-css-animations/index.js", function(exports, require, module){
// https://developer.mozilla.org/en-US/docs/CSS/Tutorials/Using_CSS_animations/Detecting_CSS_animation_support

var animation = false,
    animationstring = 'animation',
    keyframeprefix = '',
    domPrefixes = 'Webkit Moz O ms Khtml'.split(' '),
    pfx  = '';

var el = document.createElement('div');
if( el.style.animationName ) { animation = true; }

if( animation === false ) {
  for( var i = 0; i < domPrefixes.length; i++ ) {
    if( el.style[ domPrefixes[i] + 'AnimationName' ] !== undefined ) {
      pfx = domPrefixes[ i ];
      animationstring = pfx + 'Animation';
      keyframeprefix = '-' + pfx.toLowerCase() + '-';
      animation = true;
      break;
    }
  }
}

module.exports = animation;

});
require.register("bmcmahen-animate-css/index.js", function(exports, require, module){
var hasAnimations = require('has-css-animations')
  , classes = require('classes')
  , cssEvent = require('css-emitter')
  , once = require('once');

// API:
// animate(el, 'fadeOutRight', function(el){
//  $(el).remove();
// });

// If animations aren't supported, call back immediately,
// which allows us to immediately remove specific elements.

// One issue: If the browser supports animations, but an
// animation is called that doens't exist, things get
// screwed up because the callback is never invoked.
// Workarounds? Or maybe people should just fix their css...

module.exports = animate;

function animate(el, className, fn){
  if (!hasAnimations) {
    if (fn) fn(el);
    return;
  }
  var cls = classes(el);
  cls.add(className);
  cssEvent(el).bind(once(cleanup));
  function cleanup(){
    cls.remove(className);
    if (fn) fn(el);
  }
}
});
require.register("bmcmahen-modal/index.js", function(exports, require, module){
/**
 * Modal Dialogue
 *
 */

var Emitter = require('emitter')
  , Overlay = require('overlay')
  , classes = require('classes')
  , animate = require('animate-css');

var Modal = function (el, options) {
  if (!(this instanceof Modal)) return new Modal(el, options);
  if (!el) throw new TypeError('Modal() requires an element.');
  this.el = el;
  options = options || {};
  this.animationIn = options.animationIn || 'fadeInDownBig';
  this.animationOut = options.animationOut || 'fadeOutUpBig';
  this.duration = options.duration || 800;
  this.isShown = false;
  this.overlay = new Overlay({duration: this.duration});
};

module.exports = Modal;

Emitter(Modal.prototype);

// Functions
Modal.prototype.toggle = function(){
  return this.isShown ? this.hide() : this.show();
};

// Apply our animation to show the Modal.
Modal.prototype.show = function(){
  if (this.isShown) return;
  this.isShown = true;
  this.emit('show');
  this.overlay.show();
  var cls = classes(this.el)
    , _this = this;

  cls.add('in');
  animate(this.el, this.animationIn, function(el){
    cls.remove(this.animationIn);
    _this.emit('modalIn');
  });

  this.el.focus();
  return this;
};

Modal.prototype.hide = function(){
  if (!this.isShown) return;
  this.emit('hide');
  this.overlay.hide();
  this.isShown = false;
  var _this = this;
  animate(this.el, this.animationOut, function(el){
    classes(_this.el).remove('in');
    _this.emit('modalOut');
  });
  return this;
};

});
require.register("component-bind/index.js", function(exports, require, module){

/**
 * Slice reference.
 */

var slice = [].slice;

/**
 * Bind `obj` to `fn`.
 *
 * @param {Object} obj
 * @param {Function|String} fn or string
 * @return {Function}
 * @api public
 */

module.exports = function(obj, fn){
  if ('string' == typeof fn) fn = obj[fn];
  if ('function' != typeof fn) throw new Error('bind() requires a function');
  var args = [].slice.call(arguments, 2);
  return function(){
    return fn.apply(obj, args.concat(slice.call(arguments)));
  }
};

});
require.register("component-each/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var type = require('type');

/**
 * HOP reference.
 */

var has = Object.prototype.hasOwnProperty;

/**
 * Iterate the given `obj` and invoke `fn(val, i)`.
 *
 * @param {String|Array|Object} obj
 * @param {Function} fn
 * @api public
 */

module.exports = function(obj, fn){
  switch (type(obj)) {
    case 'array':
      return array(obj, fn);
    case 'object':
      if ('number' == typeof obj.length) return array(obj, fn);
      return object(obj, fn);
    case 'string':
      return string(obj, fn);
  }
};

/**
 * Iterate string chars.
 *
 * @param {String} obj
 * @param {Function} fn
 * @api private
 */

function string(obj, fn) {
  for (var i = 0; i < obj.length; ++i) {
    fn(obj.charAt(i), i);
  }
}

/**
 * Iterate object keys.
 *
 * @param {Object} obj
 * @param {Function} fn
 * @api private
 */

function object(obj, fn) {
  for (var key in obj) {
    if (has.call(obj, key)) {
      fn(key, obj[key]);
    }
  }
}

/**
 * Iterate array-ish.
 *
 * @param {Array|Object} obj
 * @param {Function} fn
 * @api private
 */

function array(obj, fn) {
  for (var i = 0; i < obj.length; ++i) {
    fn(obj[i], i);
  }
}
});
require.register("bmcmahen-ordered-dictionary/index.js", function(exports, require, module){
// Modules
var indexOf = require('indexof'),
		Emitter = require('emitter');

var OrderedDictonary = function(attr){
	if (!(this instanceof OrderedDictonary))
		return new OrderedDictonary(attr);

	this.map = {};
	this.array = [];

	if (typeof attr === 'object')
		this.set(attr);
};

module.exports = OrderedDictonary;

Emitter(OrderedDictonary.prototype);

// Allow both 'key', 'value' and {key: value} style arguments.
OrderedDictonary.prototype.set = function(key, val){
	var attr, attrs;
	if (typeof key === 'object') attrs = key;
	else (attrs = {})[key] = val;
	for (attr in attrs) {
		if (attr in this.map) this.map[attr] = attrs[attr];
		else {
			this.array.push(attr);
			this.map[attr] = attrs[attr];
			this.emit('enter', attrs[attr]);
		}
	}
	return this;
};

OrderedDictonary.prototype.remove = function(key) {
	var index = indexOf(this.array, key);
	if (index === -1) throw new Error('Key doesnt exist');
	this.emit('exit', this.map[key]);
	this.array.splice(index, 1);
	delete this.map[key];
};

OrderedDictonary.prototype.get = function(key){
	return this.map[key];
};

OrderedDictonary.prototype.at = function(index){
	return this.map[this.array[index]];
};

OrderedDictonary.prototype.length = function(){
	return this.array.length;
};

// Iterates through our array, providing the key, value,
// and index of the field.
OrderedDictonary.prototype.forEach = function(fn){
	var key, value;
	for (var i = 0, len = this.array.length; i < len; i++) {
		key = this.array[i];
		value = this.map[key];
		fn(key, value, i);
	}
	return this;
};

OrderedDictonary.prototype.sort = function(fn){
	var _this = this;
	this.array.sort(function(left, right){
		return fn(_this.map[left], _this.map[right]);
	});
	return this;
};

OrderedDictonary.prototype.clear = function(){
	this.map = {};
	this.array = [];
	return this;
};
});
require.register("component-has-translate3d/index.js", function(exports, require, module){

var prop = require('transform-property');
// IE8<= doesn't have `getComputedStyle`
if (!prop || !window.getComputedStyle) return module.exports = false;

var map = {
  webkitTransform: '-webkit-transform',
  OTransform: '-o-transform',
  msTransform: '-ms-transform',
  MozTransform: '-moz-transform',
  transform: 'transform'
};

// from: https://gist.github.com/lorenzopolidori/3794226
var el = document.createElement('div');
el.style[prop] = 'translate3d(1px,1px,1px)';
document.body.insertBefore(el, null);
var val = getComputedStyle(el).getPropertyValue(map[prop]);
document.body.removeChild(el);
module.exports = null != val && val.length && 'none' != val;

});
require.register("component-transform-property/index.js", function(exports, require, module){

var styles = [
  'webkitTransform',
  'MozTransform',
  'msTransform',
  'OTransform',
  'transform'
];

var el = document.createElement('p');
var style;

for (var i = 0; i < styles.length; i++) {
  style = styles[i];
  if (null != el.style[style]) {
    module.exports = style;
    break;
  }
}

});
require.register("component-translate/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var transform = require('transform-property');
var has3d = require('has-translate3d');

/**
 * Expose `translate`.
 */

module.exports = translate;

/**
 * Translate `el` by `(x, y)`.
 *
 * @param {Element} el
 * @param {Number} x
 * @param {Number} y
 * @api public
 */

function translate(el, x, y){
  if (transform) {
    if (has3d) {
      el.style[transform] = 'translate3d(' + x + 'px,' + y + 'px, 0)';
    } else {
      el.style[transform] = 'translate(' + x + 'px,' + y + 'px)';
    }
  } else {
    el.style.left = x;
    el.style.top = y;
  }
};

});
require.register("bmcmahen-cast/index.js", function(exports, require, module){
// Required Modules.
var Emitter = require('emitter')
  , clone = require('clone')
  , bind = require('bind')
  , type = require('type')
  , OrderedDictionary = require('ordered-dictionary')
  , indexOf = require('indexof')
  , translate = require('translate');

// By default, use these options. Should we bother with this?
var defaultOptions = {
  boxWidth: 75,
  paddingWidth: 5,
  boxHeight: 75,
  paddingHeight: 5,
  minWidth: 30,
  maxWidth: 80,
  ratio: 1
};

// Cast Constructor. Contains an ordered-dictionary of Cast-Item models.
var Cast = function(options){
  if (!(this instanceof Cast)) return new Cast(options);

  // Attributes
  this.collection = new OrderedDictionary();
  this.idCounter = 0;

  // Options
  options = options || {};
  for (var def in defaultOptions) {
    if (defaultOptions.hasOwnProperty(def) && options[def] == null) {
      options[def] = defaultOptions[def];
    }
  }
  this.setOptions(options);
};

Emitter(Cast.prototype);

// #data() allows us to give our Cast a collection of attributes. If a unique
// identifier is supplied in the callback (like _.id), then we can efficiently
// update, add, and remove models on subsequent .data() calls. If we don't
// have a unique identifier, then we just reset our collection.
Cast.prototype.data = function(attr, fn) {
  if (!fn) {
    this.reset(attr);
    return;
  }

  var len = this.collection.length(),
      keys = [];

  // Either update our model, or make a new one for each attribute
  // that we have passed.
  for ( var i = 0, l = attr.length; i < l; i++ ){
    var key = fn(attr[i]);
    var model = this.collection.get(key);
    keys.push(key);
    if (model) model.set(attr[i]);
    else this.collection.set(key, new Block(attr[i], this));
  }

  // If running .data() multiple times, remove any attributes
  // that were not contained in subsequent calls. XXX Improve.
  if (len) {
    var toRemove = [];
    this.collection.forEach(function(key, model, i){
      if (indexOf(keys, key) === -1 ) toRemove.push(key);
    });
    for (var x = 0, length = toRemove.length; x < length; x++){
      this.collection.remove(toRemove[x]);
    }
  }
  return this;
};

// Methods
Cast.prototype.toJSON = function(){
  var json = [];
  this.collection.forEach(function(key, value){
    json.push(value.toJSON());
  });
  return json;
};

// Courtesy of underscore.js
Cast.prototype.uniqueId = function(prefix){
  var id = ++this.idCounter + '';
  return prefix ? prefix + id : id;
};

Cast.prototype.reset = function(attr, fn){
  this.collection.clear();
  this.add(attr, fn);
  return this;
};

Cast.prototype.add = function(attr, fn){
  if (type(attr) !== 'array') attr = [attr];
  for (var i = 0, l = attr.length; i < l; i++){
    var key = fn ? fn(attr[i]) : this.uniqueId('c');
    var val = new Block(attr[i], this);
    this.collection.set(key, val);
  }
  return this;
};

Cast.prototype.remove = function(key){
  this.collection.remove(key);
};

Cast.prototype.setOptions = function(options){
  for (var option in options) {
    if (options.hasOwnProperty(option)) {
      if (option === 'wrapper') {
        this.wrapper = document.querySelector(options.wrapper);
        this.wrapperWidth = this.wrapper.clientWidth;
      } else {
        this[option] = options[option];
      }
    }
  }
  return this;
};

// The Cast items on the left/right will be fully aligned
// to the left/right side of the wrapper.
Cast.prototype.justify = function(options){
  if (options) this.setOptions(options);

  var cw = this.wrapperWidth,
      w = this.boxWidth,
      pw = this.paddingWidth,
      ph = this.paddingHeight,
      h = this.boxHeight;

  var bpr = Math.floor((cw - (pw * 2)) / (w + pw));
  var getLeft = function(c, r) {
    if (c === 0) return 0;
    if (c === bpr - 1) return cw - w;
    var remainingSpace = cw - (w * bpr),
        padding = remainingSpace / (bpr - 1);
    return w + (c * padding) + ((c - 1) * w);
  };

  this.collection.forEach(function(key, model, i){
    var r = Math.floor(i / bpr),
        c = i % bpr,
        left = getLeft(c, r),
        top = ((r * h) + (r + 1) * ph);

    model.set({
      'left': left,
      'top': top,
      'width': w,
      'height': h
    });
  });
  var t = this.collection.length();
  var wrapperHeight = Math.ceil(t / bpr) * (h + ph)  + ph;
  this.emit('wrapperHeight', wrapperHeight);
  return this;
};

// Ensure that there is padding on the far left and right
// of the wrapper.
Cast.prototype.center = function(options){
  if (options) this.setOptions(options);

  var cw = this.wrapperWidth
    , w = this.boxWidth
    , h = this.boxHeight
    , pw = this.paddingWidth
    , ph = this.paddingHeight;

  var bpr = Math.floor(cw/(w + pw));
  var mx = (cw - (bpr * w) - (bpr - 1) * pw) * 0.5;

  this.collection.forEach(function(key, model, i){
    var r = Math.floor(i / bpr)
      , c = i % bpr
      , left = mx + (c * (w + pw))
      , top = (r * h) + (r + 1) * ph;

    model.set({
      'left': left,
      'top': top,
      'width': w,
      'height': h
    });
  });
  var t = this.collection.length();
  var wrapperHeight = Math.ceil(t / bpr) * (h + ph)  + ph;
  this.emit('wrapperHeight', wrapperHeight);
  return this;
};

// Keeps a constant paddingWidth and Height with a
// dynamic CastWidth and CastHeight.
Cast.prototype.dynamic = function(options){
  if (options) this.setOptions(options);

  var cw = this.wrapperWidth
    , w = this.boxWidth
    , h = this.boxHeight
    , pw = this.paddingWidth
    , ph = this.paddingHeight;

  var bpr = Math.floor(cw / ( w + pw ));
  var newWidth = (cw - (bpr * pw)) / bpr;
  var newHeight = ( newWidth / w ) * h;
  var mx = (cw - (bpr * newWidth) - (bpr - 1) * pw) * 0.5;

  // XXX This logic is the same as center(). Should we make
  // this a shared function?
  this.collection.forEach(function(id, model, i){
    var r = Math.floor(i / bpr)
      , c = i % bpr
      , left = mx + (c * (newWidth + pw))
      , top = (r * newHeight) + (r + 1) * ph;

    model.set({
      width: newWidth,
      left: left,
      top: top,
      height: newHeight
    });
  });

  var t = this.collection.length();
  var wrapperHeight = Math.ceil(t / bpr) * (newHeight + ph)  + ph;
  this.emit('wrapperHeight', wrapperHeight);
  return this;
};

Cast.prototype.list = function(options){
  if (options) this.setOptions(options);
  var h = this.boxHeight
    , ph = this.paddingHeight;

  this.collection.forEach(function(id, model, i){
    var top = (h + ph) * i;
    model.set({
      left: 0,
      top: top,
      height: h
    });
  });

  this.emit('wrapperHeight', this.collection.length() * (h + ph));
  return this;
};

Cast.prototype.sortBy = function(field, invert){
  invert = invert || 1;
  this.collection.sort(function(left, right){
    var leftVal = left.get(field)
      , rightVal = right.get(field);
    if (leftVal < rightVal) return (-1 * invert);
    if (leftVal > rightVal) return (1 * invert);
    return 0;
  });
  return this;
};

Cast.prototype.draw = function(options){
  if (options) this.setOptions(options);
  if (!this.view) {
    this.view = new CastView(this);
  }
  this.wrapper.innerHTML = '';
  this.view.render();
  this.wrapper.appendChild(this.view.el);
  return this;
};


// Cast Item Model
// Events: change:attribute
// Constructor
var Block = function(attributes, context){
  this.context = context;
  this.attributes = { hidden: true };
  if (attributes) this.set(attributes);
};

Emitter(Block.prototype);

// Methods
Block.prototype.set = function(attr){
  var changed = false;
  if (!attr) return;
  this.previousAttributes = clone(this.attributes);

  for (var key in attr) {
    if (attr.hasOwnProperty(key)) {
      this.attributes[key] = attr[key];
      if (this.attributes[key] !== this.previousAttributes[key]){
        changed = true;
      }
    }
  }
  if (changed) this.emit('change:attribute');
};

Block.prototype.get = function(key){
  return this.attributes[key];
};

Block.prototype.destroy = function(){
  this.emit('destroy');
};

Block.prototype.hide = function(){
  this.set({ hidden: true });
};

Block.prototype.show = function(){
  this.set({ hidden: false });
};

Block.prototype.toJSON = function(){
  return clone(this.attributes);
};

// Our wrapper view, which renders an array of Cast item views.
// Constructor
var CastView = function(context){
  this.context = context;
  this.collection = context.collection;
  this.el = document.createElement('div');
  this.el.className = 'cast-view';
  this.collection.on('enter', bind(this, this.renderNew));
  this.collection.on('exit', bind(this, this.removeOld));
  this.context.on('wrapperHeight', bind(this, this.setHeight));
};

// Methods
CastView.prototype.render = function(){
  var _this = this;
  this.collection.forEach(function(key, model, i){
    _this.renderNew(model);
  });
};

CastView.prototype.setHeight = function(height){
  this.el.style.height = height + 'px';
};

CastView.prototype.renderNew = function(model){
  var cardView = new CastItemView({ model: model, context: this.context });
  this.el.appendChild(cardView.render().el);
  window.setTimeout(function(){
    model.show();
  }, 0);
};

CastView.prototype.removeOld = function(model){
  var _this = this;
  model.hide();
  window.setTimeout(function(){
    model.destroy();
  }, 500);
};

// Cast Item View. Contains one Cast block.
// Constructor
var CastItemView = function(options){
  this.model = options.model;
  this.context = options.context;
  this.el = document.createElement('div');
  this.el.className = 'cast-item';
  this.template = options.context.template;
  if (!this.template) throw new Error('You need to supply a template');
  this.model
    .on('change:attribute', bind(this, this.render))
    .on('destroy', bind(this, this.remove));
  this.context.emit('viewCreated', this);
};

// Methods
CastItemView.prototype.render = function(){
  this.el.innerHTML = this.template(this.model.toJSON());
  this.changePosition().showOrHide();
  this.context.emit('viewRendered', this);
  return this;
};

CastItemView.prototype.remove = function(){
  this.model
    .off('change:attribute')
    .off('destroy');
  this.context.emit('viewDestroyed', this);
  this.el.parentNode.removeChild(this.el);
};

// Should we also use scale3d (like isotope?)
CastItemView.prototype.changePosition = function(){
  var top = this.model.get('top')
    , left = this.model.get('left')
    , style = this.el.style
    , width = this.model.get('width')
    , height = this.model.get('height');

  style.width = width + 'px';
  style.height = height + 'px';
  translate(this.el, left, top);
  return this;
};

CastItemView.prototype.showOrHide = function(){
  var _this = this
    , el = this.el
    , style = el.style;

  if (this.model.get('hidden')) {
    el.className += ' hidden';
    el.setAttribute('aria-hidden', true);
  } else {
    style.display = 'block';
    window.setTimeout(function(){
      el.className = el.className.replace( /(?:^|\s)hidden(?!\S)/g , '');
    }, 0);
    el.setAttribute('aria-hidden', false);
  }
  return this;
};

module.exports = Cast;
});
require.register("component-emitter/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var index = require('indexof');

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  fn._off = on;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var i = index(callbacks, fn._off || fn);
  if (~i) callbacks.splice(i, 1);
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

});
require.register("component-type/index.js", function(exports, require, module){

/**
 * toString ref.
 */

var toString = Object.prototype.toString;

/**
 * Return the type of `val`.
 *
 * @param {Mixed} val
 * @return {String}
 * @api public
 */

module.exports = function(val){
  switch (toString.call(val)) {
    case '[object Function]': return 'function';
    case '[object Date]': return 'date';
    case '[object RegExp]': return 'regexp';
    case '[object Arguments]': return 'arguments';
    case '[object Array]': return 'array';
    case '[object String]': return 'string';
  }

  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (val && val.nodeType === 1) return 'element';
  if (val === Object(val)) return 'object';

  return typeof val;
};

});
require.register("eugenicsarchivesca-swipe/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var events = require('events');
var has3d = require('has-translate3d');
var transform = require('transform-property');
var Emitter = require('emitter');

/**
 * Expose `Swipe`.
 */

module.exports = Swipe;

/**
 * Turn `el` into a swipeable list.
 *
 * @param {Element} el
 * @api public
 */

function Swipe(el) {
  if (!(this instanceof Swipe)) return new Swipe(el);
  if (!el) throw new TypeError('Swipe() requires an element');
  this.el = el;
  this.child = el.children[0];
  this.currentEl = this.child.children[0];
  this.current = 0;
  this.total = this.child.children.length;
  this.refresh();
  this.interval(5000);
  this.duration(300);
  this.show(0, 0, { silent: true });
  // this.bind();
}

/**
 * Mixin `Emitter`.
 */

Emitter(Swipe.prototype);

/**
 * Refresh sizing data.
 *
 * @api public
 */

Swipe.prototype.refresh = function(){
  var i = this.indexOf(this.currentEl);
  var total = this.child.children.length;

  // we removed/added item(s), update current
  if (total < this.total && i <= this.current && i >= 0) {
    this.current -= this.current - i;
  } else if(total > this.total && i > this.current) {
    this.current += i - this.current;
  }

  this.total = total;
  this.childWidth = this.el.getBoundingClientRect().width;
  // TODO: remove + 10px. arbitrary number to give extra room for zoom changes
  this.width = Math.ceil(this.childWidth * this.total) + 10;
  this.child.style.width = this.width + 'px';
  this.child.style.height = this.height + 'px';
  if (null != this.current && this.current > -1) {
    this.show(this.current, 0, { silent: true });
  }
};

/**
 * Bind event handlers.
 *
 * @api public
 */

Swipe.prototype.bind = function(){
  this.events = events(this.child, this);
  this.events.bind('mousedown', 'ontouchstart');
  this.events.bind('mousemove', 'ontouchmove');
  this.events.bind('touchstart');
  this.events.bind('touchmove');

  this.docEvents = events(document, this);
  this.docEvents.bind('mouseup', 'ontouchend');
  this.docEvents.bind('touchend');
};

/**
 * Unbind event handlers.
 *
 * @api public
 */

Swipe.prototype.unbind = function(){
  this.events.unbind();
  this.docEvents.unbind();
};

/**
 * Handle touchstart.
 *
 * @api private
 */

Swipe.prototype.ontouchstart = function(e){
  e.stopPropagation();
  if (e.touches) e = e.touches[0];

  this.transitionDuration(0);
  this.dx = 0;
  this.lock = false;
  this.ignore = false;

  this.down = {
    x: e.pageX,
    y: e.pageY,
    at: new Date
  };
};

/**
 * Handle touchmove.
 *
 * For the first and last slides
 * we apply some resistence to help
 * indicate that you're at the edges.
 *
 * @api private
 */

Swipe.prototype.ontouchmove = function(e){
  if (!this.down || this.ignore) return;
  if (e.touches && e.touches.length > 1) return;
  if (e.touches) {
    var ev = e;
    e = e.touches[0];
  }
  var s = this.down;
  var x = e.pageX;
  var w = this.childWidth;
  var i = this.current;
  this.dx = x - s.x;

  // determine dy and the slope
  if (!this.lock) {
    this.lock = true;
    var y = e.pageY;
    var dy = y - s.y;
    var slope = dy / this.dx;

    // if is greater than 1 or -1, we're swiping up/down
    if (slope > 1 || slope < -1) {
      this.ignore = true;
      return;
    }
  }

  // when we overwrite touch event with e.touches[0], it doesn't
  // have the preventDefault method. e.preventDefault() prevents
  // multiaxis scrolling when moving from left to right
  (ev || e).preventDefault();

  var dir = this.dx < 0 ? 1 : 0;
  if (this.isFirst() && 0 == dir) this.dx /= 2;
  if (this.isLast() && 1 == dir) this.dx /= 2;
  this.translate((i * w) + -this.dx);
};

/**
 * Handle touchend.
 *
 * @api private
 */

Swipe.prototype.ontouchend = function(e){
  if (!this.down) return;
  e.stopPropagation();

  // touches
  if (e.changedTouches) e = e.changedTouches[0];

  // setup
  var dx = this.dx;
  var x = e.pageX;
  var w = this.childWidth;

  // < 200ms swipe
  var ms = new Date - this.down.at;
  var threshold = ms < 200 ? w / 10 : w / 2;
  var dir = dx < 0 ? 1 : 0;
  var half = Math.abs(dx) >= threshold;

  // clear
  this.down = null;

  // first -> next
  if (this.isFirst() && 1 == dir && half) return this.next();

  // first -> first
  if (this.isFirst()) return this.prev();

  // last -> last
  if (this.isLast() && 1 == dir) return this.next();

  // N -> N + 1
  if (1 == dir && half) return this.next();

  // N -> N - 1
  if (0 == dir && half) return this.prev();

  // N -> N
  this.show(this.current);
};

/**
 * Set transition duration to `ms`.
 *
 * @param {Number} ms
 * @return {Swipe} self
 * @api public
 */

Swipe.prototype.duration = function(ms){
  this._duration = ms;
  return this;
};

/**
 * Set cycle interval to `ms`.
 *
 * @param {Number} ms
 * @return {Swipe} self
 * @api public
 */

Swipe.prototype.interval = function(ms){
  this._interval = ms;
  return this;
};

/**
 * Play through all the elements.
 *
 * @return {Swipe} self
 * @api public
 */

Swipe.prototype.play = function(){
  if (this.timer) return;
  this.timer = setInterval(this.cycle.bind(this), this._interval);
  return this;
};

/**
 * Stop playing.
 *
 * @return {Swipe} self
 * @api public
 */

Swipe.prototype.stop = function(){
  clearInterval(this.timer);
  this.timer = null;
  return this;
};

/**
 * Show the next slide, when the end
 * is reached start from the beginning.
 *
 * @api public
 */

Swipe.prototype.cycle = function(){
  if (this.isLast()) {
    this.current = -1;
    this.next();
  } else {
    this.next();
  }
};

/**
 * Check if we're on the first slide.
 *
 * @return {Boolean}
 * @api public
 */

Swipe.prototype.isFirst = function(){
  return this.current == 0;
};

/**
 * Check if we're on the last slide.
 *
 * @return {Boolean}
 * @api public
 */

Swipe.prototype.isLast = function(){
  return this.current == this.total - 1;
};

/**
 * Show the previous slide, if any.
 *
 * @return {Swipe} self
 * @api public
 */

Swipe.prototype.prev = function(){
  this.show(this.current - 1);
  return this;
};

/**
 * Show the next slide, if any.
 *
 * @return {Swipe} self
 * @api public
 */

Swipe.prototype.next = function(){
  this.show(this.current + 1);
  return this;
};

/**
 * Show slide `i`.
 *
 * Emits `show `event
 *
 * @param {Number} i
 * @return {Swipe} self
 * @api public
 */

Swipe.prototype.show = function(i, ms, options){
  options = options || {};
  if (null == ms) ms = this._duration;
  i = Math.max(0, Math.min(i, this.total - 1));
  var x = this.childWidth * i;
  this.current = i;
  this.currentEl = this.child.children[i];
  this.transitionDuration(ms);
  this.translate(x);
  if (!options.silent) this.emit('show', this.current);
  return this;
};

/**
 * Get the index of the current element
 *
 * @api private
 */

Swipe.prototype.indexOf = function(el) {
  return [].indexOf.call(this.child.children, el);
};

/**
 * Set transition duration.
 *
 * @api private
 */

Swipe.prototype.transitionDuration = function(ms){
  var s = this.child.style;
  s.webkitTransitionDuration =
  s.MozTransitionDuration =
  s.msTransitionDuration =
  s.OTransitionDuration =
  s.transitionDuration = ms + 'ms';
};

/**
 * Translate to `x`.
 *
 * @api private
 */

Swipe.prototype.translate = function(x){
  var s = this.child.style;
  x = -x;
  if (has3d) {
    s[transform] = 'translate3d(' + x + 'px, 0, 0)';
  } else {
    s[transform] = 'translateX(' + x + 'px)';
  }
};

});
require.register("component-json/index.js", function(exports, require, module){

module.exports = 'undefined' == typeof JSON
  ? require('component-json-fallback')
  : JSON;

});
require.register("component-model/lib/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var proto = require('./proto')
  , statics = require('./static')
  , Emitter = require('emitter');

/**
 * Expose `createModel`.
 */

module.exports = createModel;

/**
 * Create a new model constructor with the given `name`.
 *
 * @param {String} name
 * @return {Function}
 * @api public
 */

function createModel(name) {
  if ('string' != typeof name) throw new TypeError('model name required');

  /**
   * Initialize a new model with the given `attrs`.
   *
   * @param {Object} attrs
   * @api public
   */

  function model(attrs) {
    if (!(this instanceof model)) return new model(attrs);
    attrs = attrs || {};
    this._callbacks = {};
    this.attrs = attrs;
    this.dirty = attrs;
  }

  // mixin emitte

  Emitter(model);

  // statics

  model.modelName = name;
  model.base = '/' + name.toLowerCase();
  model.attrs = {};
  model.validators = [];
  for (var key in statics) model[key] = statics[key];

  // prototype

  model.prototype = {};
  model.prototype.model = model;
  for (var key in proto) model.prototype[key] = proto[key];

  return model;
}


});
require.register("component-model/lib/static.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var request = require('superagent')
  , Collection = require('collection')
  , noop = function(){};

/**
 * Construct a url to the given `path`.
 *
 * Example:
 *
 *    User.url('add')
 *    // => "/users/add"
 *
 * @param {String} path
 * @return {String}
 * @api public
 */

exports.url = function(path){
  var url = this.base;
  if (0 == arguments.length) return url;
  return url + '/' + path;
};

/**
 * Add validation `fn()`.
 *
 * @param {Function} fn
 * @return {Function} self
 * @api public
 */

exports.validate = function(fn){
  this.validators.push(fn);
  return this;
};

/**
 * Use the given plugin `fn()`.
 *
 * @param {Function} fn
 * @return {Function} self
 * @api public
 */

exports.use = function(fn){
  fn(this);
  return this;
};

/**
 * Define attr with the given `name` and `options`.
 *
 * @param {String} name
 * @param {Object} options
 * @return {Function} self
 * @api public
 */

exports.attr = function(name, options){
  this.attrs[name] = options || {};

  // implied pk
  if ('_id' == name || 'id' == name) {
    this.attrs[name].primaryKey = true;
    this.primaryKey = name;
  }

  // getter / setter method
  this.prototype[name] = function(val){
    if (0 == arguments.length) return this.attrs[name];
    var prev = this.attrs[name];
    this.dirty[name] = val;
    this.attrs[name] = val;
    this.model.emit('change', this, name, val, prev);
    this.model.emit('change ' + name, this, val, prev);
    this.emit('change', name, val, prev);
    this.emit('change ' + name, val, prev);
    return this;
  };

  return this;
};

/**
 * Remove all and invoke `fn(err)`.
 *
 * @param {Function} [fn]
 * @api public
 */

exports.removeAll = function(fn){
  fn = fn || noop;
  var self = this;
  var url = this.url('all');
  request.del(url, function(res){
    if (res.error) return fn(error(res));
    fn();
  });
};

/**
 * Get all and invoke `fn(err, array)`.
 *
 * @param {Function} fn
 * @api public
 */

exports.all = function(fn){
  var self = this;
  var url = this.url('all');
  request.get(url, function(res){
    if (res.error) return fn(error(res));
    var col = new Collection;
    for (var i = 0, len = res.body.length; i < len; ++i) {
      col.push(new self(res.body[i]));
    }
    fn(null, col);
  });
};

/**
 * Get `id` and invoke `fn(err, model)`.
 *
 * @param {Mixed} id
 * @param {Function} fn
 * @api public
 */

exports.get = function(id, fn){
  var self = this;
  var url = this.url(id);
  request.get(url, function(res){
    if (res.error) return fn(error(res));
    var model = new self(res.body);
    fn(null, model);
  });
};

/**
 * Response error helper.
 *
 * @param {Response} er
 * @return {Error}
 * @api private
 */

function error(res) {
  return new Error('got ' + res.status + ' response');
}

});
require.register("component-model/lib/proto.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var Emitter = require('emitter')
  , request = require('superagent')
  , JSON = require('json')
  , each = require('each')
  , noop = function(){};

/**
 * Mixin emitter.
 */

Emitter(exports);

/**
 * Register an error `msg` on `attr`.
 *
 * @param {String} attr
 * @param {String} msg
 * @return {Object} self
 * @api public
 */

exports.error = function(attr, msg){
  this.errors.push({
    attr: attr,
    message: msg
  });
  return this;
};

/**
 * Check if this model is new.
 *
 * @return {Boolean}
 * @api public
 */

exports.isNew = function(){
  var key = this.model.primaryKey;
  return ! this.has(key);
};

/**
 * Get / set the primary key.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api public
 */

exports.primary = function(val){
  var key = this.model.primaryKey;
  if (0 == arguments.length) return this[key]();
  return this[key](val);
};

/**
 * Validate the model and return a boolean.
 *
 * Example:
 *
 *    user.isValid()
 *    // => false
 *
 *    user.errors
 *    // => [{ attr: ..., message: ... }]
 *
 * @return {Boolean}
 * @api public
 */

exports.isValid = function(){
  this.validate();
  return 0 == this.errors.length;
};

/**
 * Return `false` or an object
 * containing the "dirty" attributes.
 *
 * Optionally check for a specific `attr`.
 *
 * @param {String} [attr]
 * @return {Object|Boolean}
 * @api public
 */

exports.changed = function(attr){
  var dirty = this.dirty;
  if (Object.keys(dirty).length) {
    if (attr) return !! dirty[attr];
    return dirty;
  }
  return false;
};

/**
 * Perform validations.
 *
 * @api private
 */

exports.validate = function(){
  var self = this;
  var fns = this.model.validators;
  this.errors = [];
  each(fns, function(fn){ fn(self) });
};

/**
 * Destroy the model and mark it as `.removed`
 * and invoke `fn(err)`.
 *
 * Events:
 *
 *  - `removing` before deletion
 *  - `remove` on deletion
 *
 * @param {Function} [fn]
 * @api public
 */

exports.remove = function(fn){
  fn = fn || noop;
  if (this.isNew()) return fn(new Error('not saved'));
  var self = this;
  var url = this.url();
  this.model.emit('removing', this);
  this.emit('removing');
  request.del(url, function(res){
    if (res.error) return fn(error(res));
    self.removed = true;
    self.model.emit('remove', self);
    self.emit('remove');
    fn();
  });
};

/**
 * Save and invoke `fn(err)`.
 *
 * Events:
 *
 *  - `save` on updates and saves
 *  - `saving` pre-update or save, after validation
 *
 * @param {Function} [fn]
 * @api public
 */

exports.save = function(fn){
  if (!this.isNew()) return this.update(fn);
  var self = this;
  var url = this.model.url();
  fn = fn || noop;
  if (!this.isValid()) return fn(new Error('validation failed'));
  this.model.emit('saving', this);
  this.emit('saving');
  request.post(url, self, function(res){
    if (res.error) return fn(error(res));
    if (res.body) self.primary(res.body.id);
    self.dirty = {};
    self.model.emit('save', self);
    self.emit('save');
    fn();
  });
};

/**
 * Update and invoke `fn(err)`.
 *
 * @param {Function} [fn]
 * @api private
 */

exports.update = function(fn){
  var self = this;
  var url = this.url();
  fn = fn || noop;
  if (!this.isValid()) return fn(new Error('validation failed'));
  this.model.emit('saving', this);
  this.emit('saving');
  request.put(url, self, function(res){
    if (res.error) return fn(error(res));
    self.dirty = {};
    self.model.emit('save', self);
    self.emit('save');
    fn();
  });
};

/**
 * Return a url for `path` relative to this model.
 *
 * Example:
 *
 *    var user = new User({ id: 5 });
 *    user.url('edit');
 *    // => "/users/5/edit"
 *
 * @param {String} path
 * @return {String}
 * @api public
 */

exports.url = function(path){
  var model = this.model;
  var url = model.base;
  var id = this.primary();
  if (0 == arguments.length) return url + '/' + id;
  return url + '/' + id + '/' + path;
};

/**
 * Set multiple `attrs`.
 *
 * @param {Object} attrs
 * @return {Object} self
 * @api public
 */

exports.set = function(attrs){
  for (var key in attrs) {
    this[key](attrs[key]);
  }
  return this;
};

/**
 * Get `attr` value.
 *
 * @param {String} attr
 * @return {Mixed}
 * @api public
 */

exports.get = function(attr){
  return this.attrs[attr];
};

/**
 * Check if `attr` is present (not `null` or `undefined`).
 *
 * @param {String} attr
 * @return {Boolean}
 * @api public
 */

exports.has = function(attr){
  return null != this.attrs[attr];
};

/**
 * Return the JSON representation of the model.
 *
 * @return {Object}
 * @api public
 */

exports.toJSON = function(){
  return this.attrs;
};

/**
 * Response error helper.
 *
 * @param {Response} er
 * @return {Error}
 * @api private
 */

function error(res) {
  return new Error('got ' + res.status + ' response');
}
});
require.register("component-collection/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var Enumerable = require('enumerable');

/**
 * Expose `Collection`.
 */

module.exports = Collection;

/**
 * Initialize a new collection with the given `models`.
 *
 * @param {Array} models
 * @api public
 */

function Collection(models) {
  this.models = models || [];
}

/**
 * Mixin enumerable.
 */

Enumerable(Collection.prototype);

/**
 * Iterator implementation.
 */

Collection.prototype.__iterate__ = function(){
  var self = this;
  return {
    length: function(){ return self.length() },
    get: function(i){ return self.models[i] }
  }
};

/**
 * Return the collection length.
 *
 * @return {Number}
 * @api public
 */

Collection.prototype.length = function(){
  return this.models.length;
};

/**
 * Add `model` to the collection and return the index.
 *
 * @param {Object} model
 * @return {Number}
 * @api public
 */

Collection.prototype.push = function(model){
  return this.models.push(model);
};

});
require.register("RedVentures-reduce/index.js", function(exports, require, module){

/**
 * Reduce `arr` with `fn`.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @param {Mixed} initial
 *
 * TODO: combatible error handling?
 */

module.exports = function(arr, fn, initial){  
  var idx = 0;
  var len = arr.length;
  var curr = arguments.length == 3
    ? initial
    : arr[idx++];

  while (idx < len) {
    curr = fn.call(null, curr, arr[idx], ++idx, arr);
  }
  
  return curr;
};
});
require.register("visionmedia-superagent/lib/client.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var Emitter = require('emitter');
var reduce = require('reduce');

/**
 * Root reference for iframes.
 */

var root = 'undefined' == typeof window
  ? this
  : window;

/**
 * Noop.
 */

function noop(){};

/**
 * Check if `obj` is a host object,
 * we don't want to serialize these :)
 *
 * TODO: future proof, move to compoent land
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isHost(obj) {
  var str = {}.toString.call(obj);

  switch (str) {
    case '[object File]':
    case '[object Blob]':
    case '[object FormData]':
      return true;
    default:
      return false;
  }
}

/**
 * Determine XHR.
 */

function getXHR() {
  if (root.XMLHttpRequest
    && ('file:' != root.location.protocol || !root.ActiveXObject)) {
    return new XMLHttpRequest;
  } else {
    try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.6.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.3.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch(e) {}
  }
  return false;
}

/**
 * Removes leading and trailing whitespace, added to support IE.
 *
 * @param {String} s
 * @return {String}
 * @api private
 */

var trim = ''.trim
  ? function(s) { return s.trim(); }
  : function(s) { return s.replace(/(^\s*|\s*$)/g, ''); };

/**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isObject(obj) {
  return obj === Object(obj);
}

/**
 * Serialize the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function serialize(obj) {
  if (!isObject(obj)) return obj;
  var pairs = [];
  for (var key in obj) {
    pairs.push(encodeURIComponent(key)
      + '=' + encodeURIComponent(obj[key]));
  }
  return pairs.join('&');
}

/**
 * Expose serialization method.
 */

 request.serializeObject = serialize;

 /**
  * Parse the given x-www-form-urlencoded `str`.
  *
  * @param {String} str
  * @return {Object}
  * @api private
  */

function parseString(str) {
  var obj = {};
  var pairs = str.split('&');
  var parts;
  var pair;

  for (var i = 0, len = pairs.length; i < len; ++i) {
    pair = pairs[i];
    parts = pair.split('=');
    obj[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
  }

  return obj;
}

/**
 * Expose parser.
 */

request.parseString = parseString;

/**
 * Default MIME type map.
 *
 *     superagent.types.xml = 'application/xml';
 *
 */

request.types = {
  html: 'text/html',
  json: 'application/json',
  urlencoded: 'application/x-www-form-urlencoded',
  'form': 'application/x-www-form-urlencoded',
  'form-data': 'application/x-www-form-urlencoded'
};

/**
 * Default serialization map.
 *
 *     superagent.serialize['application/xml'] = function(obj){
 *       return 'generated xml here';
 *     };
 *
 */

 request.serialize = {
   'application/x-www-form-urlencoded': serialize,
   'application/json': JSON.stringify
 };

 /**
  * Default parsers.
  *
  *     superagent.parse['application/xml'] = function(str){
  *       return { object parsed from str };
  *     };
  *
  */

request.parse = {
  'application/x-www-form-urlencoded': parseString,
  'application/json': JSON.parse
};

/**
 * Parse the given header `str` into
 * an object containing the mapped fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseHeader(str) {
  var lines = str.split(/\r?\n/);
  var fields = {};
  var index;
  var line;
  var field;
  var val;

  lines.pop(); // trailing CRLF

  for (var i = 0, len = lines.length; i < len; ++i) {
    line = lines[i];
    index = line.indexOf(':');
    field = line.slice(0, index).toLowerCase();
    val = trim(line.slice(index + 1));
    fields[field] = val;
  }

  return fields;
}

/**
 * Return the mime type for the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function type(str){
  return str.split(/ *; */).shift();
};

/**
 * Return header field parameters.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function params(str){
  return reduce(str.split(/ *; */), function(obj, str){
    var parts = str.split(/ *= */)
      , key = parts.shift()
      , val = parts.shift();

    if (key && val) obj[key] = val;
    return obj;
  }, {});
};

/**
 * Initialize a new `Response` with the given `xhr`.
 *
 *  - set flags (.ok, .error, etc)
 *  - parse header
 *
 * Examples:
 *
 *  Aliasing `superagent` as `request` is nice:
 *
 *      request = superagent;
 *
 *  We can use the promise-like API, or pass callbacks:
 *
 *      request.get('/').end(function(res){});
 *      request.get('/', function(res){});
 *
 *  Sending data can be chained:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' })
 *        .end(function(res){});
 *
 *  Or passed to `.send()`:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' }, function(res){});
 *
 *  Or passed to `.post()`:
 *
 *      request
 *        .post('/user', { name: 'tj' })
 *        .end(function(res){});
 *
 * Or further reduced to a single call for simple cases:
 *
 *      request
 *        .post('/user', { name: 'tj' }, function(res){});
 *
 * @param {XMLHTTPRequest} xhr
 * @param {Object} options
 * @api private
 */

function Response(xhr, options) {
  options = options || {};
  this.xhr = xhr;
  this.text = xhr.responseText;
  this.setStatusProperties(xhr.status);
  this.header = this.headers = parseHeader(xhr.getAllResponseHeaders());
  // getAllResponseHeaders sometimes falsely returns "" for CORS requests, but
  // getResponseHeader still works. so we get content-type even if getting
  // other headers fails.
  this.header['content-type'] = xhr.getResponseHeader('content-type');
  this.setHeaderProperties(this.header);
  this.body = this.parseBody(this.text);
}

/**
 * Get case-insensitive `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

Response.prototype.get = function(field){
  return this.header[field.toLowerCase()];
};

/**
 * Set header related properties:
 *
 *   - `.type` the content type without params
 *
 * A response of "Content-Type: text/plain; charset=utf-8"
 * will provide you with a `.type` of "text/plain".
 *
 * @param {Object} header
 * @api private
 */

Response.prototype.setHeaderProperties = function(header){
  // content-type
  var ct = this.header['content-type'] || '';
  this.type = type(ct);

  // params
  var obj = params(ct);
  for (var key in obj) this[key] = obj[key];
};

/**
 * Parse the given body `str`.
 *
 * Used for auto-parsing of bodies. Parsers
 * are defined on the `superagent.parse` object.
 *
 * @param {String} str
 * @return {Mixed}
 * @api private
 */

Response.prototype.parseBody = function(str){
  var parse = request.parse[this.type];
  return parse
    ? parse(str)
    : null;
};

/**
 * Set flags such as `.ok` based on `status`.
 *
 * For example a 2xx response will give you a `.ok` of __true__
 * whereas 5xx will be __false__ and `.error` will be __true__. The
 * `.clientError` and `.serverError` are also available to be more
 * specific, and `.statusType` is the class of error ranging from 1..5
 * sometimes useful for mapping respond colors etc.
 *
 * "sugar" properties are also defined for common cases. Currently providing:
 *
 *   - .noContent
 *   - .badRequest
 *   - .unauthorized
 *   - .notAcceptable
 *   - .notFound
 *
 * @param {Number} status
 * @api private
 */

Response.prototype.setStatusProperties = function(status){
  var type = status / 100 | 0;

  // status / class
  this.status = status;
  this.statusType = type;

  // basics
  this.info = 1 == type;
  this.ok = 2 == type;
  this.clientError = 4 == type;
  this.serverError = 5 == type;
  this.error = (4 == type || 5 == type)
    ? this.toError()
    : false;

  // sugar
  this.accepted = 202 == status;
  this.noContent = 204 == status || 1223 == status;
  this.badRequest = 400 == status;
  this.unauthorized = 401 == status;
  this.notAcceptable = 406 == status;
  this.notFound = 404 == status;
  this.forbidden = 403 == status;
};

/**
 * Return an `Error` representative of this response.
 *
 * @return {Error}
 * @api public
 */

Response.prototype.toError = function(){
  var msg = 'got ' + this.status + ' response';
  var err = new Error(msg);
  err.status = this.status;
  return err;
};

/**
 * Expose `Response`.
 */

request.Response = Response;

/**
 * Initialize a new `Request` with the given `method` and `url`.
 *
 * @param {String} method
 * @param {String} url
 * @api public
 */

function Request(method, url) {
  var self = this;
  Emitter.call(this);
  this._query = this._query || [];
  this.method = method;
  this.url = url;
  this.header = {};
  this._header = {};
  this.set('X-Requested-With', 'XMLHttpRequest');
  this.on('end', function(){
    var res = new Response(self.xhr);
    if ('HEAD' == method) res.text = null;
    self.callback(null, res);
  });
}

/**
 * Inherit from `Emitter.prototype`.
 */

Request.prototype = new Emitter;
Request.prototype.constructor = Request;

/**
 * Set timeout to `ms`.
 *
 * @param {Number} ms
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.timeout = function(ms){
  this._timeout = ms;
  return this;
};

/**
 * Clear previous timeout.
 *
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.clearTimeout = function(){
  this._timeout = 0;
  clearTimeout(this._timer);
  return this;
};

/**
 * Abort the request, and clear potential timeout.
 *
 * @return {Request}
 * @api public
 */

Request.prototype.abort = function(){
  if (this.aborted) return;
  this.aborted = true;
  this.xhr.abort();
  this.clearTimeout();
  this.emit('abort');
  return this;
};

/**
 * Set header `field` to `val`, or multiple fields with one object.
 *
 * Examples:
 *
 *      req.get('/')
 *        .set('Accept', 'application/json')
 *        .set('X-API-Key', 'foobar')
 *        .end(callback);
 *
 *      req.get('/')
 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *        .end(callback);
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.set = function(field, val){
  if (isObject(field)) {
    for (var key in field) {
      this.set(key, field[key]);
    }
    return this;
  }
  this._header[field.toLowerCase()] = val;
  this.header[field] = val;
  return this;
};

/**
 * Get case-insensitive header `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api private
 */

Request.prototype.getHeader = function(field){
  return this._header[field.toLowerCase()];
};

/**
 * Set Content-Type to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.xml = 'application/xml';
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('application/xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 * @param {String} type
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.type = function(type){
  this.set('Content-Type', request.types[type] || type);
  return this;
};

/**
 * Set Authorization field value with `user` and `pass`.
 *
 * @param {String} user
 * @param {String} pass
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.auth = function(user, pass){
  var str = btoa(user + ':' + pass);
  this.set('Authorization', 'Basic ' + str);
  return this;
};

/**
* Add query-string `val`.
*
* Examples:
*
*   request.get('/shoes')
*     .query('size=10')
*     .query({ color: 'blue' })
*
* @param {Object|String} val
* @return {Request} for chaining
* @api public
*/

Request.prototype.query = function(val){
  if ('string' != typeof val) val = serialize(val);
  this._query.push(val);
  return this;
};

/**
 * Send `data`, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // querystring
 *       request.get('/search')
 *         .end(callback)
 *
 *       // multiple data "writes"
 *       request.get('/search')
 *         .send({ search: 'query' })
 *         .send({ range: '1..5' })
 *         .send({ order: 'desc' })
 *         .end(callback)
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .send('{"name":"tj"})
 *         .end(callback)
 *
 *       // auto json
 *       request.post('/user')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send('name=tj')
 *         .end(callback)
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // defaults to x-www-form-urlencoded
  *      request.post('/user')
  *        .send('name=tobi')
  *        .send('species=ferret')
  *        .end(callback)
 *
 * @param {String|Object} data
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.send = function(data){
  var obj = isObject(data);
  var type = this.getHeader('Content-Type');

  // merge
  if (obj && isObject(this._data)) {
    for (var key in data) {
      this._data[key] = data[key];
    }
  } else if ('string' == typeof data) {
    if (!type) this.type('form');
    type = this.getHeader('Content-Type');
    if ('application/x-www-form-urlencoded' == type) {
      this._data = this._data
        ? this._data + '&' + data
        : data;
    } else {
      this._data = (this._data || '') + data;
    }
  } else {
    this._data = data;
  }

  if (!obj) return this;
  if (!type) this.type('json');
  return this;
};

/**
 * Invoke the callback with `err` and `res`
 * and handle arity check.
 *
 * @param {Error} err
 * @param {Response} res
 * @api private
 */

Request.prototype.callback = function(err, res){
  var fn = this._callback;
  if (2 == fn.length) return fn(err, res);
  if (err) return this.emit('error', err);
  fn(res);
};

/**
 * Invoke callback with x-domain error.
 *
 * @api private
 */

Request.prototype.crossDomainError = function(){
  var err = new Error('Origin is not allowed by Access-Control-Allow-Origin');
  err.crossDomain = true;
  this.callback(err);
};

/**
 * Invoke callback with timeout error.
 *
 * @api private
 */

Request.prototype.timeoutError = function(){
  var timeout = this._timeout;
  var err = new Error('timeout of ' + timeout + 'ms exceeded');
  err.timeout = timeout;
  this.callback(err);
};

/**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 *
 * @api public
 */

Request.prototype.withCredentials = function(){
  this._withCredentials = true;
  return this;
};

/**
 * Initiate request, invoking callback `fn(res)`
 * with an instanceof `Response`.
 *
 * @param {Function} fn
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.end = function(fn){
  var self = this;
  var xhr = this.xhr = getXHR();
  var query = this._query.join('&');
  var timeout = this._timeout;
  var data = this._data;

  // store callback
  this._callback = fn || noop;

  // CORS
  if (this._withCredentials) xhr.withCredentials = true;

  // state change
  xhr.onreadystatechange = function(){
    if (4 != xhr.readyState) return;
    if (0 == xhr.status) {
      if (self.aborted) return self.timeoutError();
      return self.crossDomainError();
    }
    self.emit('end');
  };

  // progress
  if (xhr.upload) {
    xhr.upload.onprogress = function(e){
      e.percent = e.loaded / e.total * 100;
      self.emit('progress', e);
    };
  }

  // timeout
  if (timeout && !this._timer) {
    this._timer = setTimeout(function(){
      self.abort();
    }, timeout);
  }

  // querystring
  if (query) {
    query = request.serializeObject(query);
    this.url += ~this.url.indexOf('?')
      ? '&' + query
      : '?' + query;
  }

  // initiate request
  xhr.open(this.method, this.url, true);

  // body
  if ('GET' != this.method && 'HEAD' != this.method && 'string' != typeof data && !isHost(data)) {
    // serialize stuff
    var serialize = request.serialize[this.getHeader('Content-Type')];
    if (serialize) data = serialize(data);
  }

  // set header fields
  for (var field in this.header) {
    if (null == this.header[field]) continue;
    xhr.setRequestHeader(field, this.header[field]);
  }

  // send stuff
  xhr.send(data);
  return this;
};

/**
 * Expose `Request`.
 */

request.Request = Request;

/**
 * Issue a request:
 *
 * Examples:
 *
 *    request('GET', '/users').end(callback)
 *    request('/users').end(callback)
 *    request('/users', callback)
 *
 * @param {String} method
 * @param {String|Function} url or callback
 * @return {Request}
 * @api public
 */

function request(method, url) {
  // callback
  if ('function' == typeof url) {
    return new Request('GET', method).end(url);
  }

  // url first
  if (1 == arguments.length) {
    return new Request('GET', method);
  }

  return new Request(method, url);
}

/**
 * GET `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.get = function(url, data, fn){
  var req = request('GET', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.query(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * GET `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.head = function(url, data, fn){
  var req = request('HEAD', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * DELETE `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.del = function(url, fn){
  var req = request('DELETE', url);
  if (fn) req.end(fn);
  return req;
};

/**
 * PATCH `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.patch = function(url, data, fn){
  var req = request('PATCH', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * POST `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.post = function(url, data, fn){
  var req = request('POST', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * PUT `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.put = function(url, data, fn){
  var req = request('PUT', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * Expose `request`.
 */

module.exports = request;

});
require.register("component-to-function/index.js", function(exports, require, module){

/**
 * Expose `toFunction()`.
 */

module.exports = toFunction;

/**
 * Convert `obj` to a `Function`.
 *
 * @param {Mixed} obj
 * @return {Function}
 * @api private
 */

function toFunction(obj) {
  switch ({}.toString.call(obj)) {
    case '[object Object]':
      return objectToFunction(obj);
    case '[object Function]':
      return obj;
    case '[object String]':
      return stringToFunction(obj);
    case '[object RegExp]':
      return regexpToFunction(obj);
    default:
      return defaultToFunction(obj);
  }
}

/**
 * Default to strict equality.
 *
 * @param {Mixed} val
 * @return {Function}
 * @api private
 */

function defaultToFunction(val) {
  return function(obj){
    return val === obj;
  }
}

/**
 * Convert `re` to a function.
 *
 * @param {RegExp} re
 * @return {Function}
 * @api private
 */

function regexpToFunction(re) {
  return function(obj){
    return re.test(obj);
  }
}

/**
 * Convert property `str` to a function.
 *
 * @param {String} str
 * @return {Function}
 * @api private
 */

function stringToFunction(str) {
  // immediate such as "> 20"
  if (/^ *\W+/.test(str)) return new Function('_', 'return _ ' + str);

  // properties such as "name.first" or "age > 18"
  return new Function('_', 'return _.' + str);
}

/**
 * Convert `object` to a function.
 *
 * @param {Object} object
 * @return {Function}
 * @api private
 */

function objectToFunction(obj) {
  var match = {}
  for (var key in obj) {
    match[key] = typeof obj[key] === 'string'
      ? defaultToFunction(obj[key])
      : toFunction(obj[key])
  }
  return function(val){
    if (typeof val !== 'object') return false;
    for (var key in match) {
      if (!(key in val)) return false;
      if (!match[key](val[key])) return false;
    }
    return true;
  }
}

});
require.register("component-map/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var toFunction = require('to-function');

/**
 * Map the given `arr` with callback `fn(val, i)`.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @return {Array}
 * @api public
 */

module.exports = function(arr, fn){
  var ret = [];
  fn = toFunction(fn);
  for (var i = 0; i < arr.length; ++i) {
    ret.push(fn(arr[i], i));
  }
  return ret;
};
});
require.register("component-matches-selector/index.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var query = require('query');

/**
 * Element prototype.
 */

var proto = Element.prototype;

/**
 * Vendor function.
 */

var vendor = proto.matchesSelector
  || proto.webkitMatchesSelector
  || proto.mozMatchesSelector
  || proto.msMatchesSelector
  || proto.oMatchesSelector;

/**
 * Expose `match()`.
 */

module.exports = match;

/**
 * Match `el` to `selector`.
 *
 * @param {Element} el
 * @param {String} selector
 * @return {Boolean}
 * @api public
 */

function match(el, selector) {
  if (vendor) return vendor.call(el, selector);
  var nodes = query.all(selector, el.parentNode);
  for (var i = 0; i < nodes.length; ++i) {
    if (nodes[i] == el) return true;
  }
  return false;
}

});
require.register("component-delegate/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var matches = require('matches-selector')
  , event = require('event');

/**
 * Delegate event `type` to `selector`
 * and invoke `fn(e)`. A callback function
 * is returned which may be passed to `.unbind()`.
 *
 * @param {Element} el
 * @param {String} selector
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.bind = function(el, selector, type, fn, capture){
  return event.bind(el, type, function(e){
    if (matches(e.target, selector)) fn(e);
  }, capture);
  return callback;
};

/**
 * Unbind event `type`'s callback `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @api public
 */

exports.unbind = function(el, type, fn, capture){
  event.unbind(el, type, fn, capture);
};

});
require.register("component-domify/index.js", function(exports, require, module){

/**
 * Expose `parse`.
 */

module.exports = parse;

/**
 * Wrap map from jquery.
 */

var map = {
  option: [1, '<select multiple="multiple">', '</select>'],
  optgroup: [1, '<select multiple="multiple">', '</select>'],
  legend: [1, '<fieldset>', '</fieldset>'],
  thead: [1, '<table>', '</table>'],
  tbody: [1, '<table>', '</table>'],
  tfoot: [1, '<table>', '</table>'],
  colgroup: [1, '<table>', '</table>'],
  caption: [1, '<table>', '</table>'],
  tr: [2, '<table><tbody>', '</tbody></table>'],
  td: [3, '<table><tbody><tr>', '</tr></tbody></table>'],
  th: [3, '<table><tbody><tr>', '</tr></tbody></table>'],
  col: [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>'],
  _default: [0, '', '']
};

/**
 * Parse `html` and return the children.
 *
 * @param {String} html
 * @return {Array}
 * @api private
 */

function parse(html) {
  if ('string' != typeof html) throw new TypeError('String expected');
  
  // tag name
  var m = /<([\w:]+)/.exec(html);
  if (!m) throw new Error('No elements were generated.');
  var tag = m[1];
  
  // body support
  if (tag == 'body') {
    var el = document.createElement('html');
    el.innerHTML = html;
    return [el.removeChild(el.lastChild)];
  }
  
  // wrap map
  var wrap = map[tag] || map._default;
  var depth = wrap[0];
  var prefix = wrap[1];
  var suffix = wrap[2];
  var el = document.createElement('div');
  el.innerHTML = prefix + html + suffix;
  while (depth--) el = el.lastChild;

  return orphan(el.children);
}

/**
 * Orphan `els` and return an array.
 *
 * @param {NodeList} els
 * @return {Array}
 * @api private
 */

function orphan(els) {
  var ret = [];

  while (els.length) {
    ret.push(els[0].parentNode.removeChild(els[0]));
  }

  return ret;
}

});
require.register("component-css/index.js", function(exports, require, module){

/**
 * Properties to ignore appending "px".
 */

var ignore = {
  columnCount: true,
  fillOpacity: true,
  fontWeight: true,
  lineHeight: true,
  opacity: true,
  orphans: true,
  widows: true,
  zIndex: true,
  zoom: true
};

/**
 * Set `el` css values.
 *
 * @param {Element} el
 * @param {Object} obj
 * @return {Element}
 * @api public
 */

module.exports = function(el, obj){
  for (var key in obj) {
    var val = obj[key];
    if ('number' == typeof val && !ignore[key]) val += 'px';
    el.style[key] = val;
  }
  return el;
};

});
require.register("component-sort/index.js", function(exports, require, module){

/**
 * Expose `sort`.
 */

exports = module.exports = sort;

/**
 * Sort `el`'s children with the given `fn(a, b)`.
 *
 * @param {Element} el
 * @param {Function} fn
 * @api public
 */

function sort(el, fn) {
  var arr = [].slice.call(el.children).sort(fn);
  var frag = document.createDocumentFragment();
  for (var i = 0; i < arr.length; i++) {
    frag.appendChild(arr[i]);
  }
  el.appendChild(frag);
};

/**
 * Sort descending.
 *
 * @param {Element} el
 * @param {Function} fn
 * @api public
 */

exports.desc = function(el, fn){
  sort(el, function(a, b){
    return ~fn(a, b) + 1;
  });
};

/**
 * Sort ascending.
 */

exports.asc = sort;

});
require.register("component-value/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var typeOf = require('type');

/**
 * Set or get `el`'s' value.
 *
 * @param {Element} el
 * @param {Mixed} val
 * @return {Mixed}
 * @api public
 */

module.exports = function(el, val){
  if (2 == arguments.length) return set(el, val);
  return get(el);
};

/**
 * Get `el`'s value.
 */

function get(el) {
  switch (type(el)) {
    case 'checkbox':
    case 'radio':
      if (el.checked) {
        var attr = el.getAttribute('value');
        return null == attr ? true : attr;
      } else {
        return false;
      }
    case 'radiogroup':
      for (var i = 0, radio; radio = el[i]; i++) {
        if (radio.checked) return radio.value;
      }
      break;
    case 'select':
      for (var i = 0, option; option = el.options[i]; i++) {
        if (option.selected) return option.value;
      }
      break;
    default:
      return el.value;
  }
}

/**
 * Set `el`'s value.
 */

function set(el, val) {
  switch (type(el)) {
    case 'checkbox':
    case 'radio':
      if (val) {
        el.checked = true;
      } else {
        el.checked = false;
      }
      break;
    case 'radiogroup':
      for (var i = 0, radio; radio = el[i]; i++) {
        radio.checked = radio.value === val;
      }
      break;
    case 'select':
      for (var i = 0, option; option = el.options[i]; i++) {
        option.selected = option.value === val;
      }
      break;
    default:
      el.value = val;
  }
}

/**
 * Element type.
 */

function type(el) {
  var group = 'array' == typeOf(el) || 'object' == typeOf(el);
  if (group) el = el[0];
  var name = el.nodeName.toLowerCase();
  var type = el.getAttribute('type');

  if (group && type && 'radio' == type.toLowerCase()) return 'radiogroup';
  if ('input' == name && type && 'checkbox' == type.toLowerCase()) return 'checkbox';
  if ('input' == name && type && 'radio' == type.toLowerCase()) return 'radio';
  if ('select' == name) return 'select';
  return name;
}

});
require.register("component-query/index.js", function(exports, require, module){

function one(selector, el) {
  return el.querySelector(selector);
}

exports = module.exports = function(selector, el){
  el = el || document;
  return one(selector, el);
};

exports.all = function(selector, el){
  el = el || document;
  return el.querySelectorAll(selector);
};

exports.engine = function(obj){
  if (!obj.one) throw new Error('.one callback required');
  if (!obj.all) throw new Error('.all callback required');
  one = obj.one;
  exports.all = obj.all;
};

});
require.register("component-dom/index.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var delegate = require('delegate');
var classes = require('classes');
var indexof = require('indexof');
var domify = require('domify');
var events = require('event');
var value = require('value');
var query = require('query');
var type = require('type');
var css = require('css');

/**
 * Attributes supported.
 */

var attrs = [
  'id',
  'src',
  'rel',
  'cols',
  'rows',
  'name',
  'href',
  'title',
  'style',
  'width',
  'height',
  'tabindex',
  'placeholder'
];

/**
 * Expose `dom()`.
 */

exports = module.exports = dom;

/**
 * Expose supported attrs.
 */

exports.attrs = attrs;

/**
 * Return a dom `List` for the given
 * `html`, selector, or element.
 *
 * @param {String|Element|List}
 * @return {List}
 * @api public
 */

function dom(selector, context) {
  // array
  if (Array.isArray(selector)) {
    return new List(selector);
  }

  // List
  if (selector instanceof List) {
    return selector;
  }

  // node
  if (selector.nodeName) {
    return new List([selector]);
  }

  if ('string' != typeof selector) {
    throw new TypeError('invalid selector');
  }

  // html
  if ('<' == selector.charAt(0)) {
    return new List([domify(selector)[0]], selector);
  }

  // selector
  var ctx = context
    ? (context.els ? context.els[0] : context)
    : document;

  return new List(query.all(selector, ctx), selector);
}

/**
 * Expose `List` constructor.
 */

exports.List = List;

/**
 * Initialize a new `List` with the
 * given array-ish of `els` and `selector`
 * string.
 *
 * @param {Mixed} els
 * @param {String} selector
 * @api private
 */

function List(els, selector) {
  this.els = els || [];
  this.selector = selector;
}

/**
 * Enumerable iterator.
 */

List.prototype.__iterate__ = function(){
  var self = this;
  return {
    length: function(){ return self.els.length },
    get: function(i){ return new List([self.els[i]]) }
  }
};

/**
 * Remove elements from the DOM.
 *
 * @api public
 */

List.prototype.remove = function(){
  for (var i = 0; i < this.els.length; i++) {
    var el = this.els[i];
    var parent = el.parentNode;
    if (parent) parent.removeChild(el);
  }
};

/**
 * Set attribute `name` to `val`, or get attr `name`.
 *
 * @param {String} name
 * @param {String} [val]
 * @return {String|List} self
 * @api public
 */

List.prototype.attr = function(name, val){
  // get
  if (1 == arguments.length) {
    return this.els[0] && this.els[0].getAttribute(name);
  }

  // remove
  if (null == val) {
    return this.removeAttr(name);
  }

  // set
  return this.forEach(function(el){
    el.setAttribute(name, val);
  });
};

/**
 * Remove attribute `name`.
 *
 * @param {String} name
 * @return {List} self
 * @api public
 */

List.prototype.removeAttr = function(name){
  return this.forEach(function(el){
    el.removeAttribute(name);
  });
};

/**
 * Set property `name` to `val`, or get property `name`.
 *
 * @param {String} name
 * @param {String} [val]
 * @return {Object|List} self
 * @api public
 */

List.prototype.prop = function(name, val){
  if (1 == arguments.length) {
    return this.els[0] && this.els[0][name];
  }

  return this.forEach(function(el){
    el[name] = val;
  });
};

/**
 * Get the first element's value or set selected
 * element values to `val`.
 *
 * @param {Mixed} [val]
 * @return {Mixed}
 * @api public
 */

List.prototype.val =
List.prototype.value = function(val){
  if (0 == arguments.length) {
    return this.els[0]
      ? value(this.els[0])
      : undefined;
  }

  return this.forEach(function(el){
    value(el, val);
  });
};

/**
 * Return a cloned `List` with all elements cloned.
 *
 * @return {List}
 * @api public
 */

List.prototype.clone = function(){
  var arr = [];
  for (var i = 0, len = this.els.length; i < len; ++i) {
    arr.push(this.els[i].cloneNode(true));
  }
  return new List(arr);
};

/**
 * Prepend `val`.
 *
 * @param {String|Element|List} val
 * @return {List} new list
 * @api public
 */

List.prototype.prepend = function(val){
  var el = this.els[0];
  if (!el) return this;
  val = dom(val);
  for (var i = 0; i < val.els.length; ++i) {
    if (el.children.length) {
      el.insertBefore(val.els[i], el.firstChild);
    } else {
      el.appendChild(val.els[i]);
    }
  }
  return val;
};

/**
 * Append `val`.
 *
 * @param {String|Element|List} val
 * @return {List} new list
 * @api public
 */

List.prototype.append = function(val){
  var el = this.els[0];
  if (!el) return this;
  val = dom(val);
  for (var i = 0; i < val.els.length; ++i) {
    el.appendChild(val.els[i]);
  }
  return val;
};

/**
 * Append self's `el` to `val`
 *
 * @param {String|Element|List} val
 * @return {List} self
 * @api public
 */

List.prototype.appendTo = function(val){
  dom(val).append(this);
  return this;
};

/**
 * Return a `List` containing the element at `i`.
 *
 * @param {Number} i
 * @return {List}
 * @api public
 */

List.prototype.at = function(i){
  return new List([this.els[i]], this.selector);
};

/**
 * Return a `List` containing the first element.
 *
 * @param {Number} i
 * @return {List}
 * @api public
 */

List.prototype.first = function(){
  return new List([this.els[0]], this.selector);
};

/**
 * Return a `List` containing the last element.
 *
 * @param {Number} i
 * @return {List}
 * @api public
 */

List.prototype.last = function(){
  return new List([this.els[this.els.length - 1]], this.selector);
};

/**
 * Return an `Element` at `i`.
 *
 * @param {Number} i
 * @return {Element}
 * @api public
 */

List.prototype.get = function(i){
  return this.els[i || 0];
};

/**
 * Return list length.
 *
 * @return {Number}
 * @api public
 */

List.prototype.length = function(){
  return this.els.length;
};

/**
 * Return element text.
 *
 * @param {String} str
 * @return {String|List}
 * @api public
 */

List.prototype.text = function(str){
  // TODO: real impl
  if (1 == arguments.length) {
    this.forEach(function(el){
      el.textContent = str;
    });
    return this;
  }

  var str = '';
  for (var i = 0; i < this.els.length; ++i) {
    str += this.els[i].textContent;
  }
  return str;
};

/**
 * Return element html.
 *
 * @return {String} html
 * @api public
 */

List.prototype.html = function(html){
  if (1 == arguments.length) {
    this.forEach(function(el){
      el.innerHTML = html;
    });
  }
  // TODO: real impl
  return this.els[0] && this.els[0].innerHTML;
};

/**
 * Bind to `event` and invoke `fn(e)`. When
 * a `selector` is given then events are delegated.
 *
 * @param {String} event
 * @param {String} [selector]
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {List}
 * @api public
 */

List.prototype.on = function(event, selector, fn, capture){
  if ('string' == typeof selector) {
    for (var i = 0; i < this.els.length; ++i) {
      fn._delegate = delegate.bind(this.els[i], selector, event, fn, capture);
    }
    return this;
  }

  capture = fn;
  fn = selector;

  for (var i = 0; i < this.els.length; ++i) {
    events.bind(this.els[i], event, fn, capture);
  }

  return this;
};

/**
 * Unbind to `event` and invoke `fn(e)`. When
 * a `selector` is given then delegated event
 * handlers are unbound.
 *
 * @param {String} event
 * @param {String} [selector]
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {List}
 * @api public
 */

List.prototype.off = function(event, selector, fn, capture){
  if ('string' == typeof selector) {
    for (var i = 0; i < this.els.length; ++i) {
      // TODO: add selector support back
      delegate.unbind(this.els[i], event, fn._delegate, capture);
    }
    return this;
  }

  capture = fn;
  fn = selector;

  for (var i = 0; i < this.els.length; ++i) {
    events.unbind(this.els[i], event, fn, capture);
  }
  return this;
};

/**
 * Iterate elements and invoke `fn(list, i)`.
 *
 * @param {Function} fn
 * @return {List} self
 * @api public
 */

List.prototype.each = function(fn){
  for (var i = 0; i < this.els.length; ++i) {
    fn(new List([this.els[i]], this.selector), i);
  }
  return this;
};

/**
 * Iterate elements and invoke `fn(el, i)`.
 *
 * @param {Function} fn
 * @return {List} self
 * @api public
 */

List.prototype.forEach = function(fn){
  for (var i = 0; i < this.els.length; ++i) {
    fn(this.els[i], i);
  }
  return this;
};

/**
 * Map elements invoking `fn(list, i)`.
 *
 * @param {Function} fn
 * @return {Array}
 * @api public
 */

List.prototype.map = function(fn){
  var arr = [];
  for (var i = 0; i < this.els.length; ++i) {
    arr.push(fn(new List([this.els[i]], this.selector), i));
  }
  return arr;
};

/**
 * Filter elements invoking `fn(list, i)`, returning
 * a new `List` of elements when a truthy value is returned.
 *
 * @param {Function} fn
 * @return {List}
 * @api public
 */

List.prototype.select =
List.prototype.filter = function(fn){
  var el;
  var list = new List([], this.selector);
  for (var i = 0; i < this.els.length; ++i) {
    el = this.els[i];
    if (fn(new List([el], this.selector), i)) list.els.push(el);
  }
  return list;
};

/**
 * Add the given class `name`.
 *
 * @param {String} name
 * @return {List} self
 * @api public
 */

List.prototype.addClass = function(name){
  var el;
  for (var i = 0; i < this.els.length; ++i) {
    el = this.els[i];
    el._classes = el._classes || classes(el);
    el._classes.add(name);
  }
  return this;
};

/**
 * Remove the given class `name`.
 *
 * @param {String|RegExp} name
 * @return {List} self
 * @api public
 */

List.prototype.removeClass = function(name){
  var el;

  if ('regexp' == type(name)) {
    for (var i = 0; i < this.els.length; ++i) {
      el = this.els[i];
      el._classes = el._classes || classes(el);
      var arr = el._classes.array();
      for (var j = 0; j < arr.length; j++) {
        if (name.test(arr[j])) {
          el._classes.remove(arr[j]);
        }
      }
    }
    return this;
  }

  for (var i = 0; i < this.els.length; ++i) {
    el = this.els[i];
    el._classes = el._classes || classes(el);
    el._classes.remove(name);
  }

  return this;
};

/**
 * Toggle the given class `name`,
 * optionally a `bool` may be given
 * to indicate that the class should
 * be added when truthy.
 *
 * @param {String} name
 * @param {Boolean} bool
 * @return {List} self
 * @api public
 */

List.prototype.toggleClass = function(name, bool){
  var el;
  var fn = 'toggle';

  // toggle with boolean
  if (2 == arguments.length) {
    fn = bool ? 'add' : 'remove';
  }

  for (var i = 0; i < this.els.length; ++i) {
    el = this.els[i];
    el._classes = el._classes || classes(el);
    el._classes[fn](name);
  }

  return this;
};

/**
 * Check if the given class `name` is present.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

List.prototype.hasClass = function(name){
  var el;
  for (var i = 0; i < this.els.length; ++i) {
    el = this.els[i];
    el._classes = el._classes || classes(el);
    if (el._classes.has(name)) return true;
  }
  return false;
};

/**
 * Set CSS `prop` to `val` or get `prop` value.
 * Also accepts an object (`prop`: `val`)
 *
 * @param {String} prop
 * @param {Mixed} val
 * @return {List|String}
 * @api public
 */

List.prototype.css = function(prop, val){
  if (2 == arguments.length) {
    var obj = {};
    obj[prop] = val;
    return this.setStyle(obj);
  }

  if ('object' == type(prop)) {
    return this.setStyle(prop);
  }

  return this.getStyle(prop);
};

/**
 * Set CSS `props`.
 *
 * @param {Object} props
 * @return {List} self
 * @api private
 */

List.prototype.setStyle = function(props){
  for (var i = 0; i < this.els.length; ++i) {
    css(this.els[i], props);
  }
  return this;
};

/**
 * Get CSS `prop` value.
 *
 * @param {String} prop
 * @return {String}
 * @api private
 */

List.prototype.getStyle = function(prop){
  var el = this.els[0];
  if (el) return el.style[prop];
};

/**
 * Find children matching the given `selector`.
 *
 * @param {String} selector
 * @return {List}
 * @api public
 */

List.prototype.find = function(selector){
  return dom(selector, this);
};

/**
 * Empty the dom list
 *
 * @return self
 * @api public
 */

List.prototype.empty = function(){
  var elem, el;

  for (var i = 0; i < this.els.length; ++i) {
    el = this.els[i];
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  return this;
}

/**
 * Attribute accessors.
 */

attrs.forEach(function(name){
  List.prototype[name] = function(val){
    if (0 == arguments.length) return this.attr(name);
    return this.attr(name, val);
  };
});


});
require.register("component-event/index.js", function(exports, require, module){

/**
 * Bind `el` event `type` to `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.bind = function(el, type, fn, capture){
  if (el.addEventListener) {
    el.addEventListener(type, fn, capture || false);
  } else {
    el.attachEvent('on' + type, fn);
  }
  return fn;
};

/**
 * Unbind `el` event `type`'s callback `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.unbind = function(el, type, fn, capture){
  if (el.removeEventListener) {
    el.removeEventListener(type, fn, capture || false);
  } else {
    el.detachEvent('on' + type, fn);
  }
  return fn;
};

});
require.register("matthewmueller-debounce/index.js", function(exports, require, module){
/**
 * Debounce
 *
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 *
 * @param {Function} func
 * @param {Number} wait
 * @param {Boolean} immediate
 * @return {Function}
 */

module.exports = function(func, wait, immediate) {
  var timeout, result;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) result = func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) result = func.apply(context, args);
    return result;
  };
};

});
require.register("component-select/index.js", function(exports, require, module){

/**
 * Filter the given `arr` with callback `fn(val, i)`,
 * when a truthy value is return then `val` is included
 * in the array returned.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @return {Array}
 * @api public
 */

module.exports = function(arr, fn){
  var ret = [];
  for (var i = 0; i < arr.length; ++i) {
    if (fn(arr[i], i)) {
      ret.push(arr[i]);
    }
  }
  return ret;
};
});
require.register("segmentio-extend/index.js", function(exports, require, module){

module.exports = function extend (object) {
    // Takes an unlimited number of extenders.
    var args = Array.prototype.slice.call(arguments, 1);

    // For each extender, copy their properties on our object.
    for (var i = 0, source; source = args[i]; i++) {
        if (!source) continue;
        for (var property in source) {
            object[property] = source[property];
        }
    }

    return object;
};
});
require.register("yields-uniq/index.js", function(exports, require, module){

/**
 * dependencies
 */

try {
  var indexOf = require('indexof');
} catch(e){
  var indexOf = require('indexof-component');
}

/**
 * Create duplicate free array
 * from the provided `arr`.
 *
 * @param {Array} arr
 * @param {Array} select
 * @return {Array}
 */

module.exports = function (arr, select) {
  var len = arr.length, ret = [], v;
  select = select ? (select instanceof Array ? select : [select]) : false;

  for (var i = 0; i < len; i++) {
    v = arr[i];
    if (select && !~indexOf(select, v)) {
      ret.push(v);
    } else if (!~indexOf(ret, v)) {
      ret.push(v);
    }
  }
  return ret;
};

});
require.register("nami-doc-contains/index.js", function(exports, require, module){
/**
 * Checks whether the element `el` is in the array `arr`
 */
module.exports = function (arr, el) {
  var i = 0
    , len = arr.length >>> 0

  while (i < len) {
    if (el === arr[i++]) {
      return true
    }
  }

  return false
}

});
require.register("bmcmahen-confirmation/index.js", function(exports, require, module){
/**
 * Confirmation Module
 *
 * Super simple confirmation dialogue following in the footsteps
 * of https://github.com/component/dialog but without jquery. 
 *
 * I'm generally of the opinion that a dialogue should always have a confirmation
 * button of some sort, so I've wrapped dialogue & confirmation into one module. 
 */

var Emitter = require('emitter');

module.exports = function(attributes, options){
	return new Confirmation(attributes, options);
}

var active; 

// Constructor
var Confirmation = function (attributes, options) {
	this.attributes = attributes || {};

	options = options || {}; 
	this.template = options.template || require('./template');
	this.isShown = false; 

	this.el = this._render(); 

	if (active && active.isShown)
		active.hide();

	active = this; 

	if (attributes.okay) this.okay();
	if (attributes.cancel) this.cancel(); 

}

Confirmation.prototype = new Emitter();

// Functions
Confirmation.prototype._render = function(){
	var self = this
		, el = document.createElement('div')
		, html = self.template(self.attributes);

	el.className = 'confirmation hide';
	el.innerHTML = html;
	el.setAttribute('tabindex', '-1');

	setTimeout(function(){
    el.className = el.className.replace( /(?:^|\s)hide(?!\S)/g , '' );
  }, 0);

  return el; 
};

Confirmation.prototype.show = function(){
	if (this.isShown)
		return

	var el = this.el; 

	document.querySelector('body').appendChild(el);

	this.isShown = true; 
	this.emit('show');
	el.focus();

	return this; 
};

Confirmation.prototype.hide = function(){
	var self = this
		, el = self.el; 

	if (!this.isShown)
		return

	if (self.animate) {
		el.className += ' hide';
		clearTimeout(this.timer);
		this.timer = setTimeout(function(){
			self.remove();
		}, 400);
	} else {
		self.remove(); 
	}

	self.isShown = false; 
	self.emit('hide');

};

Confirmation.prototype.remove = function(){
	var self = this
		, el = self.el; 
		
	el.parentNode.removeChild(self.el);
	self.emit('hidden');
};

Confirmation.prototype.okay = function(callback){
	var self = this
		, el = self.el; 

	el.querySelector('.ok').onclick = function(e){
		if (callback) callback(e);
		self.emit('okay');
		self.hide(); 
	}

	return this; 
};

Confirmation.prototype.cancel = function(callback){
	var self = this
		, el = self.el; 

	el.querySelector('.cancel').onclick = function(e){
		if (callback) callback(e);
		self.emit('cancel');
		self.hide(); 
	}

	return this; 
};

Confirmation.prototype.addClass = function(name){
	this.el.className += ' '+name; 
	return this; 
};

Confirmation.prototype.effect = function(type){
	this.animate = type; 
	this.el.className += ' '+type; 
	return this; 
}

});
require.register("bmcmahen-confirmation/template.js", function(exports, require, module){
module.exports = function anonymous(obj) {

  function escape(html) {
    return String(html)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  function section(obj, prop, negate, str) {
    var val = obj[prop];
    if ('function' == typeof val) return val.call(obj, str);
    if (negate) val = !val;
    if (val) return str;
    return '';
  };

  return "\n	<div class='dialog-content " + escape(obj.className) + "'>\n		<span class='title'> " + escape(obj.title) + " </span>\n		<div class='body'>\n			<p>\n				" + escape(obj.content) + "\n			</p>\n		</div>\n		<div class='confirmation-actions'>\n			" + section(obj, "cancel", false, "\n				<button class='cancel'>" + escape(obj.cancel) + "</button>\n			") + "\n			" + section(obj, "okay", false, "\n			<button class='ok main'>" + escape(obj.okay) + "</button>\n			") + "\n		</div>\n	</div>\n"
}
});
require.register("component-clone/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var type;

try {
  type = require('type');
} catch(e){
  type = require('type-component');
}

/**
 * Module exports.
 */

module.exports = clone;

/**
 * Clones objects.
 *
 * @param {Mixed} any object
 * @api public
 */

function clone(obj){
  switch (type(obj)) {
    case 'object':
      var copy = {};
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
          copy[key] = clone(obj[key]);
        }
      }
      return copy;

    case 'array':
      var copy = new Array(obj.length);
      for (var i = 0, l = obj.length; i < l; i++) {
        copy[i] = clone(obj[i]);
      }
      return copy;

    case 'regexp':
      // from millermedeiros/amd-utils - MIT
      var flags = '';
      flags += obj.multiline ? 'm' : '';
      flags += obj.global ? 'g' : '';
      flags += obj.ignoreCase ? 'i' : '';
      return new RegExp(obj.source, flags);

    case 'date':
      return new Date(obj.getTime());

    default: // string, number, boolean, …
      return obj;
  }
}

});
require.register("component-enumerable/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var toFunction = require('to-function')
  , proto = {};

/**
 * Expose `Enumerable`.
 */

module.exports = Enumerable;

/**
 * Mixin to `obj`.
 *
 *    var Enumerable = require('enumerable');
 *    Enumerable(Something.prototype);
 *
 * @param {Object} obj
 * @return {Object} obj
 */

function mixin(obj){
  for (var key in proto) obj[key] = proto[key];
  obj.__iterate__ = obj.__iterate__ || defaultIterator;
  return obj;
}

/**
 * Initialize a new `Enumerable` with the given `obj`.
 *
 * @param {Object} obj
 * @api private
 */

function Enumerable(obj) {
  if (!(this instanceof Enumerable)) {
    if (Array.isArray(obj)) return new Enumerable(obj);
    return mixin(obj);
  }
  this.obj = obj;
}

/*!
 * Default iterator utilizing `.length` and subscripts.
 */

function defaultIterator() {
  var self = this;
  return {
    length: function(){ return self.length },
    get: function(i){ return self[i] }
  }
}

/**
 * Return a string representation of this enumerable.
 *
 *    [Enumerable [1,2,3]]
 *
 * @return {String}
 * @api public
 */

Enumerable.prototype.inspect =
Enumerable.prototype.toString = function(){
  return '[Enumerable ' + JSON.stringify(this.obj) + ']';
};

/**
 * Iterate enumerable.
 *
 * @return {Object}
 * @api private
 */

Enumerable.prototype.__iterate__ = function(){
  var obj = this.obj;
  obj.__iterate__ = obj.__iterate__ || defaultIterator;
  return obj.__iterate__();
};

/**
 * Iterate each value and invoke `fn(val, i)`.
 *
 *    users.each(function(val, i){
 *
 *    })
 *
 * @param {Function} fn
 * @return {Object} self
 * @api public
 */

proto.forEach =
proto.each = function(fn){
  var vals = this.__iterate__();
  var len = vals.length();
  for (var i = 0; i < len; ++i) {
    fn(vals.get(i), i);
  }
  return this;
};

/**
 * Map each return value from `fn(val, i)`.
 *
 * Passing a callback function:
 *
 *    users.map(function(user){
 *      return user.name.first
 *    })
 *
 * Passing a property string:
 *
 *    users.map('name.first')
 *
 * @param {Function} fn
 * @return {Enumerable}
 * @api public
 */

proto.map = function(fn){
  fn = toFunction(fn);
  var vals = this.__iterate__();
  var len = vals.length();
  var arr = [];
  for (var i = 0; i < len; ++i) {
    arr.push(fn(vals.get(i), i));
  }
  return new Enumerable(arr);
};

/**
 * Select all values that return a truthy value of `fn(val, i)`.
 *
 *    users.select(function(user){
 *      return user.age > 20
 *    })
 *
 *  With a property:
 *
 *    items.select('complete')
 *
 * @param {Function|String} fn
 * @return {Enumerable}
 * @api public
 */

proto.filter =
proto.select = function(fn){
  fn = toFunction(fn);
  var val;
  var arr = [];
  var vals = this.__iterate__();
  var len = vals.length();
  for (var i = 0; i < len; ++i) {
    val = vals.get(i);
    if (fn(val, i)) arr.push(val);
  }
  return new Enumerable(arr);
};

/**
 * Select all unique values.
 *
 *    nums.unique()
 *
 * @return {Enumerable}
 * @api public
 */

proto.unique = function(){
  var val;
  var arr = [];
  var vals = this.__iterate__();
  var len = vals.length();
  for (var i = 0; i < len; ++i) {
    val = vals.get(i);
    if (~arr.indexOf(val)) continue;
    arr.push(val);
  }
  return new Enumerable(arr);
};

/**
 * Reject all values that return a truthy value of `fn(val, i)`.
 *
 * Rejecting using a callback:
 *
 *    users.reject(function(user){
 *      return user.age < 20
 *    })
 *
 * Rejecting with a property:
 *
 *    items.reject('complete')
 *
 * Rejecting values via `==`:
 *
 *    data.reject(null)
 *    users.reject(tobi)
 *
 * @param {Function|String|Mixed} fn
 * @return {Enumerable}
 * @api public
 */

proto.reject = function(fn){
  var val;
  var arr = [];
  var vals = this.__iterate__();
  var len = vals.length();

  if ('string' == typeof fn) fn = toFunction(fn);

  if (fn) {
    for (var i = 0; i < len; ++i) {
      val = vals.get(i);
      if (!fn(val, i)) arr.push(val);
    }
  } else {
    for (var i = 0; i < len; ++i) {
      val = vals.get(i);
      if (val != fn) arr.push(val);
    }
  }

  return new Enumerable(arr);
};

/**
 * Reject `null` and `undefined`.
 *
 *    [1, null, 5, undefined].compact()
 *    // => [1,5]
 *
 * @return {Enumerable}
 * @api public
 */


proto.compact = function(){
  return this.reject(null);
};

/**
 * Return the first value when `fn(val, i)` is truthy,
 * otherwise return `undefined`.
 *
 *    users.find(function(user){
 *      return user.role == 'admin'
 *    })
 *
 * With a property string:
 *
 *    users.find('age > 20')
 *
 * @param {Function|String} fn
 * @return {Mixed}
 * @api public
 */

proto.find = function(fn){
  fn = toFunction(fn);
  var val;
  var vals = this.__iterate__();
  var len = vals.length();
  for (var i = 0; i < len; ++i) {
    val = vals.get(i);
    if (fn(val, i)) return val;
  }
};

/**
 * Return the last value when `fn(val, i)` is truthy,
 * otherwise return `undefined`.
 *
 *    users.findLast(function(user){
 *      return user.role == 'admin'
 *    })
 *
 * @param {Function} fn
 * @return {Mixed}
 * @api public
 */

proto.findLast = function(fn){
  fn = toFunction(fn);
  var val;
  var vals = this.__iterate__();
  var len = vals.length();
  for (var i = len - 1; i > -1; --i) {
    val = vals.get(i);
    if (fn(val, i)) return val;
  }
};

/**
 * Assert that all invocations of `fn(val, i)` are truthy.
 *
 * For example ensuring that all pets are ferrets:
 *
 *    pets.all(function(pet){
 *      return pet.species == 'ferret'
 *    })
 *
 *    users.all('admin')
 *
 * @param {Function|String} fn
 * @return {Boolean}
 * @api public
 */

proto.all =
proto.every = function(fn){
  fn = toFunction(fn);
  var val;
  var vals = this.__iterate__();
  var len = vals.length();
  for (var i = 0; i < len; ++i) {
    val = vals.get(i);
    if (!fn(val, i)) return false;
  }
  return true;
};

/**
 * Assert that none of the invocations of `fn(val, i)` are truthy.
 *
 * For example ensuring that no pets are admins:
 *
 *    pets.none(function(p){ return p.admin })
 *    pets.none('admin')
 *
 * @param {Function|String} fn
 * @return {Boolean}
 * @api public
 */

proto.none = function(fn){
  fn = toFunction(fn);
  var val;
  var vals = this.__iterate__();
  var len = vals.length();
  for (var i = 0; i < len; ++i) {
    val = vals.get(i);
    if (fn(val, i)) return false;
  }
  return true;
};

/**
 * Assert that at least one invocation of `fn(val, i)` is truthy.
 *
 * For example checking to see if any pets are ferrets:
 *
 *    pets.any(function(pet){
 *      return pet.species == 'ferret'
 *    })
 *
 * @param {Function} fn
 * @return {Boolean}
 * @api public
 */

proto.any = function(fn){
  fn = toFunction(fn);
  var val;
  var vals = this.__iterate__();
  var len = vals.length();
  for (var i = 0; i < len; ++i) {
    val = vals.get(i);
    if (fn(val, i)) return true;
  }
  return false;
};

/**
 * Count the number of times `fn(val, i)` returns true.
 *
 *    var n = pets.count(function(pet){
 *      return pet.species == 'ferret'
 *    })
 *
 * @param {Function} fn
 * @return {Number}
 * @api public
 */

proto.count = function(fn){
  var val;
  var vals = this.__iterate__();
  var len = vals.length();
  var n = 0;
  for (var i = 0; i < len; ++i) {
    val = vals.get(i);
    if (fn(val, i)) ++n;
  }
  return n;
};

/**
 * Determine the indexof `obj` or return `-1`.
 *
 * @param {Mixed} obj
 * @return {Number}
 * @api public
 */

proto.indexOf = function(obj){
  var val;
  var vals = this.__iterate__();
  var len = vals.length();
  for (var i = 0; i < len; ++i) {
    val = vals.get(i);
    if (val === obj) return i;
  }
  return -1;
};

/**
 * Check if `obj` is present in this enumerable.
 *
 * @param {Mixed} obj
 * @return {Boolean}
 * @api public
 */

proto.has = function(obj){
  return !! ~this.indexOf(obj);
};

/**
 * Reduce with `fn(accumulator, val, i)` using
 * optional `init` value defaulting to the first
 * enumerable value.
 *
 * @param {Function} fn
 * @param {Mixed} [val]
 * @return {Mixed}
 * @api public
 */

proto.reduce = function(fn, init){
  var val;
  var i = 0;
  var vals = this.__iterate__();
  var len = vals.length();

  val = null == init
    ? vals.get(i++)
    : init;

  for (; i < len; ++i) {
    val = fn(val, vals.get(i), i);
  }

  return val;
};

/**
 * Determine the max value.
 *
 * With a callback function:
 *
 *    pets.max(function(pet){
 *      return pet.age
 *    })
 *
 * With property strings:
 *
 *    pets.max('age')
 *
 * With immediate values:
 *
 *    nums.max()
 *
 * @param {Function|String} fn
 * @return {Number}
 * @api public
 */

proto.max = function(fn){
  var val;
  var n = 0;
  var max = -Infinity;
  var vals = this.__iterate__();
  var len = vals.length();

  if (fn) {
    fn = toFunction(fn);
    for (var i = 0; i < len; ++i) {
      n = fn(vals.get(i), i);
      max = n > max ? n : max;
    }
  } else {
    for (var i = 0; i < len; ++i) {
      n = vals.get(i);
      max = n > max ? n : max;
    }
  }

  return max;
};

/**
 * Determine the min value.
 *
 * With a callback function:
 *
 *    pets.min(function(pet){
 *      return pet.age
 *    })
 *
 * With property strings:
 *
 *    pets.min('age')
 *
 * With immediate values:
 *
 *    nums.min()
 *
 * @param {Function|String} fn
 * @return {Number}
 * @api public
 */

proto.min = function(fn){
  var val;
  var n = 0;
  var min = Infinity;
  var vals = this.__iterate__();
  var len = vals.length();

  if (fn) {
    fn = toFunction(fn);
    for (var i = 0; i < len; ++i) {
      n = fn(vals.get(i), i);
      min = n < min ? n : min;
    }
  } else {
    for (var i = 0; i < len; ++i) {
      n = vals.get(i);
      min = n < min ? n : min;
    }
  }

  return min;
};

/**
 * Determine the sum.
 *
 * With a callback function:
 *
 *    pets.sum(function(pet){
 *      return pet.age
 *    })
 *
 * With property strings:
 *
 *    pets.sum('age')
 *
 * With immediate values:
 *
 *    nums.sum()
 *
 * @param {Function|String} fn
 * @return {Number}
 * @api public
 */

proto.sum = function(fn){
  var ret;
  var n = 0;
  var vals = this.__iterate__();
  var len = vals.length();

  if (fn) {
    fn = toFunction(fn);
    for (var i = 0; i < len; ++i) {
      n += fn(vals.get(i), i);
    }
  } else {
    for (var i = 0; i < len; ++i) {
      n += vals.get(i);
    }
  }

  return n;
};

/**
 * Determine the average value.
 *
 * With a callback function:
 *
 *    pets.avg(function(pet){
 *      return pet.age
 *    })
 *
 * With property strings:
 *
 *    pets.avg('age')
 *
 * With immediate values:
 *
 *    nums.avg()
 *
 * @param {Function|String} fn
 * @return {Number}
 * @api public
 */

proto.avg =
proto.mean = function(fn){
  var ret;
  var n = 0;
  var vals = this.__iterate__();
  var len = vals.length();

  if (fn) {
    fn = toFunction(fn);
    for (var i = 0; i < len; ++i) {
      n += fn(vals.get(i), i);
    }
  } else {
    for (var i = 0; i < len; ++i) {
      n += vals.get(i);
    }
  }

  return n / len;
};

/**
 * Return the first value, or first `n` values.
 *
 * @param {Number|Function} [n]
 * @return {Array|Mixed}
 * @api public
 */

proto.first = function(n){
  if ('function' == typeof n) return this.find(n);
  var vals = this.__iterate__();

  if (n) {
    var len = Math.min(n, vals.length());
    var arr = new Array(len);
    for (var i = 0; i < len; ++i) {
      arr[i] = vals.get(i);
    }
    return arr;
  }

  return vals.get(0);
};

/**
 * Return the last value, or last `n` values.
 *
 * @param {Number|Function} [n]
 * @return {Array|Mixed}
 * @api public
 */

proto.last = function(n){
  if ('function' == typeof n) return this.findLast(n);
  var vals = this.__iterate__();
  var len = vals.length();

  if (n) {
    var i = Math.max(0, len - n);
    var arr = [];
    for (; i < len; ++i) {
      arr.push(vals.get(i));
    }
    return arr;
  }

  return vals.get(len - 1);
};

/**
 * Return values in groups of `n`.
 *
 * @param {Number} n
 * @return {Enumerable}
 * @api public
 */

proto.inGroupsOf = function(n){
  var arr = [];
  var group = [];
  var vals = this.__iterate__();
  var len = vals.length();

  for (var i = 0; i < len; ++i) {
    group.push(vals.get(i));
    if ((i + 1) % n == 0) {
      arr.push(group);
      group = [];
    }
  }

  if (group.length) arr.push(group);

  return new Enumerable(arr);
};

/**
 * Return the value at the given index.
 *
 * @param {Number} i
 * @return {Mixed}
 * @api public
 */

proto.at = function(i){
  return this.__iterate__().get(i);
};

/**
 * Return a regular `Array`.
 *
 * @return {Array}
 * @api public
 */

proto.toJSON =
proto.array = function(){
  var arr = [];
  var vals = this.__iterate__();
  var len = vals.length();
  for (var i = 0; i < len; ++i) {
    arr.push(vals.get(i));
  }
  return arr;
};

/**
 * Return the enumerable value.
 *
 * @return {Mixed}
 * @api public
 */

proto.value = function(){
  return this.obj;
};

/**
 * Mixin enumerable.
 */

mixin(Enumerable.prototype);

});
require.register("component-inherit/index.js", function(exports, require, module){

module.exports = function(a, b){
  var fn = function(){};
  fn.prototype = b.prototype;
  a.prototype = new fn;
  a.prototype.constructor = a;
};
});
require.register("yields-isArray/index.js", function(exports, require, module){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

});
require.register("eugenicsarchivesca-tip/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var Emitter = require('emitter')
  , inherit = require('inherit')
  , each = require('each')
  , query = require('query')
  , domify = require('domify')
  , classes = require('classes')
  , css = require('css')
  , events = require('event')
  , bind = require('bind')
  , isArray = require('isArray');

/**
 * Expose `Tip`.
 */

module.exports = Tip;

/**
 * Apply the average use-case of simply
 * showing a tool-tip on `el` hover.
 *
 * Options:
 *
 *  - `delay` hide delay in milliseconds [0]
 *  - `value` defaulting to the element's title attribute
 *
 * @param {Mixed} el
 * @param {Object|String} options or value
 * @api public
 */

function tip(el, options) {
  if ('string' == typeof options) options = { value : options };
  options = options || {};
  var delay = options.delay;

  if ('string' == typeof el) el = query.all(el);
  if (!isArray(el) && !(el instanceof NodeList)) el = [el];

  each(el, function(el, i){
    var val = options.value || el.getAttribute('title');
    var tip = new Tip(val);
    el.setAttribute('title', '');
    tip.cancelHideOnHover(delay);
    tip.attach(el, delay);
  });
}

/**
 * Initialize a `Tip` with the given `content`.
 *
 * @param {Mixed} content
 * @api public
 */

function Tip(content, options) {
  if (!(this instanceof Tip)) return tip(content, options);
  Emitter.call(this);
  this.classname = '';
  this.el = domify(require('./template'))[0];
  this.inner = query('.tip-inner', this.el);
  Tip.prototype.message.call(this, content);
  this.position('south');
  if (Tip.effect) this.effect(Tip.effect);
}

/**
 * Inherits from `Emitter.prototype`.
 */

inherit(Tip, Emitter);

/**
 * Set tip `content`.
 *
 * @param {String|Element} content
 * @return {Tip} self
 * @api public
 */

Tip.prototype.message = function(content){
  this.inner.innerHTML = '';
  if ('string' == typeof content) {
    this.inner.innerHTML = content;
  } else {
    this.inner.appendChild(content);
  }
  return this;
};

/**
 * Attach to the given `el` with optional hide `delay`.
 *
 * @param {Element} el
 * @param {Number} delay
 * @return {Tip}
 * @api public
 */

Tip.prototype.attach = function(el, delay){
  var self = this;
  if ('string' == typeof el) el = query(el);
  events.bind(el, 'mouseover', function () {
    self.show(el);
    self.cancelHide();
  });
  events.bind(el, 'mouseout', function () {
    self.hide(delay);
  });
  return this;
};

/**
 * Cancel hide on hover, hide with the given `delay`.
 *
 * @param {Number} delay
 * @return {Tip}
 * @api public
 */

Tip.prototype.cancelHideOnHover = function(delay){
  events.bind(this.el, 'mouseover', bind(this, 'cancelHide'));
  events.bind(this.el, 'mouseout', bind(this, 'hide', delay));
  return this;
};

/**
 * Set the effect to `type`.
 *
 * @param {String} type
 * @return {Tip}
 * @api public
 */

Tip.prototype.effect = function(type){
  this._effect = type;
  classes(this.el).add(type);
  return this;
};

/**
 * Set position:
 *
 *  - `north`
 *  - `north east`
 *  - `north west`
 *  - `south`
 *  - `south east`
 *  - `south west`
 *  - `east`
 *  - `west`
 *
 * @param {String} pos
 * @param {Object} options
 * @return {Tip}
 * @api public
 */

Tip.prototype.position = function(pos, options){
  options = options || {};
  this._position = pos;
  this._auto = false != options.auto;
  this.replaceClass(pos);
  return this;
};

/**
 * Show the tip attached to `el`.
 *
 * Emits "show" (el) event.
 *
 * @param {String|Element} el or x
 * @param {Number} [y]
 * @return {Tip}
 * @api public
 */

Tip.prototype.show = function(el){
  // show it
  try {
    this.target = query(el);
  } catch (_) { try {
    this.target = domify(el)[0];
  } catch (_) {
    this.target = el.hover
      ? el[0]
      : el;
  }}

  document.body.appendChild(this.el);

  var cl = classes(this.el);
  each(this._position.split(/ /g), function (c) {
    cl.add(c);
  });
  cl.remove('tip-hide');

  // x,y
  if ('number' == typeof el) {
    var x = arguments[0];
    var y = arguments[1];
    this.emit('show');
    css(this.el, { top: y, left: x });
    return this;
  }

  // el
  this.reposition();
  this.emit('show', this.target);
  this._reposition = bind(this, 'reposition');
  events.bind(window, 'resize', this._reposition);
  events.bind(window, 'scroll', this._reposition);

  return this;
};

/**
 * Reposition the tip if necessary.
 *
 * @api private
 */

Tip.prototype.reposition = function(){
  var pos = this._position;
  var off = this.offset(pos);
  var newpos = this._auto && this.suggested(pos, off);
  if (newpos) off = this.offset(pos = newpos);
  this.replaceClass(pos);
  css(this.el, off);
};

/**
 * Compute the "suggested" position favouring `pos`.
 * Returns undefined if no suggestion is made.
 *
 * @param {String} pos
 * @param {Object} offset
 * @return {String}
 * @api private
 */

Tip.prototype.suggested = function(pos, off){
  var el = this.el;

  var ew = el.offsetWidth;
  var eh = el.offsetHeight;

  var top = window.scrollY;
  var left = window.scrollX;

  var w = window.innerWidth;
  var h = window.innerHeight;

  // too high
  if (off.top < top) return 'north';

  // too low
  if (off.top + eh > top + h) return 'south';

  // too far to the right
  if (off.left + ew > left + w) return 'east';

  // too far to the left
  if (off.left < left) return 'west';
};

/**
 * Replace position class `name`.
 *
 * @param {String} name
 * @api private
 */

Tip.prototype.replaceClass = function(name){
  name = name.split(' ').join('-');
  this.el.setAttribute('class', this.classname + ' tip tip-' + name + ' ' + this._effect);
};

/**
 * Compute the offset for `.target`
 * based on the given `pos`.
 *
 * @param {String} pos
 * @return {Object}
 * @api private
 */

Tip.prototype.offset = function(pos){
  var pad = 15;
  var el = this.el;

  var ew = el.offsetWidth;
  var eh = el.offsetHeight;

  var target = this.target;
  var docEl = document.documentElement;
  var rect = target.getBoundingClientRect();
  var to = {
    top: rect.top + window.pageYOffset - docEl.clientTop,
    left: rect.left + window.pageXOffset - docEl.clientLeft
  };
  var tw = target.offsetWidth;
  var th = target.offsetHeight;

  switch (pos) {
    case 'south':
      return {
        top: to.top - eh,
        left: to.left + tw / 2 - ew / 2
      };
    case 'north west':
      return {
        top: to.top + th,
        left: to.left + tw / 2 - pad
      };
    case 'north east':
      return {
        top: to.top + th,
        left: to.left + tw / 2 - ew + pad
      };
    case 'north':
      return {
        top: to.top + th,
        left: to.left + tw / 2 - ew / 2
      };
    case 'south west':
      return {
        top: to.top - eh,
        left: to.left + tw / 2 - pad
      };
    case 'south east':
      return {
        top: to.top - eh,
        left: to.left + tw / 2 - ew + pad
      };
    case 'west':
      return {
        top: to.top + th / 2 - eh / 2,
        left: to.left + tw
      };
    case 'east':
      return {
        top: to.top + th / 2 - eh / 2,
        left: to.left - ew
      };
    default:
      throw new Error('invalid position "' + pos + '"');
  }
};

/**
 * Cancel the `.hide()` timeout.
 *
 * @api private
 */

Tip.prototype.cancelHide = function(){
  clearTimeout(this._hide);
};

/**
 * Hide the tip with optional `ms` delay.
 *
 * Emits "hide" event.
 *
 * @param {Number} ms
 * @return {Tip}
 * @api public
 */

Tip.prototype.hide = function(ms){
  var self = this;

  // duration
  if (ms) {
    this._hide = setTimeout(bind(this, 'hide'), ms);
    return this;
  }

  // hide
  classes(this.el).add('tip-hide');
  if (this._effect) {
    setTimeout(bind(this, 'remove'), 300);
  } else {
    self.remove();
  }

  return this;
};

/**
 * Hide the tip without potential animation.
 *
 * @return {Tip}
 * @api
 */

Tip.prototype.remove = function(){
  events.unbind(window, 'resize', this._reposition);
  events.unbind(window, 'scroll', this._reposition);
  this.emit('hide');
  if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
  return this;
};
});
require.register("eugenicsarchivesca-tip/template.js", function(exports, require, module){
module.exports = '<div class="tip tip-hide">\n  <div class="tip-arrow"></div>\n  <div class="tip-inner"></div>\n</div>';
});
require.register("bmcmahen-append/index.js", function(exports, require, module){
module.exports = function(el, content){
	if (typeof content == 'string') el.innerHTML += content;
	else el.appendChild(content);
	return el;
};


});
require.register("yields-empty/index.js", function(exports, require, module){

/**
 * Empty the given `el`.
 * 
 * @param {Element} el
 * @return {Element}
 */

module.exports = function(el, node){
  while (node = el.firstChild) el.removeChild(node);
  return el;
};

});
require.register("bmcmahen-html/index.js", function(exports, require, module){
var empty = require('empty')
	, append = require('append');

module.exports = function(el, content){
	return append(empty(el), content);
};
});
require.register("eugenicsarchivesca-confirmation-popover/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var Popover = require('popover')
  , domify = require('domify')
  , query = require('query')
  , events = require('event')
  , bind = require('bind')
  , html = require('html');

/**
 * Expose `ConfirmationPopover`.
 */

module.exports = ConfirmationPopover;

/**
 * Initialize a `ConfirmationPopover` with the given `msg`
 * and optional `title`.
 *
 * @param {Mixed} msg
 * @param {Mixed} title
 * @api public
 */

function ConfirmationPopover(msg, title) {
  this.actions = domify(require('./template'))[0];
  Popover.call(this, this.actions, title);
  this.classname = 'popover confirmation-popover';

  var cancel = query('.cancel', this.actions);
  events.bind(cancel, 'click', bind(this, this.oncancel));

  var ok = query('.ok', this.actions);
  events.bind(ok, 'click', bind(this, this.onok));

  this.message(msg);
}

/**
 * Inherits from `Popover.prototype`.
 */

ConfirmationPopover.prototype.__proto__ = Popover.prototype;

/**
 * Handle cancel click.
 *
 * Emits "cancel".
 *
 * @param {Event} e
 * @api private
 */

ConfirmationPopover.prototype.oncancel = function(e){
  e.preventDefault();
  this.emit('cancel');
  this.callback(false);
  this.hide();
};

/**
 * Handle ok click.
 *
 * Emits "ok".
 *
 * @param {Event} e
 * @api private
 */

ConfirmationPopover.prototype.onok = function(e){
  e.preventDefault();
  this.emit('ok');
  this.callback(true);
  this.hide();
};

/**
 * Set confirmation `msg`.
 *
 * @param {String} msg
 * @return {ConfirmationPopover}
 * @api public
 */

ConfirmationPopover.prototype.message = function(msg){
  html(query('.confirmation-popover-message', this.actions), msg);
  return this;
};

/**
 * Focus `type`, either "ok" or "cancel".
 *
 * @param {String} type
 * @return {ConfirmationPopover}
 * @api public
 */

ConfirmationPopover.prototype.focus = function(type){
  this._focus = type;
  return this;
};

/**
 * Change "cancel" button `text`.
 *
 * @param {String} text
 * @return {ConfirmationPopover}
 * @api public
 */

ConfirmationPopover.prototype.cancel = function(text){
  html(query('.cancel', this.actions), text);
  return this;
};

/**
 * Change "ok" button `text`.
 *
 * @param {String} text
 * @return {ConfirmationPopover}
 * @api public
 */

ConfirmationPopover.prototype.ok = function(text){
  html(query('.ok', this.actions), text);
  return this;
};

/**
 * Show the tip attached to `el` and invoke `fn(ok)`.
 *
 * @param {Element} el
 * @param {Function} fn
 * @return {ConfirmationPopover}
 * @api public
 */

ConfirmationPopover.prototype.show = function(el, fn){
  Popover.prototype.show.call(this, el);
  if (this._focus) query('.' + this._focus, this.el).focus();
  this.callback = fn || function(){};
  return this;
};

});
require.register("eugenicsarchivesca-confirmation-popover/template.js", function(exports, require, module){
module.exports = '<div class="confirmation-popover-content">\n  <div class="confirmation-popover-message"></div>\n  <div class="confirmation-popover-actions">\n    <button class="cancel">Cancel</button>\n    <button class="ok main">Ok</button>\n  </div>\n</div>';
});
require.register("eugenicsarchivesca-popover/index.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var Tip = require('tip')
  , inherit = require('inherit')
  , domify = require('domify')
  , classes = require('classes')
  , query = require('query')
  , empty = require('empty')
  , html = require('html');

/**
 * Expose `Popover`.
 */

module.exports = Popover;

/**
 * Initialize a `Popover` with the given `content`
 * and optional `title`.
 *
 * @param {Mixed} content
 * @param {Mixed} title
 * @api public
 */

function Popover(content, title) {
  this.popover = domify(require('./template'))[0];
  Tip.call(this, this.popover);
  this.classname = 'popover';
  classes(this.el).add('popover');
  if (title) this.title(title);
  else this.hideTitle();
  this.content(content);
  if (Popover.effect) this.effect(Popover.effect);
}

/**
 * Inherits from `Tip.prototype`.
 */

inherit(Popover, Tip);

/**
 * Replace `content`.
 *
 * @param {Mixed} content
 * @return {Popover}
 * @api public
 */

Popover.prototype.content = function(content){
  html(query('.popover-content', this.popover), content);
  return this;
};

/**
 * Change `title`.
 *
 * @param {String} title
 * @return {Popover}
 * @api public
 */

Popover.prototype.title = function(title){
  html(query('.popover-title', this.popover), title);
  return this;
};

/**
 * Hide the title.
 *
 * @return {Popover}
 * @api private
 */

Popover.prototype.hideTitle = function(){
  var el = query('.popover-title', this.popover);
  el.parentNode.removeChild(el);
  return this;
};


});
require.register("eugenicsarchivesca-popover/template.js", function(exports, require, module){
module.exports = '<div class="popover-wrapper">\n  <span class="popover-title"></span>\n  <div class="popover-content"></div>\n</div>';
});


require.register("component-events/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var events = require('event');
var delegate = require('delegate');

/**
 * Expose `Events`.
 */

module.exports = Events;

/**
 * Initialize an `Events` with the given
 * `el` object which events will be bound to,
 * and the `obj` which will receive method calls.
 *
 * @param {Object} el
 * @param {Object} obj
 * @api public
 */

function Events(el, obj) {
  if (!(this instanceof Events)) return new Events(el, obj);
  if (!el) throw new Error('element required');
  if (!obj) throw new Error('object required');
  this.el = el;
  this.obj = obj;
  this._events = {};
}

/**
 * Subscription helper.
 */

Events.prototype.sub = function(event, method, cb){
  this._events[event] = this._events[event] || {};
  this._events[event][method] = cb;
};

/**
 * Bind to `event` with optional `method` name.
 * When `method` is undefined it becomes `event`
 * with the "on" prefix.
 *
 * Examples:
 *
 *  Direct event handling:
 *
 *    events.bind('click') // implies "onclick"
 *    events.bind('click', 'remove')
 *    events.bind('click', 'sort', 'asc')
 *
 *  Delegated event handling:
 *
 *    events.bind('click li > a')
 *    events.bind('click li > a', 'remove')
 *    events.bind('click a.sort-ascending', 'sort', 'asc')
 *    events.bind('click a.sort-descending', 'sort', 'desc')
 *
 * @param {String} event
 * @param {String|function} [method]
 * @return {Function} callback
 * @api public
 */

Events.prototype.bind = function(event, method){
  var e = parse(event);
  var el = this.el;
  var obj = this.obj;
  var name = e.name;
  var method = method || 'on' + name;
  var args = [].slice.call(arguments, 2);

  // callback
  function cb(){
    var a = [].slice.call(arguments).concat(args);
    obj[method].apply(obj, a);
  }

  // bind
  if (e.selector) {
    cb = delegate.bind(el, e.selector, name, cb);
  } else {
    events.bind(el, name, cb);
  }

  // subscription for unbinding
  this.sub(name, method, cb);

  return cb;
};

/**
 * Unbind a single binding, all bindings for `event`,
 * or all bindings within the manager.
 *
 * Examples:
 *
 *  Unbind direct handlers:
 *
 *     events.unbind('click', 'remove')
 *     events.unbind('click')
 *     events.unbind()
 *
 * Unbind delegate handlers:
 *
 *     events.unbind('click', 'remove')
 *     events.unbind('click')
 *     events.unbind()
 *
 * @param {String|Function} [event]
 * @param {String|Function} [method]
 * @api public
 */

Events.prototype.unbind = function(event, method){
  if (0 == arguments.length) return this.unbindAll();
  if (1 == arguments.length) return this.unbindAllOf(event);

  // no bindings for this event
  var bindings = this._events[event];
  if (!bindings) return;

  // no bindings for this method
  var cb = bindings[method];
  if (!cb) return;

  events.unbind(this.el, event, cb);
};

/**
 * Unbind all events.
 *
 * @api private
 */

Events.prototype.unbindAll = function(){
  for (var event in this._events) {
    this.unbindAllOf(event);
  }
};

/**
 * Unbind all events for `event`.
 *
 * @param {String} event
 * @api private
 */

Events.prototype.unbindAllOf = function(event){
  var bindings = this._events[event];
  if (!bindings) return;

  for (var method in bindings) {
    this.unbind(event, method);
  }
};

/**
 * Parse `event`.
 *
 * @param {String} event
 * @return {Object}
 * @api private
 */

function parse(event) {
  var parts = event.split(/ +/);
  return {
    name: parts.shift(),
    selector: parts.join(' ')
  }
}

});
require.register("component-autoscale-canvas/index.js", function(exports, require, module){

/**
 * Retina-enable the given `canvas`.
 *
 * @param {Canvas} canvas
 * @return {Canvas}
 * @api public
 */

module.exports = function(canvas){
  var ctx = canvas.getContext('2d');
  var ratio = window.devicePixelRatio || 1;
  if (1 != ratio) {
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
    canvas.width *= ratio;
    canvas.height *= ratio;
    ctx.scale(ratio, ratio);
  }
  return canvas;
};
});
require.register("component-raf/index.js", function(exports, require, module){

module.exports = window.requestAnimationFrame
  || window.webkitRequestAnimationFrame
  || window.mozRequestAnimationFrame
  || window.oRequestAnimationFrame
  || window.msRequestAnimationFrame
  || fallback;

var prev = new Date().getTime();
function fallback(fn) {
  var curr = new Date().getTime();
  var ms = Math.max(0, 16 - (curr - prev));
  setTimeout(fn, ms);
  prev = curr;
}

});
require.register("component-spinner/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var autoscale = require('autoscale-canvas');
var raf = require('raf');

/**
 * Expose `Spinner`.
 */

module.exports = Spinner;

/**
 * Initialize a new `Spinner`.
 */

function Spinner() {
  var self = this;
  this.percent = 0;
  this.el = document.createElement('canvas');
  this.ctx = this.el.getContext('2d');
  this.size(50);
  this.fontSize(11);
  this.speed(60);
  this.font('helvetica, arial, sans-serif');
  this.stopped = false;

  (function animate() {
    if (self.stopped) return;
    raf(animate);
    self.percent = (self.percent + self._speed / 36) % 100;
    self.draw(self.ctx);
  })();
}

/**
 * Stop the animation.
 *
 * @api public
 */

Spinner.prototype.stop = function(){
  this.stopped = true;
};

/**
 * Set spinner size to `n`.
 *
 * @param {Number} n
 * @return {Spinner}
 * @api public
 */

Spinner.prototype.size = function(n){
  this.el.width = n;
  this.el.height = n;
  autoscale(this.el);
  return this;
};

/**
 * Set text to `str`.
 *
 * @param {String} str
 * @return {Spinner}
 * @api public
 */

Spinner.prototype.text = function(str){
  this._text = str;
  return this;
};

/**
 * Set font size to `n`.
 *
 * @param {Number} n
 * @return {Spinner}
 * @api public
 */

Spinner.prototype.fontSize = function(n){
  this._fontSize = n;
  return this;
};

/**
 * Set font `family`.
 *
 * @param {String} family
 * @return {Spinner}
 * @api public
 */

Spinner.prototype.font = function(family){
  this._font = family;
  return this;
};

/**
 * Set speed to `n` rpm.
 *
 * @param {Number} n
 * @return {Spinner}
 * @api public
 */

Spinner.prototype.speed = function(n) {
  this._speed = n;
  return this;
};

/**
 * Make the spinner light colored.
 *
 * @return {Spinner}
 * @api public
 */

Spinner.prototype.light = function(){
  this._light = true;
  return this;
};

/**
 * Draw on `ctx`.
 *
 * @param {CanvasRenderingContext2d} ctx
 * @return {Spinner}
 * @api private
 */

Spinner.prototype.draw = function(ctx){
  var percent = Math.min(this.percent, 100)
    , ratio = window.devicePixelRatio || 1
    , size = this.el.width / ratio
    , half = size / 2
    , x = half
    , y = half
    , rad = half - 1
    , fontSize = this._fontSize
    , light = this._light;

  ctx.font = fontSize + 'px ' + this._font;

  var angle = Math.PI * 2 * (percent / 100);
  ctx.clearRect(0, 0, size, size);

  // outer circle
  var grad = ctx.createLinearGradient(
    half + Math.sin(Math.PI * 1.5 - angle) * half,
    half + Math.cos(Math.PI * 1.5 - angle) * half,
    half + Math.sin(Math.PI * 0.5 - angle) * half,
    half + Math.cos(Math.PI * 0.5 - angle) * half
  );

  // color
  if (light) {
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 1)');
  } else {
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 1)');
  }

  ctx.strokeStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, rad, angle - Math.PI, angle, false);
  ctx.stroke();

  // inner circle
  ctx.strokeStyle = light ? 'rgba(255, 255, 255, .4)' : '#eee';
  ctx.beginPath();
  ctx.arc(x, y, rad - 1, 0, Math.PI * 2, true);
  ctx.stroke();

  // text
  var text = this._text || ''
    , w = ctx.measureText(text).width;

  if (light) ctx.fillStyle = 'rgba(255, 255, 255, .9)';
  ctx.fillText(
      text
    , x - w / 2 + 1
    , y + fontSize / 2 - 1);

  return this;
};


});
require.register("anthonyshort-map/index.js", function(exports, require, module){
var SimpleMap = function(values){
  this._keys = [];
  this._values = [];
  if(values) {
    values.forEach(function(data){
      this.set.apply(this, data);
    });
  }
};

SimpleMap.prototype.set = function(key, value) {
  var index = this._keys.indexOf(key);
  if (index === -1) {
    index = this._keys.length;
  }
  this._values[index] = value;
  this._keys[index] = key;
};

SimpleMap.prototype.get = function(key) {
  if ( this.has(key) === false ) return undefined;
  var index = this._keys.indexOf(key);
  return this._values[index];
};

SimpleMap.prototype.size = function() {
  return this._keys.length;
};

SimpleMap.prototype.remove = function(key) {
  if ( this.has(key) === false ) return true;
  var index = this._keys.indexOf(key);
  this._keys.splice(index, 1);
  this._values.splice(index, 1);
  return true;
};

SimpleMap.prototype.values = function() {
  return this._values;
};

SimpleMap.prototype.keys = function() {
  return this._keys;
};

SimpleMap.prototype.forEach = function(callback, context) {
  var i;
  for(i = 0; i < this._keys.length; i++) {
    callback.call(context || this._values[i], this._values[i], this._keys[i]);
  }
};

SimpleMap.prototype.has = function(key) {
  return this._keys.indexOf(key) > -1;
};

module.exports = SimpleMap;
});
require.register("anthonyshort-emitter-manager/index.js", function(exports, require, module){
var HashMap = require('map');

function mixin(obj) {
  obj._eventManager = new Manager();
  obj.listenTo = function(emitter, type, fn){
    this._eventManager.on(emitter, type, fn, this);
  };
  obj.stopListening = function(emitter, type, fn){
    this._eventManager.off(emitter, type, fn);
  };
}

function Manager(obj) {
  if(obj) return mixin(obj);
  this._events = new HashMap();
}

Manager.prototype.on = function(obj, type, fn, context) {
  var data = this._events.get(obj) || {};
  var fns = data[type] || (data[type] = []);
  var bound = fn.bind(context);
  obj.on(type, bound);
  fns.push({ original: fn, bound: bound });
  this._events.set(obj, data);
};

Manager.prototype.off = function(obj, name, fn) {
  var events = this._events;
  if(typeof name === 'function') {
    fn = name;
  }
  if(typeof obj === 'string') {
    name = obj;
    obj = null;
  }
  var objs = obj ? [obj] : this._events.keys();
  objs.forEach(function(emitter){
    var data = events.get(emitter);
    for (var eventName in data) {
      data[eventName] = data[eventName].filter(function(callback){
        if(fn && callback.original !== fn) return true;
        emitter.off(name || eventName, callback.bound);
        return false;
      });
    }
  });
};

module.exports = Manager;
});
require.register("eugenicsdatabase/index.js", function(exports, require, module){
module.exports = require('./lib/Controller');
});
require.register("eugenicsdatabase/lib/Model.js", function(exports, require, module){
var Model = require('model')
  , request = require('superagent');


///////////////////////
// Eugenics Document //
///////////////////////

var EugenicsDocument = new Model('document')
  .attr('_id')
  .attr('title', { required: true, type: 'string'})
  .attr('fullDescription', { required: true, type: 'string'})
  .attr('created_at', { type: 'date' })
  .attr('created_by')
  .attr('modified_by')
  .attr('modified_at', { type: 'date' })
  .attr('type', { type: 'string'})
  .attr('prods')
  .attr('resources')
  .attr('image')
  .attr('date')
  .attr('dateOfBirth')
  .attr('dateOfDeath')
  .attr('alternativeName')
  .attr('location')
  .attr('yearOfPublication')
  .attr('monthOfPublication')
  .attr('author')
  .attr('publisher')
  .attr('startDate')
  .attr('endDate')
  .attr('heroQuote')
  .attr('heroQuoteSource')
  .attr('villainQuote')
  .attr('villainQuoteSource')
  .attr('ambiQuote')
  .attr('ambiQuoteSource')
  .attr('latitude')
  .attr('longitude')
  .attr('connections');

EugenicsDocument.prototype.unset = function(key){
	var _this = this;
	delete this.attrs[key];
};

EugenicsDocument.base = 'api/documents';
exports.Document = EugenicsDocument;

////////////////
// Link Model //
////////////////

var LinkModel = new Model('link')
  .attr('_id')
  .attr('from', { required : true })
  .attr('to', { required: true })
  .attr('strength', { required: true, type: 'number' });

LinkModel.base = 'api/links';
exports.LinkModel = LinkModel;


//////////////////
// Current User //
//////////////////

// Retrieve our current user for basic authentication.
// NOTE: this will only be used for display purposes. Anything
// that alters the DB is ultimately done on the server-side.
request('/api/user', function(user){
  exports.User = user;
});


});
require.register("eugenicsdatabase/lib/Collection.js", function(exports, require, module){
var Collection = require('collection')
  , request = require('superagent')
  , Emitter = require('emitter')
  , map = require('map')
  , type = require('type')
  , each = require('each');

var EugenicsDocument = require('./Model').Document;
var spinner = require('./Spinner');

// Extend our Collection to provide more backbone-like
// functionality.
Emitter(Collection.prototype);

// Replace all the docs
Collection.prototype.reset = function(models, silent){
  this.models = models;
  if (!silent) {
    this.emit('reset');
    this.emit('change');
  }
};

// Add a doc
Collection.prototype.add = function(model, silent){
  var _this = this;
  if (type(model) == 'array'){
    each(model, function(m){
      _this.add(m, silent);
    });
  } else {
    this.models.push(model);
    if (!silent) this.emit('add', model);
  }
};

// Remove a doc (by id)
Collection.prototype.remove = function(id, silent){
  var _this = this;
  var splice = function(i, m){
    if (i < 0) return;
    _this.models.splice(i, 1);
    _this.emit('remove', m);
  };

  var getIndex = function(model){
    splice(_this.indexOf(model), model);
  };

  if (type(id) == 'array'){
    each(id, function(obj){
     getIndex(obj);
    });
  } else if (type(id) == 'object') {
    getIndex(id);
  } else if (type(id) == 'string'){
    getIndex(this.find(function(m){
      return m._id === id;
    }));
  }

};

Collection.prototype.clear = function(){
  this.reset([]);
  return this;
};

/////////////////////////
// Document Collection //
/////////////////////////

var DocumentCollection = function(models){
  this.models = models || [];
};

DocumentCollection.prototype = new Collection();

// Set our URL based on the docType & name.
DocumentCollection.prototype.setUrl = function(docType, name){
  this.url = '/api/' + docType + '/' + name;
  return this;
};

// Fetch and populate given a URL.
DocumentCollection.prototype.fetch = function(fn, model){
  var _this = this;
  url = this.url;
  if (!url) {
    var controller = require('./Controller');
    return controller.goHome();
  }

  spinner.show();

  request.get(url, function(res){
    spinner.hide();
    if (res.body){
      var docs = map(res.body, function(doc){
        return new EugenicsDocument(doc);
      });
      _this.reset(docs);
      if (fn) fn();
    }
  });
};

// Give us a bare array, devoid of our models / DocumentCollections.
DocumentCollection.prototype.toJSON = function(){
  return this.map(function(doc){
    return doc.toJSON();
  }).value();
};

module.exports = DocumentCollection;
});
require.register("eugenicsdatabase/lib/BreadCrumbs.js", function(exports, require, module){
var dom = require('dom')
  , each = require('each')
  , Emitter = require('emitter');

// BREAD CRUMBS -- Harder than it looks!
var BreadCrumbs = function(){
  this.el = dom('#bread');
  this.models = [];
  this.add('Home', 0);
};

Emitter(BreadCrumbs.prototype);

// Remove any of our models that are after the index
BreadCrumbs.prototype.slice = function(i){
  this.models = this.models.slice(0, i + 1);
  return this;
};

BreadCrumbs.prototype.render = function(){
  var _this = this;
  this.el.empty();
  each(this.models, function(model, i){
    _this.el.append(new BreadCrumbItem(_this, model, model.name, i).li);
  });
};

BreadCrumbs.prototype.add = function(name, i){
  i = i || this.models.length;
  this.models[i] = new BreadCrumbModel(name, i);
  this.slice(i);
  this.render();
};

// BREAD CRUMB MODEL
var BreadCrumbModel = function(name, i){
  this.name = name;
  this.i = i;
};

// BREAD CRUMB ITEM VIEW
var BreadCrumbItem = function(ctx, model, name, i){
  this.context = ctx;
  this.model = model;
  this.i = i;
  this.li = dom(document.createElement('li'));
  if (this.isLast()){
    this.li.addClass('active').text(name);
  } else {
    this.li.html('<a href="#">'+name+'</a><span class="divider"> / </span>');
  }
  var _this = this;
  this.bind();
};

BreadCrumbItem.prototype.isLast = function(){
 return this.context.models.length === (this.i + 1);
};

BreadCrumbItem.prototype.bind = function(){
  var _this = this;
  this.li.find('a').on('click', function(e){
    e.preventDefault();
    _this.context.emit('click', _this.i, _this.model);
    _this.context.slice(_this.i).render();
  });
};

module.exports = BreadCrumbs;

});
require.register("eugenicsdatabase/lib/Document-list.js", function(exports, require, module){

// MODULES
var Cast = require('cast')
  , Emitter = require('emitter')
  , bind = require('bind')
  , type = require('type')
  , dom = require('dom')
  , debounce = require('debounce')
  , each = require('each')
  , select = require('select')
  , map = require('map');

// Imports
// var controller = require('./Controller');
var template = require('../templates/cast-item');
var spinner = require('./Spinner');

var typeToParam = {
  'event' : 'events',
  'concept' : 'concepts',
  'person' : 'people',
  'place' : 'places',
  'publication' : 'publications'
};

module.exports = function(controller){

// CAST LISTING
var CastListing = function(type){
  this.type = type || 'documents';
  this.fieldToSort = 'created';
  this.sortDirection = 1;
  this.cast = new Cast({
    wrapper: '#cast-wrapper',
    template: template,
    boxHeight: 41,
    paddingHeight: 5
  }).draw();
  this.query = dom('#query');
  this.bind();
};

Emitter(CastListing);

CastListing.prototype.bind = function(){
  this.query.on('keydown', debounce(bind(this, this.filter), 300));
  var _this = this;
  dom('.navbar-search').on('submit', function(e){
    e.preventDefault();
    _this.filter();
    return false;
  });
  this.cast.on('viewRendered', bind(this, this.onViewRendered));
};

CastListing.prototype.onViewRendered = function(view){
  dom(view.el).find('a.edit-btn').on('click', function(e){
    e.preventDefault();
    controller.editDocument(view.model.toJSON()._id);
  });

  dom(view.el).find('a.title').on('click', function(e){
    e.preventDefault();
    controller.viewDocument(view.model.toJSON()._id);
  });
};

CastListing.prototype.filter = function(e){
  var val = this.query.val();
  var re = new RegExp(val, 'i');
  var data = select(this.docs, function(attr){
    return re.test(attr.title);
  });
  this.data(data).sort().list();
};


CastListing.prototype.setTotal = function(len){
  this.totalDocs = len;
  dom('#total').text('Total Entries: '+ len);
};

CastListing.prototype.data = function(datas){
  var data;
  if (type(datas) == 'undefined'){
    data = [];
  } else {
    data = datas || this.docs;
  }

  this.cast.data(data, function(attr){
    return attr._id;
  });
  return this;
};

CastListing.prototype.list = function(){
  this.cast.list();
  return this;
};

CastListing.prototype.draw = function(){
  this.cast.draw();
  return this;
};

CastListing.prototype.sort = function(field, inverse){
  this.fieldToSort = field || this.fieldToSort;
  this.sortDirection = inverse || this.sortDirection;
  this.cast.sortBy(this.fieldToSort, this.sortDirection);
  return this;
};

// Sort Listing View - XXX Make this into a component
var SortView = function(context, type){
  this.context = context;
  this.type = type;
  this.sortWrapper = dom('#sort-wrapper');
  this.direction = 1;
  this.attr = [
    { val: 'created', name:'Date Created' },
    { val: 'modified', name: 'Last Modified' },
    { val: 'title', name:'Title (Alphabetical)'}
  ];
  if (this.type === 'events' || this.type === 'timeline'){
    this.attr.push({val: 'date', name: 'Date'});
  }
  this.render();
  this.bind();
};

SortView.prototype.render = function(){
  var el = this.el = dom(document.createElement('select'));

  var buildOption = function(val, name){
    return dom(document.createElement('option'))
      .attr('value', val)
      .text(name);
  };

  each(this.attr, function(item, i){
    el.append(buildOption(item.val, item.name));
  });

  var direction = this.directionEl = dom(document.createElement('a'));
  direction
    .href('#')
    .html('<i class="icon-chevron-down"></i>');

  this.sortWrapper
    .empty()
    .append(el);

  this.sortWrapper.append(direction);
  };

SortView.prototype.bind = function(){
  var _this = this;
  this.el.on('change', function(e){
    var t = e.currentTarget;
    var type = dom(t.options[t.selectedIndex]).val();
    _this.context.sort(type).list();
  });
  this.directionEl.on('click', function(e){
    e.preventDefault();
    var i = dom(e.currentTarget).find('i');
    if (_this.direction === 1){
      i.removeClass('icon-chevron-down').addClass('icon-chevron-up');
      _this.direction = -1;
      _this.context.sortDirection = -1;
      _this.context.sort().list();
    } else {
      i.removeClass('icon-chevron-up').addClass('icon-chevron-down');
      _this.direction = 1;
      _this.context.sortDirection = 1;
      _this.context.sort().list();
    }
  });
};



  var collection = controller.collection;

  collection.on('change', function(){
    var myCast = new CastListing().draw();
    myCast.type = controller.collectionType;
    myCast.name = controller.collectionName;

    var data = controller.collection.toJSON()
      , userModel = require('./Model').User
      , user = userModel && userModel.body;

    data = map(data, function(attr, i){
      attr.currentUser = user;
      return attr;
    });

    myCast.docs = data;
    myCast.fieldToSort = 'created';


    var c = myCast.cast;
    c.data(data, function(attr){
      return attr._id;
    });

    myCast.sort();

    c.list();

    myCast.setTotal(data.length);

    var sortView = new SortView(myCast, name);
  });

}


});
require.register("eugenicsdatabase/lib/Document-summary.js", function(exports, require, module){
var dom = require('dom')
	, extend = require('extend')
	, map = require('map')
	, clone = require('clone');

// Imports
var template = require('../templates/document-summary');

// Translate some of our attributes into nicer labels
var prodToFullName = {
	'heroes' : 'Heroes and Villains'
};

var typeToFullType = {
	'person' : 'Person or Group'
};

module.exports = function(controller){

console.log('hello', controller);

///////////////////////////
// Document Summary View //
///////////////////////////

var DocumentView = function(){
	console.log(controller);
	this.controller = controller;
	this.wrapper = dom('#document-summary');
	var self = this;
	controller.on('viewDocument', function(model){
		self.setModel(model);
		self.render(model);
	});
};

DocumentView.prototype.setModel = function(model){
	this.model = model;
	var _this = this;
	this.model.on('change', function(){
		_this.render(_this.model);
	});
};

DocumentView.prototype.render = function(){
	var json = clone(this.model.toJSON());

	// Make our prod names presentable. ie heroes -> Heroes and villains
	if (json.prods){
		json.prods = map(json.prods, function(prod, i){
			if (prodToFullName[prod])
				return prodToFullName[prod];
			return prod;
		});
	}

	var user = require('./Model').User;
	json.currentUser = user && user.body;

	if (typeToFullType[json.type])
		json.type = typeToFullType[json.type];


	// json.currentUser = currentUser;
	this.wrapper.html(template(json));
	this.bind();
};

DocumentView.prototype.bind = function(){
	var _this = this;
	dom('#edit-document').on('click', function(e){
		e.preventDefault();
		_this.controller.editDocument(_this.model._id());
	});
};

var view = new DocumentView();

};

// Instantiate our View, and listen for either:
// (1) When we have a new model
// (2) When our model changes






});
require.register("eugenicsdatabase/lib/Document-forms.js", function(exports, require, module){
// Modules
var confirmation = require('confirmation')
  , moment = require('moment')
  , dom = require('dom')
  , uniq = require('uniq')
  , each = require('each')
  , extend = require('extend')
  , events = require('events')
  , contains = require('contains')
  , type = require('type')
  , Collection = require('collection')
  , EmitterManager = require('emitter-manager')
  , clone = require('clone')
  , Model = require('model')
  , enumerable = require('enumerable')
  , bind = require('bind')
  , map = require('map')
  , Confirmation = require('confirmation-popover');

// Imports
var DocumentModel = require('./Model').Document
  , Schema = require('./Forms-schema')
  , Spinner = require('./Spinner');

 // Maps type field to pluralized form
var typeToParam = {
  'event' : 'events',
  'concept' : 'concepts',
  'person' : 'people',
  'place' : 'places',
  'publication' : 'publications'
};


module.exports = function(controller){

var Connection = require('./Connections')(controller);

// Our Controller should now control the creation of new documents
// or the retrieval of existing documents. Both will share the 'editDocument'
// event, & the model itself will handle whether to POST or PUT it.
controller.on('editDocument', function(model){
  var form = new FormGenerator(model).generate();
});

/////////////////////////////////
// Form Generator / Controller //
/////////////////////////////////

var FormGenerator = function(model){
  this.model = model;
  this.el = dom('#form-wrapper');
};

FormGenerator.prototype.generate = function(){
  this.fields = new FieldCollection(this, this.model)
    .on('save', bind(this, this.saveModel))
    .generateFieldModels();

  var formView = new FormView(this.fields, this, false);
  this.el
    .empty()
    .append(formView.render().el);
};

FormGenerator.prototype.deleteDocument = function(){
  this.model.remove(function(err){
    controller.collection.fetch(function(){
      controller.viewDocuments();
    });
  });
};

FormGenerator.prototype.saveModel = function(json){
  var previousJSON = this.model.toJSON()
    , _this = this;

  // Unset any previous attributes that we might no longer
  // have in our document.


  each(previousJSON, function(key, val){
    if (! json[key] && key !== '_id' && key !== '__v' && key !== 'created_at'){
      _this.model.unset(key);
    }
  });

  this.model.set(json);

  // XXX Redraw our collection in case the altered
  // model belongs to it.
  // Once the model is saved, refetch our collection
  // and redraw our model to update our listing
  // for edge cases.

  controller.collection.emit('change');
  console.log('Saving Model.', this.model);
  Spinner.show();
  this.model.save(function(err, res){
    console.log('model saved');
    Spinner.hide();
    console.log('fetching...');
    controller.collection.fetch(function(){
      controller.viewDocuments();
    }, _this.model);
  });
};

var FormModel = Model('FormModel');

/////////////////
// Field Model //
/////////////////

var FieldModel = Model('Field')
  .attr('value')
  .attr('label')
  .attr('widget')
  .attr('name')
  .attr('loading')
  .attr('error')
  .validate(function(field){
    if (field.get('required')){
      var val = field.get('value');
      if (type(val) == 'undefined' || val === ''){
        field.error('This field is required');
        field.errors.push('required');
      } else {
        field.error('');
      }
    }
  });

//////////////////////
// Field Collection //
//////////////////////

var FieldCollection = function(ctx, model){
  this.context = ctx;
  this.documentModel = model || null;
  this.models = [];
};

FieldCollection.prototype = new Collection();

// Our field models will contains each field and its attribute.
FieldCollection.prototype.generateFieldModels = function(){
  var _this = this;
  var attr = this.documentModel.toJSON();
  this.type = attr.type;
  this.prods = attr.prods || [];

  var fields = this.determineFields(this.type, this.prods);

  each(fields, function(key, field){
    field.name = key;
    if (key === 'prods'){
      each(field.fields[0], function(k, p){
        p.value = contains(attr.prods, k) ? true : false;
        p.name = k;
      });
    } else if ((type(attr[key]) != 'undefined')){
      field.value = attr[key];
    }

    _this.add(new FieldModel(field));
  });

  return this;
};

// Based on the document type, and the number of prods it participates in
// calculate the required fields.
FieldCollection.prototype.determineFields = function(type, prods){
  var defaultFields = Schema.required()
    , toIterate = [];

  toIterate.push(type);

  each(prods, function(prod){
    toIterate.push(prod);
  });

  each(toIterate, function(required){
    if (Schema[required])
      extend(defaultFields, Schema[required]());
    each(defaultFields, function(field, name){
      field.name = name;
    });
  });

  return defaultFields;
};

/**
 * If we change our document type, we need to add and remove
 * the required fields for each doc type.
 * @param  {string} newType new document type name
 */

FieldCollection.prototype.alterTypes = function(newType){
  if (this.type === newType) return;
  var fields = this.determineFields(newType, this.prods);
  this.remove(this.fieldsToRemove(fields));
  this.add(this.fieldsToAdd(fields));
  this.type = newType;
};

/**
 * Change the prod value to boolean (checked or not)
 * @param  {string} prodName
 * @param  {boolean} remove   remove prod?
 */

FieldCollection.prototype.alterProdValue = function(prodName, remove){
  // find our Prods field model
  var model = this.select(function(doc){
    return doc.get('name') === 'prods';
  }).value()[0];

  // and change its value (Yoiks)
  model.get('fields')[0][prodName].value = remove ? true : false;
};

/**
 * Add a new prod to our document
 * @param  {string} prodName
 */

FieldCollection.prototype.addProd = function(prodName){
  this.alterProdValue(prodName);

  // Determine which fields to add
  var newProds = clone(this.prods);
  newProds.push(prodName);

  // Determine & add the (unique) new fields
  var fields = this.determineFields(this.type, newProds);
  this.add(this.fieldsToAdd(fields));
  this.prods = newProds;
};

/**
 * Remove a prod from our document
 * @param  {string} prodName
 */

FieldCollection.prototype.removeProd = function(prodName){
  this.alterProdValue(prodName, true);

  // Determine our new prod listing.
  var newProds = map(this.prods, function(prod){
    if (prod !== prodName) return prod;
  });

  // Determine & remove the (unique) old fields
  var fields = this.determineFields(this.type, newProds);
  this.remove(this.fieldsToRemove(fields));
  this.prods = newProds;
};


/**
 * Given a new object of fields, determine which fields to remove
 * from our current field collection.
 * @param  {object} newFields key/val object schema
 * @return {array}           array of fields to remove
 */

FieldCollection.prototype.fieldsToRemove = function(newFields){
  return this.filter(function(obj, i){
    if (! newFields[obj.get('name')])
      return true;
  }).value();
};

/**
 * Given a new object of fields, determine which fields should
 * be added to our current field collection.
 * @param  {object} newFields ke/val object schema
 * @return {array}           array of fields to add
 */

FieldCollection.prototype.fieldsToAdd = function(newFields){
  var _this = this, newProds = [];
  each(newFields, function(key, field){
    var contains = _this.any(function(model){
      return model.get('name') === key;
    });
    if (!contains){
      field.name = key;
      newProds.push(new FieldModel(field));
    }
  });
  return newProds;
};

/**
 * Save our fields
 */

FieldCollection.prototype.save = function(){
  var json = {};
  this.each(function(model){
    var val = model.get('value');
    if (val) {
      json[model.get('name')] = model.get('value');
    }
  });
  this.emit('save', json);
};

/**
 * Validate each of our models
 * @return {boolean} false if any models are invalid
 */

FieldCollection.prototype.isValid = function(){
  var isValid = true;
  this.each(function(model){
    if (!(model.isValid()))
      isValid = false;
  });
  return isValid;
};


///////////////
// Form View //
///////////////

var FormView = function(fields, ctx, isFormset){
  this.fields = fields;
  this.context = ctx;
  this.isFormset = isFormset || false;
  this.el = dom('<form></form>');
  this.bind();
  this.buildWidgets();
  this.children = new Collection();
};

EmitterManager(FormView.prototype);

FormView.prototype.bind = function(){
  this.listenTo(this.fields, 'add', this.addChild);
  this.listenTo(this.fields, 'remove', this.removeChild);

  if (this.events) this.events.unbind();

  this.events = events(this.el.get(0), this);
  this.events.bind('click .remove-form', 'removeFormElement');
  this.events.bind('change select', 'alterType');
  this.events.bind('click .prod', 'alterProds');

  if (!this.isFormset){
    this.events.bind('submit', 'saveForm');
  }
};

FormView.prototype.addChild = function(child){
  var view = new FieldView(child);
  this.children.push(view);
  var saveEl = this.el.find('#save-form').get()
    , viewEl = view.render().el.get();
  saveEl.parentNode.insertBefore(viewEl, saveEl);
};

FormView.prototype.removeChild = function(childModel){
  var newFieldSet = this.children
    .reject(function(fieldView){
      if (fieldView.model == childModel) {
        fieldView.close();
        return true;
      }
    }).value();

  this.children.reset(newFieldSet);
};

FormView.prototype.closeChildren = function(){
  this.children
    .each(function(view){
      view.close();
    })
    .clear();
};

FormView.prototype.close = function(){
  this.events.unbind();
  this.stopListening();
  if (this.children) this.closeChildren();
  this.el.remove();
};

/**
 * Remove a form element within a Formset
 * @param  {event} e click remove btn
 */

FormView.prototype.removeFormElement = function(e){
  e.preventDefault();
  this.fields.context.remove(this.context);
};

/**
 * Render our Form
 * @return {[type]} [description]
 */

FormView.prototype.render = function(){
  var _this = this;

  this.closeChildren();

  // Render and keep track of our field views.
  var childViews = this.fields.map(function(fieldModel){
    var view = (fieldModel.get('widget') === 'formset')
      ? new FormsetView(fieldModel)
      : new FieldView(fieldModel);
    _this.el.append(view.render().el);
    return view;
  }).value();

  this.children.reset(childViews);

  // if a formset, then append a 'remove' element
  // if not formset, append a submit button
  if (this.isFormset){
   this.el.append(this.$remove);
  } else {
   this.el.append(this.$save);
    // If our document isn't new, provide delete button.
    if (! this.context.model.isNew()) {
      this.el.append(this.$delete);
    }
  }

  return this;
};

FormView.prototype.buildWidgets = function(){
  if (this.isFormset){

    this.$remove = dom('<a>[Remove]</a>')
      .href('#')
      .addClass('remove-form');

  } else {
    this.$save = dom('<input>')
      .id('save-form')
      .attr('type', 'submit')
      .addClass('btn')
      .addClass('btn-primary')
      .value('Save');

    // If our document isn't new, provide delete button.
    if (! this.context.model.isNew()) {
      this.$delete = dom('<a>Delete</a>')
        .id('delete-form')
        .addClass('delete')
        .addClass('btn')
        .addClass('btn-danger');

      this.events.bind('click #delete-form', 'deleteDocument');
    }
  }
};


/**
 * Parse, validate, and save our form input.
 * @param  {event} e submit form
 */

FormView.prototype.saveForm = function(e){
  e.preventDefault();
  this.parse();
  if (this.fields.isValid()){
    this.fields.save();
  }
};

/**
 * Parse either our field or formset
 * @return {object} self
 */

FormView.prototype.parse = function(){
  this.children.each(function(fieldView){
    var widget = fieldView.model.get('widget');

    if (widget !== 'image' || widget !== 'button') {
      fieldView.model.value(fieldView.parse());
    }
  });
  return this;
};

/**
 * Event Handler: Alter our document type
 * @param  {event} e selectbox change
 */

FormView.prototype.alterType = function(e){
  var t = e.target
    , type = dom(t.options[t.selectedIndex]).val();

  this.fields.alterTypes(type.toLowerCase());
};

/**
 * Event Handler: Alter our Prods collection
 * @param  {event} e click checkbox
 */

FormView.prototype.alterProds = function(e){

  var checkbox = dom(e.target).find('input')
    , isChecked = checkbox.get().checked
    , name = checkbox.name();

  // for some reason the checked attribute is reversed...
  if (!isChecked) this.fields.addProd(name);
  else this.fields.removeProd(name);
};

/**
 * Event Handler: Delete Document Button
 * @param  {event} e click delete
 */

FormView.prototype.deleteDocument = function(e){
  e.preventDefault();
  var _this = this;
  var confirm = new Confirmation('This action cannot be undone.', 'Delete document?');
  confirm.focus('ok');
  confirm.ok('Delete Document');
  confirm.show(e.currentTarget, function(ok){
    if (ok) _this.context.deleteDocument();
  });
};


////////////////
// Field View //
////////////////

var FieldView = function(fieldModel, context){
  this.context = context;
  this.el = dom('<div></div>').addClass('form-field');
  this.model = fieldModel;
  this.widget = fieldModel.get('widget');
  this.attributes = fieldModel.toJSON();

  // xxx - should be defined in schema
  if (this.attributes.name === 'prods')
    this.el.addClass('prods');

  // add our classname if specified
  if (this.attributes.className){
    this.el.addClass(this.attributes.className);
  }

  this.bind();
};

EmitterManager(FieldView.prototype);

/**
 * Bind our model listening events
 */

FieldView.prototype.bind = function(){
  this.listenTo(this.model, 'change error', this.render);
  if (this.widget === 'image') this.listenTo(this.model, 'change', this.render);
  this.events = events(this.el.get(0), this);
};

/**
 * Render our widget using templates
 * @return {object} self
 */

FieldView.prototype.render = function(){
  var html = this.widget === 'formset'
    ? ''
    : this.widgetTemplates[this.widget]({
      object : this.model.toJSON()
    });

  this.el.html(html);

  if (this.widget === 'image'){
    var fp = this.el
      .find('#filepicker')
      .attr('type', 'filepicker')
      .get();
    this.events.bind('change #filepicker', 'uploadImage');
    filepicker.constructWidget(fp);
    this.events.bind('click #remove-image', 'removeImage');
  }

  if (this.widget === 'button'){
    this.events.bind('click button', 'selectConnection');
  }

  return this;
};

/**
 * Parse our field, depending on the widget type
 * @return {string or array} the value of the field
 */

FieldView.prototype.parse = function(){
  var widget = this.widget;

  if (widget === 'button' || widget === 'image'){
    return this.model.value();
  }

  inputEl = widget === 'textarea'
    ? this.el.find('textarea')
    : this.el.find('input[name]');

  if (widget === 'checkbox'){
    var checkedProds = [];
    inputEl.each(function(input){
      if (input.get().checked){
        checkedProds.push(input.name());
      }
    });

    return (checkedProds.length > 0) ? checkedProds : null;
  }

  if (widget === 'select') {
    var select = this.el.find('select').get();
    return dom(select.options[select.selectedIndex])
      .val()
      .toLowerCase();
  }

  return inputEl.val();
};

FieldView.prototype.widgetTemplates = {
  'textarea' : require('../templates/textarea'),
  'text' : require('../templates/text'),
  'checkbox' : require('../templates/checkbox'),
  'select' : require('../templates/select'),
  'image' : require('../templates/image'),
  'button' : require('../templates/button')
};

FieldView.prototype.close = function(){
  this.events.unbind();
  this.stopListening();
  this.el.remove();
};

FieldView.prototype.uploadImage = function(e){
  var image = e.fpfile
    , _this = this
    , currentImage = this.model.value();

  e.preventDefault();

  if (currentImage){
    filepicker.remove(currentImage);
    this.model.value(false);
  }
  this.model.loading(true);
  filepicker.stat(image, { width: true, height: true }, function(meta){
    image.metadata = meta;
    _this.model.loading(false);
    _this.model.value(image);
    console.log('set value', _this.model);
  });
};

FieldView.prototype.removeImage = function(e){
  e.preventDefault();
  filepicker.remove(this.model.get('value'));
  this.model.value('');
};

FieldView.prototype.selectConnection = function(e){
  e.preventDefault();
  var _this = this;
  var connection = new Connection(this.model, function(links){
    _this.model.set({ value : links });
    // if links, update our links value with the new array.
  });
};

//////////////////
// Formset View //
//////////////////

var FormsetView = function(model){
  this.model = model;
  this.views = [];
  this.el = dom('<div></div>')
    .addClass('formsetView')
    .addClass('well');
  this.buildWidgets();
  this.formCollection = new Collection();

  var fields = this.fields = model.get('fields');
  var _this = this;

  // WTF this is a mess. .. but it works.
  if (model.get('value')){
    each(model.get('value'), function(obj){
      _this.formCollection.add(new FormModel(fields));
    });
  }

  this.formCollection.each(function(form, i){
    var fieldCollection = new FieldCollection(_this, form);
    var json = clone(form.toJSON());

    each(json, function(attr, ind){
        var val = model.get('value')[i][attr.name];
        attr['value'] = val;
        fieldCollection.add(new FieldModel(attr));
    });

    var view = new FormView(fieldCollection, form, true);
    _this.views.push(view);
  });
};

FormsetView.prototype.buildWidgets = function(){
  this.$add = dom('<button></button>')
    .addClass('btn')
    .addClass('btn-small')
    .addClass('add-another')
    .text('Add New Citation');
};

FormsetView.prototype.bind = function(){
  this.$add.on('click', bind(this, this.addAnother));
};

FormsetView.prototype.render = function(){
  this.closeChildren();
  this.el.empty();

  var _this = this;
  each(this.views, function(view){
    _this.children.push(view);
    dom(view.render().el).appendTo(_this.el);
  });

  this.el.append(this.$add);
  this.bind();

  return this;
};

/**
 * Parse our formset & don't return empty or null values.
 * @return {array} formset fields and values
 */

FormsetView.prototype.parse = function(){
  var toReturn = [];

  each(this.views, function(formView){
    formView.parse();
    var formValues = {}, empty = true;

    formView.children.each(function(fieldView){
      var val = fieldView.model.get('value');
      if (val && val != ''){
        formValues[fieldView.model.get('name')] = val;
        empty = false;
      }
    });

    if (!empty) {
      toReturn.push(formValues);
    }
  });

  return (toReturn.length > 0) ? toReturn : null;
};

/**
 * Add another instance of our formset
 * @param  {event} e click add-another button
 */

FormsetView.prototype.addAnother = function(e){
  e.preventDefault();
  var newFields = map(this.fields, function(field){
    return clone(field);
  });

  var formModel = new FormModel(newFields);
  this.formCollection.add(formModel);

  var col = new FieldCollection(this, formModel);
  each(this.fields, function(field){
    col.add(new FieldModel(field));
  });

  var view = new FormView(col, formModel, true);
  this.views.push(view);
  var addAnother = this.el.find('button.add-another').get();

  var toInsert = view.render().el;

  addAnother.parentNode.insertBefore(toInsert.get(), addAnother);
};

FormsetView.prototype.closeChildren = function(){
  if (this.children){
    each(this.children, function(view){
      view.closeChildren();
    });
  }
  this.children = [];
};

FormsetView.prototype.remove = function(formModel){
  this.formCollection.remove(formModel);
  var newViews = [];
  each(this.views, function(view){
    if (view.context == formModel){
      view.close();
    } else {
      newViews.push(view);
    }
  });
  this.views = newViews;
};

}
});
require.register("eugenicsdatabase/lib/Controller.js", function(exports, require, module){
// MODULES
var Swipe = require('swipe')
  , Emitter = require('emitter')
  , typeOf = require('type')
  , bind = require('bind')
  , dom = require('dom')
  , events = require('event');

var Collection = require('./Collection')
  , EugenicsDocument = require('./Model').Document
  , BreadCrumbs = require('./BreadCrumbs');

// Load filepicker to handle image uploads
(function(){

  var filepickerLoadCallback = function(){
    filepicker.setKey('AjpxCz4j4QaeYHScaoB1Iz');
  };

  var filepickerErrorCallback = function(){
    console.log('Error loading Filepicker');
  };

  //Generate a script tag
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = '//api.filepicker.io/v1/filepicker.js';
  script.onload = filepickerLoadCallback;
  script.onerror = filepickerErrorCallback;

  //Load the script tag
  var head = document.getElementsByTagName('head')[0];
  head.appendChild(script);

})();

//////////////////////////////////////////
// Basically our Controller / Main View //
//////////////////////////////////////////

var Controller = function(){
  this.swipeContainer = dom('#swipe-container');
  this.setDimensions();
  this.swipe = new Swipe(document.getElementById('swipe-container'));
  this.selectedList = dom('#primary-navigation').find('a.active');
  this.breadCrumbs = new BreadCrumbs();
  this.collection = new Collection();
  this.bind();
};

Emitter(Controller.prototype);

Controller.prototype.bind = function(){
  var _this = this;
  events.bind(window, 'resize', function(){
    _this.setDimensions();
    _this.swipe.refresh();
  });
  dom('a.category').on('click', bind(this, this.onCategorySelect));
  dom('a.prod').on('click', bind(this, this.onCategorySelect));
  dom('a.new-document').on('click', bind(this, this.onCategorySelect));
  this.breadCrumbs.on('click', function(i, name){
    if (i === 0) _this.goHome();
    else _this.swipe.show(i);
  });
};

Controller.prototype.setDimensions = function(){
  var w = this.swipeContainer.get().offsetWidth;
  var h = window.innerHeight - 120;
  dom('li.swipe-item').css({ width: w, height: h });
  dom('.swipe-content').css({ height: h - 45 });
  dom('#listing').css({ height: h - 45 - 42 });
  dom('#swipe').css({ height: h });
};

Controller.prototype.onCategorySelect = function(e){
  e.preventDefault();
  if (this.selectedLink)
    this.selectedLink.removeClass('active');

  var link = dom(e.currentTarget);
  this.selectedLink = link.addClass('active');
  var name = link.attr('data-name');

  if (link.hasClass('prod')) {
    this.viewDocuments('prods', name);
    this.collectionType = 'prods';
    this.collectionName = name;
  } else if (link.hasClass('category')) {
    this.viewDocuments('documents', name);
    this.collectionType = 'documents';
    this.collectionName = name;
  } else if (link.hasClass('new-document')) {
    this.createDocument();
  }
};

Controller.prototype.selectDocument = function(doc){
  this.selectedDocument = doc;
  this.emit('setDocument', doc);
};

Controller.prototype.viewDocuments = function(type, name){
  type = type || this.collectionType;
  name = name || this.collectionName;

  if (!name) return this.goHome();

  if (this.collectionType !== type || this.collectionName !== name){
    dom('#query').value('');
    this.collection
      .setUrl(type, name)
      .fetch();
  }
  this.swipe.show(1);
  this.breadCrumbs.add(name, 1);
  this.url(type + '/' + name);
};

Controller.prototype.findDocumentById = function(id){
  return this.collection.find(function(doc){
    var _id = doc.get('_id');
    return id === _id;
  });
};

Controller.prototype.viewDocument = function(id){
  var selectedDocument = this.findDocumentById(id);
  if (selectedDocument){
    this.selectedDocument = selectedDocument;
    this.swipe.show(2);
    this.emit('viewDocument', selectedDocument);
    this.breadCrumbs.add('View Document', 2);
    this.url('/view/'+ id);
  }
};

Controller.prototype.editDocument = function(id, shallow){
  var selectedDocument = this.findDocumentById(id);
  if (selectedDocument){
    this.selectedDocument = selectedDocument;
    this.emit('editDocument', selectedDocument);
    this.swipe.show(3);
    this.breadCrumbs.add('Edit');
    this.url('/view/'+id+'/edit');
  }
};

Controller.prototype.createDocument = function(){
  var newDoc = new EugenicsDocument({
    type: 'event',
    prods: []
  });
  this.selectedDocument = newDoc;
  this.emit('editDocument', newDoc);
  this.swipe.show(3);
  this.breadCrumbs.add('New Document', 1);
  this.url('/new');
};

Controller.prototype.goHome = function(){
  this.swipe.show(0);
  this.breadCrumbs.slice(0).render();
  this.url('/');
  if (this.selectedLink) this.selectedLink.removeClass('active');
  delete this.selectedLink;
};

Controller.prototype.url = function(url){
  // xxx todo router
};

var controller = new Controller();
module.exports = controller;
var DocumentList = require('./Document-list')(controller);
var DocumentSummary = require('./Document-summary')(controller);
var DocumentForms = require('./Document-forms')(controller);



});
require.register("eugenicsdatabase/lib/Forms-schema.js", function(exports, require, module){

// The field types that are required by each field type, and
// each prod. The app uses these to determine what fields
// are necessary to include, depending on the document type
// and the prods that it's part of.
var documentTypes = [
  {label: 'Event', name: 'event'},
  {label: 'Concept', name: 'concept'},
  {label: 'Person or Group', name: 'person'},
  {label: 'Place', name: 'place'},
  {label: 'Publication', name: 'publication'}
];


// Field Type Schemas
module.exports = {

  required : function() {
    return {
      title : { widget: 'text', label: 'Title', required: true },
      type : { widget: 'select', label: 'Document Type', options: documentTypes },
      fullDescription: {widget: 'textarea', label: 'Full Description', required: true},
      image: {widget: 'image', label: 'Image', className: 'image' },
      resources: {widget: 'formset', label: 'Citations', editable: true, fields : [{
        widget: 'textarea', name: 'resource', label: 'Citation', helpText: 'APA Format'
      }]},
      prods: {widget: 'checkbox', fields: [{
        timeline: {
          widget: 'checkbox', label: 'Timeline', value: ''
        },
        heroes: {
          widget: 'checkbox', label: 'Heroes and Villains', value: ''
        },
        institutions: {
          widget: 'checkbox', label: 'Institutions', value:''
        },
        mindmap: {
          widget: 'checkbox', label: 'Mind Map', value:''
        }
      }]}
    };
  },

  event : function() {
    return {
      date: { widget: 'text', label: 'Date', className:'date', helpText: 'Format: YYYY-MM-DD or YYYY', isDate: true }
    };
  },

  person : function() {
    return {
      dateOfBirth: { widget: 'text', label: 'Date of Birth / Formation', className: 'dateOfBirth', helpText: 'Format: YYYY-MM-DD or YYYY', isDate: true},
      dateOfDeath: { widget: 'text', label: 'Date of Death / Dissolution', className: 'dateOfDeath', helpText: 'Format: YYYY-MM-DD or YYYY', isDate: true}
    };
  },

  place: function() {
    return {
      alternativeNames : { widget: 'text', label: 'Alternative Names', helpText: 'Enter a comma-separated list of alternative place names.'},
      location: { widget: 'text', label: 'Location', helpText: 'City, Province'}
    };
  },

  publication : function() {
    return {
      yearOfPublication: { widget: 'text', label : 'Year of Publication'},
      monthOfPublication: { widget: 'text', label: 'Month of Publication'},
      author: {widget: 'text', label: 'Author'},
      publisher: {widget: 'text', label: 'Publisher'}
    };
  },

  timeline : function() {
    return {
      date: { widget: 'text', className:'date', label: 'Date', helpText: 'Format: YYYY-MM-DD or YYYY', isDate: true },
      startDate : {
        widget: 'text',
        label: 'Date Range (Start Date)',
        helpText: 'If you want this entry to appear as a date range, use this field. Format: YYYY-MM-DD or YYYY.',
        isDate: true
      },
      endDate : {
        widget: 'text',
        label: 'Date Range (End Date)',
        isDate: true,
        helpText: 'If you want this entry to appear as a date range, use this field. Format: YYYY-MM-DD or YYYY.'
      }
    };
  },

  heroes : function() {
    return {
      heroQuote: { widget: 'textarea', label: 'Hero Quote', className: 'quote'},
      heroQuoteSource: { widget: 'text', label: 'Hero Quote Citation', className: 'quote-citation'},
      villainQuote: { widget: 'textarea', label: 'Villain Quote', className: 'quote'},
      villainQuoteSource: { widget: 'text', label: 'Villain Quote Citation', className: 'quote-citation'},
      ambiQuote: {widget: 'textarea', label: 'Ambiguous Quote', className: 'quote'},
      ambiQuoteSource: { widget: 'text', label: 'Ambiguous Quote Source', className: 'quote-citation' }
    };
  },

  institutions : function(){
    return {
      latitude : { widget: 'text', label: 'Latitude' },
      longitude : { widget: 'text', label: 'Longitude' }
    };
  },

  mindmap : function(){
    return {
      connections: { widget: 'button', name: 'connection', label: 'Connection', className: 'mindmap-connection', helpText: 'Click the button to create a connection.' }
    };
  }

};

});
require.register("eugenicsdatabase/lib/Connections.js", function(exports, require, module){


// Modules
var Modal = require('modal')
	, bind = require('bind')
	, each = require('each')
	, dom = require('dom')
	, request = require('superagent')
	, Collection = require('collection')
	, events = require('events')
	, clone = require('clone');

// Import
var LinkModel = require('./Model').LinkModel;

module.exports = function(controller){

// Create our Modal
var modal = Modal(document.getElementById('connections'), {
	animationIn: 'fadeInDown',
	animationOut: 'fadeOutUp'
});


var Connection = module.exports = function(model, fn){
	var attr = model.toJSON();
	this.connections = attr.value || [];

	this.callback = fn;
	this.$el = dom('#connections');
	this.$add = dom('a.add-connections');
	this.$cancel = dom('.cancel');
	this.$list = dom('#mindmap-nodes');
	this.$selectedList = dom('#selected-nodes');
	this.potentialNodes = new Collection();
	this.previousNodes = new Collection();
	this.selectedNodes = new Collection();
	this.linksToDelete = [];
	modal.show();
	this.fetchAll();
	this.bind();
};

Connection.prototype.bind = function(){
	this.addEvents = events(this.$add.get(), this);
	this.addEvents.bind('click', 'parseAndSave');

	this.cancelBinding = bind(this, this.close);
	this.$cancel.on('click', this.cancelBinding);
};

Connection.prototype.unbind = function(){
	this.addEvents.unbind();
	this.$cancel.off('click', this.cancelBinding);
};

Connection.prototype.close = function(){
	this.unbind();
	modal.hide();
	this.$selectedList.empty();
	this.$list.empty();
};

// XXX

Connection.prototype.fetchAll = function(){
	var _this = this
		, currentDocument = controller.selectedDocument;

	// Fetch potential connections
	if (currentDocument.isNew()){
		request('/api/relations/', function(req, res){
			_this.createListing(res.body).render();
		});

	// Fetch potential & current connections of selected doc
	} else {
		var _id = controller.selectedDocument._id();
		request('/api/relations/'+ _id, function(res){
			_this.createListing(res.body).render();
		});
	}
};


Connection.prototype.createListing = function(docs){
	var _this = this;

	// Create our potential connection views
	each(docs.potentialNodes, function(doc){
		var node = new PotentialNode(doc, _this);
		_this.potentialNodes.push(node);
	});

	// Create our current connection views
	each(docs.links, function(doc, i){
		var link = new LinkNode(new LinkModel(doc), _this);
		_this.selectedNodes.push(link);
	});

	return this;
};


Connection.prototype.render = function(){
	var _this = this;
	this.potentialNodes.each(function(view){
		_this.$list.append(view.render().$el);
	});

	this.selectedNodes.each(function(view){
		_this.$selectedList.append(view.render().$el);
	});
};



Connection.prototype.parseAndSave = function(){
	var json = this.selectedNodes.map(function(node){
		node.parse();
		return node.model.toJSON();
	}).value();
	this.close();
	this.callback(json);
};

/**
 * Convert a selected link to a potential node
 * @param  {LinkNode} linkView
 * @return {Connection}
 */

Connection.prototype.linkToNode = function(linkView){
	var model = linkView.model;
	linkView.close();

	this.selectedNodes.models = this.selectedNodes.reject(function(node){
		return node == linkView;
	}).value();

	var current = controller.selectedDocument;
	var attr;
	if (model.from()){
		attr = (current._id() === model.from()._id)
			? model.to()
			: model.from();
	} else {
		attr = model.to();
	}

	var view = new PotentialNode(attr, this);
	this.potentialNodes.push(view);
	this.$list.append(view.render().$el);
	return this;
};

/**
 * Convert a potential node to a selected link
 * @param  {PotentialNode} nodeView
 * @return {Connection}
 */

Connection.prototype.nodeToLink = function(nodeView){
	var attr = nodeView.attr
		, current = controller.selectedDocument;

	// remove our element
	nodeView.close();

	// remove from our potential nodes collection
	this.potentialNodes.models = this.potentialNodes.reject(function(node){
		return node == nodeView;
	}).value();

	// create a new link model & fill it with attributes
	var model = new LinkModel();
	model.to({ title: attr.title, _id: attr._id });

	// we can't set our title and _id on new documents because we haven't
	// yet saved our document to the server. We need to PUT or POST our
	// links when we save our document.
	if (current && current._id())
		model.from({ title: current.title(), _id: current._id() });

	model.strength(1);

	// create a new link view, and add it to our selected node list
	var view = new LinkNode(model, this);
	this.selectedNodes.push(view);
	this.$selectedList.append(view.render().$el);
	return this;
};




/**
 * Link View
 * @param  {LinkModel} model
 * @param  {Connection} context
 * @return {LinkNode}
 */

var LinkNode = function(model, context){
	this.model = model;
	this.context = context;
	this.$el = dom('<li></li>').addClass('clearfix');
	this.template = require('../templates/connection-select');

	var current = controller.selectedDocument;
	if (model.from()){
		this.attr = (current._id() === model.from()._id)
				? clone(model.to())
				: clone(model.from());
	} else {
		this.attr = clone(model.to());
	}
	this.attr.strength = model.strength();
};

LinkNode.prototype.render = function(){
	this.$el.html(this.template(this.attr));
	this.bind();
	return this;
};

// Sets the link strength to the selected number.
LinkNode.prototype.parse = function(){
	var select = this.$el.find('select').get()
		, val = dom(select.options[select.selectedIndex]).val();
	this.model.strength(val);
};

LinkNode.prototype.bind = function(){
	var remove = this.$el.find('.remove').get();
	this.events = events(remove, this);
	this.events.bind('click', 'removeLink');
};

LinkNode.prototype.removeLink = function(e){
	e.preventDefault();
	this.context.linkToNode(this);
};

LinkNode.prototype.close = function(e){
	this.events.unbind();
	this.$el.remove();
};


/**
 * Potential Connection View
 * @param  {object} attr    name & id
 * @param  {Connection} context
 * @return {PotentialNode}
 */

var PotentialNode = function(attr, context){
	this.context = context;
	this.attr = attr;
	this.$el = dom('<li></li>').addClass('clearfix');
	this.template = function(attr){
		return attr.title+'<button class="add btn btn-small">Add</button>';
	};
};

PotentialNode.prototype.render = function(){
	this.$el.html(this.template(this.attr));
	this.bind();
	return this;
};

PotentialNode.prototype.bind = function(){
	var add = this.$el.find('.add').get();
	this.events = events(add, this);
	this.events.bind('click', 'addConnection');
};

PotentialNode.prototype.addConnection = function(){
	this.context.nodeToLink(this);
};

PotentialNode.prototype.close = function(){
	this.events.unbind();
	this.$el.remove();
};

}


});
require.register("eugenicsdatabase/lib/Spinner.js", function(exports, require, module){
var Spinner = require('spinner');

var el = document.getElementById('loading-wrapper');
var appended = false;

module.exports = {
	show: function(){
		if (appended) return;
		this.spinner = new Spinner()
			.size(30)
			.light();
		el.appendChild(this.spinner.el);
		appended = true;
	},
	hide: function(){
		if (appended) el.removeChild(this.spinner.el);
		this.spinner.stop();
		appended = false;
	}
};
});
require.register("eugenicsdatabase/jade-runtime.js", function(exports, require, module){

jade = (function(exports){
/*!
 * Jade - runtime
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Lame Array.isArray() polyfill for now.
 */

if (!Array.isArray) {
  Array.isArray = function(arr){
    return '[object Array]' == Object.prototype.toString.call(arr);
  };
}

/**
 * Lame Object.keys() polyfill for now.
 */

if (!Object.keys) {
  Object.keys = function(obj){
    var arr = [];
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        arr.push(key);
      }
    }
    return arr;
  }
}

/**
 * Merge two attribute objects giving precedence
 * to values in object `b`. Classes are special-cased
 * allowing for arrays and merging/joining appropriately
 * resulting in a string.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api private
 */

exports.merge = function merge(a, b) {
  var ac = a['class'];
  var bc = b['class'];

  if (ac || bc) {
    ac = ac || [];
    bc = bc || [];
    if (!Array.isArray(ac)) ac = [ac];
    if (!Array.isArray(bc)) bc = [bc];
    ac = ac.filter(nulls);
    bc = bc.filter(nulls);
    a['class'] = ac.concat(bc).join(' ');
  }

  for (var key in b) {
    if (key != 'class') {
      a[key] = b[key];
    }
  }

  return a;
};

/**
 * Filter null `val`s.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function nulls(val) {
  return val != null;
}

/**
 * Render the given attributes object.
 *
 * @param {Object} obj
 * @param {Object} escaped
 * @return {String}
 * @api private
 */

exports.attrs = function attrs(obj, escaped){
  var buf = []
    , terse = obj.terse;

  delete obj.terse;
  var keys = Object.keys(obj)
    , len = keys.length;

  if (len) {
    buf.push('');
    for (var i = 0; i < len; ++i) {
      var key = keys[i]
        , val = obj[key];

      if ('boolean' == typeof val || null == val) {
        if (val) {
          terse
            ? buf.push(key)
            : buf.push(key + '="' + key + '"');
        }
      } else if (0 == key.indexOf('data') && 'string' != typeof val) {
        buf.push(key + "='" + JSON.stringify(val) + "'");
      } else if ('class' == key && Array.isArray(val)) {
        buf.push(key + '="' + exports.escape(val.join(' ')) + '"');
      } else if (escaped && escaped[key]) {
        buf.push(key + '="' + exports.escape(val) + '"');
      } else {
        buf.push(key + '="' + val + '"');
      }
    }
  }

  return buf.join(' ');
};

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

exports.escape = function escape(html){
  return String(html)
    .replace(/&(?!(\w+|\#\d+);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

/**
 * Re-throw the given `err` in context to the
 * the jade in `filename` at the given `lineno`.
 *
 * @param {Error} err
 * @param {String} filename
 * @param {String} lineno
 * @api private
 */

exports.rethrow = function rethrow(err, filename, lineno){
  if (!filename) throw err;

  var context = 3
    , str = require('fs').readFileSync(filename, 'utf8')
    , lines = str.split('\n')
    , start = Math.max(lineno - context, 0)
    , end = Math.min(lines.length, lineno + context);

  // Error context
  var context = lines.slice(start, end).map(function(line, i){
    var curr = i + start + 1;
    return (curr == lineno ? '  > ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'Jade') + ':' + lineno
    + '\n' + context + '\n\n' + err.message;
  throw err;
};

  return exports;

})({});
});
require.register("eugenicsdatabase/templates/cast-item.js", function(exports, require, module){
module.exports = function anonymous(locals) {
var buf = [];
with (locals || {}) {
if ( locals.image)
{
buf.push("<img" + (jade.attrs({ 'width':('40px'), 'height':('40px'), 'src':(image.url+'/convert?w=40&h=40&fit=crop&align=faces') }, {"width":true,"height":true,"src":true})) + "/>");
}
else
{
buf.push("<div class=\"image-placeholder\"></div>");
}
buf.push("<a href=\"#\" class=\"title\">" + (((jade.interp = title) == null ? '' : jade.interp)) + "</a>");
if ( locals.currentUser)
{
buf.push("<a href=\"#\" class=\"edit-btn btn btn-small\">Edit</a>");
}
if ( locals.date)
{
buf.push("<span class=\"date\">" + (jade.escape(null == (jade.interp = date) ? "" : jade.interp)) + "</span>");
}
if ( locals.startDate)
{
buf.push("<span class=\"date\">" + (jade.escape((jade.interp = startDate) == null ? '' : jade.interp)) + " - " + (jade.escape((jade.interp = endDate) == null ? '' : jade.interp)) + "</span>");
}
}
return buf.join("");
}
});
require.register("eugenicsdatabase/templates/document-summary.js", function(exports, require, module){
module.exports = function anonymous(locals) {
var buf = [];
with (locals || {}) {
var field_mixin = function(label, value){
var block = this.block, attributes = this.attributes || {}, escaped = this.escaped || {};
buf.push("<dt>" + (jade.escape((jade.interp = label) == null ? '' : jade.interp)) + "</dt><dd>" + (((jade.interp = value) == null ? '' : jade.interp)) + "</dd>");
};
buf.push("<div><h4>" + (((jade.interp = title) == null ? '' : jade.interp)) + "</h4></div><dl>");
field_mixin('Type', type);
if (locals.prods && locals.prods.length > 0){
{
buf.push("<dt>Prods</dt><dd>");
// iterate locals.prods
;(function(){
  var $$obj = locals.prods;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var prod = $$obj[$index];

buf.push("<p class=\"prod-listing\">" + (jade.escape(null == (jade.interp = prod) ? "" : jade.interp)) + "</p>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var prod = $$obj[$index];

buf.push("<p class=\"prod-listing\">" + (jade.escape(null == (jade.interp = prod) ? "" : jade.interp)) + "</p>");
      }

    }

  }
}).call(this);

buf.push("</dd>");
}
}
if ( locals.alternativeNames)
{
field_mixin('Alternative Names', alternativeNames);
}
if ( locals.location)
{
field_mixin('Location', location);
}
if ( locals.latitude)
{
field_mixin('Latitude', latitude);
}
if ( locals.longitude)
{
field_mixin('Longitude', longitude);
}
if ( locals.date)
{
field_mixin('Date', date);
}
if ( locals.dateOfBirth)
{
field_mixin('Date of Birth', dateOfBirth);
}
if ( locals.dateOfDeath)
{
field_mixin('Date of Death', dateOfDeath);
}
if ( locals.startDate)
{
field_mixin('Start Date', startDate);
}
if ( locals.endDate)
{
field_mixin('End Date', endDate);
}
field_mixin('Full Description', fullDescription);
if ( locals.resources)
{
buf.push("<dt>Citations</dt>");
// iterate resources
;(function(){
  var $$obj = resources;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var resource = $$obj[$index];

buf.push("<dd>");
if ( resource.resource !== '')
{
buf.push("<p>" + (((jade.interp = resource.resource) == null ? '' : jade.interp)) + "</p>");
}
else
{
buf.push("<p>Citation Missing</p>");
}
buf.push("</dd>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var resource = $$obj[$index];

buf.push("<dd>");
if ( resource.resource !== '')
{
buf.push("<p>" + (((jade.interp = resource.resource) == null ? '' : jade.interp)) + "</p>");
}
else
{
buf.push("<p>Citation Missing</p>");
}
buf.push("</dd>");
      }

    }

  }
}).call(this);

}
if ( locals.image)
{
buf.push("<dt>Image</dt><dd><img" + (jade.attrs({ 'src':(image.url + '/convert?w=300&h=200&fit=max'), "class": ('document-summary-image') + ' ' + ('img-polaroid') }, {"src":true})) + "/></dd>");
}
if ( locals.heroQuote)
{
field_mixin('Hero Quote', heroQuote);
if ( locals.heroQuoteSource)
{
buf.push("<dd>heroQuoteSource</dd>");
}
}
if ( locals.villainQuote)
{
field_mixin('Villain Quote', villainQuote);
if ( locals.villainQuoteSource)
{
buf.push("<dd>villainQuoteSource</dd>");
}
}
if ( locals.ambiQuote)
{
field_mixin('Ambiguous Quote', ambiQuote);
if ( locals.ambiQuoteSource)
{
buf.push("<dd>ambiQuoteSource</dd>");
}
}
if ( locals.currentUser)
{
buf.push("<div><a id=\"edit-document\" class=\"btn btn-primary\">Edit Document</a></div>");
}
buf.push("</dl>");
}
return buf.join("");
}
});
require.register("eugenicsdatabase/templates/button.js", function(exports, require, module){
module.exports = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<label>" + (jade.escape(null == (jade.interp = object.label) ? "" : jade.interp)));
if ( object.required)
{
buf.push("<span>*</span>");
}
buf.push("<span class=\"target-link\"></span><div><button" + (jade.attrs({ 'name':(object.name), "class": ('btn') + ' ' + ('btn-success') }, {"name":true})) + ">Edit Connections</button></div></label>");
if ( object.error)
{
buf.push("<p class=\"error-text\">" + (jade.escape(null == (jade.interp = object.error) ? "" : jade.interp)) + "</p>");
}
if ( object.helpText)
{
buf.push("<span class=\"help-block\">" + (jade.escape(null == (jade.interp = object.helpText) ? "" : jade.interp)) + "</span>");
}
}
return buf.join("");
}
});
require.register("eugenicsdatabase/templates/checkbox.js", function(exports, require, module){
module.exports = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<h5>Select PRODs:</h5><div class=\"well\">");
// iterate object.fields
;(function(){
  var $$obj = object.fields;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var field = $$obj[$index];

// iterate field
;(function(){
  var $$obj = field;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var f = $$obj[$index];

buf.push("<label class=\"prod\"><input" + (jade.attrs({ 'type':('checkbox'), 'name':(f.name), 'checked':(f.value) }, {"type":true,"name":true,"checked":true})) + "/>" + (jade.escape((jade.interp = f.label) == null ? '' : jade.interp)) + "</label>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var f = $$obj[$index];

buf.push("<label class=\"prod\"><input" + (jade.attrs({ 'type':('checkbox'), 'name':(f.name), 'checked':(f.value) }, {"type":true,"name":true,"checked":true})) + "/>" + (jade.escape((jade.interp = f.label) == null ? '' : jade.interp)) + "</label>");
      }

    }

  }
}).call(this);

    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var field = $$obj[$index];

// iterate field
;(function(){
  var $$obj = field;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var f = $$obj[$index];

buf.push("<label class=\"prod\"><input" + (jade.attrs({ 'type':('checkbox'), 'name':(f.name), 'checked':(f.value) }, {"type":true,"name":true,"checked":true})) + "/>" + (jade.escape((jade.interp = f.label) == null ? '' : jade.interp)) + "</label>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var f = $$obj[$index];

buf.push("<label class=\"prod\"><input" + (jade.attrs({ 'type':('checkbox'), 'name':(f.name), 'checked':(f.value) }, {"type":true,"name":true,"checked":true})) + "/>" + (jade.escape((jade.interp = f.label) == null ? '' : jade.interp)) + "</label>");
      }

    }

  }
}).call(this);

      }

    }

  }
}).call(this);

buf.push("<span class=\"help-block\">Selecting a PROD from the list above will include this document on that PROD. It will also append fields to this form that are required for that PROD.</span></div>");
}
return buf.join("");
}
});
require.register("eugenicsdatabase/templates/image.js", function(exports, require, module){
module.exports = function anonymous(locals) {
var buf = [];
with (locals || {}) {
if ( object.loading)
{
buf.push("<img src=\"/img/loading.gif\"/>");
}
if ( object.value)
{
buf.push("<img" + (jade.attrs({ 'src':(object.value.url + '/convert?w=250&h=250'), "class": ('document-image') }, {"src":true})) + "/>");
}
buf.push("<input id=\"filepicker\" data-fp-maxSize=\"10485760\" data-fp-button-class=\"btn btn-small btn-success filepicker\" data-fp-button-text=\"Select an Image\"/>");
if ( object.value)
{
buf.push("<button id=\"remove-image\" href=\"#\" class=\"btn btn-small btn-warning\">Remove Image</button>");
}
if ( object.helpText)
{
buf.push("<span class=\"help-block\">" + (jade.escape(null == (jade.interp = object.helpText) ? "" : jade.interp)) + "</span>");
}
}
return buf.join("");
}
});
require.register("eugenicsdatabase/templates/select.js", function(exports, require, module){
module.exports = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<label" + (jade.attrs({ "class": (object.name) }, {"class":true})) + ">" + (jade.escape(null == (jade.interp = object.label) ? "" : jade.interp)) + "<select>");
// iterate object.options
;(function(){
  var $$obj = object.options;
  if ('number' == typeof $$obj.length) {

    for (var $index = 0, $$l = $$obj.length; $index < $$l; $index++) {
      var option = $$obj[$index];

buf.push("<option" + (jade.attrs({ 'value':(option.name), 'selected':(option.name == object.value) }, {"value":true,"selected":true})) + ">" + (jade.escape(null == (jade.interp = option.label) ? "" : jade.interp)) + "</option>");
    }

  } else {
    var $$l = 0;
    for (var $index in $$obj) {
      $$l++;      if ($$obj.hasOwnProperty($index)){      var option = $$obj[$index];

buf.push("<option" + (jade.attrs({ 'value':(option.name), 'selected':(option.name == object.value) }, {"value":true,"selected":true})) + ">" + (jade.escape(null == (jade.interp = option.label) ? "" : jade.interp)) + "</option>");
      }

    }

  }
}).call(this);

buf.push("</select></label>");
}
return buf.join("");
}
});
require.register("eugenicsdatabase/templates/text.js", function(exports, require, module){
module.exports = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<label>" + (jade.escape((jade.interp = object.label) == null ? '' : jade.interp)) + "");
if ( object.required)
{
buf.push("<span>*</span>");
}
buf.push("<input" + (jade.attrs({ 'id':(object.name), 'type':('text'), 'name':(object.name), 'value':(object.value), "class": (object.className) }, {"id":true,"type":true,"name":true,"class":true,"value":true})) + "/></label>");
if ( object.error)
{
buf.push("<p class=\"error-text\">" + (jade.escape(null == (jade.interp = object.error) ? "" : jade.interp)) + "</p>");
}
if ( object.helpText)
{
buf.push("<span class=\"help-block\">" + (jade.escape(null == (jade.interp = object.helpText) ? "" : jade.interp)) + "</span>");
}
}
return buf.join("");
}
});
require.register("eugenicsdatabase/templates/textarea.js", function(exports, require, module){
module.exports = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<label>" + (jade.escape(null == (jade.interp = object.label) ? "" : jade.interp)));
if ( object.required)
{
buf.push("<span>*</span>");
}
buf.push("<textarea" + (jade.attrs({ 'name':(object.name), "class": (object.name) }, {"name":true,"class":true})) + ">" + (jade.escape(null == (jade.interp = object.value) ? "" : jade.interp)) + "</textarea></label>");
if ( object.error)
{
buf.push("<p class=\"error-text\">" + (jade.escape(null == (jade.interp = object.error) ? "" : jade.interp)) + "</p>");
}
if ( object.helpText)
{
buf.push("<span class=\"help-block\">" + (jade.escape(null == (jade.interp = object.helpText) ? "" : jade.interp)) + "</span>");
}
}
return buf.join("");
}
});
require.register("eugenicsdatabase/templates/connection-select.js", function(exports, require, module){
module.exports = function anonymous(locals) {
var buf = [];
with (locals || {}) {
buf.push("<span class=\"document-name\">" + (jade.escape(null == (jade.interp = title) ? "" : jade.interp)) + "</span><button class=\"btn btn-small btn-warning remove\">Remove</button><select class=\"strength\"><option" + (jade.attrs({ 'value':('1'), 'selected':((strength === 1)) }, {"value":true,"selected":true})) + ">1</option><option" + (jade.attrs({ 'value':('2'), 'selected':((strength === 2)) }, {"value":true,"selected":true})) + ">2</option><option" + (jade.attrs({ 'value':('3'), 'selected':((strength === 3)) }, {"value":true,"selected":true})) + ">3</option><option" + (jade.attrs({ 'value':('4'), 'selected':((strength === 4)) }, {"value":true,"selected":true})) + ">4</option><option" + (jade.attrs({ 'value':('5'), 'selected':((strength === 5)) }, {"value":true,"selected":true})) + ">5</option><option" + (jade.attrs({ 'value':('6'), 'selected':((strength === 6)) }, {"value":true,"selected":true})) + ">6</option><option" + (jade.attrs({ 'value':('7'), 'selected':((strength === 7)) }, {"value":true,"selected":true})) + ">7</option><option" + (jade.attrs({ 'value':('8'), 'selected':((strength === 8)) }, {"value":true,"selected":true})) + ">8</option><option" + (jade.attrs({ 'value':('9'), 'selected':((strength === 9)) }, {"value":true,"selected":true})) + ">9</option><option" + (jade.attrs({ 'value':('10'), 'selected':((strength === 10)) }, {"value":true,"selected":true})) + ">10</option></select>");
}
return buf.join("");
}
});












































require.register("eugenicsdatabase/templates/cast-item.jade", function(exports, require, module){
module.exports = 'if locals.image\n	img(width=\'40px\', height=\'40px\', src=image.url+\'/convert?w=40&h=40&fit=crop&align=faces\')\nelse\n	.image-placeholder\na.title(href=\'#\') !{title}\nif locals.currentUser\n	a.edit-btn.btn.btn-small(href=\'#\') Edit\nif locals.date\n	span.date=date\nif locals.startDate\n	span.date #{startDate} - #{endDate}';
});
require.register("eugenicsdatabase/templates/document-summary.jade", function(exports, require, module){
module.exports = 'mixin field(label, value)\n  dt #{label}\n  dd !{value}\n\ndiv\n  h4 !{title}\ndl\n  mixin field(\'Type\', type)\n  - if (locals.prods && locals.prods.length > 0){\n      dt Prods\n      dd\n        each prod in locals.prods\n          p.prod-listing=prod\n  - }\n  if locals.alternativeNames\n    mixin field(\'Alternative Names\', alternativeNames)\n  if locals.location\n    mixin field(\'Location\', location)\n  if locals.latitude\n    mixin field(\'Latitude\', latitude)\n  if locals.longitude\n    mixin field(\'Longitude\', longitude)\n  if locals.date\n    mixin field(\'Date\', date)\n  if locals.dateOfBirth\n    mixin field(\'Date of Birth\', dateOfBirth)\n  if locals.dateOfDeath\n    mixin field(\'Date of Death\', dateOfDeath)\n  if locals.startDate\n    mixin field(\'Start Date\', startDate)\n  if locals.endDate\n    mixin field(\'End Date\', endDate)\n\n  mixin field(\'Full Description\', fullDescription)\n\n  if locals.resources\n    dt Citations\n    for resource in resources\n      dd\n        if resource.resource !== \'\'\n          p !{resource.resource}\n        else\n          p Citation Missing\n\n  if locals.image\n    dt Image\n    dd\n      img.document-summary-image.img-polaroid(src=image.url + \'/convert?w=300&h=200&fit=max\')\n\n  if locals.heroQuote\n    mixin field(\'Hero Quote\', heroQuote)\n    if locals.heroQuoteSource\n      dd heroQuoteSource\n\n  if locals.villainQuote\n    mixin field(\'Villain Quote\', villainQuote)\n    if locals.villainQuoteSource\n      dd villainQuoteSource\n\n  if locals.ambiQuote\n    mixin field(\'Ambiguous Quote\', ambiQuote)\n    if locals.ambiQuoteSource\n      dd ambiQuoteSource\n\n  if locals.currentUser\n    div\n      a.btn.btn-primary#edit-document Edit Document\n\n';
});
require.register("eugenicsdatabase/templates/button.jade", function(exports, require, module){
module.exports = 'label=object.label\n	if object.required\n		span *\n	span.target-link\n	div\n		button.btn.btn-success(name=object.name) Edit Connections\nif object.error\n	p.error-text=object.error\nif object.helpText\n	span.help-block=object.helpText\n';
});
require.register("eugenicsdatabase/templates/checkbox.jade", function(exports, require, module){
module.exports = 'h5 Select PRODs:\n.well\n	each field in object.fields\n		each f in field\n			label.prod\n				input(type=\'checkbox\', name=f.name, checked=f.value)\n				| #{f.label}\n	span.help-block Selecting a PROD from the list above will include this document on that PROD. It will also append fields to this form that are required for that PROD.\n';
});
require.register("eugenicsdatabase/templates/image.jade", function(exports, require, module){
module.exports = 'if object.loading\n	img(src=\'/img/loading.gif\')\nif object.value\n	img.document-image(src=object.value.url + \'/convert?w=250&h=250\')\ninput#filepicker(data-fp-maxSize=\'10485760\', data-fp-button-class=\'btn btn-small btn-success filepicker\', data-fp-button-text=\'Select an Image\')\nif object.value\n	button#remove-image.btn.btn-small.btn-warning(href=\'#\') Remove Image\nif object.helpText\n	span.help-block=object.helpText';
});
require.register("eugenicsdatabase/templates/select.jade", function(exports, require, module){
module.exports = 'label(class=object.name)=object.label\n	select\n		each option in object.options\n			option(value=option.name, selected= option.name == object.value)= option.label';
});
require.register("eugenicsdatabase/templates/text.jade", function(exports, require, module){
module.exports = 'label #{object.label}\n	if object.required\n		span *\n	input(id=object.name, type=\'text\', name=object.name, class=object.className, value=object.value)\nif object.error\n	p.error-text=object.error\nif object.helpText\n	span.help-block=object.helpText\n';
});
require.register("eugenicsdatabase/templates/textarea.jade", function(exports, require, module){
module.exports = 'label=object.label\n	if object.required\n		span *\n	textarea(name=object.name, class=object.name)=object.value\nif object.error\n	p.error-text=object.error\nif object.helpText\n	span.help-block=object.helpText\n';
});
require.register("eugenicsdatabase/templates/connection-select.jade", function(exports, require, module){
module.exports = 'span.document-name=title\nbutton.btn.btn-small.btn-warning.remove Remove\nselect.strength\n	option(value=\'1\', selected=(strength === 1)) 1\n	option(value=\'2\', selected=(strength === 2)) 2\n	option(value=\'3\', selected=(strength === 3)) 3\n	option(value=\'4\', selected=(strength === 4)) 4\n	option(value=\'5\', selected=(strength === 5)) 5\n	option(value=\'6\', selected=(strength === 6)) 6\n	option(value=\'7\', selected=(strength === 7)) 7\n	option(value=\'8\', selected=(strength === 8)) 8\n	option(value=\'9\', selected=(strength === 9)) 9\n	option(value=\'10\', selected=(strength === 10)) 10';
});
require.alias("component-moment/index.js", "eugenicsdatabase/deps/moment/index.js");
require.alias("component-moment/index.js", "moment/index.js");

require.alias("bmcmahen-modal/index.js", "eugenicsdatabase/deps/modal/index.js");
require.alias("bmcmahen-modal/index.js", "modal/index.js");
require.alias("component-emitter/index.js", "bmcmahen-modal/deps/emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("eugenicsarchivesca-overlay/index.js", "bmcmahen-modal/deps/overlay/index.js");
require.alias("component-classes/index.js", "eugenicsarchivesca-overlay/deps/classes/index.js");
require.alias("component-indexof/index.js", "component-classes/deps/indexof/index.js");

require.alias("component-emitter/index.js", "eugenicsarchivesca-overlay/deps/emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("component-classes/index.js", "bmcmahen-modal/deps/classes/index.js");
require.alias("component-indexof/index.js", "component-classes/deps/indexof/index.js");

require.alias("bmcmahen-animate-css/index.js", "bmcmahen-modal/deps/animate-css/index.js");
require.alias("component-classes/index.js", "bmcmahen-animate-css/deps/classes/index.js");
require.alias("component-indexof/index.js", "component-classes/deps/indexof/index.js");

require.alias("ecarter-css-emitter/index.js", "bmcmahen-animate-css/deps/css-emitter/index.js");
require.alias("component-emitter/index.js", "ecarter-css-emitter/deps/emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("component-event/index.js", "ecarter-css-emitter/deps/event/index.js");

require.alias("component-once/index.js", "bmcmahen-animate-css/deps/once/index.js");

require.alias("eugenicsarchivesca-has-css-animations/index.js", "bmcmahen-animate-css/deps/has-css-animations/index.js");
require.alias("eugenicsarchivesca-has-css-animations/index.js", "bmcmahen-animate-css/deps/has-css-animations/index.js");
require.alias("eugenicsarchivesca-has-css-animations/index.js", "eugenicsarchivesca-has-css-animations/index.js");
require.alias("component-bind/index.js", "eugenicsdatabase/deps/bind/index.js");
require.alias("component-bind/index.js", "bind/index.js");

require.alias("component-each/index.js", "eugenicsdatabase/deps/each/index.js");
require.alias("component-each/index.js", "each/index.js");
require.alias("component-type/index.js", "component-each/deps/type/index.js");

require.alias("bmcmahen-cast/index.js", "eugenicsdatabase/deps/cast/index.js");
require.alias("bmcmahen-cast/index.js", "cast/index.js");
require.alias("component-emitter/index.js", "bmcmahen-cast/deps/emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("component-clone/index.js", "bmcmahen-cast/deps/clone/index.js");
require.alias("component-type/index.js", "component-clone/deps/type/index.js");

require.alias("component-bind/index.js", "bmcmahen-cast/deps/bind/index.js");

require.alias("component-type/index.js", "bmcmahen-cast/deps/type/index.js");

require.alias("bmcmahen-ordered-dictionary/index.js", "bmcmahen-cast/deps/ordered-dictionary/index.js");
require.alias("component-indexof/index.js", "bmcmahen-ordered-dictionary/deps/indexof/index.js");

require.alias("component-emitter/index.js", "bmcmahen-ordered-dictionary/deps/emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("component-indexof/index.js", "bmcmahen-cast/deps/indexof/index.js");

require.alias("component-translate/index.js", "bmcmahen-cast/deps/translate/index.js");
require.alias("component-translate/index.js", "bmcmahen-cast/deps/translate/index.js");
require.alias("component-has-translate3d/index.js", "component-translate/deps/has-translate3d/index.js");
require.alias("component-transform-property/index.js", "component-has-translate3d/deps/transform-property/index.js");

require.alias("component-transform-property/index.js", "component-translate/deps/transform-property/index.js");

require.alias("component-translate/index.js", "component-translate/index.js");
require.alias("component-emitter/index.js", "eugenicsdatabase/deps/emitter/index.js");
require.alias("component-emitter/index.js", "emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("component-type/index.js", "eugenicsdatabase/deps/type/index.js");
require.alias("component-type/index.js", "type/index.js");

require.alias("eugenicsarchivesca-swipe/index.js", "eugenicsdatabase/deps/swipe/index.js");
require.alias("eugenicsarchivesca-swipe/index.js", "swipe/index.js");
require.alias("component-emitter/index.js", "eugenicsarchivesca-swipe/deps/emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("component-events/index.js", "eugenicsarchivesca-swipe/deps/events/index.js");
require.alias("component-event/index.js", "component-events/deps/event/index.js");

require.alias("component-delegate/index.js", "component-events/deps/delegate/index.js");
require.alias("component-matches-selector/index.js", "component-delegate/deps/matches-selector/index.js");
require.alias("component-query/index.js", "component-matches-selector/deps/query/index.js");

require.alias("component-event/index.js", "component-delegate/deps/event/index.js");

require.alias("component-has-translate3d/index.js", "eugenicsarchivesca-swipe/deps/has-translate3d/index.js");
require.alias("component-transform-property/index.js", "component-has-translate3d/deps/transform-property/index.js");

require.alias("component-transform-property/index.js", "eugenicsarchivesca-swipe/deps/transform-property/index.js");

require.alias("component-model/lib/index.js", "eugenicsdatabase/deps/model/lib/index.js");
require.alias("component-model/lib/static.js", "eugenicsdatabase/deps/model/lib/static.js");
require.alias("component-model/lib/proto.js", "eugenicsdatabase/deps/model/lib/proto.js");
require.alias("component-model/lib/index.js", "eugenicsdatabase/deps/model/index.js");
require.alias("component-model/lib/index.js", "model/index.js");
require.alias("component-each/index.js", "component-model/deps/each/index.js");
require.alias("component-type/index.js", "component-each/deps/type/index.js");

require.alias("component-json/index.js", "component-model/deps/json/index.js");

require.alias("component-emitter/index.js", "component-model/deps/emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("component-collection/index.js", "component-model/deps/collection/index.js");
require.alias("component-enumerable/index.js", "component-collection/deps/enumerable/index.js");
require.alias("component-to-function/index.js", "component-enumerable/deps/to-function/index.js");

require.alias("visionmedia-superagent/lib/client.js", "component-model/deps/superagent/lib/client.js");
require.alias("visionmedia-superagent/lib/client.js", "component-model/deps/superagent/index.js");
require.alias("component-emitter/index.js", "visionmedia-superagent/deps/emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("RedVentures-reduce/index.js", "visionmedia-superagent/deps/reduce/index.js");

require.alias("visionmedia-superagent/lib/client.js", "visionmedia-superagent/index.js");
require.alias("component-model/lib/index.js", "component-model/index.js");
require.alias("component-collection/index.js", "eugenicsdatabase/deps/collection/index.js");
require.alias("component-collection/index.js", "collection/index.js");
require.alias("component-enumerable/index.js", "component-collection/deps/enumerable/index.js");
require.alias("component-to-function/index.js", "component-enumerable/deps/to-function/index.js");

require.alias("visionmedia-superagent/lib/client.js", "eugenicsdatabase/deps/superagent/lib/client.js");
require.alias("visionmedia-superagent/lib/client.js", "eugenicsdatabase/deps/superagent/index.js");
require.alias("visionmedia-superagent/lib/client.js", "superagent/index.js");
require.alias("component-emitter/index.js", "visionmedia-superagent/deps/emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("RedVentures-reduce/index.js", "visionmedia-superagent/deps/reduce/index.js");

require.alias("visionmedia-superagent/lib/client.js", "visionmedia-superagent/index.js");
require.alias("component-map/index.js", "eugenicsdatabase/deps/map/index.js");
require.alias("component-map/index.js", "map/index.js");
require.alias("component-to-function/index.js", "component-map/deps/to-function/index.js");

require.alias("component-dom/index.js", "eugenicsdatabase/deps/dom/index.js");
require.alias("component-dom/index.js", "dom/index.js");
require.alias("component-type/index.js", "component-dom/deps/type/index.js");

require.alias("component-event/index.js", "component-dom/deps/event/index.js");

require.alias("component-delegate/index.js", "component-dom/deps/delegate/index.js");
require.alias("component-matches-selector/index.js", "component-delegate/deps/matches-selector/index.js");
require.alias("component-query/index.js", "component-matches-selector/deps/query/index.js");

require.alias("component-event/index.js", "component-delegate/deps/event/index.js");

require.alias("component-indexof/index.js", "component-dom/deps/indexof/index.js");

require.alias("component-domify/index.js", "component-dom/deps/domify/index.js");

require.alias("component-classes/index.js", "component-dom/deps/classes/index.js");
require.alias("component-indexof/index.js", "component-classes/deps/indexof/index.js");

require.alias("component-css/index.js", "component-dom/deps/css/index.js");

require.alias("component-sort/index.js", "component-dom/deps/sort/index.js");

require.alias("component-value/index.js", "component-dom/deps/value/index.js");
require.alias("component-value/index.js", "component-dom/deps/value/index.js");
require.alias("component-type/index.js", "component-value/deps/type/index.js");

require.alias("component-value/index.js", "component-value/index.js");
require.alias("component-query/index.js", "component-dom/deps/query/index.js");

require.alias("component-event/index.js", "eugenicsdatabase/deps/event/index.js");
require.alias("component-event/index.js", "event/index.js");

require.alias("matthewmueller-debounce/index.js", "eugenicsdatabase/deps/debounce/index.js");
require.alias("matthewmueller-debounce/index.js", "debounce/index.js");

require.alias("component-select/index.js", "eugenicsdatabase/deps/select/index.js");
require.alias("component-select/index.js", "select/index.js");

require.alias("segmentio-extend/index.js", "eugenicsdatabase/deps/extend/index.js");
require.alias("segmentio-extend/index.js", "extend/index.js");

require.alias("yields-uniq/index.js", "eugenicsdatabase/deps/uniq/index.js");
require.alias("yields-uniq/index.js", "uniq/index.js");
require.alias("component-indexof/index.js", "yields-uniq/deps/indexof/index.js");

require.alias("nami-doc-contains/index.js", "eugenicsdatabase/deps/contains/index.js");
require.alias("nami-doc-contains/index.js", "contains/index.js");

require.alias("bmcmahen-confirmation/index.js", "eugenicsdatabase/deps/confirmation/index.js");
require.alias("bmcmahen-confirmation/template.js", "eugenicsdatabase/deps/confirmation/template.js");
require.alias("bmcmahen-confirmation/index.js", "confirmation/index.js");
require.alias("component-emitter/index.js", "bmcmahen-confirmation/deps/emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("component-clone/index.js", "eugenicsdatabase/deps/clone/index.js");
require.alias("component-clone/index.js", "clone/index.js");
require.alias("component-type/index.js", "component-clone/deps/type/index.js");

require.alias("component-enumerable/index.js", "eugenicsdatabase/deps/enumerable/index.js");
require.alias("component-enumerable/index.js", "enumerable/index.js");
require.alias("component-to-function/index.js", "component-enumerable/deps/to-function/index.js");

require.alias("eugenicsarchivesca-tip/index.js", "eugenicsdatabase/deps/tip/index.js");
require.alias("eugenicsarchivesca-tip/template.js", "eugenicsdatabase/deps/tip/template.js");
require.alias("eugenicsarchivesca-tip/index.js", "tip/index.js");
require.alias("component-emitter/index.js", "eugenicsarchivesca-tip/deps/emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("component-inherit/index.js", "eugenicsarchivesca-tip/deps/inherit/index.js");

require.alias("component-query/index.js", "eugenicsarchivesca-tip/deps/query/index.js");

require.alias("component-each/index.js", "eugenicsarchivesca-tip/deps/each/index.js");
require.alias("component-type/index.js", "component-each/deps/type/index.js");

require.alias("component-domify/index.js", "eugenicsarchivesca-tip/deps/domify/index.js");

require.alias("component-event/index.js", "eugenicsarchivesca-tip/deps/event/index.js");

require.alias("component-bind/index.js", "eugenicsarchivesca-tip/deps/bind/index.js");

require.alias("component-classes/index.js", "eugenicsarchivesca-tip/deps/classes/index.js");
require.alias("component-indexof/index.js", "component-classes/deps/indexof/index.js");

require.alias("component-css/index.js", "eugenicsarchivesca-tip/deps/css/index.js");

require.alias("yields-isArray/index.js", "eugenicsarchivesca-tip/deps/isArray/index.js");

require.alias("eugenicsarchivesca-confirmation-popover/index.js", "eugenicsdatabase/deps/confirmation-popover/index.js");
require.alias("eugenicsarchivesca-confirmation-popover/template.js", "eugenicsdatabase/deps/confirmation-popover/template.js");
require.alias("eugenicsarchivesca-confirmation-popover/index.js", "confirmation-popover/index.js");
require.alias("eugenicsarchivesca-popover/index.js", "eugenicsarchivesca-confirmation-popover/deps/popover/index.js");
require.alias("eugenicsarchivesca-popover/template.js", "eugenicsarchivesca-confirmation-popover/deps/popover/template.js");
require.alias("eugenicsarchivesca-tip/index.js", "eugenicsarchivesca-popover/deps/tip/index.js");
require.alias("eugenicsarchivesca-tip/template.js", "eugenicsarchivesca-popover/deps/tip/template.js");
require.alias("component-emitter/index.js", "eugenicsarchivesca-tip/deps/emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("component-inherit/index.js", "eugenicsarchivesca-tip/deps/inherit/index.js");

require.alias("component-query/index.js", "eugenicsarchivesca-tip/deps/query/index.js");

require.alias("component-each/index.js", "eugenicsarchivesca-tip/deps/each/index.js");
require.alias("component-type/index.js", "component-each/deps/type/index.js");

require.alias("component-domify/index.js", "eugenicsarchivesca-tip/deps/domify/index.js");

require.alias("component-event/index.js", "eugenicsarchivesca-tip/deps/event/index.js");

require.alias("component-bind/index.js", "eugenicsarchivesca-tip/deps/bind/index.js");

require.alias("component-classes/index.js", "eugenicsarchivesca-tip/deps/classes/index.js");
require.alias("component-indexof/index.js", "component-classes/deps/indexof/index.js");

require.alias("component-css/index.js", "eugenicsarchivesca-tip/deps/css/index.js");

require.alias("yields-isArray/index.js", "eugenicsarchivesca-tip/deps/isArray/index.js");

require.alias("component-inherit/index.js", "eugenicsarchivesca-popover/deps/inherit/index.js");

require.alias("yields-empty/index.js", "eugenicsarchivesca-popover/deps/empty/index.js");
require.alias("yields-empty/index.js", "eugenicsarchivesca-popover/deps/empty/index.js");
require.alias("yields-empty/index.js", "yields-empty/index.js");
require.alias("component-domify/index.js", "eugenicsarchivesca-popover/deps/domify/index.js");

require.alias("component-classes/index.js", "eugenicsarchivesca-popover/deps/classes/index.js");
require.alias("component-indexof/index.js", "component-classes/deps/indexof/index.js");

require.alias("component-query/index.js", "eugenicsarchivesca-popover/deps/query/index.js");

require.alias("bmcmahen-html/index.js", "eugenicsarchivesca-popover/deps/html/index.js");
require.alias("bmcmahen-html/index.js", "eugenicsarchivesca-popover/deps/html/index.js");
require.alias("bmcmahen-append/index.js", "bmcmahen-html/deps/append/index.js");
require.alias("bmcmahen-append/index.js", "bmcmahen-html/deps/append/index.js");
require.alias("bmcmahen-append/index.js", "bmcmahen-append/index.js");
require.alias("yields-empty/index.js", "bmcmahen-html/deps/empty/index.js");
require.alias("yields-empty/index.js", "bmcmahen-html/deps/empty/index.js");
require.alias("yields-empty/index.js", "yields-empty/index.js");
require.alias("bmcmahen-html/index.js", "bmcmahen-html/index.js");
require.alias("component-domify/index.js", "eugenicsarchivesca-confirmation-popover/deps/domify/index.js");

require.alias("component-query/index.js", "eugenicsarchivesca-confirmation-popover/deps/query/index.js");

require.alias("component-event/index.js", "eugenicsarchivesca-confirmation-popover/deps/event/index.js");

require.alias("component-bind/index.js", "eugenicsarchivesca-confirmation-popover/deps/bind/index.js");

require.alias("bmcmahen-html/index.js", "eugenicsarchivesca-confirmation-popover/deps/html/index.js");
require.alias("bmcmahen-html/index.js", "eugenicsarchivesca-confirmation-popover/deps/html/index.js");
require.alias("bmcmahen-append/index.js", "bmcmahen-html/deps/append/index.js");
require.alias("bmcmahen-append/index.js", "bmcmahen-html/deps/append/index.js");
require.alias("bmcmahen-append/index.js", "bmcmahen-append/index.js");
require.alias("yields-empty/index.js", "bmcmahen-html/deps/empty/index.js");
require.alias("yields-empty/index.js", "bmcmahen-html/deps/empty/index.js");
require.alias("yields-empty/index.js", "yields-empty/index.js");
require.alias("bmcmahen-html/index.js", "bmcmahen-html/index.js");
require.alias("eugenicsarchivesca-popover/index.js", "eugenicsdatabase/deps/popover/index.js");
require.alias("eugenicsarchivesca-popover/template.js", "eugenicsdatabase/deps/popover/template.js");
require.alias("eugenicsarchivesca-popover/index.js", "popover/index.js");
require.alias("eugenicsarchivesca-tip/index.js", "eugenicsarchivesca-popover/deps/tip/index.js");
require.alias("eugenicsarchivesca-tip/template.js", "eugenicsarchivesca-popover/deps/tip/template.js");
require.alias("component-emitter/index.js", "eugenicsarchivesca-tip/deps/emitter/index.js");
require.alias("component-indexof/index.js", "component-emitter/deps/indexof/index.js");

require.alias("component-inherit/index.js", "eugenicsarchivesca-tip/deps/inherit/index.js");

require.alias("component-query/index.js", "eugenicsarchivesca-tip/deps/query/index.js");

require.alias("component-each/index.js", "eugenicsarchivesca-tip/deps/each/index.js");
require.alias("component-type/index.js", "component-each/deps/type/index.js");

require.alias("component-domify/index.js", "eugenicsarchivesca-tip/deps/domify/index.js");

require.alias("component-event/index.js", "eugenicsarchivesca-tip/deps/event/index.js");

require.alias("component-bind/index.js", "eugenicsarchivesca-tip/deps/bind/index.js");

require.alias("component-classes/index.js", "eugenicsarchivesca-tip/deps/classes/index.js");
require.alias("component-indexof/index.js", "component-classes/deps/indexof/index.js");

require.alias("component-css/index.js", "eugenicsarchivesca-tip/deps/css/index.js");

require.alias("yields-isArray/index.js", "eugenicsarchivesca-tip/deps/isArray/index.js");

require.alias("component-inherit/index.js", "eugenicsarchivesca-popover/deps/inherit/index.js");

require.alias("yields-empty/index.js", "eugenicsarchivesca-popover/deps/empty/index.js");
require.alias("yields-empty/index.js", "eugenicsarchivesca-popover/deps/empty/index.js");
require.alias("yields-empty/index.js", "yields-empty/index.js");
require.alias("component-domify/index.js", "eugenicsarchivesca-popover/deps/domify/index.js");

require.alias("component-classes/index.js", "eugenicsarchivesca-popover/deps/classes/index.js");
require.alias("component-indexof/index.js", "component-classes/deps/indexof/index.js");

require.alias("component-query/index.js", "eugenicsarchivesca-popover/deps/query/index.js");

require.alias("bmcmahen-html/index.js", "eugenicsarchivesca-popover/deps/html/index.js");
require.alias("bmcmahen-html/index.js", "eugenicsarchivesca-popover/deps/html/index.js");
require.alias("bmcmahen-append/index.js", "bmcmahen-html/deps/append/index.js");
require.alias("bmcmahen-append/index.js", "bmcmahen-html/deps/append/index.js");
require.alias("bmcmahen-append/index.js", "bmcmahen-append/index.js");
require.alias("yields-empty/index.js", "bmcmahen-html/deps/empty/index.js");
require.alias("yields-empty/index.js", "bmcmahen-html/deps/empty/index.js");
require.alias("yields-empty/index.js", "yields-empty/index.js");
require.alias("bmcmahen-html/index.js", "bmcmahen-html/index.js");

require.alias("component-events/index.js", "eugenicsdatabase/deps/events/index.js");
require.alias("component-events/index.js", "events/index.js");
require.alias("component-event/index.js", "component-events/deps/event/index.js");

require.alias("component-delegate/index.js", "component-events/deps/delegate/index.js");
require.alias("component-matches-selector/index.js", "component-delegate/deps/matches-selector/index.js");
require.alias("component-query/index.js", "component-matches-selector/deps/query/index.js");

require.alias("component-event/index.js", "component-delegate/deps/event/index.js");

require.alias("component-spinner/index.js", "eugenicsdatabase/deps/spinner/index.js");
require.alias("component-spinner/index.js", "spinner/index.js");
require.alias("component-autoscale-canvas/index.js", "component-spinner/deps/autoscale-canvas/index.js");

require.alias("component-raf/index.js", "component-spinner/deps/raf/index.js");

require.alias("anthonyshort-emitter-manager/index.js", "eugenicsdatabase/deps/emitter-manager/index.js");
require.alias("anthonyshort-emitter-manager/index.js", "emitter-manager/index.js");
require.alias("anthonyshort-map/index.js", "anthonyshort-emitter-manager/deps/map/index.js");

require.alias("eugenicsdatabase/index.js", "eugenicsdatabase/index.js");
require("eugenicsdatabase/jade-runtime");
