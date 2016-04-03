require('./util.js');
var json2csv = require('json2csv');
const fs = require('fs');
var points = require('./points.json');
var xMax = 5120;
var yMax = 4096;
var xCent = 1323;
var yCent = 1624;
var POPULATION_SIZE = 30;
var ELITE_RATE = 0.3;
var CROSSOVER_PROBABILITY = 0.9;
var MUTATION_PROBABILITY  = 0.01;
var UNCHANGED_GENS = 0;
var mutationTimes = 0;
var bestValue = undefined;
var best = [];
var currentGeneration = 0;
var currentBest;
var population = [];
var values = new Array(POPULATION_SIZE);
var fitnessValues = new Array(POPULATION_SIZE);
var roulette = new Array(POPULATION_SIZE);

var convpoints = [];
points.forEach(convertToCoords);
var distance = countDistances();
for (var i=0; i<POPULATION_SIZE; i++) {
    population.push(randomInd(convpoints.length));
}
setBestValue();

while (UNCHANGED_GENS < 100000) {
    GANextGeneration();
}

var res = printResults();
saveResults(res);

function printResults() {
    var result = [];
    result.push(convpoints[0]);
    for (var i = 1; i < convpoints.length; i++) {
        result.push(convpoints[best[i]]);
    }
    console.log("This order of points yields the best path after " + currentGeneration + " generations");
    console.log(result);
    return result;
}

function saveResults(res) {
    fs.writeFileSync('./result.json', JSON.stringify(res));
    var fields = ['xCoord', 'yCoord'];
    json2csv({ data: res, fields: fields }, function(err, csv) {
        if (err) console.log(err);
        fs.writeFileSync('./result.csv', csv);
    });
    var mapfile = "3\n";
    for (var i = 0; i < res.length; i++) {
        mapfile += "+treasure: " + res[i].xCoord + " " + res[i].yCoord + " 0 [MIB]\n"
    }
    fs.writeFileSync('./Mibs.MAP', mapfile);
}

function convertToCoords(point, index, arr) {
    var result = {};
    var longDeg = Number(point.longDeg) + (Number(point.longMin) / 60);
    var latDeg = Number(point.latDeg) + (Number(point.latMin) / 60);
    // Normalize to SE Quad
    if (point.longQuad === 'W') {
        longDeg = 180 + (180 - longDeg);
    }
    if (point.latQuad === 'N') {
        latDeg = 180 + (180 - latDeg);
    }
    var xCoord = longDeg * xMax / 360 + xCent;
    xCoord %= xMax;
    var yCoord = latDeg * yMax / 360 + yCent;
    yCoord %= yMax;
    result.xCoord = Math.round(xCoord);
    result.yCoord = Math.round(yCoord);
    convpoints.push(result);
}

function distanceFormula(point1, point2) {
    var xDist = Math.abs(point2.xCoord - point1.xCoord);
    xDist = Math.min(xDist, xMax - xDist);
    var yDist = Math.abs(point2.yCoord - point1.yCoord);
    yDist = Math.min(yDist, yMax - yDist);
    return Math.sqrt(Math.pow(xDist, 2) + Math.pow(yDist, 2));
}

function countDistances() {
    var length = convpoints.length;
    var dist = new Array(length);
    for (var i = 0; i < length; i++) {
        dist[i] = new Array(length);
        for (var j = 0; j < length; j++) {
            dist[i][j] = ~~distanceFormula(convpoints[i], convpoints[j]);
        }
    }
    return dist;
}

function setBestValue() {
    for(var i=0; i<population.length; i++) {
        values[i] = evaluate(population[i]);
    }
    currentBest = getCurrentBest();
    if(bestValue === undefined || bestValue > currentBest.bestValue) {
        best = population[currentBest.bestPosition].clone();
        bestValue = currentBest.bestValue;
        UNCHANGED_GENS = 0;
    } else {
        UNCHANGED_GENS += 1;
    }
}

function getCurrentBest() {
    var bestP = 0,
    currentBestValue = values[0];

    for(var i=1; i<population.length; i++) {
        if(values[i] < currentBestValue) {
            currentBestValue = values[i];
            bestP = i;
        }
    }
    return {
        bestPosition : bestP
      , bestValue    : currentBestValue
   }
}

function randomInd(n) {
    var a = [];
    for(var i=0; i<n; i++) {
        a.push(i);
    }
    return a.shuffle();
}

function GANextGeneration() {
    currentGeneration++;
    selection();
    crossover();
    mutation();
    setBestValue();
}

function selection() {
    var parents = new Array();
    var initnum = 4;
    parents.push(population[currentBest.bestPosition]);
    parents.push(doMutate(best.clone()));
    parents.push(pushMutate(best.clone()));
    parents.push(best.clone());

    setRoulette();
    for(var i=initnum; i<POPULATION_SIZE; i++) {
        parents.push(population[wheelOut(Math.random())]);
    }
    population = parents;
}

function crossover() {
    var queue = new Array();
    for(var i=0; i<POPULATION_SIZE; i++) {
        if( Math.random() < CROSSOVER_PROBABILITY ) {
            queue.push(i);
        }
    } 
    queue.shuffle();
    for(var i=0, j=queue.length-1; i<j; i+=2) {
        doCrossover(queue[i], queue[i+1]);
    }
}

function mutation() {
    for(var i=0; i<POPULATION_SIZE; i++) {
        if(Math.random() < MUTATION_PROBABILITY) {
            if(Math.random() > 0.5) {
                population[i] = pushMutate(population[i]);
            } else {
                population[i] = doMutate(population[i]);
            }
            i--;
        }
    }
}

function doMutate(seq) {
    mutationTimes++;
    // m and n refers to the actual index in the array
    // m range from 0 to length-2, n range from 2...length-m
    do {
        m = randomNumber(seq.length - 2);
        n = randomNumber(seq.length);
    } while (m>=n)

    for(var i=0, j=(n-m+1)>>1; i<j; i++) {
        seq.swap(m+i, n-i);
    }
    return seq;
}

function pushMutate(seq) {
    mutationTimes++;
    var m,n;
    do {
        m = randomNumber(seq.length>>1);
        n = randomNumber(seq.length);
    } while (m>=n)

    var s1 = seq.slice(0,m);
    var s2 = seq.slice(m,n)
    var s3 = seq.slice(n,seq.length);
    return s2.concat(s1).concat(s3).clone();
}

function setRoulette() {
    //calculate all the fitness
    for(var i=0; i<values.length; i++) { fitnessValues[i] = 1.0/values[i]; }
    //set the roulette
    var sum = 0;
    for(var i=0; i<fitnessValues.length; i++) { sum += fitnessValues[i]; }
    for(var i=0; i<roulette.length; i++) { roulette[i] = fitnessValues[i]/sum; }
    for(var i=1; i<roulette.length; i++) { roulette[i] += roulette[i-1]; }
}

function wheelOut(rand) {
    var i;
    for(i=0; i<roulette.length; i++) {
        if( rand <= roulette[i] ) {
            return i;
        }
    }
}

function doCrossover(x, y) {
    child1 = getChild('next', x, y);
    child2 = getChild('previous', x, y);
    population[x] = child1;
    population[y] = child2;
}

function getChild(fun, x, y) {
    solution = new Array();
    var px = population[x].clone();
    var py = population[y].clone();
    var dx,dy;
    var c = px[randomNumber(px.length)];
    solution.push(c);
    while(px.length > 1) {
        dx = px[fun](px.indexOf(c));
        dy = py[fun](py.indexOf(c));
        px.deleteByValue(c);
        py.deleteByValue(c);
        c = distance[c][dx] < distance[c][dy] ? dx : dy;
        solution.push(c);
    }
    return solution;
}

function evaluate(ind) {
    var sum = distance[ind[0]][ind[ind.length - 1]];
    for(var i=1; i<ind.length; i++) {
        sum += distance[ind[i]][ind[i-1]];
    }
    return sum;
}

function randomNumber(boundary) {
    return parseInt(Math.random() * boundary);
}
