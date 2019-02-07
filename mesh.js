function OBJ(string){
  this.lines = string.split("\n");
  this.positions = [];
  this.texCoords = [];
  this.vertices = [];


  for(var i = 0; i < this.lines.length; i++){
    var parts = this.lines[i].trimRight().split(' ');
    if(parts.length > 0){
      switch(parts[0]){
        case 'v': this.positions.push(
          glMatrix.vec3.fromValues(
            (parts[1]),
            (parts[2]) ,
            (parts[3]),
          )
        );
          break;
        case 'vt': this.texCoords.push(
          glMatrix.vec2.fromValues(
            parts[1],
            parts[2]
          )
        );
          break;
        case 'f':
          var f1 = parts[1].split('/');
          var f2 = parts[2].split('/');
          var f3 = parts[3].split('/');

          Array.prototype.push.apply(
           this.vertices, this.positions[parseInt(f1[0]) - 1]
         );
         Array.prototype.push.apply(
           this.vertices, this.texCoords[parseInt(f1[1]) - 1]
         );
         Array.prototype.push.apply(
           this.vertices, this.positions[parseInt(f2[0]) - 1]
         );
         Array.prototype.push.apply(
           this.vertices, this.texCoords[parseInt(f2[1]) - 1]
         );
         Array.prototype.push.apply(
           this.vertices, this.positions[parseInt(f3[0]) - 1]
         );
         Array.prototype.push.apply(
           this.vertices, this.texCoords[parseInt(f3[1]) - 1]
         );
         break;

      }
    }
  }
  this.vertexCount = this.vertices.length / 5;
  console.log("Loaded mesh with " + this.vertexCount + " vertices");

}

function loadMesh(filename) {
  var object;
  const request = async () => {
    const response = await fetch(filename);
    const text = await response.text();
    object = new OBJ(text)
    return object;
  }

  request();

  }
