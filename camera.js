function Camera(locRot){
  var x = new SmoothFloat(locRot[0], 30)
  var y = new SmoothFloat(locRot[1], 30)
  var z = new SmoothFloat(locRot[2], 30)
  this.locRot = [x,y,z];
  this.dP = new SmoothFloat(8, 30);
  this.aP = new SmoothFloat(45, 50);
  this.position = new Vector(0, 0, 0)
  this.yaw = 0.0;
  this.pitch = new SmoothFloat(45.0, 50)
  this.zoomUpdate = 0.01
  this.pitchUpdate = 0.03
}

Camera.prototype = {
  move: function(mouseX, mouseY, mouseDown, wheelDelta) {
    this.zoom(wheelDelta);
    this.look(mouseX, mouseY, mouseDown);
    var hD = this.calculatehD();
    var vD = this.calculatevD();
    this.pos(hD, vD);
  },
  zoom: function(wheelDelta) {
    if(wheelDelta != 0){
      this.zoomUpdate = 0.01
    }
    var targetZoom = this.dP.getTarget();
    var zoomLevel = wheelDelta * 0.0004 * targetZoom;
    targetZoom -= zoomLevel;
    if(targetZoom < 4){
      targetZoom = 4;
    }
    if(targetZoom > 100){
      targetZoom = 100;
    }
    this.dP.setTarget(targetZoom);
    this.dP.update(this.zoomUpdate);
  },
  look: function(mouseX, mouseY, mouseDown) {
    if(mouseDown){
      this.pitchUpdate = 0.03
      var angleChange = mouseX;
      this.aP.increaseTarget(-angleChange);

      var pitchChange = mouseY;
      var newPitch = this.pitch.get() - pitchChange
      if(newPitch < 0){
        newPitch = 0;
      }
      if(newPitch > 90){
        newPitch = 90;
      }
      this.pitch.setTarget(newPitch);
    }
    this.pitch.update(this.pitchUpdate)
    this.aP.update(0.01);
  },
  calculatehD: function() {
    var hD = this.dP.get() * Math.cos(radians(this.pitch.get()));
    return hD;
  },
  calculatevD: function() {
    return this.dP.get() * Math.sin(radians(this.pitch.get()));
  },
  pos: function(hD, vD){
    var theta = this.aP.get();
    var offX = hD * Math.sin(radians(theta));
    var offZ = hD * Math.cos(radians(theta));
    this.position.x = this.locRot[0].get() - offX;
    this.position.z = this.locRot[2].get() - offZ;
    this.position.y = this.locRot[1].get() + vD;
    this.yaw = this.aP.get();
  },
  viewMatrix: function() {
    var vMat = new Float32Array(16);
    glMatrix.mat4.identity(vMat);
    glMatrix.mat4.rotate(vMat, vMat, radians(this.pitch.get()), [1, 0, 0]);
    glMatrix.mat4.rotate(vMat, vMat, radians(-this.yaw), [0, 1, 0]);
    glMatrix.mat4.translate(vMat, vMat, [this.position.x, -this.position.y, this.position.z]);
		return vMat;
  },
  setZoom: function(zoom){
    this.dP.setTarget(zoom)
    this.zoomUpdate = 0.003
  },
  setPitch: function(pitch){
    this.pitch.setTarget(pitch)
    this.pitchUpdate = 0.003
  },
  setLoc: function(pos){
    var currentLoc = this.locRot
    var xIncrease = (-1 * pos[0]) - currentLoc[0].get()
    var yIncrease = (-1 * pos[1]) - currentLoc[1].get()
    var zIncrease = (-1 * pos[2]) - currentLoc[2].get()
    this.locRot[0].setTarget(-1 * pos[0])
    this.locRot[1].setTarget(-1 * pos[1])
    this.locRot[2].setTarget(-1 * pos[2])
  },
  updateLoc: function(){
    this.locRot[0].update(0.005)
    this.locRot[1].update(0.005)
    this.locRot[2].update(0.005)
  }

};
