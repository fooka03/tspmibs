const readline = require('linebyline');
const fs = require('fs');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var points = [];

try {
    points = require('./points.json');
}
catch (e) {
    // ignore
    console.log('preexisting points file not found, creating new one');
}

console.log('Please enter the map coordinates in the following format:');
console.log('<longitude degrees> <longitude minutes> <N|S> <latitude degrees> <latitude minutes> <E|W>');

var readRecursive = function() {
    rl.question('What are the coordinates? ', (answer) => {
        if (!answer) {
            console.log('Writing out points file');
	    saveFile();
	    return rl.close();
        }
	else {
            console.log('input received, please enter the next or hit enter to finish input');
	    line = answer.split(' ');
	    if (line.length === 6 && (line[2].toUpperCase() === 'N' || line[2].toUpperCase() === 'S') && (line[5].toUpperCase() === 'E' || line[5].toUpperCase() === 'W')) {
                points.push({
                    latDeg: line[0],
		    latMin: line[1],
		    latQuad: line[2].toUpperCase(),
		    longDeg: line[3],
		    longMin: line[4],
		    longQuad: line[5].toUpperCase()
                });
            }
	    else {
                console.log('Error parsing input, please ensure it follows the format:');
		console.log('<longitude degrees> <longitude minutes> <N|S> <latitude degrees> <latitude minutes> <E|W>');
            }
	    readRecursive();
        }
    });
}

function saveFile() {
    fs.writeFileSync('./points.json', JSON.stringify(points));
}

readRecursive();
