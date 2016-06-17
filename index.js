const fs = require('fs');
var S = require('string');

function TextParserGenie(settings) {
  return {

    // Settings for the text file like word delimitter
    _settings: settings,

    // Storage place for individual lines of text file
    _lines: [],

    // result array to store results of parse query along with parse result
    _results: [],

    // Function which is called from client
    parse: function parse(query, callback) {

      // Cloning the Json query to another variable
      //  to remove the reference of query from client side
      // EXPLATION: When client calls the parse function with same query json multiple times
      //  the current query will have the result of previous execution
      //  because we are appending the results directly into the query
      var parseQuery = JSON.parse(JSON.stringify(query));

      // Reads files in aync mode
      fs.readFile(this._settings.file, 'utf-8', (err, data) => {

        // If error pass it to callback
        if (err) {
          console.log('Unable to read file ' + this._settings.file);
          callback(err, null);
          return;
        }

        // Splits the lines
        this._splitLines(data);

        if (parseQuery.length) {
          // Traverse through all parse query objects and resolve each query individually
          for (var i = 0; i < Object.keys(parseQuery).length; i++) {
            var result = this._resolveQuery(parseQuery[i], {});
            this._results.push(result);
          }
        } else {
          // If the query contains just a single query object
          var result = this._resolveQuery(parseQuery, {});
          this._results.push(result);
        }

        // After gathering all results, send the results in callback
        callback(null, this._results);
      });
    },

    // Finds line number in which the pattern is found after the startLineNumber
    _findLineNumber: function _findLineNumber(pattern, startLineNumber, context) {
      // Pattern to short multiple word delimitters to one
      var wordDelimitterPattern = new RegExp('[' + context.wordDelimitter + ']+', 'g');

      // Pattern to trim the line in start and end without word delimitter,
      // because it causes extra array element while splitting line for words
      var wordDelimitterPatternTrimEnds = new RegExp('^'
                                                      + context.wordDelimitter
                                                      + '+|'
                                                      + context.wordDelimitter
                                                      + '+$', 'g');

      for (var lineIterator = startLineNumber;
            lineIterator < this._lines.length;
            lineIterator++) {
        var line = this._lines[lineIterator];
        if (S(line).isEmpty()) {
          continue;
        }

        line = line.replace(wordDelimitterPattern, context.wordDelimitter)
                    .replace(wordDelimitterPatternTrimEnds, '');

        // Test the line for the pattern
        if (pattern.test(line)) {
          return lineIterator;
        }
      }

      // If pattern not found return -1
      return -1;
    },

    // Splits the lines based on \r\n in text file and saves to _lines array
    _splitLines: function _splitLines(data) {
      this._lines = S(data).lines();

      // Inserting the first element as '',
      // because line numbers from users will be indexed from 1 and not 0
      this._lines.unshift('');
    },

    // Find / Get the line number from query item
    _lineNumber: function _lineNumber(queryItem, context) {

      // If line number is not a number and we have not yet resolved to get the result key
      if (isNaN(queryItem.lineNumber) && queryItem.lineNumber.result == undefined) {

        // Call the resolve query with line number's object as query item.
        context.lineNumber = this._resolveQuery(queryItem.lineNumber, context).result;

      // If query item has line number then directly set to context
      } else if (queryItem.lineNumber) {
        context.lineNumber = queryItem.lineNumber;

      // If nothing works out set line number to 1 as default
      } else {
        if (context.lineNumber == undefined) {
          context.lineNumber = 1;
        }
      }

      return context.lineNumber;
    },

    // Get the word number from particular line
    _wordNumber: function _wordNumber(queryItem, context) {

      // If word number query item itself has a nested query then process that first
      if (isNaN(queryItem.wordNumber)) {
        this._resolveQuery(queryItem.wordNumber, context);
      }

      // Get the line with and replace all unwanted delimitters then split by word delimitter
      var line = this._lines[context.lineNumber];
      line = S(line).replaceAll('/s/' + context.wordDelimitter + '+/', context.wordDelimitter).s;
      var words = line.split(context.wordDelimitter);

      // Insert empty '' as first element, because user query will be indexed from 1 and not 0
      words.unshift('');
      queryItem.result = words[queryItem.wordNumber];
      return queryItem.result;
    },

    // Get the field value from text
    _field: function _field(queryItem, context) {
      // TODO Field value must be text if not then resolve query

      // Sets the context with first from query item
      // if not then from settings if not then from defaults
      context.wordDelimitter = queryItem.wordDelimitter
                                || context.wordDelimitter
                                || this._settings.wordDelimitter
                                || ' ';
      context.fieldDelimitter = queryItem.fieldDelimitter
                                || context.fieldDelimitter
                                || this._settings.fieldDelimitter
                                || ':';

      // Pattern to short multiple word delimitters to one
      var wordDelimitterPattern = new RegExp('[' + context.wordDelimitter + ']+', 'g');

      // Pattern to trim the line in start and end without word delimitter,
      // because it causes extra array element while splitting line for words
      var wordDelimitterPatternTrimEnds = new RegExp('^'
                                                      + context.wordDelimitter
                                                      + '+|'
                                                      + context.wordDelimitter
                                                      + '+$', 'g');

      // Get the pattern for context delimitter and
      // find the line number by searching from start of file
      var fieldPattern = new RegExp(queryItem.field + ' *' + context.fieldDelimitter + ' *');

      // EXP after resolving the nested query field must be search with the previous result
      if (queryItem.result) {
        // TODO replace hard coded first pattern match with nth from context
        var startIndex = queryItem.result.search(fieldPattern)
                          + queryItem.result.match(fieldPattern)[0].length;
        var endIndex = S(queryItem.result).indexOf(context.wordDelimitter, startIndex);
        if (-1 == endIndex) {
          endIndex = S(queryItem.result).length - 1;
        }

        queryItem.result = S(queryItem.result).substring(startIndex, endIndex).s.trim();
      }

      // TODO replace hard coded first pattern match with nth from context
      var lineNumber = this._findLineNumber(fieldPattern, 0, context);
      context.lineNumber = lineNumber;

      // Get the line and clean unwanted elements like duplicate delimitters
      var line = this._lines[lineNumber];
      if (line == undefined) {
        return 'field value not found by parser';
      }

      line = line.replace(wordDelimitterPattern, context.wordDelimitter)
                  .replace(wordDelimitterPatternTrimEnds, '');

      // Finds the start index of field value by adding field pattern + field pattern length
      // TODO replace hard coded first match within line with nth instance within line
      var startIndex = line.search(fieldPattern) + line.match(fieldPattern)[0].length;

      // Find the end index by searching the word after start index
      // If end index not found then lenth of line will be the end index
      var endIndex = S(line).indexOf(context.wordDelimitter, startIndex);
      if (-1 == endIndex) {
        endIndex = S(line).length;
      }

      // Return the result after cutting the string with start index and end index
      queryItem.result = S(line).substring(startIndex, endIndex).s.trim();
      return queryItem.result;
    },

    // Get the field value from text
    _subString: function _subString(queryItem, context) {
      var startIndex = 0;
      var endIndex = 0;

      // If the start index inside the substring is another query
      if (isNaN(queryItem.subString.startIndex)) {

        // If the start index is not resolved already then resolve
        // if already resolved then assign start index as that result
        if (!queryItem.subString.startIndex.result) {
          startIndex = this._resolveQuery(queryItem.subString.startIndex, context).result;
        } else {
          startIndex = queryItem.subString.startIndex.result;
        }
      }

      // If the end index inside the substring is another query
      if (isNaN(queryItem.subString.endIndex)) {

        // If the end index is not resolved already then resolve
        // if already resolved then assign end index as that result
        if (!queryItem.subString.endIndex.result) {
          endIndex = this._resolveQuery(queryItem.subString.endIndex, context).result;
        } else {
          endIndex = queryItem.subString.endIndex.result;
        }
      }

      // Get the line using context line number
      var line = this._lines[context.lineNumber];

      // Return the result after cutting the string with start index and end index
      queryItem.subString.result = S(line).substring(startIndex, endIndex).s.trim();
      queryItem.result = queryItem.subString.result;
      return queryItem.result;
    },

    _section: function _section(queryItem, context) {
      // Sets the context with first from query item
      // if not then from settings if not then from defaults
      context.wordDelimitter = queryItem.wordDelimitter
                                || context.wordDelimitter
                                || this._settings.wordDelimitter
                                || ' ';
      context.fieldDelimitter = queryItem.fieldDelimitter
                                || context.fieldDelimitter
                                || this._settings.fieldDelimitter
                                || ':';

      // Pattern to short multiple word delimitters to one
      var wordDelimitterPattern = new RegExp('[' + context.wordDelimitter + ']+', 'g');

      // Pattern to trim the line in start and end without word delimitter,
      // because it causes extra array element while splitting line for words
      var wordDelimitterPatternTrimEnds = new RegExp('^'
                                                      + context.wordDelimitter
                                                      + '+|'
                                                      + context.wordDelimitter
                                                      + '+$', 'g');

      // Find the section line by searching from start of file
      var sectionPattern = new RegExp(queryItem.section);
      var sectionLineNumber = this._findLineNumber(sectionPattern, 0, context);
      context.lineNumber = sectionLineNumber;

      // TODO Header value in query must be a text if not then resolve that first
      if (typeof queryItem.header == 'string') {

        // Find the header line with header pattern
        var headerPattern = new RegExp(queryItem.header);
        var headerLineNumber = this._findLineNumber(headerPattern, sectionLineNumber, context);
        if (headerLineNumber) {

          // If the header line number is far away from the section line number
          // then search for next section line
          // TODO Difference between the header and section is hard coded as 2, must be a variable
          while (headerLineNumber != -1 && (headerLineNumber - sectionLineNumber) > 2) {
            var sectionLineNumber = this._findLineNumber(sectionPattern,
                                                          sectionLineNumber + 1,
                                                          context);
            context.lineNumber = sectionLineNumber;
            headerLineNumber = this._findLineNumber(headerPattern, sectionLineNumber, context);
          }

          context.lineNumber = headerLineNumber;
          var headerLine = this._lines[context.lineNumber];
          headerLine = headerLine.replace(wordDelimitterPattern, context.wordDelimitter)
                                  .replace(wordDelimitterPatternTrimEnds, '');
          var headerLineSplit = headerLine.split(context.wordDelimitter);

          // Get the position index of header from the last of line split array
          var headerPositionFromEnd = (headerLineSplit.length - 1)
                                      - headerLineSplit.indexOf(queryItem.header);
        }

        var valueLineNumber = headerLineNumber + S(queryItem.offset).toInt();
        var valueLine = this._lines[valueLineNumber];
        valueLine = valueLine.replace(wordDelimitterPattern, context.wordDelimitter)
                              .replace(wordDelimitterPatternTrimEnds, '');
        var valueLineSplit = valueLine.split(context.wordDelimitter);

        // Get the value using header position from end
        var valuePositionFromEnd = (valueLineSplit.length - 1) - headerPositionFromEnd;
        var value = valueLineSplit[valuePositionFromEnd];
        queryItem.result = value;
        return queryItem.result;
      }
    },

    _indexOf: function _indexOf(queryItem, context) {
      // Index of value must be a string, and expects a line number in context
      // TODO handle nested queries too
      var line = this._lines[context.lineNumber];
      queryItem.result = S(line).indexOf(queryItem.indexOf);
      return queryItem.result;
    },

    // Resolves query for each item and contains context for each query
    _resolveQuery: function _resolveQuery(queryItem, context) {

      // Sets the context with first from query item
      // if not then from settings if not then from defaults
      context.wordDelimitter = queryItem.wordDelimitter
                                || context.wordDelimitter
                                || this._settings.wordDelimitter
                                || ' ';
      context.fieldDelimitter = queryItem.fieldDelimitter
                                || context.fieldDelimitter
                                || this._settings.fieldDelimitter
                                || ':';

      // If query item has line number key
      if (queryItem.lineNumber) {
        context.lineNumber = this._lineNumber(queryItem, context);
      }

      // If query item has word number key
      if (queryItem.wordNumber) {
        queryItem.result = this._wordNumber(queryItem, context);
      }

      // If query item has field key
      if (queryItem.field) {
        queryItem.result = this._field(queryItem, context);
      }

      // If query item has field key
      if (queryItem.subString) {
        queryItem.result = this._subString(queryItem, context);
      }

      // If query item has section key
      if (queryItem.section) {
        queryItem.result = this._section(queryItem, context);
      }

      // If query item has indexOf key
      if (queryItem.indexOf) {
        queryItem.result = this._indexOf(queryItem, context);
      }

      /*for(var i=0;i<Object.keys(queryItem).length;i++){
        if('object' == typeof queryItem[i]){
          this._resolveQuery(queryItem[i], {});
        }
        }*/

      return queryItem;
    },
  };
}

module.exports = TextParserGenie;
