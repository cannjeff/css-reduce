var css = require('css'),
	fs = require('fs'),
	path = require('path'),
	chalk = require('chalk'),
	_ = require('underscore'),
	util = require('util');

// var filePath = 'tests/test1.css';
var filePath = '/Users/jeff/Documents/dev/cpsb/src/main/webapp/css/cpsb.css';
var code = fs.readFileSync(filePath) + '';
var ast = css.parse(code, { source: true });

// console.log(util.inspect(ast, { depth: null }));

function bytesToSize (bytes) {
	var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	if (bytes == 0) return '0 Bytes';
	var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
	return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

var map = {};
_.forEach(ast.stylesheet.rules, function ( rule ) {
	if (map[ rule.type ]) {
		map[ rule.type ].counter++;
		map[ rule.type ].rules.push(rule);
	} else {
		map[ rule.type ] = {
			counter: 1,
			rules: [ rule ]
		};
	}
});

var ruleMap = {};
_.forEach(map.rule.rules, function ( rule ) {
	if (ruleMap[ rule.selectors[0] ]) {
		ruleMap[ rule.selectors[0] ].counter++;
		ruleMap[ rule.selectors[0] ].rules.push(rule);
	} else {
		ruleMap[ rule.selectors[0] ] = {
			counter: 1,
			rules: [ rule ]
		};
	}
});

var unusedDecs = [];
_.forEach(ruleMap, function ( rule ) {
	rule._styles = {};

	_.forEach(rule.rules, function ( _rule) {
		var dupLogs = [];

		_.forEach(_rule.declarations, function ( dec ) {
			if (dec.property === undefined) return; // { type: comment } is returned undefined
			// console.log('declaration', dec.position);
			if (!rule._styles[ dec.property ]) {
				rule._styles[ dec.property ] = dec;
			} else {
				// console.log('---->', rule);
				/* Style being overwritten */
				dupLogs.push([
					'    ',
					chalk.magenta(dec.property),
					': ',
					chalk.red(rule._styles[dec.property].value),
					'(',
					chalk.white(rule._styles[dec.property].position.start.line),
					',',
					chalk.white(rule._styles[dec.property].position.start.column),
					')  ',
					chalk.blue(dec.value),
					'(',
					chalk.white(dec.position.start.line) ,
					',',
					chalk.white(dec.position.start.column),
					')  '
					].join(''));

				// dupLogs.push(' overwriting ' + chalk.magenta(dec.property) + ':');
				// dupLogs.push('     old value ' + chalk.red(rule._styles[dec.property].value) + ' on line ' + chalk.white(rule._styles[dec.property].position.start.line) + ' column ' + chalk.white(rule._styles[dec.property].position.start.column));
				// dupLogs.push('     new value ' + chalk.blue(dec.value) + ' on line ' + chalk.white(dec.position.start.line) + ' column ' + chalk.white(dec.position.start.column));

				unusedDecs.push(dec.property + ': ' + rule._styles[dec.property].value);

				rule._styles[ dec.property ] = dec;
			}
		});

		if (dupLogs.length > 0) {
			if (_rule.declarations && _rule.declarations.length > 1) {
				console.log(_rule.selectors.join(', '));
			}
			var len = dupLogs.length;
			for (var i = 0; i < len; i++) {
				console.log(dupLogs[i]);
			}
		}
	});
});

/* Determine original file size */
var orgStat = fs.statSync(filePath),
	originalSize = bytesToSize(orgStat['size']);

/* Determine wasted file size - ideally just a diff in size from statSync output, but faked for now */
var tmpDir = '/tmp';
var tmpFullDir = path.join(process.cwd() + tmpDir);
if (!fs.existsSync(tmpFullDir)) {
	fs.mkdirSync(tmpFullDir);
}

var calcFilePath = path.join(tmpFullDir, '_for_calc.txt');
var f = fs.stat(calcFilePath, function ( error, stats ) {
	if (!error) {
		/* File exists, kill it */
		fs.unlinkSync(calcFilePath);
	}

	var fd = fs.openSync(calcFilePath, 'w');
	fs.writeSync(fd, unusedDecs.join(''));
	var stats = fs.fstatSync(fd),
		wastedSize = bytesToSize(stats['size']);

	console.log('Wasted', wastedSize, '/', originalSize);
});

/* Reduced file creation */

