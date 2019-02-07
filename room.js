function Room(x, y, z, mesh){
  this.pos = new Vector(x*2, y*2, z*2);
  this.name = "Empty Room";
  this.type = 'blank';
  this.mesh = mesh;
}

Room.prototype = {
  createRandom: function(seed) {

  },

  create: function() {

  }
}
