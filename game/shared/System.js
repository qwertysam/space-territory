const SOrbit = IS_SERVER ? require('../shared/Orbit.js') : Orbit

class System extends(IS_SERVER ? Object : PIXI.Container) {
	constructor(game) {
		super()

		this.game = game

		if (!IS_SERVER) {
			this.sun = new PIXI.particles.Emitter(this, resources.sunTexture.texture, Particle.Sun)
			this.sun.emit = true
		}

		this.orbits = []
		this.sendingShips = []
	}

	update(delta, paused) {
		if (!paused) {
			for (var i in this.orbits) {
				this.orbits[i].update(delta)
			}

			if (!IS_SERVER) {
				// If drawing the ship travel lines
				if (isChoosingShipSend())
					updateSelectedPlanet(viewport.toWorld(pixigame.renderer.plugins.interaction.mouse.global))


				// Update all travelling ships
				for (var i in this.sendingShips)
					this.sendingShips[i].update(delta)
			}
		}

		if (!IS_SERVER) this.sun.update(delta)
	}

	getPlanet(x, y) {
		var planet
		for (var i in this.orbits)
			if ((planet = this.orbits[i].getPlanet(x, y)) != null)
				return planet

		return null
	}

	addOrbit(orbit) {
		this.orbits.push(orbit)
		orbit.game = this.game
		orbit.system = this

		if (IS_SERVER) {
			orbit.id = orbit.game.createID()
			return orbit
		} else {
			orbit.system.addChild(orbit)
		}
	}

	getOrbit(id) {
		for (var i in this.orbits)
			if (this.orbits[i].id == id)
				return this.orbits[i]

		return null
	}

	getPlanetByID(id) {
		var planet
		for (var i in this.orbits)
			if ((planet = this.orbits[i].getPlanetByID(id)) != null)
				return planet

		return null
	}

	save(literal) {
		// default value of literal is true
		// literal will save the system exactly how it is, with ID's and all
		// non-literal will not save ID's
		if (!exists(literal)) literal = true

		var sys = {
			orbits: []
		}

		for (var i in this.orbits) {
			sys.orbits.push(this.orbits[i].save(literal))
		}

		return sys
	}

	static load(json, game) {
		var sys = new System(game)

		for (var i in json.orbits)
			SOrbit.load(json.orbits[i], game, sys)

		return sys
	}
}

if (IS_SERVER) {
	module.exports = System
}
