class Ship extends (IS_SERVER ? Object : PIXI.Sprite) {
  constructor (system, fromX, fromY, toX, toY, speed, amount, team, planet, duration) {
    if (IS_SERVER) {
      super()

      addPosition(this)
    } else {
      super(resources.ship.texture)

      this.pivot.set(0.5, 0.5)
      this.anchor.set(0.5, 0.5)
      this.scale.set(0.5)
      this.position.set(fromX, fromY)
      this.tint = team.colour
    }

    this.system = system
    this.team = team
    this.amount = amount
    this.planet = planet
    this.duration = duration
    this.cumulativeDuration = 0

    this.fromX = fromX
    this.fromY = fromY
    this.toX = toX
    this.toY = toY
    this.speed = speed
    let dX = toX - fromX
    let dY = toY - fromY
    let dnet = Math.sqrt(dX * dX + dY * dY)
    this.vX = dX * speed / dnet
    this.vY = dY * speed / dnet

    this.rotation = (this.vX > 0 ? 1 : -1) * (Math.PI / 2 + Math.asin(this.vY / speed))
  }

  update (delta) {
    this.cumulativeDuration += delta
    if (this.cumulativeDuration >= this.duration) {
      this.arrive()
    } else {
      this.position.x += this.vX * delta
      this.position.y += this.vY * delta
    }
  }

  arrive () {
    if (!IS_SERVER) {
      this.system.removeChild(this)
    }

    // Removes this from the sendingShips list
    let i = this.system.sendingShips
    if (i >= 0) {
      this.system.sendingShips.indexOf(this)
      this.system.sendingShips.splice(i, 1)
    }

    // TODO colonize the planet!
    this.planet.arrive(this.team, this.amount)
  }
}

if (IS_SERVER) {
  module.exports = Ship
}
