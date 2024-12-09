const gameDuration = 30.0;
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
canvas.onmousedown = onmousedown;
canvas.onmouseup = onmouseup;
canvas.onmousemove = onmousemove;
const coinImage = new Image();
coinImage.src = "img/Apple.png"
const goldImage = new Image();
goldImage.src = "img/gold.png"
const silverImage = new Image();
silverImage.src = "img/silver.png"
const bronzeImage = new Image();
bronzeImage.src = "img/bronze.png"

function getRandomInt(min, max) {
    return Math.floor(min + Math.random() * (max - min));
}

class QuestionGenerator {
    constructor() {
        this.firstQuestion = true;
        this.previousResponse = 0;
    }
    getOperation() {
        if (this.firstQuestion) {
            this.firstQuestion = false;
            this.previousResponse = 56;
            return { a: 7, b: 8, r: 56, label: "7 x 8", isHard: false };
        }
        while (true) {
            const a = getRandomInt(2, 9);
            const b = getRandomInt(2, 9);
            let response = a * b;
            if (response === this.previousResponse) {
                continue;
            }
            this.previousResponse = response;
            let isHard = (a == 7 || a == 8) && (b == 3 || b == 4 || b == 7 || b == 8);
            return { a, b, r: response, label: a + " x " + b, isHard };
        }
    }
    getPropals(op) {
        return [
            op.r - 3,
            op.r - 2,
            op.r - 1,
            (op.a - 1) * (op.b - 1),
            (op.a - 1) * (op.b),
            (op.a) * (op.b - 1),
            (op.a + 1) * (op.b - 1),
            (op.a - 1) * (op.b + 1),
            (op.a + 1) * (op.b),
            (op.a) * (op.b + 1),
            op.r + 1,
            op.r + 2,
            op.r + 3,
            op.r + 5,
            op.r + 10,
        ];
    }

    getPropals4(op) {
        const propals = this.getPropals(op);
        const props4 = [op.r];
        while (props4.length != 4) {
            const p = propals[getRandomInt(0, propals.length)];
            if (!props4.includes(p)) {
                props4.push(p);
            }
        }
        props4.sort(function (a, b) { return a - b; });
        return props4;
    }

    getPropalsWithGoodSolutionDistributed(op) {
        const expectedIndex = getRandomInt(0, 4);
        let props4 = null;
        for (let i = 0; i < 20; i++) {
            props4 = this.getPropals4(op)
            if (props4.indexOf(op.r) == expectedIndex) {
                return props4;
            }
        }
        return props4;

    }

    next() {
        const op = this.getOperation();
        const props4 = this.getPropalsWithGoodSolutionDistributed(op);
        return { op: op, props: props4 };
    }
}

function Mod2Pi(a) {
    while (a < Math.PI)
        a += 2 * Math.PI;
    while (a > Math.PI)
        a -= 2 * Math.PI;
    return a;
}

class CoinAnimation {
    constructor(x, y, dextX, destY, board) {
        this.x = x;
        this.y = y;
        this.destX = dextX;
        this.destY = destY;
        this.board = board;
        this.running = true;
        this.speed = 15 + Math.random() * 5;
        this.angus = Mod2Pi(Math.random() * 2 * Math.PI);
    }
    paint() {
        ctx.drawImage(coinImage, this.x, this.y, 48, 48);
    }

    update() {
        const d = Math.abs(this.destX - this.x) + Math.abs(this.destY - this.y);
        if (d < 25) {
            this.running = false;
            this.board.score++;
        }
        const targetAngus = Math.atan2(this.destY - this.y, this.destX - this.x);
        const diff = Mod2Pi(targetAngus - this.angus);
        if (Math.abs(diff) > 0.1) {
            if (diff > 0) {
                if (diff > 1)
                    this.angus += 0.4;
                this.angus += 0.1;
            } else {
                if (diff < -1)
                    this.angus -= 0.4;
                this.angus -= 0.1;
            }
            this.angus = Mod2Pi(this.angus);
        }
        this.x += this.speed * Math.cos(this.angus);
        this.y += this.speed * Math.sin(this.angus);
    }
}

class AnimationSet {
    constructor(items) {
        this.items = items;
        this.running = true;
    }
    paint() {
        for (const a of this.items) {
            if (a.running) {
                a.paint();
            }
        }
    }
    update() {
        for (let i = this.items.length - 1; i >= 0; i--) {
            this.items[i].update();
            if (!this.items[i].running) {
                this.items.splice(i, 1);
            }
        }
        this.running = this.items.length != 0;
    }
}

class Board {
    static scoreImageX = 400;
    static scoreImageY = 0;
    constructor() {
        this.score = 0;
        this.time = gameDuration;
        this.question = "7 x 8";
        this.currentQuestion = null;
        this.generator = new QuestionGenerator();
        this.buttons = [new Button(this, 0), new Button(this, 1), new Button(this, 2), new Button(this, 3)];
        this.numberOfAnswer = 0;
        this.animation = null;
        this.tickBeforeShowingQuestion = 5;
    }
    paint() {
        ctx.drawImage(coinImage, Board.scoreImageX, Board.scoreImageY, 48, 48);
        ctx.fillStyle = "black";
        ctx.font = "24px Arial";
        ctx.fillText(this.score, 440, 30);

        ctx.fillStyle = "black";
        ctx.font = "24px Arial";
        ctx.fillText(Number(this.time).toFixed(1), 500, 30);

        ctx.fillStyle = "black";
        ctx.font = "70px Arial";
        let label = "...";
        if (this.tickBeforeShowingQuestion <= 0) {
            label = this.question;
        }
        ctx.fillText(label, 300 - label.length * 15, 250);

        for (const b of this.buttons) {
            b.paint();
        }

        if (this.animation != null) {
            this.animation.paint();
        }
    }
    update(ellapsed) {
        if (this.currentQuestion == null) {
            this.setQuestion();
        }
        if (this.animation != null) {
            this.animation.update();
            if (!this.animation.running) {
                this.animation = null;
                if (this.time > 0) {
                    this.setQuestion();
                } else {
                    addScore(currentPlayer.name, this.score);
                    save();
                    mainPage = new EndGamePage(this.score);
                }

            }
            return;
        }
        for (let c of this.buttons) {
            c.update();
        }
        if (this.tickBeforeShowingQuestion > 0) {
            this.tickBeforeShowingQuestion--;
        }
        if (this.numberOfAnswer > 0 && this.tickBeforeShowingQuestion <= 0) {
            this.time -= ellapsed / 1000;
        }
        if (this.time < 0) {
            this.time = 0;
        }
    }
    setQuestion() {
        this.tickBeforeShowingQuestion = 5;
        this.currentQuestion = this.generator.next();
        this.question = this.currentQuestion.op.label;
        for (let i = 0; i < this.buttons.length; i++) {
            this.buttons[i].isBad = false;
            this.buttons[i].isGood = false;
            this.buttons[i].isEnable = true;
            this.buttons[i].label = "" + this.currentQuestion.props[i];
        }
    }
    onButtonClick(index) {
        this.buttons[index].isEnable = false;
        if (this.currentQuestion.props[index] == this.currentQuestion.op.r) {
            this.buttons[index].isGood = true;
            this.goodAnswer(index);
        } else {
            this.buttons[index].isBad = true;
        }
    }
    goodAnswer(index) {
        this.numberOfAnswer++;
        const scoreIncr = this.numberOfAnswer + (this.currentQuestion.op.isHard ? 1 : 0);
        const button = this.buttons[index];
        let anims = [];
        for (let i = 0; i < scoreIncr; i++) {
            anims.push(new CoinAnimation(button.x, button.y, Board.scoreImageX, Board.scoreImageY, this));
        }
        this.animation = new AnimationSet(anims);
    }
}


class Button {
    static ClickTicks = 10;
    constructor(board, index) {
        this.board = board;
        this.index = index;
        this.width = 285;
        this.x = (index % 2) == 0 ? 10 : 305;
        this.y = 400 + Math.floor(index / 2) * 100;
        this.height = 80;
        this.label = "" + (10 + 8 * index);
        this.mouseOver = false;
        this.clicking = -1;
        this.isEnable = true;
        this.isBad = false;
        this.isGood = false;
    }
    paint() {
        ctx.fillStyle = this.isBad ? "red"
            : this.isGood ? "green"
                : this.mouseOver ? "orange"
                    : "gray";
        ctx.fillRect(this.x, this.y, this.width, this.height);
        if (this.clicking >= 0) {
            ctx.fillStyle = "cyan";
            ctx.fillRect(this.x, this.y, this.width * (Math.min(this.clicking, Button.ClickTicks) / Button.ClickTicks), this.height);
        }
        ctx.fillStyle = "black";
        ctx.font = "50px Arial";
        ctx.fillText(this.label, this.x + 150 - this.label.length * 16, this.y + 60);

    }
    update() {
        if (!this.isEnable)
            return;
        if (this.clicking >= 0)
            this.clicking++;
        if (this.clicking > Button.ClickTicks) {
            this.clicking = 0;
            this.board.onButtonClick(this.index);
        }
    }
    mouseDown() {
        if (!this.isEnable)
            return;
        if (this.clicking < 0)
            this.clicking = 1;

    }
    mouseUp() {
        this.clicking = -1;
    }
    mouseEnter() {
        this.mouseOver = true;
    }
    mouseExit() {
        this.mouseOver = false;
        this.clicking = -1;
    }
}
class MenuButton {
    constructor(x, y, label, mouseDown) {
        this.x = x;
        this.y = y;
        this.label = label;
        this.mouseDown = mouseDown;
        this.width = 285;
        this.height = 80;
        this.mouseOver = false;
    }
    paint() {
        ctx.fillStyle = this.mouseOver ? "orange" : "gray";
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.fillStyle = "black";
        ctx.font = "50px Arial";
        ctx.fillText(this.label, this.x + this.width / 2 - this.label.length * 15, this.y + 60);
    }
    mouseEnter() {
        this.mouseOver = true;
    }
    mouseExit() {
        this.mouseOver = false;
    }
}

function addScore(name, score) {
    bestScores.push({ name, score, date: new Date().toLocaleDateString("en-GB") });
    bestScores.sort((s1, s2) => s2.score - s1.score)
    bestScores.splice(10);
}
let players = JSON.parse(localStorage.getItem("players") || "[]");
let bestScores = JSON.parse(localStorage.getItem("bestScores") || "[]");
if (bestScores.length == 0) {
    addScore("Olive", 100);
    addScore("Olive", 90);
    addScore("Olive", 70);
    addScore("Olive", 50);
    addScore("Olive", 40);
    addScore("Olive", 30);
    addScore("Olive", 20);
    addScore("Olive", 10);
    addScore("Olive", 5);
    addScore("Olive", 1);
    save();
}
let currentPlayer = null;
function save() {
    localStorage.setItem("players", JSON.stringify(players));
    localStorage.setItem("bestScores", JSON.stringify(bestScores));
}
class ChoseProfilePage {
    constructor() {
        this.buttons = [];
        for (let i = 0; i < players.length; i++) {
            let button = new MenuButton(50, 150 + 90 * i, players[i].name, function () {
                currentPlayer = players[i];
                mainPage = new Board();
            });
            button.width = 420;
            this.buttons.push(button);

            let deleteButton = new MenuButton(480, 150 + 90 * i, "X", function () {
                if (!confirm("Do you really want to delete '" + players[i].name + "'?"))
                    return;
                players.splice(i, 1);
                save();
                mainPage = new ChoseProfilePage();
            });
            deleteButton.width = 70;
            this.buttons.push(deleteButton);
        }
        if (players.length < 5) {
            let button = new MenuButton(50, 150 + 90 * players.length, "New player...", function () {
                const name = prompt("Player name?", "Tom");
                if (!name)
                    return;
                players.push({ name, totalScore: 0, bestScore: 0, bestGames: [] });
                save();
                mainPage = new ChoseProfilePage();
            });
            button.width = 500;
            this.buttons.push(button);
        }
    }
    paint() {
        ctx.fillStyle = "black";
        ctx.font = "40px Arial";
        ctx.fillText("Play as", 100, 100);

        for (const b of this.buttons) {
            b.paint();
        }
    }
    update() {
    }

}

class EndGamePage {
    constructor(score) {
        this.score = score;
        const replayButton = new MenuButton(10, 500, "Replay", function () {
            mainPage = new Board();
        });
        const changeUserButton = new MenuButton(300, 500, "Menu", function () {
            mainPage = new ChoseProfilePage();
        });
        this.buttons = [replayButton, changeUserButton];
    }
    paint() {
        ctx.fillStyle = "black";
        ctx.font = "24px Arial";
        ctx.fillText("You have done:", 100, 50 + 30);

        ctx.drawImage(coinImage, 280, 50, 48, 48);
        ctx.fillStyle = "black";
        ctx.font = "24px Arial";
        ctx.fillText(this.score, 320, 50 + 30);

        ctx.fillStyle = "black";
        ctx.font = "20px Arial";
        ctx.fillText("Best scores:", 40, 150);

        for (let i = 0; i < bestScores.length; i++) {
            let img = null;
            if (i == 0)
                img = goldImage;
            if (i == 1)
                img = silverImage;
            if (i == 2)
                img = bronzeImage;
            if (img)
                ctx.drawImage(img, 36, 200 + 30 * i - 18, 20, 20);
            ctx.fillStyle = "black";
            ctx.font = "20px Arial";
            let name = bestScores[i].name;
            ctx.fillText(name, 60, 200 + 30 * i);

            let score = "" + bestScores[i].score;
            ctx.drawImage(coinImage, 300 - score.length * 10 - 40, 200 + 30 * i - 30, 48, 48);
            ctx.fillText(score, 300 - score.length * 10, 200 + 30 * i);
            ctx.fillText(bestScores[i].date, 450, 200 + 30 * i);
        }

        for (const b of this.buttons) {
            b.paint();
        }
    }
    update() {
    }
}

function onmousedown(event) {
    for (const c of mainPage.buttons) {
        if (c.mouseDown
            && event.offsetX >= c.x && event.offsetX < c.x + c.width
            && event.offsetY >= c.y && event.offsetY < c.y + c.height) {
            c.mouseDown(event);
        }
    }
}
function onmouseup(event) {
    for (const c of mainPage.buttons) {
        if (c.mouseUp
            && event.offsetX >= c.x && event.offsetX < c.x + c.width
            && event.offsetY >= c.y && event.offsetY < c.y + c.height) {
            c.mouseUp(event);
        }
    }
}

let currentControl = null;
function onmousemove(event) {
    let newControl = null
    for (const c of mainPage.buttons) {
        if (c.x
            && event.offsetX >= c.x && event.offsetX < c.x + c.width
            && event.offsetY >= c.y && event.offsetY < c.y + c.height) {
            newControl = c;
            break;
        }
    }
    if (currentControl === newControl) {
        return;
    }
    if (currentControl && currentControl.mouseExit)
        currentControl.mouseExit(event);
    if (newControl && newControl.mouseEnter)
        newControl.mouseEnter(event);
    currentControl = newControl;
}

function tick() {
    update();
    paint();
    setTimeout(tick, tickDuration);
}


let mainPage = new ChoseProfilePage();

const tickDuration = 1000.0 / 30;
let previousTime = performance.now();

function update() {
    let currentTime = performance.now();
    let ellapsed = currentTime - previousTime
    previousTime = currentTime;
    mainPage.update(ellapsed);
}

function paint() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    mainPage.paint();
}

tick();