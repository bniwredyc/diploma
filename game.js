'use strict';

class Vector {
  constructor(x=0, y=0) {
    this.x = x;
    this.y = y;
  }

  plus(plusVector) {
    if (!(plusVector instanceof Vector)) {
        throw new Error('Можно прибавлять к вектору только тип Vector');
    }
    return new Vector(plusVector.x + this.x, plusVector.y + this.y);
  }

  times(multiplierVector = 1) {
    return new Vector(this.x * multiplierVector, this.y * multiplierVector);
  }
}

class Actor {
  constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
    if (!((pos instanceof Vector)&&(size instanceof Vector)&&(speed instanceof Vector))) {
      throw new Error('Передан не вектор.');
    }
    this.pos = pos;
    this.size = size;
    this.speed = speed;
  }

  act() {}

  get top() {
    return this.pos.y;
  }

  get left() {
    return this.pos.x;
  }
  get bottom() {
    return this.pos.y + this.size.y;
  }

  get right() {
    return this.pos.x + this.size.x;
  }

  get type() {
    return 'actor';
  }

  isIntersect(item) {
    if (this === item) {
      return false
    };
    if (!(item instanceof Actor)) {
      throw new Error('Передан не объект типа Vector');
    } else if (item === undefined) {
      throw new Error('Объект не может быть пустым')
    }
    return !((item.left >= this.right) || (item.right <= this.left) || (item.top >= this.bottom) || (item.bottom <= this.top));
  }
}

class Level {
  constructor(grid = [], actors = []) {
    this.actors = actors.slice();
    this.status = null;
    this.finishDelay = 1;
    this.grid = grid.slice();
    this.height = this.grid.length;
    this.width = Math.max(0, ...this.grid.map(element=> element.length));
    this.player = actors.find(actor => actor.type === 'player');
  }

  isFinished() {
    return this.status !== null && this.finishDelay < 0;
  }

  actorAt(moveActor) {
    if (!(moveActor instanceof Actor)) {
      throw new Error('Передан не объект типа Vector');
    }
    return this.actors.find(actor => actor.isIntersect(moveActor));
  }

  obstacleAt(position, size) {
    if (!((position instanceof Vector)&&(size instanceof Vector))) {
      throw new Error('Объект должен быть типа Vector');
    }

    const topBord = Math.floor(position.y);
    const bottomBord = Math.ceil(position.y + size.y);
    const leftBord = Math.floor(position.x);
    const rightBord = Math.ceil(position.x + size.x);

    if (leftBord < 0 || rightBord > this.width || topBord < 0) {
      return 'wall';
    }
    if (bottomBord > this.height) {
      return 'lava';
    }

    for (let y = topBord; y < bottomBord; y++) {
      for (let x = leftBord; x < rightBord; x++) {
        const cell = this.grid[y][x];
        if (cell) {
          return cell;
        }
      }
    }
  }

  removeActor(actor) {
    const findInd = this.actors.indexOf(actor);
    if (findInd !== -1) {
      this.actors.splice(findInd, 1)
    }
  }

  noMoreActors(typeActor) {
    return !this.actors.some(actor => actor.type === typeActor);
  }

  playerTouched(touched, actor) {
    if (this.status !== null) {
      return
    }
    if (['lava', 'fireball'].some(element => element === touched )) {
      this.status = 'lost';
    }
    if (touched === 'coin' && actor.type === 'coin') {
      this.removeActor(actor);
      if (this.noMoreActors('coin')) {
        this.status = 'won';
      }
    }
  }
}

class LevelParser {
  constructor(dictionary) {
    this.dictionary = Object.assign({}, dictionary);
  }

  actorFromSymbol(symbol) {
    if (symbol != undefined && Object.keys(this.dictionary).indexOf(symbol) != -1) {
      return this.dictionary[symbol];
    }
  }

  obstacleFromSymbol(symbol) {
    if (symbol === 'x') {
      return 'wall';
    }

    if (symbol === '!') {
      return 'lava';
    }
  }

  createGrid(plan) {
    return plan.map(line => line.split('')).map(line => line.map(line => this.obstacleFromSymbol(line)));
  }

  createActors(arrayActors = []) {
    const actors = [];
    arrayActors.forEach((itemY, y) => {
      itemY.split('').forEach((itemX, x) => {
        const constructorActors = this.actorFromSymbol(itemX);
        if (typeof constructorActors !== 'function') {
          return;
        }
        const result = new constructorActors(new Vector(x, y));
        if (result instanceof Actor) {
          actors.push(result);
        }
      });
    });
    return actors;
  }

  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
  }
}

class Fireball extends Actor {
  constructor(position = new Vector(0, 0), speed = new Vector(0, 0)) {
    super(position, new Vector(1, 1), speed);
  }

  get type() {
    return 'fireball';
  }

  getNextPosition(time = 1) {
    return this.pos.plus(this.speed.times(time));
  }

  handleObstacle() {
    this.speed = this.speed.times(-1);
  }

  act(time, level) {
    const nextPosition = this.getNextPosition(time);
    if (level.obstacleAt(nextPosition, this.size)) {
      this.handleObstacle();
    } else {
      this.pos = nextPosition;
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(position) {
    super(position, new Vector(2, 0));
  }
}

class VerticalFireball extends Fireball {
  constructor(position) {
    super(position, new Vector(0, 2));
  }
}

class FireRain extends Fireball {
  constructor(position) {
    super(position, new Vector(0, 3));
    this.beginPosition = position;
  }

  handleObstacle() {
    this.pos = this.beginPosition;
  }
}

class Coin extends Actor {
  constructor(position = new Vector(0, 0)) {
    const pos = position.plus(new Vector(0.2, 0.1));
    super(pos, new Vector(0.6, 0.6));
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * 2 * Math.PI;
    this.startPos = this.pos;
  }

  get type() {
    return 'coin';
  }

  updateSpring(number = 1) {
    this.spring += this.springSpeed * number;
  }

  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }

  getNextPosition(number = 1) {
    this.updateSpring(number);
    return this.startPos.plus(this.getSpringVector());
  }

  act(time) {
    this.pos = this.getNextPosition(time);
  }
}

class Player extends Actor {
  constructor(position = new Vector(0, 0)) {
    super(position.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5));
  }

  get type() {
    return 'player';
  }
}

const actorDict = {
    '@': Player,
    'o': Coin,
    '=': HorizontalFireball,
    '|': VerticalFireball,
    'v': FireRain
};

const parser = new LevelParser(actorDict);

loadLevels()
    .then((res) => {runGame(JSON.parse(res), parser, DOMDisplay)
    .then(() => alert('You are the best!'))});