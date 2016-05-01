var textParserGenie = require('./index');
const fs = require('fs');

var query = [
			{
				'lineNumber': 2,
				'subString': 
							{
								'startIndex': 0,
								'endIndex': 
											{ 
												'indexOf': 'PROVIDER'
											}
							}
			},
			{
				'field': 'CHECK/EFT #'
			},
			{
				'section': 'TOTALS:',
				'header': 'CHECK',
				'offset': '2'
			}
			];

textParserGenie.preParse({'filePath': './test/17225.txt', 'wordDelimitter': ' '});

textParserGenie.parse( 	query,
						function(err, results, exceptions){
							console.log(results);
						}
					);