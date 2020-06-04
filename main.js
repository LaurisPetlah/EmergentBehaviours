// Super light PURPLE
// #e8ebff

// LIGHT PURPLE
// #bca0dc

// MEDIUM PURPLE
// #663a82

// DARK PURPLE
// #3c1361

let c = document.getElementsByTagName("canvas")[0];
let ctx;
let height, width;

let mouseCollisionRadius = 100;
let mouseX = -100, mouseY = -100;


let boids = [];
let boidNumber = 80;
let boidSize = 35

let biggestBoidPack = [];

let globalFOV = 300;
let globalViewDistance = 60;
let globalSpeed = 2;

let seperationMinimum = 40;
let seperationSpeed = 0.05;

let alignmentSpeed = .075;

let cohesionSpeed = .004;

let debug = true;
let debugNear = false;
let flags = {
    lineWidth: 5,
    showBiggestFlock: false,
    showFieldOfView: false,
    wiggle: 0,
    wiggleIntensity: 8,
    wigglePeriod: 2000,
    splashScreen: {
        display: true,
        maxTime: 500,
        timer: 500,
    }
}

function resizeCanvas() {
    // width = c.parentElement.clientWidth;
    // height = c.parentElement.clientHeight;
    // width = document.documentElement.clientWidth;
    // height = document.documentElement.clientHeight;

    width = window.innerWidth;
    height = window.innerHeight;
    c.width = width;
    c.height = height;
    ctx = c.getContext("2d");
    // ctx.canvas.width = width;
    // ctx.canvas.height = height;



    // document.getElementById("numberOfBoids").max = 200
    
}

window.onload = function () {
    window.addEventListener('resize', resizeCanvas, true);
    resizeCanvas();

    document.addEventListener('mousemove', onMouseUpdate, false);
    document.addEventListener('mouseenter', onMouseUpdate, false);
    document.addEventListener("touchstart", onMouseUpdate, false);
    document.addEventListener("touchmove", onMouseUpdate, false);
    document.addEventListener("touchend", function () {
        mouseX = -100;
        mouseY = -100;
    }, false);
    init();
    gameLoop();
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function newBoid(i) {
    return makeBoid(i, [Math.random() * width, Math.random() * height], Math.random() * 360, 3, globalViewDistance, 220);
}

function init() {
    for (let i = 0; i < boidNumber; i++) {
        boids.push(newBoid(i));

    }
    boids[0].selected = true;
}

async function gameLoop() {
    let repetition = 10000
    const msPerFrame = 1000 / 60;
    while (repetition > 0) {

        let startTime = new Date().getTime();
        // resizeCanvas();
        if (boids.length > boidNumber) {
            boids.pop();
        }
        if (boids.length < boidNumber) {
            boids.push(newBoid(boids.length));
        }
        updateBoids();
        // biggestBoidPack = largestBoid();
        draw(msPerFrame);
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillRect(0, 0, width, height);
        // ctx.fillStyle = "rgba(255,0,255,0.1)"
        // ctx.fillRect(25,25,25,25)

        let endTime = new Date().getTime();
        let elapsedTime = endTime - startTime;
        await sleep(msPerFrame - elapsedTime);

    }
}

function draw(t) {
    
    for (const boid of boids) {
        drawBoid(boid, t);
    }
    flags.wiggle += t;

}

function normalizeVector(vector = { x: 1, y: 0 }) {
    const sum = dist(0, 0, vector.x, vector.y);

    let newX = vector.x / sum;
    let newY = vector.y / sum;

    return { x: newX, y: newY };

}

function makeBoid(id = 0, initialPosition = [0, 0], initialDirection = 0, initialSpeed = 10, initialViewDistance = 75, initialFov = 270) {
    let boid = {
        id: id,
        x: initialPosition[0],
        y: initialPosition[1],
        forwardVector: {
            x: Math.cos(toRadians(initialDirection)),
            y: Math.sin(toRadians(initialDirection))
        },
        speed: initialSpeed,
        viewDistance: initialViewDistance,
        fov: initialFov,
        selected: false,
        nearby: [],
        addChangeInVelocity: function (dx, dy) {
            let x = this.forwardVector.x * this.speed;
            let y = this.forwardVector.y * this.speed;
            x += dx;
            y += dy;
            let v = { x: x, y: y };
            this.forwardVector = normalizeVector(v);
            // this.direction = (toDegrees(Math.atan2(y, x)) + 360)%360;
            // this.updateForwardVector();
            // this.updateDirection();
        },
        updateVelocity: function () {
            this.x += this.forwardVector.x * this.speed;
            this.y += this.forwardVector.y * this.speed;
            if (this.selected) {

                // console.log((toDegrees(Math.atan2(this.forwardVector.y,this.forwardVector.x))+360)%360,this.direction);
            }
        },
        getDirectionRadians: function () {
            return (Math.atan2(-this.forwardVector.y, -this.forwardVector.x)) + Math.PI;
        },
        getDirectionDegrees: function () {
            let deg = toDegrees(Math.atan2(this.forwardVector.y, this.forwardVector.x));
            return toDegrees(this.getDirectionRadians());
        }

    };

    return boid;
}

function onMouseUpdate(e) {
    if (e.type == 'touchstart' || e.type == 'touchmove' || e.type == 'touchend' || e.type == 'touchcancel') {
        var touch = e.touches[0] || e.changedTouches[0];
        mouseX = touch.pageX;
        mouseY = touch.pageY;
    } else if (e.type == 'mousedown' || e.type == 'mouseup' || e.type == 'mousemove' || e.type == 'mouseover' || e.type == 'mouseout' || e.type == 'mouseenter' || e.type == 'mouseleave') {
        mouseX = e.clientX;
        mouseY = e.clientY;
    }

}

function updateBoid(boid) {
    boid.fov = globalFOV;
    boid.viewDistance = globalViewDistance;
    boid.speed = globalSpeed;
    boid.updateVelocity();
    boid = keepBoidInBounds(boid);
    nearby = getNearbyBoids(boid);
    boid.nearby = nearby;
    boid = aligmnentMeasure(boid, nearby);
    boid = cohesionMeasure(boid, nearby);
    boid = seperationMeasure(boid, nearby);

    let d = dist(boid.x, boid.y, mouseX, mouseY);
    let deltaX = mouseX - boid.x, deltaY = mouseY - boid.y;
    if (d < mouseCollisionRadius) {
        let delta = mouseCollisionRadius - d;
        let theta = Math.atan2(deltaY, deltaX) + Math.PI;
        let dx = delta * Math.cos(theta);
        let dy = delta * Math.sin(theta);
        boid.addChangeInVelocity(dx * 0.1, dy * 0.1);
    }


    return boid;

}

function dotProduct(vector1, vector2) {
    return vector1.x * vector2.x + vector1.y * vector2.y;
}


function getNearbyBoids(boid) {
    nearby = [];
    for (const b of boids) {
        if (b.id == boid.id) {
            continue;
        }
        let d = dist(boid.x, boid.y, b.x, b.y);
        if (d < boid.viewDistance) {
        }
        else {
            continue;
        }

        let dx = b.x - boid.x, dy = b.y - boid.y;
        // MAKE THE ANGLE BETWEEN 2 VECTORS CALCULATION HERE
        let dot = dotProduct(boid.forwardVector, { x: dx, y: dy });
        let magnitude = dist(0, 0, dx, dy);
        let cosTheta = dot / magnitude;
        let theta = Math.acos(cosTheta);


        // let angle = Math.abs(dir - relDir) % 180;
        let angle = toDegrees(theta);

        if (angle <= boid.fov / 2) {
            if (debug && boid.selected) {
                // console.log(Math.floor(dir), Math.floor(relDir), Math.floor(Math.abs(dir - relDir) % 180), Math.floor(Math.abs(dir - relDir) % 180) < boid.fov/2);
                ctx.beginPath();
                ctx.moveTo(boid.x, boid.y);
                ctx.lineTo(b.x, b.y);
                ctx.closePath()
                ctx.strokeStyle = "#ffffff";
                // ctx.stroke();

            }

            nearby.push(b);
        }


    }
    if (boid.selected) {
        // console.log(nearby);
    }
    return nearby;
}

function dist(myX, myY, targetX, targetY) {
    return Math.sqrt(Math.pow(myX - targetX, 2) + Math.pow(myY - targetY, 2));
}

function seperationMeasure(boid, nearby) {
    let deltax = 0, deltay = 0;
    if (debug && boid.selected && false) {

        ctx.beginPath();
        ctx.ellipse(boid.x, boid.y, seperationMinimum, seperationMinimum, 0, 0, Math.PI * 2)
        ctx.closePath();
        ctx.stroke();
    }
    for (const b of nearby) {
        let d = dist(boid.x, boid.y, b.x, b.y);
        let deltaX = b.x - boid.x, deltaY = b.y - boid.y;
        if (d < seperationMinimum) {
            let bDist = dist(boid.x, boid.y, b.x, b.y);
            let delta = seperationMinimum - bDist;
            let theta = Math.atan2(deltaY, deltaX) + Math.PI;
            // let dx = seperationMinimum - Math.abs(deltaX);
            // let dy = seperationMinimum - Math.abs(deltaY);
            let dx = delta * Math.cos(theta);
            let dy = delta * Math.sin(theta);
            // deltax += dx*0.1;
            // deltay += dy*0.1;
            boid.addChangeInVelocity(dx * seperationSpeed, dy * seperationSpeed);
        }

    }
    return boid;

}

function aligmnentMeasure(boid, nearby) {
    let dx = 0, dy = 0;
    for (const b of nearby) {
        boid.addChangeInVelocity(b.forwardVector.x * alignmentSpeed, b.forwardVector.y * alignmentSpeed);
    }
    return boid;
}

function cohesionMeasure(boid, nearby) {
    let v = { x: 0, y: 0 };
    let numOfNearby = nearby.length;
    if (numOfNearby <= 0) {
        return boid;
    }
    for (const b of nearby) {
        v.x += b.x;
        v.y += b.y;
    }
    v.x = v.x / numOfNearby - boid.x;
    v.y = v.y / numOfNearby - boid.y;
    boid.addChangeInVelocity(v.x * cohesionSpeed, v.y * cohesionSpeed);
    return boid;
}

function keepBoidInBounds(boid) {
    let x = boid.x, y = boid.y;

    let c = .97;
    let s = 0.5
    if (x < -width * (c - 1)) {
        x = width * c;
        boid.addChangeInVelocity(s, 0);
    }
    else if (x > width * c) {
        x = -width * (c - 1);
        boid.addChangeInVelocity(-s, 0);
    }

    if (y < -height * (c - 1)) {
        y = height * c;

        boid.addChangeInVelocity(0, s);
    }
    else if (y > height * c) {
        y = -height * (c - 1);

        boid.addChangeInVelocity(0, -s);
    }

    // boid.x = x;
    // boid.y = y;
    return boid;




}

function updateBoids() {
    for (let i = 0; i < boids.length; i++) {
        const boid = boids[i];
        boids[i] = updateBoid(boid);

    }
}

function toRadians(degrees) {
    var pi = Math.PI;
    return degrees * (pi / 180);
}
function toDegrees(radians) {
    var pi = Math.PI;
    return radians * (180 / pi);
}

function drawPolygon(polygon, centerx, centery, dir = 0, color = "#000000") {
    // let ox = polygon[0][0], oy = polygon[0][1];
    ctx.beginPath();

    // ctx.moveTo(ox, oy);
    for (const point of polygon) {
        let px = point[0], py = point[1];

        let newx = Math.cos(dir) * (px - centerx) - Math.sin(dir) * (py - centery) + centerx
        let newy = Math.sin(dir) * (px - centerx) + Math.cos(dir) * (py - centery) + centery
        ctx.lineTo(newx, newy);



    }
    ctx.closePath()
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = flags.lineWidth;
    // ctx.stroke();
}
function drawBoid(boid, t) {
    const size = boidSize;
    let x = boid.x, y = boid.y;
    let dir = boid.getDirectionDegrees();
    let color = "#000000";
    // color  = `rgba(${boid.x*(255/width)},${boid.y*(255/width)},${boid.y*(255/width)})`
    // let cosmetic = Math.sin((Math.PI * 2 / flags.wigglePeriod) * (flags.wiggle + t)) * flags.wiggleIntensity;
    // dir += cosmetic;
    // cosmetic = -cosmetic / 4;
    let cosmetic =0
    let polygon = [
        [(x - size * 0.3), y + cosmetic],
        [(x) - size * 0.4, y - size * .25 + cosmetic],
        [(x) + size * 0.3, y],
        [(x) - size * 0.4, y + size * .25 + cosmetic],
        [(x - size * 0.3), y + cosmetic]
    ]

    if (flags.showFieldOfView && boid.selected) {
        ctx.beginPath()
        ctx.lineTo(x, y);
        ctx.ellipse(x, y, boid.viewDistance, boid.viewDistance, boid.getDirectionRadians(), toRadians(boid.fov) / 2 * -1, toRadians(boid.fov) / 2);
        // ctx.arc(x, y, boid.viewDistance, toRadians(boid.direction), toRadians(boid.fov)+toRadians(boid.direction))
        ctx.closePath();
        ctx.globalAlpha = .7;
        ctx.fillStyle = "#000000";
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    if (biggestBoidPack.includes(boid) && flags.showBiggestFlock) {

        color = "#ff0000"
    }
    drawPolygon(polygon, boid.x, boid.y, toRadians(dir), color);

    if (debug && boid.selected && false) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(boid.x - 2.5, boid.y - 2.5, 5, 5);
    }





}



function breadthOfBoid(boid) {
    let breadthStack = [boid];
    let searched = [];

    let i = 0;
    while (i < breadthStack.length) {
        let b = breadthStack[i];
        if (searched.includes(b)) {
            i++;
            continue;
        }
        breadthStack = breadthStack.concat(b.nearby);
        searched.push(b);
        i++;
    }

    return searched;

}

function largestBoid() {
    let max = [];
    // boid = boids[0];
    // searched = breadthOfBoid(boid);
    searched = [];
    let i = 0;
    while (i < boids.length && i < 20) {
        let b = boids[i];
        i++;
        if (searched.includes(b)) {
            continue;
        }
        let breadth = breadthOfBoid(b);
        searched = searched.concat(breadth);
        if (breadth.length > max.length) {
            max = breadth;
        }
    }
    return max;
}