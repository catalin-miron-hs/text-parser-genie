Text Parser Genie
=====================

>Thought we should have a text processing genie which can extract results, from the way we tell to another human.

This can be used to remove the clutter code from string processing like index variables, split arrays from actual code.

It knows the context of query which can be useful to store all index related variables.

------

## Usage
```sh
npm install text-parser-genie --save
```
```javascript
var TextParserGenie = require('text-parser-genie');
var parseOptions = {'file': './sometext.txt', 'wordDelimitter': ' '};
var query = [ {
        'lineNumber': 2,
        'subString': {
            'startIndex': 0,
          'endIndex': {
            'indexOf': 'PROVIDER'
          }
        }
      } ];

TextParserGenie(parseOptions)
  .parse( query, function(err, results, exceptions){
      if (err) {
          console.error(err);
          return;
      }
      if (exceptions) {
          console.warn(exceptions);
      }
    console.log(results);
  }
);
```

------
### QUERY EXAMPLE 1
```
Data:
TOTAL SOMEHEADER OTHERONE CHECK
      12         15       27

Query:
{
  'section' : 'TOTAL',
  'header': 'CHECK',
  'offset': '1'
}

Result:
{
  'section' : 'TOTAL',
  'header': 'CHECK',
  'offset': '1',
  'result': '27'
}
```
------
### QUERY EXAMPLE 2
```
Data:
This is the first line
And this is the sample second line

Query:
{
  'lineNumber' : 2
  'wordNumber' : 5
}

Result:
{
  'lineNumber' : 2
  'wordNumber' : 5
  'result' : 'sample'
}
```
------
### QUERY EXAMPLE 3
```
Data:
This is the first line
And this is the sample second line

Query:
{
  'lineNumber': 2,
  'subString': {
    'startIndex': 0,
    'endIndex': {
      'indexOf': 'sample'
    }
  }
}

Result:
{
  'lineNumber': 2,
  'subString': {
    'startIndex': 0,
    'endIndex': {
      'indexOf': 'sample'
      'result': 17
    }
    'result': 'And this is the'
  }
  'result': 'And this is the'
}
```
-------
### QUERY EXAMPLE 4
```
Data:
This is some text       Report No : 12587456
This is some text too

Query:
{
  'field': 'Report No'
}

Result:
{
  'field': 'Report No',
  'result': '12587456'
}
```

------

### NOTE: This library is not stable now

##### If you like the idea, and willing to contribute give a pull request
###### I am willing to learn best practices, so be a critic for code reviews if you have some free time.
