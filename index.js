const { h, app } = window.hyperapp;


// get rough location
var latitude;
var longitude;

fetch("https://api.ipdata.co/?api-key=2f0353b0045ebc7d4df7a8152b6e010183f19721f232588ef1f5a7a0").then(function(response) {
  return response.json();
}).then(data => {
  latitude = data.latitude;
  longitude = data.longitude;
});
// if cannot get latitude and longitude, use default value, Shanghai
if (!latitude) {
  latitude = 31.224361;
  longitude = 121.469170;
}

// draw Mountains
const randPlusMinus = n => Math.random() * n - n/2;

const mkMidpoints = points => {
  const newPoints = [];
  for (let i = 0; i < points.length*2 -1; i++) {
    if (i % 2 === 0) {
      newPoints[i] = points[i/2];   // eg. newPoints[10] = points[5]
    } else {
      newPoints[i] = (points[(i-1)/2] + points[(i+1)/2]) / 2 + randPlusMinus(50/points.length);
    }                   // eg. newPoints[11] = avg(points[5]+points[6]) + 
  }
  return newPoints;
}

class PointGenerator {
  constructor() {
    this.points = this.generatePoints();
    this.newPointSize = this.points.length;
    this.sliceSize = this.newPointSize * 3;
    this.slice = [0, this.sliceSize];
    for (let i = 0; i < 3; i++) {
      this.points = this.points.concat(this.generatePoints(this.points[this.points.length - 1]));
    }
    this.visiblePoints = this.points.slice(...this.slice);
  }
  generatePoints(start) {
    const iterations = 8;
    let points = [start || Math.random() * 15 + 30, Math.random() * 15 + 30];
    for (let i = 0; i < iterations; i++) {
      points = mkMidpoints(points);
    }
    return points;
  }
  tick() {
    if (this.slice[0] >= this.newPointsSize) {
      this.slice = [0, this.sliceSize];
      this.points = state.points.map(points => [
        ...points.slice(this.newPointsSize),
        ...this.generatePoints(this.points[this.points.length-1]),
      ]);
    } else {
      this.slice = this.slice.map(x => x + 1); 
    }
    this.visiblePoints = this.points.slice(...this.slice);
    return this;
  }
}


const arrayToD = points => {
  const parts = ['M', '-125,200'];
  for (const i in points) {
    parts.push(`${i * 350 / (points.length - 1) - 125},${points[i] + 25}`);
  }
  //console.log(parts)
  parts.push([225,200]);

  return parts.join(' ');
};

// product SVG Path DOM 
const mountainRange = (fill, points) => h('path', {fill, d: arrayToD(points)}, []);

const generateMountainRanges = (points, hue) => {
  const sunRatio = getSunRatio();
  const night = sunRatio < 0 || sunRatio > 1;
  const [sMin, sMax] = [50, 80];
  const [lMin, lMax] = night ? [0, 15] : [30, 50];
  const ranges = [];
  for (const i in points) {
    const s = sMin + (sMax - sMin) / points.length * i;
    const l = lMax - (lMax - lMin) / points.length * i * (night?-1:1);
    ranges.push(mountainRange(`hsl(${hue}, ${s}%, ${l}%)`, points[i].map(p=>p+i*2)));
  }
  return ranges;
};



function dayOfYear() {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 0);
    var diff = now - start;
    var oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

function hourOfDay() {
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // console.log(now, start)
    var diff = now - start;
    var oneHour = 1000 * 60 * 60;
    return diff / oneHour;
}

// cribbed from https://gist.github.com/Tafkas/4742250
function computeSunrise(day, sunrise) {

    /*Sunrise/Sunset Algorithm taken from
        http://williams.best.vwh.net/sunrise_sunset_algorithm.htm
        inputs:
            day = day of the year
            sunrise = true for sunrise, false for sunset
        output:
            time of sunrise/sunset in hours */

    // var longitude = 121.469170;
    // var latitude = 38.908975;
    var zenith = 90.83333333333333;
    var D2R = Math.PI / 180;
    var R2D = 180 / Math.PI;

    // convert the longitude to hour value and calculate an approximate time
    var lnHour = longitude / 15;
    var t;
    if (sunrise) {
        t = day + ((6 - lnHour) / 24);
    } else {
        t = day + ((18 - lnHour) / 24);
    };

    //calculate the Sun's mean anomaly
    M = (0.9856 * t) - 3.289;

    //calculate the Sun's true longitude
    L = M + (1.916 * Math.sin(M * D2R)) + (0.020 * Math.sin(2 * M * D2R)) + 282.634;
    if (L > 360) {
        L = L - 360;
    } else if (L < 0) {
        L = L + 360;
    };

    //calculate the Sun's right ascension
    RA = R2D * Math.atan(0.91764 * Math.tan(L * D2R));
    if (RA > 360) {
        RA = RA - 360;
    } else if (RA < 0) {
        RA = RA + 360;
    };

    //right ascension value needs to be in the same qua
    Lquadrant = (Math.floor(L / (90))) * 90;
    RAquadrant = (Math.floor(RA / 90)) * 90;
    RA = RA + (Lquadrant - RAquadrant);

    //right ascension value needs to be converted into hours
    RA = RA / 15;

    //calculate the Sun's declination
    sinDec = 0.39782 * Math.sin(L * D2R);
    cosDec = Math.cos(Math.asin(sinDec));

    //calculate the Sun's local hour angle
    cosH = (Math.cos(zenith * D2R) - (sinDec * Math.sin(latitude * D2R))) / (cosDec * Math.cos(latitude * D2R));
    var H;
    if (sunrise) {
        H = 360 - R2D * Math.acos(cosH)
    } else {
        H = R2D * Math.acos(cosH)
    };
    H = H / 15;

    //calculate local mean time of rising/setting
    T = H + RA - (0.06571 * t) - 6.622;

    //adjust back to UTC
    UT = T - lnHour;
    if (UT > 24) {
        UT = UT - 24;
    } else if (UT < 0) {
        UT = UT + 24;
    }
    // deduce utc offset from output of Date()
    const [, plusMinus, offset] = new Date().toString().match(/GMT(.)?(\d\d\d\d)/);
    const UTC_OFFSET = (plusMinus === '-' ? -1 : 1) * Number(offset) / 100;
    //convert UT value to local time zone of latitude/longitude
    localT = UT + UTC_OFFSET;

    //convert to Milliseconds
    return localT * 3600 * 1000;
}

function getSunRatio() {
  const hour = hourOfDay();
  const sunrise = computeSunrise(dayOfYear(), true)  / 1000 / 3600 %24;
  const sunset = computeSunrise(dayOfYear(), false) / 1000 / 3600 %24;
  
  // sun progress during day a on scale [0, 1]
  return (hour - sunrise) / (sunset - sunrise);
}

// sky lights up and lights down
const nightLumOffset = () => {
    const sunRatio = getSunRatio()
    // lights up
    if (sunRatio >= -0.025 && sunRatio <= 0.15)
        return (1-(sunRatio+0.025)/(0.025+0.15))*40;
    // lights down
    else if (sunRatio >=0.925 && sunRatio <= 1.04)
        return (sunRatio-0.925)/(1.04-0.925)*40;
    else
        return (sunRatio < 0 || sunRatio > 1)? 40:0;
};


// moon
function getMoonPosition() {
  var R2D = 180 / Math.PI;
  var now = new Date();
  azimuth = SunCalc.getMoonPosition( now, latitude, longitude).azimuth;
  ratio = azimuth * R2D;
  return (ratio-90)/180;
}

function getMoonPhase() {
  var now = new Date();
  return SunCalc.getMoonIllumination(now).phase;
}


const sky = (hue) => h('rect', {x: -125, y: -100, height: 300, width: 350, fill: `hsl(${hue}, 35%, ${89 - nightLumOffset()*2}%)`}, []);
const sun = (hue) => {
  const sunRatio = getSunRatio();
  // console.log(sunRatio)
  // sun height, just a simple parabola. no need to flip or anything bc svg coords are backwards anyway
  const sunHeight = 10 + Math.pow((sunRatio - .5) * 100 /*scale to [-100, 100]*/, 2) / 50;
  // console.log(sunHeight);
  return h('circle', {cx: sunRatio * 100, cy: sunHeight, r: 10, fill: `hsl(${hue}, 35%, 97%)`}, [])
};
const moon = (hue) =>{
  const moonRatio = getMoonPosition();
  const moonHeight = 10 + Math.pow((moonRatio - .5) * 100, 2) / 50;

  return h('circle', {cx: moonRatio * 100, cy: moonHeight, r: 5, fill: `hsl(${hue}, 35%, 89%)` }, []);
  
}
const moonShadow = (hue) => {
  const shadowOffset = getMoonPhase() * 10;
  const cx = getMoonPosition()*100-shadowOffset;
  const cy = 10 + Math.pow((getMoonPosition() - .5) * 100, 2) / 50;
  return h('circle', {cx: cx, cy: cy, r: 5, fill: `hsl(${hue}, 35%, ${89 - nightLumOffset()*2}%)` }, []);
}





const view = (state, actions) => {
  return h('div', {id: 'view'}, [
    h('svg', {
      viewBox: '0 0 100 100',
      oncreate: () => setInterval(actions.generatePoints, 180*1000),
     }, [
      sky(state.hue),
      moon(state.hue),
      moonShadow(state.hue),
      sun(state.hue),
      ...generateMountainRanges(state.points.map(points => points.visiblePoints), state.hue),
    ]),
  ]);
};

const state = {
  points: new Array(8).fill(0).map(() => new PointGenerator()),
  hue: 206,
};

const actions = {
  generatePoints: n => state => ({
    points: state.points.map(points => points.tick()),
  }),
};

app(state, actions, view, document.getElementById('app'));
