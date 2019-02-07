function SmoothFloat(start, agility){
  this.target = start;
  this.actual = start;
  this.agility = agility;
}

SmoothFloat.prototype = {
  update: function(delta){
    var offset = this.target - this.actual;
    var change = delta * offset * this.agility;
    this.actual += change;
  },
  increaseTarget: function(dT){
    this.target += dT;
  },
  setTarget : function(dT){
    this.target = dT;
  },
  instantIncrease: function(increase){
    this.actual += increase;
  },
  get: function(){
    return this.actual;
  },
  getTarget: function(){
    return this.target;
  }
};
