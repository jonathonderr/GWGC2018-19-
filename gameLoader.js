function GameLoader(fileName){
  this.initLines = []
  this.rooms = []
  this.entities = []
  this.agents = []
  this.enemies = []
  this.items = []
  this.events = []
  this.omens = []
  this.haunts = []
  this.lines = []
  this.file = fileName
}

GameLoader.prototype = {
  loadGame: async function() {
    const request1 = async () => {
      const r = await fetch(this.file);
      const t = await r.text();
      this.lines = t.split("\n");
    }
    await request1();
  },
  compile: function() {
    var init = false
    var agents = false
    var rooms = false
    var items = false
    var omens = false
    var events = false
    var haunts = false
    for(var i = 0; i < this.lines.length; i++){
      var l = this.lines[i]
      if(l=="i" || l=="/i"){
        init = !init
      }
      if(l=="a" || l=="/a"){
        agents = !agents
      }
      if(l=="r" || l=="/r"){
        rooms = !rooms
      }
      if(l=="it" || l=="/it"){
        items = !items
      }
      if(l=="o" || l=="/o"){
        omens = !omens
      }
      if(l=="e" || l=="/e"){
        events = !events
      }
      if(l=="h" || l=="/h"){
        haunts = !haunts
      }
      if(init && l != "i"){
        this.initLines.push(l)
      }
      if(agents && l != "a"){
        this.agents.push(new Agent(l))
      }
      if(rooms && l != "r"){
        this.rooms.push(new Room(l))
      }
      if(items && l != "it"){
        this.items.push(new Item(l))
      }
      if(omens && l != "o"){
        this.omens.push(new Omen(l))
      }
      if(events && l != "e"){
        this.events.push(new Event(l))
      }
      if(haunts && l != "h"){
        this.haunts.push(new Haunt(l))
      }
    }
  }
}

function Enemy(might, speed, health, position){
  this.might = might
  this.speed = speed
  this.health = health
  this.position = position
}

function Agent(l){
  var parts = l.split(/[[\]]{1,2}/)
  this.name = parts[1]
  var attribs = String(parts[2]).split(" ")
  this.might = parseInt(attribs[0])
  this.speed = parseInt(attribs[1])
  this.sanity = parseInt(attribs[2])
  this.intelligence = parseInt(attribs[3])
  this.position = [0, 0, 0]
  this.innerColor = parts[3].split(" ")
  this.innerColor.push(1.0)
  this.outerColor = parts[4].split(" ")
  this.outerColor.push(1.0)
  this.items = []
}


function Room(l){
  var parts = String(l).split(/[[\]]{1,2}/)
  this.name = parts[1]
  this.description = parts[2]
  this.type = parts[3]
  this.position = [0, 0, 0]
  this.color = String(parts[4]).split(" ")
  this.color.push(1.0)
  this.action = String(parts[5]).split(/[{\}]{1,2}/)
  this.actionWin = parts[6]
  this.actionFail = parts[7]
}

function SelectedRoom(p){
   this.position = [p[0]*2, p[1]*2, p[2]*2]
}

Room.prototype = {

}

function Item(l){
  var parts = String(l).split(/[[\]]{1,2}/)
  this.name = parts[1]
  this.type = parts[2]
  this.use = parts[3]
  this.description = parts[4]
}

function Event(l){
  var parts = String(l).split(/[[\]]{1,2}/)
  this.title = parts[1]
  this.description = parts[2]
  this.action = parts[3]
  this.win = parts[4]
  this.lose = parts[5]
}


function Haunt(l){
  var parts = String(l).split(/[[\]]{1,2}/)
  this.name = parts[1]
  this.description = parts[2]
  this.goal = parts[3]
  this.enemies = parts[4]
  this.actions = parts[5]
  this.win = parts[6]
  this.lose = parts[7]
  this.type = "KILL"
  this.customRooms = undefined
  this.action = ""
}


function Omen(l){
  var parts = String(l).split(/[[\]]{1,2}/)
  this.title = parts[1]
  this.description = parts[2]
  this.filler = parts[3]
}

function DiceRoll(n, w){
  this.numDice = n
  this.neededValue = w
  this.finalValue = 0
  this.type = "unknown"
}

DiceRoll.prototype = {
  randomDiceRoll: function(){
    var t = 0
    for(var i = 1; i <= this.numDice; i++){
      var r = parseInt(Math.random() * (6) + 1)
      var s = 0
      if(r%3==0){s+=2}
      else if(r%2==0){s+=1}
      //console.log(r + ":" + s)
      t+=s
    }
    this.finalValue = t
  },
  setType: function(t){
    this.type = t
  }
}

function DelayAction(f, params, time){
  this.f = f
  this.params = params
  this.time = time
}

function GameLogic(gameLoader){
  this.gameData = gameLoader
  this.scroller = []
  this.rooms = []
  this.agents = []
  this.renderAgents = []
  this.selectableRooms = []
  this.enemies = []
  this.delayQueue = []
  this.traitor = undefined
  this.difficulty = 3
  this.alertSound = new Audio('alert.mp3');
  this.currentAgent = undefined
  this.currentAgentIndex = 0
  this.first = true
  this.omenCount = 0
  this.omenLength = this.gameData.omens.length
  this.currentHaunt = undefined
  this.hauntRevealed = false
  this.removedRooms = []
  this.currentItem = undefined
  this.enemyAttacking = false
}

GameLogic.prototype = {
  start: function(){
    this.processAction("D2+3")
    for(var i = 0; i < this.gameData.initLines.length; i++){
      this.addDelayText(this.gameData.initLines[i], [1, 1, 1, 1], 1000)
    }
    var a = function(text, game){
      switch(text){
        case "Easy":
          game.difficulty = 5
          break;
        case "Normal":
          game.difficulty = 3
          break;
        case "Hard":
          game.difficulty = 1
          break;
      }
    game.gameStart()
    }
    this.addDelayChoice(["Easy", "Normal", "Hard"], a, 0)
    this.updateDelayQueue()
  },
  addText: function(t, c){
    var t = new UI(0, 0, 1, 1, "text", t, 29, c);
    addToScroller(t)
  },
  addDelayText: function(t, c, d){
    var p = [t, c, this]
    this.delayQueue.push(new DelayAction(function(p){p[2].addText(p[0], p[1])}, p, d))
  },
  addRoom: function(r, p){
    r.position = [p[0]*2,p[1]*2,p[2]*2]
    delete this.selectableRooms[r.position]
    this.rooms[r.position] = r
    var room1 = new SelectedRoom([p[0]+1,p[1],p[2]])
    var room2 = new SelectedRoom([p[0]-1,p[1],p[2]])
    var room3 = new SelectedRoom([p[0],p[1],p[2]+1])
    var room4 = new SelectedRoom([p[0],p[1],p[2]-1])
    if(this.rooms[room1.position] == undefined){
      this.selectableRooms[room1.position] = room1
    }
    if(this.rooms[room2.position] == undefined){
      this.selectableRooms[room2.position] = room2
    }
    if(this.rooms[room3.position] == undefined){
      this.selectableRooms[room3.position] = room3
    }
    if(this.rooms[room4.position] == undefined){
      this.selectableRooms[room4.position] = room4
    }

  },
  addChoice: function(d, a){
    var choices = new UI(0, 0, 0.14, 0.1, "button", d, 50, undefined, a)
    addToScroller(choices)
  },
  addDelayChoice: function(d, a, t){
    var b = [d, a, this]
    this.delayQueue.push(new DelayAction(function(p){p[2].addChoice(p[0], p[1])}, b, t))
  },
  updateDelayQueue: function(){
    this.currentDelay = 0
    for(var i = 0; i < this.delayQueue.length; i++){
      var d = this.delayQueue[i]
      this.currentDelay += d.time
      setTimeout(d.f, this.currentDelay, d.params);
      setTimeout(function(p){p.play()},d.time * i, this.alertSound)
      if(i == this.delayQueue.length - 1){
        this.delayQueue = []
        this.currentDelay = 0
      }
    }
  },
  gameStart: function(){
    var p = [this.gameData.rooms[0], [this.rooms.length, 0.0, 0.0], this]
    this.delayQueue.push(new DelayAction(function(p){
      p[2].addRoom(p[0], p[1])
      p[2].gameData.rooms.splice(0,1)
    }, p, 50))
    this.loadAgents()
    this.updateDelayQueue()
  },
  loadAgents: function(){
    for(var i = 0; i < this.difficulty; i++){
        var agent = this.getRandomAgent()
        this.agents.push(agent)
      }
      this.currentAgent = this.agents[0]
      this.startFirstTurn(0)

    },
    startFirstTurn: function(i){
      var agent = this.agents[i]
      this.currentAgent = agent
      this.currentAgentIndex = i
      this.renderAgents.push(agent)
      this.addDelayText("[Agent 1 Located] - DATA:", agent.innerColor, 500)
      this.showAgentStats()
      this.addDelayText(agent.name + " is awaiting your command", [1,1,1,1], 1000)
      var a = function(c, game){
        switch(c){
          case "Explore":
            exploring = true
            game.addDelayText("[" + agent.name + "] Where should I go, boss?", agent.innerColor, 500)
            game.addDelayText("Click on one of the surrounding rooms to move your agent", [1,1,1,1], 250)
            game.updateDelayQueue()
            break;
          case "End Turn":
            console.log("Ending Turn (startFirst)")
            game.endTurn()
            break;
        }
      }
      this.addDelayChoice(["Explore", "End Turn"], a, 0)

    },
    getRandomAgent: function(){
      var r = parseInt(Math.random() * (this.gameData.agents.length - 1))
      var agent = this.gameData.agents[r]
      this.gameData.agents.splice(r, 1)
      return agent
    },
    addRandomRoom: function(pos){
      var r = parseInt(Math.random() * (this.gameData.rooms.length))
      var room
      room = this.gameData.rooms[r]
      this.gameData.rooms.splice(r, 1)
      console.log(room)
      room.position = pos
      this.addDelayText("[WARNING] NEW ROOM LOCATED - " + room.name, [1.0, 1.0, 0.0, 1.0], 50)
      this.currentAgent.position = pos
      camera.setLoc(pos)
      this.addRoom(room, [pos[0]/2, pos[1]/2, pos[2]/2])
      this.triggerRoom(room, true)
    },
    triggerRoom:function(room, n){
      if(n){
        this.addDelayText("["+this.currentAgent.name+"] " + room.description, this.currentAgent.innerColor, 1000)
        this.addDelayText(room.type, [1.0,1.0,1.0,1.0],100)
        //Temp end turn -- put after action!!!
        this.triggerRoomAction(room)
      }else{
          //Check if special
      }
    },
    triggerRoomAction: function(room){
      if(room.action[0] != "None"){
        var a = function(t, game){
          var room = game.rooms[game.currentAgent.position]
          if(t != "Continue"){
            var dRoll = game.processAction(room.action[3])
            game.addDelayText(game.currentAgent.name.split(" ")[0] + " needs a " + dRoll.type + " roll of " + dRoll.neededValue + " or higher",
          [1.0,1.0,1.0,1.0], 100)
          game.addDelayText("You rolled a " + dRoll.finalValue + "!", [1.0, 1.0, 1.0, 1.0], 3000)
          if(dRoll.finalValue >= dRoll.neededValue){
            game.addDelayText("["+game.currentAgent.name+"] " + String(room.actionWin), game.currentAgent.innerColor, 500)
          }else{
            game.addDelayText("["+game.currentAgent.name+"] " + String(room.actionFail), game.currentAgent.innerColor, 500)
          }
          var p = [room, game]
          game.delayQueue.push(new DelayAction(function(p){p[1].triggerRoomType(p[0])}, p, 1000))
          game.updateDelayQueue()
          }else{
            game.triggerRoomType(room)
            game.updateDelayQueue()
          }
        }
        var choices = [room.action[1]]
        if(room.action[2] == "C"){
          choices.push("Continue")
        }
        this.addDelayChoice(choices, a, 100)
        this.updateDelayQueue()
      }else{
        this.triggerRoomType(room)
        this.updateDelayQueue()
      }
    },
    triggerRoomType: function(room){
      switch(room.type){
        case "N":
          console.log("Ending Turn (No room type)")
          this.endTurn()
          this.updateDelayQueue()
          break
        case "I":
          var item = this.getRandomItem()
          if(item == null){
            console.log("Ending Turn (triggerRoom)")
            this.delayQueue.push(new DelayAction(function(p){p.endTurn()}, this, 1000))
            this.delayQueue.push(new DelayAction(function(p){p.updateDelayQueue()}, this, 50))
            this.updateDelayQueue()
            return
          }
          this.currentAgent.items.push(item)
          this.addDelayText(this.currentAgent.name.split(" ")[0] + " got an item!", [1.0, 1.0, 1.0, 1.0], 1000)
          this.addDelayText("[" + this.currentAgent.name +"] " + "Oh, I also found " + item.name + ".", this.currentAgent.innerColor, 500)
          this.addDelayText(item.description, [1.0, 1.0, 1.0, 1.0], 500)
          var p = [game]
          this.delayQueue.push(new DelayAction(function(p){p[0].endTurn()}, p, 1000))
          this.delayQueue.push(new DelayAction(function(p){p[0].updateDelayQueue()}, p, 50))
          break
        case "E":
          var eVent = this.getRandomEvent()
          if(eVent == null){
            console.log("Ending Turn (startFirst)")
            this.delayQueue.push(new DelayAction(function(p){p.endTurn()}, this, 1000))
            this.delayQueue.push(new DelayAction(function(p){p.updateDelayQueue()}, this, 50))
            this.updateDelayQueue()
            return
          }
          var dRoll = this.processAction(eVent.action)
          this.addDelayText("[" + eVent.title + "]", [0.0, 1.0, 0.0, 1.0], 500)
          this.addDelayText("[" + this.currentAgent.name +"]" + eVent.description, this.currentAgent.innerColor, 500)
          game.addDelayText(game.currentAgent.name.split(" ")[0] + " needs a " + dRoll.type + " roll of " + dRoll.neededValue + " or higher",
        [1.0,1.0,1.0,1.0], 100)
        this.addDelayText("You rolled a " + dRoll.finalValue + "!", [1.0, 1.0, 1.0, 1.0], 3000)
        if(dRoll.finalValue >= dRoll.neededValue){
          this.processEvent(eVent.win)
        }else{
          this.processEvent(eVent.lose)
        }
        var p = [game]
        this.delayQueue.push(new DelayAction(function(p){
          console.log("Ending Turn (startFirst)")
          p[0].endTurn()}, p, 1000))
        this.delayQueue.push(new DelayAction(function(p){p[0].updateDelayQueue()}, p, 50))
        this.updateDelayQueue()
          break
        case "O":
          var omen = this.getRandomOmen()
          if(omen == null || this.hauntRevealed){
            console.log("Ending Turn (startFirst)")
            this.delayQueue.push(new DelayAction(function(p){p.endTurn()}, this, 1000))
            this.delayQueue.push(new DelayAction(function(p){p.updateDelayQueue()}, this, 50))
            this.updateDelayQueue()
            return
          }
          this.omenCount += 1
          this.addDelayText("[WARNING!] " + omen.title + " detected!!", [1.0, 1.0, 0.0, 1.0], 50)
          this.addDelayText("["+ this.currentAgent.name +"] " + omen.description, [1.0, 1.0, 0.0, 1.0], 500)
          if(!this.hauntRevealed){
            this.addDelayText("[ALERT!] Probability of destabilization: " +String(parseInt((this.omenCount / this.omenLength) * 100))+ "%", [1.0, 0.0, 0.0, 1.0], 50)
            this.addDelayText("...", [1.0, 0.0, 0.0, 1.0], 1000)
            this.addDelayText("...", [1.0, 0.0, 0.0, 1.0], 2000)
            this.addDelayText("...", [1.0, 0.0, 0.0, 1.0], 1000)
            var dRoll = new DiceRoll(parseInt(this.omenLength/2), this.omenCount)
            dRoll.randomDiceRoll()
            var p = [this]
            if(dRoll.finalValue >= dRoll.neededValue){

              this.addDelayText("Success!! Destabilization stabilized!!", [0.0, 1.0, 0.0, 1.0], 1000)
              this.delayQueue.push(new DelayAction(function(p){p[0].endTurn()}, p, 1000))
              this.delayQueue.push(new DelayAction(function(p){p[0].updateDelayQueue()}, p, 50))
            }else{
              this.addDelayText("[ERROR!!] Spaceship destabilized!!!", [1.0, 0.0, 0.0, 1.0], 1000)
              this.delayQueue.push(new DelayAction(function(p){p[0].triggerRandomHaunt()}, p, 1000))
              this.delayQueue.push(new DelayAction(function(p){p[0].updateDelayQueue()}, p, 50))
            }
          }
          this.updateDelayQueue()
          break
      }
    },
    triggerRandomHaunt: function(){
      var haunt = this.getRandomHaunt()
      this.hauntRevealed = true
      this.processHaunt(haunt)
      this.updateDelayQueue()
    },
    endTurn: function(){
      if(this.hauntRevealed){
        if(this.currentAgentIndex == this.difficulty - 1){
          this.first = false
          this.performHauntTurn()
           this.currentAgentIndex += 1
        }else{
          var i = (this.currentAgentIndex == this.difficulty) ? 0 : (this.currentAgentIndex + 1)
          var p = [i, this]
          if(this.first){
            this.delayQueue.push(new DelayAction(function(p){
              p[1].startFirstTurn(p[0])
              p[1].currentAgent = p[1].agents[p[0]]
              camera.setLoc(p[1].currentAgent.position)
            }, p, 1000))
            this.delayQueue.push(new DelayAction(function(p){p[1].updateDelayQueue()}, p, 50))
            if(i == this.difficulty - 1){
              this.first = false
            }
          }else{
            this.startTurn(i)
          }
        }
      }else{
        if(this.currentAgentIndex == this.difficulty - 1){
          this.first = false
        }
        var i = (this.currentAgentIndex == this.difficulty - 1) ? 0 : (this.currentAgentIndex + 1)
        var p = [i, this]
        if(this.first){
          this.delayQueue.push(new DelayAction(function(p){
            p[1].startFirstTurn(p[0])
            p[1].currentAgent = p[1].agents[p[0]]
            camera.setLoc(p[1].currentAgent.position)
          }, p, 1000))
          this.delayQueue.push(new DelayAction(function(p){p[1].updateDelayQueue()}, p, 50))
          if(i == this.difficulty - 1){
            this.first = false
          }
        }else{
          this.startTurn(i)
        }
      }
      this.updateDelayQueue()
    },
    startTurn: function(i){
      var agent = this.agents[i]
      this.currentAgent = agent
      camera.setLoc(this.currentAgent.position)
      this.currentAgentIndex = i
      this.addDelayText("It is now [" + agent.name + "]'s turn", agent.innerColor, 500)
      this.addDelayText(agent.name + " is awaiting your command", [1,1,1,1], 1000)
      var a = function(c, game){
        switch(c){
          case "Explore":
            exploring = true
            game.addDelayText("[" + agent.name + "] Where should I go, boss?", agent.innerColor, 500)
            game.addDelayText("Click on one of the surrounding rooms to move your agent", [1,1,1,1], 250)
            game.updateDelayQueue()
            break;
          case "Show Stats":
            game.showAgentStats()
            var p = [game]
            game.delayQueue.push(new DelayAction(function(p){p[0].startTurn(p[0].currentAgentIndex)}, p, 500))
            game.delayQueue.push(new DelayAction(function(g){g.updateDelayQueue()}, game, 50))
            game.updateDelayQueue()
            break
          case game.currentHaunt.actions:
            game.performCustomAction()
            game.updateDelayQueue()
            break
          case "Attack":
            game.attack()
            break;
          case "End Turn":
            game.endTurn()
            break;
        }
      }
      var actions = ["Explore","Show Stats"]
      var withEnemy = false
      for(var i = 0; i < this.enemies.length; i++){
        if(this.currentAgent.position[0] == this.enemies[i].position[0] && this.currentAgent.position[2] == this.enemies[i].position[2]){
          withEnemy = true
        }
      }
      if(this.hauntRevealed && withEnemy){
        actions.push("Attack")
      }
      if(this.hauntRevealed && this.currentHaunt.customRooms != undefined){
        var inRoom = false
        for(var i = 0; i < this.currentHaunt.customRooms.length; i++){
          var currentRoom = this.rooms[this.currentAgent.position]
          if(currentRoom.name == this.currentHaunt.customRooms[i]){
            inRoom = true
          }
        }
        if(inRoom){
          actions.push(this.currentHaunt.actions)
        }
      }
      actions.push("End Turn")
      this.addDelayChoice(actions, a, 0)
      this.updateDelayQueue()
    },
    checkIfSelectable: function(p){
      var collided = false
      if(this.gameData.rooms.length != 0){
        Object.keys(this.selectableRooms).forEach(function(key){
          if(!collided){
            collided = (p == key)
          }
        })
      }
      Object.keys(this.rooms).forEach(function(key){
        if(!collided){
          collided = (p == key)
        }
      })
      return collided

    },
    processAction: function(t){
      var dRoll;
      var type = "unknown"
      if(t.charAt(0) == '('){
        var stat = t.split(/[(\)]{1,2}/)
        switch(stat){
          case "fuel":
            return (this.fuel == undefined) ? false : this.fuel
        }
      }
      if(t.charAt(0) == 'D'){
        dRoll = new DiceRoll(parseInt(t.charAt(1)), parseInt(t.charAt(3)))
        type = "DICE"
      }
      if(t.charAt(0) == 'M'){
        dRoll = new DiceRoll(this.currentAgent.might, parseInt(t.charAt(2)))
        type = "MIGHT"
      }
      if(t.charAt(0) == 'I'){
        dRoll = new DiceRoll(this.currentAgent.intelligence, parseInt(t.charAt(2)))
        type = "INTELLIGENCE"
      }
      if(t.charAt(0) == 'S'){
        if(t.charAt(1) == 'A'){
          dRoll = new DiceRoll(this.currentAgent.sanity, parseInt(t.charAt(2)))
          type = "SANITY"
        }else{
          dRoll = new DiceRoll(this.currentAgent.speed, parseInt(t.charAt(2)))
          type = "SPEED"
        }
      }
      if(t.charAt(0) == "H"){
        dRoll = new DiceRoll(1, -1)
      }
    dRoll.randomDiceRoll()
    dRoll.setType(type)
    return dRoll
  },
  processEvent: function(t){
    var c = this.currentAgent.innerColor
    var d = 1000
    var tS = "speed"
    var loG = " gained"
    if(t.charAt(0) == 'M'){
      tS = "might"
    }
    if(t.charAt(0) == 'I'){
      tS = "intelligence"
    }
    if(t.charAt(0) == 'S'){
      if(t.charAt(1) == 'A'){
        tS = "sanity"
      }else{
        tS = "speed"
      }
    }

    var mulFac = 1
    var loGFac = 0
    if(tS == "speed" || tS == "sanity"){
      loGFac = 1
    }
    if(t.charAt(1 + loGFac) == '-'){
      mulFac = -1
      loG = " lost"
    }
    var fac = mulFac * parseInt(t.charAt(2 + loGFac))
    this.addDelayText(game.currentAgent.name.split(" ")[0] + loG + " " + Math.abs(fac) + " points of " + tS + "!", c, d)
    switch(tS){
      case "might":
        this.currentAgent.might += fac
        break
      case "speed":
        this.currentAgent.speed += fac
        break
      case "sanity":
        this.currentAgent.sanity += fac
        break
      case "intelligence":
        this.currentAgent.intelligence += fac
        break
    }
  },
  getRandomItem: function(){
    var r = parseInt(Math.random() * (this.gameData.items.length))
    var item = this.gameData.items[r]
    this.gameData.items.splice(r, 1)
    return item
  },
  getRandomEvent: function(){
    var r = parseInt(Math.random() * (this.gameData.events.length))
    var event = this.gameData.events[r]
    this.gameData.events.splice(r, 1)
    return event
  },
  getRandomOmen: function(){
    var r = parseInt(Math.random() * (this.gameData.omens.length))
    var omens = this.gameData.omens[r]
    this.gameData.omens.splice(r, 1)
    return omens
  },
  getRandomHaunt: function(){
    var r = parseInt(Math.random() * (this.gameData.haunts.length))
    var haunt = this.gameData.haunts[r]
    this.gameData.haunts.splice(r, 1)
    return haunt
  },
  processHaunt: function(haunt){
    this.currentHaunt = haunt
    this.addDelayText(haunt.name + " appeared!!", [1.0, 1.0, 1.0, 1.0], 500)
    this.addDelayText(haunt.description, [1.0, 1.0, 1.0, 1.0], 500)
    var goalParts = haunt.goal.split(/[{\}]{1,2}/)
    switch(goalParts[1]){
      case "CUSTOM":
        haunt.type = "CUSTOM"
        haunt.customRooms = goalParts[2].split(",")
        haunt.action = goalParts[3]
        console.log(haunt.customRooms)
      case "KILL":
        var enemies = haunt.enemies.split(/[{\}]{1,2}/)
        var enemyNum = enemies[2]
        var enemyAttribs = enemies[1].split(" ")
        var pos = this.getRandomEnemyPos().position
        for(var i = 0; i < enemyNum; i ++){
          var enemy = new Enemy(enemyAttribs[0], enemyAttribs[1], enemyAttribs[2], pos)
          game.enemies.push(enemy)
          console.log(game.enemies)
        }

    }
    this.delayQueue.push(new DelayAction(function(g){
      console.log("Ending Turn (startFirst)")
      g.endTurn()}, this, 50))
  },
  performCustomAction: function(){
    this.addDelayText("["+this.currentAgent.name+"] Trying to stabilize now...", this.currentAgent.innerColor, 500)
    var a = function(t, game){
      var dRoll = game.processAction(game.currentHaunt.action)
      game.addDelayText(game.currentAgent.name.split(" ")[0] +" needs a " + dRoll.type + " roll of " + dRoll.neededValue + "+ or higher.", [1.0,1.0,1.0,1.0], 500)
      game.addDelayText(game.currentAgent.name.split(" ")[0] +" rolled a " + dRoll.finalValue + "!", [1.0,1.0,1.0,1.0], 500)
      if(dRoll.finalValue >= dRoll.neededValue){
        game.addDelayText("Success!! The room stabilized!!", [1.0,1.0,1.0,1.0], 500)
        var currentRoom = game.rooms[game.currentAgent.position]
        for(var i = 0; i < game.currentHaunt.customRooms.length; i++){
          if(game.currentHaunt.customRooms[i].name == currentRoom.name){
            game.currentHaunt.customRooms.splice(i, 1)
          }
        }
      }else{
        game.addDelayText("You didn't manage to stabilize the room. You can always try again on your next turn!", [1.0,1.0,1.0,1.0], 500)
      }
      if(game.currentHaunt.customRooms != 0){
        game.addDelayText("You still have " + game.currentHaunt.customRooms.length + " rooms left to stabilize", [1.0,1.0,1.0,1.0], 500)
        game.delayQueue.push(new DelayAction(function(g){g.endTurn()}, game, 10))
      }else{
        game.addDelayText("Congratulations!! You stabilized all the rooms!!", [1.0,1.0,1.0,1.0], 500)
        game.addDelayText(game.currentHaunt.win, [1.0,1.0,1.0,1.0], 500)
        game.addDelayText("Reload to replay", [1.0,1.0,1.0,1.0], 500)
      }
      game.updateDelayQueue()
    }
    this.addDelayChoice(["Roll"], a, 500)
  },
  performHauntTurn: function(){
    console.log("Haunts Turn")
    var haunt = this.currentHaunt
    //To center
    camera.setLoc(this.getCenter())
    camera.setZoom(Object.keys(this.rooms).length * 5)
    camera.setPitch(90)

    switch(this.currentHaunt.goal.split(/[{\}]{1,2}/)[1]){
      case "CUSTOM":
        this.addDelayText("[WARNING] ROOM DESTABILIZING", [1.0, 1.0, 0.0, 1.0], 500)
        this.delayQueue.push(new DelayAction(function(g){g.removeRandomRoom()}, this, 1000))
        this.addDelayText("RUN FROM THE COLLAPSE", [1.0, 0.4, 0.0, 1.0], 500)
        this.delayQueue.push(new DelayAction(function(g){
          console.log("Ending Turn (startFirst)")
          g.endTurn()}, this, 500))
        break;
      case "KILL":
        this.enemyAttacking = true
        this.moveEnemies()
    }
  },
  removeRandomRoom: function(){
    if(this.removedRooms.length == 0){
      var room = undefined
      while(room == undefined){
        var keys = Object.keys(game.rooms)
        var r = parseInt(Math.random() * (keys.length))
        var tempRoom = this.rooms[String(keys[r]).split(",")]
        if(this.compareRoomNames(tempRoom) && this.compareRoomAgents(tempRoom)){
          room = tempRoom
        }
      }
      this.removedRooms.push(room)
      delete this.rooms[room.position]
      return room
    }else{
      var lastRemovedRoom = this.removedRooms[this.removedRooms.length -1]
      var removedRoom
      for(var i = 1; i < 5; i++){
        if(i % 2 == 0){
          var fac = 1
          if(i == 4){
            fac = -1
          }
          removedRoom = this.rooms[[lastRemovedRoom[0]+fac*2,0,lastRemovedRoom[2]]]
        }else{
          var fac = 1
          if(i == 3){
            fac = -1
          }
          removedRoom = this.rooms[[lastRemovedRoom[0],0,lastRemovedRoom[2]+fac*2,0]]
        }
        if(removedRoom != undefined && compareRoomNames(removedRoom)){
          break;
        }
      }
      if(removedRoom == undefined){
        while(removedRoom == undefined){
          var keys = Object.keys(game.rooms)
          var r = parseInt(Math.random() * (keys.length))
          var tempRoom = this.rooms[String(keys[r]).split(",")]
          if(this.compareRoomNames(tempRoom)){
            removedRoom = tempRoom
          }
        }
      }
      if(removedRoom == undefined){
        this.hauntLose()
        return
      }
      this.removedRooms.push(removedRoom)
      delete this.rooms[removedRoom.position]
      return removedRoom
    }
  },
  compareRoomNames: function(room){
    for(var i = 0; i < this.currentHaunt.customRooms.length; i++){
      var cRoom = this.currentHaunt.customRooms[i]
      if(room.name == cRoom){
        return false
      }
    }
    return true
  },
  compareRoomAgents: function(room){
    for(var i = 0; i < this.agents.length; i++){
      var roomX = (room.position[0] == this.agents[i].position[0])
      var roomY = (room.position[2] == this.agents[i].position[2])
      if(roomX && roomY){
        return false
      }
    }
    return true
  },
  getCenter: function(){
      var points = this.getXYPoints()
      var totalX = 0
      var totalY = 0
      for(var i = 0; i < points.length; i++){
        totalX += points[i][0]
        totalY += points[i][1]
      }
      var center = [(totalX / points.length), 0,(totalY / points.length)]
      return center
  },
  getPath: function(a, b){

  },
  getXYPoints: function(){
    var points = []
    Object.keys(game.rooms).forEach(function(key){
      room = game.rooms[key]
      points.push([room.position[0], room.position[2]])
    })
    return points
  },
  hauntLose: function(){
    this.addDelayText(this.currentHaunt.lose, [1.0, 1.0, 1.0, 1.0], 500)
    this.addDelayText("Reload to replay", [0.0, 1.0, 0.0, 1.0], 1000)
    this.updateDelayQueue()
  },
  hauntWin: function(){
    this.addDelayText(this.currentHaunt.win, [1.0, 1.0, 1.0, 1.0], 500)
    this.addDelayText("Reload to replay", [0.0, 1.0, 0.0, 1.0], 1000)
    this.updateDelayQueue()
  },
  getRandomEnemyPos: function(){
    var room = undefined
    while(room == undefined){
      var keys = Object.keys(game.rooms)
      var r = parseInt(Math.random() * (keys.length))
      var tempRoom = this.rooms[String(keys[r]).split(",")]
      if(this.compareRoomAgents(tempRoom)){
        room = tempRoom
      }
    }
    return room

  },
  moveEnemies: function(){
    var speedRoll = new DiceRoll(this.enemies[0].speed, 0)
    speedRoll.randomDiceRoll()
    var speed = speedRoll.finalValue
    for(var i = 0; i < this.enemies.length; i++){
      var enemy = this.enemies[i]
      var closestAgent = this.findClosestAgent(enemy.position)
      while(speed != 0){
        var currentD = 100
        var pos = undefined
        for(var j = 1; j < 5; j++){
          tempPos = [0, 0, 0]
          if(j % 2 == 0){
            var fac = 1
            if(j == 4){
              fac = -1
            }
            tempPos = [enemy.position[0]+fac*2,0,enemy.position[2]]
          }else{
            var fac = 1
            if(j == 3){
              fac = -1
            }
            tempPos = [enemy.position[0],0,enemy.position[2]+(fac*2)]
          }
          var room = this.rooms[tempPos]
          if(room == undefined){
            continue;
          }
          var d = this.getDistance(tempPos, closestAgent.position)
          if(d < currentD){
            currentD = d
            pos = tempPos
          }
        }
        var p = [pos, this, i, "FUNNY"]
        this.delayQueue.push(new DelayAction(function(p){
          p[1].enemies[p[2]].position = p[0]}, p, 500))
        for(var j = 0; j < this.agents.length; j++){
          if(this.agents[j].position[0] == pos[0] && this.agents[j].position[2] == pos[2]){
            var params = [pos, this, i, j]
            this.addDelayText("The enemy is attacking!!", [1.0, 0.0, 0.0, 1.0], 1000)
            this.delayQueue.push(new DelayAction(function(pa){
              pa[1].fight(pa[1].agents[pa[3]])
            },params, 500))
            this.updateDelayQueue()
            return
          }
        }
        speed -= 1
      }

      this.delayQueue.push(new DelayAction(function(g){
        console.log("Ending Turn (startFirst)")
        g.endTurn()}, this, 1000))
      this.updateDelayQueue()
    }
  },
  attack: function(){
    if(this.currentAgent.items.length > 0){
      this.showItems()
    }else{
      this.fight(this.currentAgent)
    }
  },
  fight: function(givenAgent){
    var enemy = this.enemies[0]
    var agent = givenAgent
    var fac = 0
    this.addDelayText(this.currentAgent.name.split(" ")[0] + " approached the enemy!!", [1.0, 1.0, 1.0, 1.0], 500)

    if(this.currentItem != undefined && !this.enemyAttacking){
      console.log(this.currentItem)
    }
    var dRollEnemy = new DiceRoll(enemy.might, 0)
    var dRollAgent = new DiceRoll(agent.might, 0)
    dRollEnemy.randomDiceRoll()
    dRollAgent.randomDiceRoll()
    this.addDelayText(this.currentAgent.name.split(" ")[0] + " had a might roll of " + dRollAgent.finalValue + "!", [1.0, 1.0, 1.0, 1.0], 100)
    this.addDelayText("The enemy had a might roll of " + dRollEnemy.finalValue+"!", [1.0, 1.0, 1.0, 1.0], 100)
    if(dRollEnemy.finalValue > dRollAgent.finalValue){
      var damage = dRollEnemy.finalValue - dRollAgent.finalValue
      this.addDelayText(this.currentAgent.name.split(" ")[0] + " took " + damage+" points of damage!", [1.0, 1.0, 1.0, 1.0], 100)
      var physicalHealth = agent.might + agent.speed
      if(physicalHealth <= damage){
        this.addDelayText(this.currentAgent.name.split(" ")[0] + " died", [1.0, 0.0, 0.0, 1.0], 100)
        this.killAgent()
        return
      }
      while(this.currentAgent.might != 1 && damage != 0){
        this.currentAgent.might -= 1
        damage -= 1
      }
      while(this.currentAgent.speed != 1 && damage != 0){
        this.currentAgent.speed -= 1
        damage -= 1
      }
      this.delayQueue.push(new DelayAction(function(g){
        console.log("Ending Turn (startFirst)")
        g.endTurn()}, this, 1000))

    }else{
      var damage = dRollEnemy.finalValue - dRollAgent.finalValue
      this.addDelayText("Success! The enemy took " + damage+" points of damage!", [0.0, 1.0, 1.0, 1.0], 100)
      var physicalHealth = enemy.health
      if(physicalHealth <= damage){
        this.addDelayText("Congrats! The enemy has fallen", [1.0, 0.0, 0.0, 1.0], 100)
        this.hauntLose()
        return
      }
      while(this.enemies[0].health != 1 && damage != 0){
        this.enemies[0].health -= 1
        damage -= 1
      }
      this.delayQueue.push(new DelayAction(function(g){
        console.log("Ending Turn (startFirst)")
        g.endTurn()}, this, 1000))
    }
    this.enemyAttacking = false
    this.updateDelayQueue()
  },
  killAgent: function(){
    var index = 0
    for(var i = 0; i < this.agents.length; i++){
      if(this.agents[i].name == this.currentAgent.name){
        index = i
        break
      }
    }
    this.agents.splice(index, 1)
    if(this.agents.length == 0){
      this.addDelayText("All your agents have fallen :(...", [1.0, 0.3, 0.0, 1.0], 500)
      this.hauntLose()
      this.updateDelayQueue()
    }
  },
  showItems: function(){
    this.addDelayText("Which item would you like to use?", [1.0, 1.0, 1.0, 1.0])
    var a = function(t, game){
      for(var i = 0; i < this.currentAgent.items.length; i++){
        if(t == this.currentAgent.items[i].name){
          this.currentItem = this.currentAgent.items[i]
        }
      }
      game.delayQueue.push(new DelayAction(function(g){g.fight()}, game, 500))
      game.updateDelayQueue()
    }
    var itemNames = []
    for(var i = 0; i < this.currentAgent.items.length; i++){
      itemNames.push(this.currentAgent.items[i].name)
    }
    this.addDelayChoice(itemNames, a, 100)
    this.updateDelayQueue()
  },
  findClosestAgent: function(p){
    var agentXY = this.getAgentXY()
    var pXY = [p[0], p[2]]
    var dist = 100
    var closest = undefined
    for(var i = 0; i < agentXY.length; i++){
      var xDist = Math.abs(pXY[0] - agentXY[i][0])
      var yDist = Math.abs(pXY[1] - agentXY[i][1])
      var d = Math.sqrt((xDist*xDist) + (yDist*yDist))
      if(d < dist){
        closest = agentXY[i][2]
        dist = d
      }
    }
    return closest
  },
  getAgentXY: function(){
    var XY = []
    for(var i = 0; i < this.agents.length; i++){
      XY.push([this.agents[i].position[0], this.agents[i].position[2], this.agents[i]])
    }
    return XY
  },
  getDistance: function(p1, p2){
    var xDist = Math.abs(p1[0] - p2[0])
    var yDist = Math.abs(p1[2] - p2[2])
    var d = Math.sqrt((xDist*xDist) + (yDist*yDist))
    return d
  },
  showAgentStats: function(){
    var agent = this.currentAgent
    this.addDelayText("[Agent "+ this.currentAgentIndex+"] Name: " + agent.name, agent.innerColor, 500)
    this.addDelayText("[Agent "+ this.currentAgentIndex+"] Speed: " + agent.speed, agent.innerColor, 500)
    this.addDelayText("[Agent "+ this.currentAgentIndex+"] Might: " + agent.might, agent.innerColor, 500)
    this.addDelayText("[Agent "+ this.currentAgentIndex+"] Sanity: " + agent.sanity, agent.innerColor, 500)
    this.addDelayText("[Agent "+ this.currentAgentIndex+"] Intelligence: " + agent.intelligence, agent.innerColor, 500)
  }
  }
