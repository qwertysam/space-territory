//   _____ _                        _
//  / ____| |                      | |
// | (___ | |__   __ _ _ __ ___  __| |
//  \___ \| '_ \ / _` | '__/ _ \/ _` |
//  ____) | | | | (_| | | |  __/ (_| |
// |_____/|_| |_|\__,_|_|  \___|\__,_|

function distSqr (x1, y1, x2, y2) {
  let x = (x2 - x1)
  let y = (y2 - y1)
  return (x * x) + (y * y)
}

// Tells if the value x is between or equal to y and z within the error margin (error should be positive)
function isBetween (x, y, z, error) {
  if (y > z) {
    return z - error < x && x < y + error
  } else {
    return y - error < x && x < z + error
  }
}

if (IS_SERVER) {
  global.distSqr = distSqr
  global.exists = exists
  global.isBetween = isBetween
}

//   _____
//  / ____|
// | (___   ___ _ ____   _____ _ __
//  \___ \ / _ \ '__\ \ / / _ \ '__|
//  ____) |  __/ |   \ V /  __/ |
// |_____/ \___|_|    \_/ \___|_|

function addPosition (obj) {
  obj.position = {}
  obj.position.x = 0
  obj.position.y = 0

  function setter (x1, y1) {
    obj.position.x = x1
    obj.position.y = y1
  }
  obj.position.set = setter
}

if (IS_SERVER) {
  global.addPosition = addPosition
}

//   _____ _ _            _
//  / ____| (_)          | |
// | |    | |_  ___ _ __ | |_
// | |    | | |/ _ \ '_ \| __|
// | |____| | |  __/ | | | |_
//  \_____|_|_|\___|_| |_|\__|

let updateLines = TICKS_PER_COLLISION_UPDATE

let sendShipsFrom
let sendShipsAmount = 0

let selectedPlanet

function updateSelectedPlanet (mouse) {
  updateLines++

  if (updateLines > TICKS_PER_COLLISION_UPDATE) {
    updateLines = 0
    selectedPlanet = null
  }

  let sys = game.system

  // For each planet, draw a line from the sendShipsFrom planet to it
  for (let o in sys.orbits) {
    let orbit = sys.orbits[o]
    for (let i in orbit.planets) {
      let planet = orbit.planets[i]
      // Don't draw a line from the sendShipsFrom planet to itself
      if (planet !== sendShipsFrom) {
        // Only draw lines every update cycle
        if (updateLines === 0) {
          planet.outline.visible = false
          planet.ghost.outline.visible = false

          // Player Planet
          let pX = sendShipsFrom.position.x
          let pY = sendShipsFrom.position.y

          let targetTime = sendShipsFrom.timeToFastestIntersect(planet)
          let target = planet.calcPosition(targetTime)

          // Line Slope (origin is the Planet Player pos)
          let mX = target.x - pX
          let mY = target.y - pY

          let collides = false

          // Tests collision for the sun (same as above with planets)
          if (isBetween(0, pX, target.x, SUN_COLLISION_RADIUS) && isBetween(0, pY, target.y, SUN_COLLISION_RADIUS)) {
            // https://math.stackexchange.com/questions/275529/check-if-line-intersects-with-circles-perimeter
            let a = -mY
            let b = mX
            let c = (pX * mY) - (mX * pY)
            let distSquared = (c * c) / (a * a + b * b)

            // if the tradjectory intersects with a planet
            if (distSquared < SUN_COLLISION_RADIUS * SUN_COLLISION_RADIUS) {
              collides = true
            }
          }

          // If it doesn't collide with the sun, test if it collides with a planet
          if (!collides) {
            for (let p in sys.orbits) {
              let currentOrbit = sys.orbits[p]
              for (let j in currentOrbit.planets) {
                let current = currentOrbit.planets[j]
                if (current !== sendShipsFrom && current !== planet) {
                  // current planet of interest
                  let cPos = current.calcPosition(targetTime)
                  // If the target is within the bounds of the two planets
                  if (isBetween(cPos.x, pX, target.x, current.radius) && isBetween(cPos.y, pY, target.y, current.radius)) {
                    // https://math.stackexchange.com/questions/275529/check-if-line-intersects-with-circles-perimeter
                    let a = -mY
                    let b = mX
                    let c = (pX * mY) - (mX * pY)
                    let numerator = (a * cPos.x + b * cPos.y + c)
                    let distSquared = (numerator * numerator) / (a * a + b * b)

                    // if the tradjectory intersects with a planet
                    if (distSquared < current.radius * current.radius) {
                      collides = true
                      break
                    }
                  }
                }
              }
              if (collides) break
            }
          }

          planet.drawLine.visible = !collides
          planet.ghost.visible = !collides

          if (planet.ghost.visible === !collides) {
            planet.ghost.position.set(target.x, target.y)
          }

          // Planet selection via mouse
          if (!collides) {
            let targetDist = distSqr(mouse.x, mouse.y, target.x, target.y)
            let planetDist = distSqr(mouse.x, mouse.y, planet.position.x, planet.position.y)

            let radSqr = distSqr(0, 0, 0, planet.radius + PLANET_SELECT_RADIUS)

            if (targetDist < radSqr || planetDist < radSqr) {
              if (!selectedPlanet) {
                selectedPlanet = planet
              } else {
                // if the mouse is within the selection radius of the planet

                let selectedDist = distSqr(mouse.x, mouse.y, selectedPlanet.position.x, selectedPlanet.position.y)
                let selectedGhostDist = distSqr(mouse.x, mouse.y, selectedPlanet.ghost.position.x, selectedPlanet.ghost.position.y)

                if ((targetDist < selectedDist && targetDist < selectedGhostDist) || (planetDist < selectedDist && planetDist < selectedGhostDist)) {
                  selectedPlanet = planet
                }
              }
            }
          }
        }

        planet.drawLine.setPoints(planet.ghost.position.x,
          planet.ghost.position.y,
          sendShipsFrom.position.x,
          sendShipsFrom.position.y)
      }
    }
  }

  if (updateLines === 0) {
    if (selectedPlanet) {
      selectedPlanet.outline.visible = true
      selectedPlanet.ghost.outline.visible = true
    }
  }
}

function cancelSendShips () {
  let sys = game.system
  for (let o in sys.orbits) {
    let orbit = sys.orbits[o]
    for (let i in orbit.planets) {
      let planet = orbit.planets[i]
      planet.outline.visible = false
      planet.ghost.visible = false
      planet.ghost.outline.visible = false
      planet.drawLine.visible = false
    }
  }
  sendShipsFrom = null
  sendShipsAmount = 0
  viewport.resumePlugin('drag')
  viewport.resumePlugin('wheel')
}

function isChoosingShipSend () {
  return exists(sendShipsFrom)
}

function setVisible (elemID, visible) {
  if (visible || !exists(visible)) {
    document.getElementById(elemID).style.visibility = 'visible'
  } else {
    setHidden(elemID)
  }
}

function setHidden (elemID) {
  document.getElementById(elemID).style.visibility = 'hidden'
}

function disableButton (elemID) {
  let elem = document.getElementById(elemID)
  deselectButton(elemID)
  elem.style.color = Colour.GREY_TEXT
  elem.style.cursor = 'default'
  elem.onmouseover = function () {
    this.style.backgroundColor = 'transparent'
  }
  elem.setAttribute('enable_click', false)
}

function enableButton (elemID, visible) {
  if (visible || !exists(visible)) {
    let elem = document.getElementById(elemID)
    elem.style.color = '#FFF'
    elem.style.cursor = 'pointer'
    elem.onmouseover = function () {
      this.style.backgroundColor = 'rgba(200, 200, 200, 0.5)'
    }
    elem.onmouseout = function () {
      this.style.backgroundColor = 'transparent'
    }
    elem.setAttribute('enable_click', true)
  } else {
    disableButton(elemID)
  }
}

function isButtonEnabled (elemID) {
  let elem = document.getElementById(elemID)
  return elem.getAttribute('enable_click') === 'true'
}

// Draws a box around the button
function selectButton (elemID) {
  let elem = document.getElementById(elemID)
  // by default elems don't have the enable_click attribute, so treat elems without it as enabled by default
  if (isButtonEnabled(elemID)) {
    elem.style.boxShadow = '0 0 0 3px white'
    setZIndex(elemID, 2)
  }
}

// NOTE
// setting z-index in selectButton and deselectButton is so that the outline for selected buttons properly draws over the highlighting for unselected buttons

function deselectButton (elemID) {
  let elem = document.getElementById(elemID)
  elem.style.boxShadow = 'none'
  setZIndex(elemID, 1)
}

function setZIndex (elemID, z) {
  document.getElementById(elemID).style.zIndex = z
}

function getInput (elemID) {
  return document.getElementById(elemID).value
}

function setText (elemID, text) {
  document.getElementById(elemID).innerHTML = text
}
