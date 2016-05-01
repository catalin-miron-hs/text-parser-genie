'use strict'

const fs = require('fs');
var S = require('string');

function TextParserGenie(){
	/*var settings = {};
	var lines = [];
	var results = [];*/
}

TextParserGenie.prototype.preParse = function(settings){
	TextParserGenie.settings = settings;
	TextParserGenie.lines = [];
	TextParserGenie.results = [];
}

TextParserGenie.prototype.parse = function(query, callBack){
	fs.readFile(TextParserGenie.settings.filePath, 'utf-8', function (err, data) {
	    if (err) {
	        return console.log("Unable to read file " + err);
	    }
	    lineSplitter(data);
	    for(var i=0;i<Object.keys(query).length;i++){
	    	var result = resolveQuery(query[i], {});
	    	TextParserGenie.results.push(result);
	    }
	    callBack(null, TextParserGenie.results);
	});
}

function resolveQuery(queryItem, context){

	context.wordDelimitter = queryItem.wordDelimitter || TextParserGenie.settings.wordDelimitter || '/t';
	context.fieldDelimitter = queryItem.fieldDelimitter || TextParserGenie.settings.fieldDelimitter || ':';

	// lineNumber
	if(queryItem.lineNumber){
		if(isNaN(queryItem.lineNumber)){
			resolveQuery(queryItem.lineNumber, context);
		}
		context.lineNumber = queryItem.lineNumber;
	} else {
		if(undefined == context.lineNumber){
			context.lineNumber = 1;
		}
	}

	// wordNumber
	if(queryItem.wordNumber){
		if(isNaN(queryItem.wordNumber)){
			resolveQuery(queryItem.wordNumber, context);
		}
		var line = TextParserGenie.lines[context.lineNumber];
		line = S(line).replaceAll('/s/'+context.wordDelimitter+'+/', context.wordDelimitter).s;
		var words = line.split(context.wordDelimitter);
		words.unshift("");
		queryItem.result = words[queryItem.wordNumber];
	}

	// field
	if(queryItem.field){
		var wordDelimitterPattern = new RegExp('['+context.wordDelimitter+']+','g');
		var wordDelimitterPatternTrimEnds = new RegExp('^'+context.wordDelimitter+'+|'+context.wordDelimitter+'+$','g');
		if(queryItem.result){
			// TODO replace hard coded first pattern match with nth from context
			var startIndex = queryItem.result.search(pattern) + queryItem.result.match(pattern)[0].length;
			var endIndex = S(queryItem.result).indexOf(context.wordDelimitter, startIndex);
			if(-1 == endIndex){
				endIndex = S(queryItem.result).length-1;
			}
			queryItem.result = S(queryItem.result).substring(startIndex, endIndex).s.trim();
		}

		var pattern = new RegExp(queryItem.field+' *'+context.fieldDelimitter+' *');
		var lineNumber = findLineNumber(pattern, 0, context.wordDelimitter, wordDelimitterPattern, wordDelimitterPatternTrimEnds);
		context.lineNumber = lineNumber;
		var line = TextParserGenie.lines[lineNumber];
		line = line.replace(wordDelimitterPattern, context.wordDelimitter).replace(wordDelimitterPatternTrimEnds, '');
		// TODO replace hard coded first pattern match with nth from context
		var startIndex = line.search(pattern) + line.match(pattern)[0].length;
		var endIndex = S(line).indexOf(context.wordDelimitter, startIndex);
		if(-1 == endIndex){
			endIndex = S(line).length;
		}
		queryItem.result = S(line).substring(startIndex, endIndex).s.trim();
	}

	// subString
	if(queryItem.subString){
		var startIndex = 0;
		var endIndex = 0;
		if(isNaN(queryItem.subString.startIndex)){
			if(!queryItem.subString.startIndex.result){
				startIndex = resolveQuery(queryItem.subString.startIndex, context).result;
			} else {
				startIndex = queryItem.subString.startIndex.result;
			}
		}
		if(isNaN(queryItem.subString.endIndex)){
			if(!queryItem.subString.endIndex.result){
				endIndex = resolveQuery(queryItem.subString.endIndex, context).result;
			} else {
				endIndex = queryItem.subString.endIndex.result;
			}
		}
		var line = TextParserGenie.lines[context.lineNumber];
		queryItem.subString.result = S(line).substring(startIndex, endIndex).s.trim();
		queryItem.result = queryItem.subString.result;
	}

	// section
	if( queryItem.section ){
		var wordDelimitterPattern = new RegExp('['+context.wordDelimitter+']+','g');
		var wordDelimitterPatternTrimEnds = new RegExp('^'+context.wordDelimitter+'+|'+context.wordDelimitter+'+$','g');
		var sectionPattern = new RegExp(queryItem.section);
		var sectionLineNumber = findLineNumber(sectionPattern, 0, context.wordDelimitter, wordDelimitterPattern, wordDelimitterPatternTrimEnds);
		context.lineNumber = sectionLineNumber;
		if('string' == typeof queryItem.header) {
			var headerPattern = new RegExp(queryItem.header);
			var headerLineNumber = findLineNumber(headerPattern, sectionLineNumber, context.wordDelimitter, wordDelimitterPattern, wordDelimitterPatternTrimEnds);
			if (headerLineNumber) {
				while(headerLineNumber!=-1 && headerLineNumber-sectionLineNumber>2){
					var sectionLineNumber = findLineNumber(sectionPattern, sectionLineNumber+1, context.wordDelimitter, wordDelimitterPattern, wordDelimitterPatternTrimEnds);
					context.lineNumber = sectionLineNumber;
					headerLineNumber = findLineNumber(headerPattern, sectionLineNumber, context.wordDelimitter, wordDelimitterPattern, wordDelimitterPatternTrimEnds);
				}
				context.lineNumber = headerLineNumber;
				var headerLine = TextParserGenie.lines[context.lineNumber];
				headerLine = headerLine.replace(wordDelimitterPattern, context.wordDelimitter).replace(wordDelimitterPatternTrimEnds, '');
				var headerLineSplit = headerLine.split(context.wordDelimitter);
				var headerPositionFromEnd = (headerLineSplit.length-1) - headerLineSplit.indexOf(queryItem.header);
			}
			var valueLineNumber = headerLineNumber + S(queryItem.offset).toInt();
			var valueLine = TextParserGenie.lines[valueLineNumber];
			valueLine = valueLine.replace(wordDelimitterPattern, context.wordDelimitter).replace(wordDelimitterPatternTrimEnds, '');
			var valueLineSplit = valueLine.split(context.wordDelimitter);
			var valuePositionFromEnd = (valueLineSplit.length-1) - headerPositionFromEnd;
			var value = valueLineSplit[valuePositionFromEnd];
			queryItem.result = value;
		}
	}

	// startIndex
	if( queryItem.startIndex && isNaN(queryItem.startIndex) && 'number' != typeof queryItem.startIndex && !queryItem.startIndex.result){
		queryItem.startIndex.result = resolveQuery(queryItem.startIndex, context).result;
	}

	// endIndex
	if( queryItem.endIndex && isNaN(queryItem.endIndex) && 'number' != typeof queryItem.endIndex && !queryItem.endIndex.result ){
		queryItem.endIndex.result = resolveQuery(queryItem.endIndex, context).result;
	}

	// indexOf
	if(queryItem.indexOf){
		var line = TextParserGenie.lines[context.lineNumber];
		queryItem.result = S(line).indexOf(queryItem.indexOf);
	}

	for(var i=0;i<Object.keys(queryItem).length;i++){
		if('object' == typeof queryItem[i]){
			resolveQuery(queryItem[i], {});
		}
    }
	return queryItem;
}

function lineSplitter(lines){
	TextParserGenie.lines = S(lines).lines();
	TextParserGenie.lines.unshift("");
}

function findLineNumber(pattern, startLineNumber, wordDelimitter, wordDelimitterPattern, wordDelimitterPatternTrimEnds){
	for(var lineIterator=startLineNumber; lineIterator<TextParserGenie.lines.length; lineIterator++){
		var line = TextParserGenie.lines[lineIterator];
		if(S(line).isEmpty()){
			continue;
		}
		line = line.replace(wordDelimitterPattern, wordDelimitter).replace(wordDelimitterPatternTrimEnds, '');
		if(pattern.test(line)) {
			return lineIterator;
		}
	}
	return -1;
}

module.exports = new TextParserGenie();