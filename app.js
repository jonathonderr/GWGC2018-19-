const canvas = document.querySelector("#glCanvas");

var worldMatrix = new Float32Array(16);
var viewMatrix = new Float32Array(16);
var projMatrix = new Float32Array(16);
glMatrix.mat4.perspective(projMatrix, 45*3.14/180, canvas.width/canvas.height, 0.1, 10000.1 );



var glslScrollX = ((1497 * 2 -(1920.0/2.0))/1920.0) - 0.5;
var glslScrollY = -((315 * 2 -(1080.0/2.0))/1080.0) + 0.5;
var glslScrollScaleX = 720.0/1920.0;
var glslScrollScaleY = 480.0/1080.0

var uis = [];
uis.push(new UI(((573 * 2 -(1920.0/2.0))/1920.0) - 0.5,
 -((567 * 2 -(1080.0/2.0))/1080.0) + 0.5,
 1024.0/1920.0, 768.0/1080.0,
 "framebuffer", "m1"))
uis.push(new UI(glslScrollX, glslScrollY, glslScrollScaleX, glslScrollScaleY,
   "color", [7/255, 8/255, 47/255, 1.0]))


var textCanvas = document.getElementById("text");
var ctx = textCanvas.getContext("2d");
var lineHeight = 25;

var scrollX =  (1147/1920) * canvas.width;
var scrollY = (83/768) * canvas.height;
var scrollWidth = (710/1920) * canvas.width;
var scrollHeight = (480/1080) * canvas.height;
var scrollCurrentY = new SmoothFloat(4, 20);
var scrollMaxHeight = 0.0;
var mouseInScrollWindow = false;
//var scrollObjects = []

var activeButtons = {};
var buttonActions = [];



uis.push(new UI(0, 0, 1, 1, "pic", "overlay"));

//scrollObjects.push(new UI(0, 0, 0.14, 0.1, "button", ["Move", "Show Stats", "Custom"], 50));


var textures = new Map([]);

var objs = [];

var fbTexture;
const fbWidth = 1024;
const fbHeight = 768;
var fb;

var wheelDelta = 0.0;
var mouseX = 0.0;
var mouseY = 0.0;
var mouseRay = glMatrix.vec3.fromValues(0, 0, 0);
var currentMousePoint = glMatrix.vec3.fromValues(0, 0, 0);

var origin = [0,0,0];
var camera = new Camera(origin);

//Gameplay
var viewing = true
var exploring = false
var rooms = [];
//Temp rooms -- Draw from game.txt
rooms.push(new Room(0, 0, 0));
var currentRoom = [0, 0, 0]

var gameLoader = new GameLoader("game.txt")
var game

main();

async function main() {

  await gameLoader.loadGame()
  gameLoader.compile()
  game = new GameLogic(gameLoader)
  game.start()
  uis.push(new UI(0, 0, 1, 1, "scrollable", game.scroller));

  // Initialize the GL context
  const gl = canvas.getContext("webgl");

  // Only continue if WebGL is available and working
  if (!gl) {
    alert("Unable to initialize WebGL. Your browser or machine may not support it.");
    return;
  }

  // Set clear color to black, fully opaque
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  // Clear the color buffer with specified clear color
  gl.clear(gl.COLOR_BUFFER_BIT || gl.DEPTH_BUFFER_BIT);
  //gl.enable(gl.DEPTH_TEST);
  //gl.enable(gl.CULL_FACE);
  gl.frontFace(gl.CCW);
  gl.cullFace(gl.BACK);

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.getExtension('OES_standard_derivatives');

  var rShader = new Shader(vsRoom, fsRoom, gl);
  rShader.compile();
  rShader.linkProgram();
  var uiShader = new Shader(vsUI, fsUI, gl);
  uiShader.compile();
  uiShader.linkProgram();
  var tShader = new Shader(vsChar, fsChar, gl);
  tShader.compile();
  tShader.linkProgram();

  var boxText;


  const request1 = async () => {
    const br = await fetch('b.obj');
    const bt = await br.text();
    boxText = bt;
  }
  await request1();

  var box = new OBJ(boxText);
  objs.push(box);

  var roomTex = loadImageAndCreateTextureInfo('b.png', gl);
  var overlayTex = loadImageAndCreateTextureInfo('gwgc201819_overlay.png', gl);
  textures.set("overlay", overlayTex);
  textures.set("room", roomTex);

  gl.useProgram(rShader.program);


  var matWorldUniformLocation = gl.getUniformLocation(rShader.program, 'mWorld');
  var matViewUniformLocation = gl.getUniformLocation(rShader.program, 'mView');
  var matProjUniformLocation = gl.getUniformLocation(rShader.program, 'mProj');
  var mouseUniform = gl.getUniformLocation(rShader.program, 'mouse');


  glMatrix.mat4.identity(worldMatrix);
  glMatrix.mat4.translate(worldMatrix, worldMatrix, glMatrix.vec3.fromValues(0, 0, 0));
  glMatrix.mat4.lookAt(viewMatrix, [0, 0, -5], [0, 0, 0,], [0, 1, 0]);
  glMatrix.mat4.perspective(projMatrix, 45*3.14/180, canvas.width/canvas.height, 0.1, 10000.1 );
  //glMatrix.mat4.ortho(projMatrix, -6.0, 6.0, -3.5, 3.5, 0.1, 10000.0);

  gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);
  gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, viewMatrix);
  gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);
  gl.uniform2f(mouseUniform, 0.0, 0.0);


var mouseDown = false;
var mouseDX = 0.0;
var mouseDY = 0.0;
var mouseWorld = glMatrix.vec3.create()

     //mousePos
     var pos;
     window.addEventListener('mousemove', e => {
          pos = getNoPaddingNoBorderCanvasRelativeMousePosition(e, gl.canvas);
          var x = pos.x / gl.canvas.width * 2 -1;
          var y = pos.y / gl.canvas.height * -2 + 1;
          gl.useProgram(rShader.program);
          gl.uniform2f(mouseUniform, x, y);
          var rotFactorX = canvas.width/15;
          var rotFactorY = canvas.height/15;
          mouseDX = rotFactorX * (x - mouseX);
          mouseDY = rotFactorY * (y - mouseY);

          mouseX = x;
          mouseY = y;

          mouseInScrollWindow = false;

          if(mouseX > scrollWidth/2 / 1920 && mouseX < (glslScrollX + (scrollWidth/1920))){
            if(mouseY < (glslScrollY + 10/1080) * 2 && mouseY > glslScrollY - glslScrollScaleY){
              mouseInScrollWindow = true;
            }
          }


          var screenX = mouseX / (1024.0/1920) + ((1920-480)/1920);
          if(screenX > 1){
            screenX = 1
          }
          if(screenX < -1){
            screenX = -1
          }
          var screenY = mouseY / (768/1080) + ((80)/1080);
          if(screenY > 1){
            screenY = 1
          }
          if(screenY < -1){
            screenY = -1
          }
          var clipCoords = glMatrix.vec4.fromValues(screenX, screenY, -1, -1)
          var invertedProjection = new Float32Array(16);
          glMatrix.mat4.invert(invertedProjection, projMatrix)
          var eyeCoords = glMatrix.vec4.create();
          glMatrix.vec4.transformMat4(eyeCoords, clipCoords, invertedProjection);
          eyeCoords =  glMatrix.vec4.fromValues(eyeCoords[0], eyeCoords[1], -1, 0)
          var inverseViewMat = new Float32Array(16)
          glMatrix.mat4.invert(inverseViewMat, camera.viewMatrix());
          var worldRay = glMatrix.vec4.create()
          glMatrix.vec4.transformMat4(worldRay, eyeCoords, inverseViewMat)
          mouseRay = glMatrix.vec3.fromValues(worldRay[0], worldRay[1], worldRay[2])
          glMatrix.vec3.normalize(mouseRay, mouseRay);

     });

     window.addEventListener('mousedown', e =>{

       mouseDown = true;
     });

     window.addEventListener('mousewheel', e=>{
       wheelDelta = e.wheelDelta;
     });

     window.addEventListener('mouseup', e => {
       mouseDown = false;
       for(bKey in activeButtons){
         var button = activeButtons[bKey];
          if(mouseX > button[0][0] && mouseX < (button[0][0] + button[0][2])
          && mouseY > button[0][1] + (scrollCurrentY.get() - 4)
          && mouseY < (button[0][1] + button[0][3]) + (scrollCurrentY.get() - 4)){
           buttonActions[button[1]](button[2].data[button[1]], game);
           button[2].selected[button[1]] = 1;
           activeButtons = [];
           buttonActions = [];
           button[2].active = false
           break;
         }
       }

       var msWrld = (this.mouseWorld == undefined) ? 0 : this.mouseWorld
       var rayColX = Math.floor((msWrld[0]+1)/2) * 2
       var rayColZ = Math.floor((msWrld[2]+1)/2) * 2

       if(exploring && game.checkIfSelectable([rayColX, 0, rayColZ]) && !mouseInScrollWindow){
         exploring = false
         var pos = game.addRandomRoom([rayColX, 0, rayColZ])
         game.updateDelayQueue()
         //game.moveCurrentAgentNewRoom(pos)
       }


     });


fbTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, fbTexture);

{
  // define size and format of level 0
  const level = 0;
  const internalFormat = gl.RGBA;
  const border = 0;
  const format = gl.RGBA;
  const type = gl.UNSIGNED_BYTE;
  const data = null;
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                fbWidth, fbHeight, border,
                format, type, data);

  // set the filtering so we don't need mips
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Create and bind the framebuffer
  fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

  // attach the texture as the first color attachment
  const attachmentPoint = gl.COLOR_ATTACHMENT0;
  gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, fbTexture, level);
}

  //*****************************RENDERER**********************
  //Main Render loop
  var loop = function () {

    //Renderer
    camera.move(mouseDX, mouseDY, mouseDown, mouseInScrollWindow ? 0.0 : wheelDelta);
    camera.updateLoc((game.currentAgent == undefined) ? [0,0,0] : game.currentAgent.position)
    mouseDX = 0;
    mouseDY = 0;
    gl.useProgram(rShader.program);
    gl.uniformMatrix4fv(matViewUniformLocation, gl.FALSE, camera.viewMatrix());

    calculateRayIntersection();

    glMatrix.mat4.perspective(projMatrix, 45*3.14/180, canvas.width/canvas.height, 0.1, 10000.1 );
    gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);

    renderToFrameBuffer(gl, [rShader, tShader], projMatrix);
    render(gl, uiShader, projMatrix);


    wheelDelta = 0;

    requestAnimationFrame(loop)
  };
  requestAnimationFrame(loop);

}

function getRelativeMousePosition(event, target) {
  target = target || event.target;
  var rect = target.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

function loadImageAndCreateTextureInfo(url, gl) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                  new Uint8Array([0, 0, 255, 255]));

    // let's assume all images are not a power of 2
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    var textureInfo = {
      width: 1,   // we don't know the size until it loads
      height: 1,
      texture: tex,
    };
    var img = new Image();
    img.addEventListener('load', function() {
      textureInfo.width = img.width;
      textureInfo.height = img.height;

      gl.bindTexture(gl.TEXTURE_2D, textureInfo.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    });
    requestCORSIfNotSameOrigin(img, url);
    img.src = url;
    return textureInfo;
  }

function getNoPaddingNoBorderCanvasRelativeMousePosition(event, target) {
  target = target || event.target;
  var pos = getRelativeMousePosition(event, target);

  pos.x = pos.x * target.width  / target.clientWidth;
  pos.y = pos.y * target.height / target.clientHeight;

  return pos;
}

function requestCORSIfNotSameOrigin(img, url) {
  // if ((new URL(url)).origin !== window.location.origin) {
  //   img.crossOrigin = "";
  // }
  img.crossOrigin = "";
}

function renderUIS(gl, program){
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    gl.useProgram(program);
    for(var i = 0; i < uis.length; i++){
      switch(uis[i].type){
        case "pic":
          renderUI(gl, program, uis[i], uis[i].type, textures.get(uis[i].data).texture);
          break;
        case "color":
          renderUI(gl, program, uis[i], uis[i].type, uis[i].data);
          break;
        case "framebuffer":
          renderUI(gl, program, uis[i], uis[i].type, fbTexture);
          break;
        case "scrollable":
          renderScrollerObjects(gl, program);
          break;
        case "text":
          renderUI(gl, program, uis[i], uis[i].type, uis[i].data);
          break;
        case "button":
          renderUI(gl, program, uis[i], uis[i].type, uis[i].data);
          renderUI(gl, program, uis[i], "bText", uis[i].data);
          break;
      }
    }
}

function renderScrollerObjects(gl, program){

  var height = 0;

  for (var i = 0; i < game.scroller.length; i++){
    switch(game.scroller[i].type){
      case "text":
      renderUI(gl, program, game.scroller[i], game.scroller[i].type, game.scroller[i].data,
        height - (scrollCurrentY.get() - 4) * 540);
        height += game.scroller[i].height;
        break;
      case "color":
      var bHeight = game.scroller[i].height/1080;
      var bY = 1 - (75/540) - (bHeight) - (height + game.scroller[i].height)/540;
      renderUI(gl, program, game.scroller[i], "scrlColor", game.scroller[i].data,
        bHeight, bY + (scrollCurrentY.get() - 4));
        height += game.scroller[i].height + 15;
        break;
      case "button":
        for(var j = 0; j < game.scroller[i].data.length; j++){
          var bNum = game.scroller[i].data.length
          var bWidth = (glslScrollScaleX/bNum - (70)/1920)
          var bPadding = (glslScrollScaleX - (bWidth * bNum))/bNum
          var bHeight = game.scroller[i].height/1080;
          var bY = 1 - (75/540) - (bHeight/2) - (height + game.scroller[i].height)/(540) + 15/540;
          var bX = (glslScrollX - (glslScrollScaleX /1 - bWidth) + (bWidth + bPadding) * (2) * j) + bPadding;
          renderUI(gl, program, new UI(bX,
              bY + (scrollCurrentY.get() - 4),
          bWidth,
                bHeight,
                 "button",
                  game.scroller[i].data[j]),
                  "button",
                   game.scroller[i].data[j], 0, 0, (game.scroller[i].selected[j]) == undefined ? 0 : game.scroller[i].selected[j]);
          renderUI(gl, program, new UI(bX,
           bY + (scrollCurrentY.get() - 4),
            glslScrollScaleX/2,
             game.scroller[i].height/1080,
              "button",
              game.scroller[i].data[j]),
               "bText",
                game.scroller[i].data[j]);
              if(activeButtons[game.scroller[i].data[j]] == undefined && game.scroller[i].active){
                activeButtons[game.scroller[i].data[j]] = [[bX - (bWidth), bY - (bHeight), bWidth * 2, bHeight * 2], buttonActions.length, game.scroller[i]]
                buttonActions.push(game.scroller[i].action)
              }
        }
        height += game.scroller[i].height + 15;
        break;
    }
  }
  scrollMaxHeight = height;
  if(mouseInScrollWindow){
    var targetScroll = scrollCurrentY.getTarget();
    var scrollLevel = wheelDelta * 0.0001 * targetScroll;
    targetScroll -= scrollLevel;
    var t = (scrollHeight - scrollMaxHeight) - 30 - 30
    var dScroll = 4 + ((scrollMaxHeight-t)/1080) - glslScrollScaleY;
    if(targetScroll > dScroll){
       targetScroll = 4 + ((scrollMaxHeight-t)/1080) - glslScrollScaleY;
    }
    if (targetScroll < 4){
      targetScroll = 4;
    }
    scrollCurrentY.setTarget(targetScroll);
  }
  scrollCurrentY.update(0.01);
}

function renderUI(gl, program, ui, type, data, height, givenY, selected){

  var typeLoc = gl.getUniformLocation(program, 't');
  var wLoc = gl.getUniformLocation(program, 'width');
  var hLoc = gl.getUniformLocation(program, 'height');
  var xLoc = gl.getUniformLocation(program, 'x');
  var yLoc = gl.getUniformLocation(program, 'y');
  var mouseLoc = gl.getUniformLocation(program, 'mouse');
  var selectedLoc = gl.getUniformLocation(program, 'selected');

  var x = ui.x;
  var y = ui.y;
  var scaleX = ui.scaleX;
  var scaleY = ui.scaleY;

  switch(type){
    case "pic":
      gl.uniform1f(typeLoc, 1.0);
      gl.bindTexture(gl.TEXTURE_2D, data);
      break;
    case "color":
      gl.uniform1f(typeLoc, 2.0);
      var colorLoc = gl.getUniformLocation(program, 'color');
      gl.uniform4fv(colorLoc, data);
      break;
    case "framebuffer":
      gl.uniform1f(typeLoc, 3.0);
      gl.bindTexture(gl.TEXTURE_2D, data);
      break;
    case "text":
    ctx.fillStyle = 'rgb('+(ui.color[0] * 255)+','+(ui.color[1] * 255)+','+(ui.color[2] * 255)+')';
    ctx.font = '20px serif';
    wrapText(data, scrollX, scrollY + height, scrollWidth);
      return;
      break;
    case "scrlColor":
    x = glslScrollX;
    y = givenY;
    scaleX = glslScrollScaleX;
    scaleY = height;
    gl.uniform1f(typeLoc, 2.0);
    var colorLoc = gl.getUniformLocation(program, 'color');
    gl.uniform4fv(colorLoc, data);
      break;
    case "button":
      gl.uniform1f(typeLoc, 4.0);
      gl.uniform1f(wLoc, scaleX);
      gl.uniform1f(hLoc, scaleY);
      gl.uniform1f(xLoc, x);
      gl.uniform1f(yLoc, y);
      gl.uniform1f(selectedLoc, selected)
      break;
    case "bText":
      ctx.fillStyle = 'white';
      ctx.font = '25px serif';
      wrapText(data, ((x + 1) * (1920 / 2)) - (ctx.measureText(data).width/2), ((-y + 1) * 1080/2) + 7.5, scrollWidth);
      return;
      break;


  }

  gl.uniform2fv(mouseLoc, [mouseX, mouseY]);

  var matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
  var worldMatrix = new Float32Array(16);
  glMatrix.mat4.identity(worldMatrix);
  glMatrix.mat4.translate(worldMatrix, worldMatrix, glMatrix.vec3.fromValues(x,y, 1));
  glMatrix.mat4.scale(worldMatrix, worldMatrix, glMatrix.vec3.fromValues(scaleX, scaleY, 1));
  gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);


    var positionAttribLocation = gl.getAttribLocation(program, 'position');

    var VBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ui.positions), gl.STATIC_DRAW);

    gl.vertexAttribPointer(
      positionAttribLocation,
      2,
      gl.FLOAT,
      gl.FALSE,
      0,
      0
    );
    gl.enableVertexAttribArray(positionAttribLocation);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, ui.positions.length/2);
}

function renderRoom(gl, program, room, x, y, z, scale, texture, selected){
  gl.bindTexture(gl.TEXTURE_2D, texture);
  var matWorldUniformLocation = gl.getUniformLocation(program, 'mWorld');
  var worldMatrix = new Float32Array(16);
  glMatrix.mat4.identity(worldMatrix);
  glMatrix.mat4.translate(worldMatrix, worldMatrix, glMatrix.vec3.fromValues(x, y, z));
  glMatrix.mat4.scale(worldMatrix, worldMatrix, glMatrix.vec3.fromValues(scale, scale, scale))
  gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, worldMatrix);


  var selectLoc = gl.getUniformLocation(program, "selected")
  gl.uniform4fv(selectLoc, selected)


    var positionAttribLocation = gl.getAttribLocation(program, 'vertPosition');
    var normalAttribLocation = gl.getAttribLocation(program, 'normPosition');
    var texCoordAttribLocation = gl.getAttribLocation(program, 'texCoord');


    var VBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(room.vertices), gl.STATIC_DRAW);

    gl.vertexAttribPointer(
      positionAttribLocation,
      3,
      gl.FLOAT,
      gl.FALSE,
      5 * 4,
      0
    );
    gl.vertexAttribPointer(
      texCoordAttribLocation,
      2,
      gl.FLOAT,
      gl.FALSE,
      5 * 4,
      3 * 4
    );

    gl.enableVertexAttribArray(positionAttribLocation);
    gl.enableVertexAttribArray(texCoordAttribLocation);
  gl.drawArrays(gl.TRIANGLES, 0, room.vertices.length/ 5);
}

function renderRooms(gl, program, entity, texture){
  gl.useProgram(program);
  Object.keys(game.rooms).forEach(function(key){
    room = game.rooms[key]
    renderRoom(gl, program, entity,room.position[0], room.position[1], room.position[2], 1, texture, room.color)
  })
  if(exploring){
    var msWrld = (this.mouseWorld == undefined) ? 0 : this.mouseWorld
    var rayColX = Math.floor((msWrld[0]+1)/2) * 2
    var rayColZ = Math.floor((msWrld[2]+1)/2) * 2

    if(game.checkIfSelectable([rayColX, 0, rayColZ])){
      renderLine(game.currentAgent.position, [rayColX,0,rayColZ], gl, program, entity, texture, [0.0, 1.0, 0.0, 1.0])
      renderRoom(gl, program, entity, rayColX,
         0, rayColZ, 1, texture, [0.0,1.0,0.0,1.0])
    }else{
      renderLine(game.currentAgent.position, [rayColX,0,rayColZ], gl, program, entity, texture, [1.0, 0.0, 0.0, 1.0])
      renderRoom(gl, program, entity, rayColX,
         0, rayColZ, 1, texture, [1.0,0.0,0.0,1.0])
    }
    var room;
    if(game.gameData.rooms.length != 0){
    Object.keys(game.selectableRooms).forEach(function(key){
      room = game.selectableRooms[key]
      renderRoom(gl, program, entity,room.position[0], room.position[1], room.position[2], 1, texture, [1.0,1.0,1.0,0.5])
    })
  }



  }

}

function renderLine(a, b, gl, program, entity, texture, color){
  var ray = glMatrix.vec3.fromValues(
    b[0]-a[0],
    b[1]-a[1],
    b[2]-a[2])
  glMatrix.vec3.normalize(ray, ray)
  var length = Math.sqrt(
    Math.pow(b[0] - a[0], 2) +
    Math.pow(b[1] - a[1], 2) +
    Math.pow(b[2] - a[2], 2))
  for(var i = 0; i < length; i++){
    renderRoom(gl, program, entity, (ray[0] * i) + a[0],
       (ray[1] * i) + a[1],
        (ray[2] * i) + a[2], 0.3, texture, color)
  }
}

function render(gl, shader){

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT || gl.DEPTH_BUFFER_BIT);

      renderUIS(gl, shader.program);
}

function renderToFrameBuffer(gl, shader, projMatrix){

      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

      //gl.activeTexture(gl.TEXTURE_0);

      // Tell WebGL how to convert from clip space to pixels
      gl.viewport(0, 0, fbWidth, fbHeight);
      var aspect = fbWidth / fbHeight;
      glMatrix.mat4.perspective(projMatrix, 45*3.14/180, aspect, 0.1, 10000.1 );
      var matProjUniformLocation = gl.getUniformLocation(shader[0].program, 'mProj');
      gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);
      gl.useProgram(shader[1].program)
      glMatrix.mat4.perspective(projMatrix, 45*3.14/180, aspect, 0.1, 10000.1 );
      var matProjUniformLocation = gl.getUniformLocation(shader[1].program, 'mProj');
      gl.uniformMatrix4fv(matProjUniformLocation, gl.FALSE, projMatrix);
      //gl.disable(gl.GL_BLEND);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT || gl.DEPTH_BUFFER_BIT);

      renderRooms(gl, shader[0].program, objs[0], textures.get("room").texture);
      renderAgents(gl, shader[1].program)
      renderEnemies(gl, shader[1].program)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function wrapText(text, x, y, maxWidth) {
  var words = text.split(' ');
  var line = '';

  for(var i = 0; i < words.length; i++){
    var tl = line + words[i] + ' ';
    var tw = ctx.measureText(tl).width;
    if(tw > maxWidth && i > 0){
      ctx.fillText(line, x, y);
      line = words[i] + ' ';
      y += lineHeight;
    }else{
      line = tl;
    }

  }
  ctx.fillText(line, x, y);
}

function addToScroller(ui){
  game.scroller.push(ui);
  if(((scrollCurrentY.get() - 4) * 540 + 440) - scrollMaxHeight < 0){
    var t = (scrollHeight - scrollMaxHeight) - 30 - 30
    scrollCurrentY.setTarget(4 + ((scrollMaxHeight - t + ui.height + 30)/1080) - glslScrollScaleY);
    scrollCurrentY.update(0.01);
  }
}

function calculateRayIntersection(){
  if(intersectionInRange(0, 600, mouseRay)){
    mouseWorld = binaryRaySearch(0, 0, 600, mouseRay)
    mouseWorld = [mouseWorld[0], mouseWorld[1], mouseWorld[2]]

  }else{
    //mouseWorld = glMatrix.vec3.create()
  }

}

function getPointOnRay(ray, distance){
  var camPos = camera.position
  var start = glMatrix.vec3.fromValues(-camPos.x, camPos.y, -camPos.z)
  var scaledRay = glMatrix.vec3.fromValues(ray[0] * distance, ray[1] * distance, ray[2] * distance)
  var ret = glMatrix.vec3.create()
  glMatrix.vec3.add(ret, start, scaledRay)
  return ret
}

function binaryRaySearch(count, start, finish, ray){
  var half = start + ((finish - start)/2)
  if (count >= 200) {
    var endPoint = getPointOnRay(ray, half)
    return endPoint
  }
  if(intersectionInRange(start, half, ray)){
    return binaryRaySearch(count + 1, start, half, ray)
  }else{
    return binaryRaySearch(count + 1, half, finish, ray)
  }
}

function intersectionInRange(start, finish, ray){
  var startPoint = getPointOnRay(ray, start)
  var endPoint = getPointOnRay(ray, finish)
  if(!isUnderground(startPoint) && isUnderground(endPoint)){
    return true
  }else{
    return false
  }
}

function isUnderground(point){
  if (point[1] < -1){
    return true
  }else{
    return false
  }
}

function renderTransformingQuad(gl, program, x, y, z, color){
  gl.enable(gl.DEPTH_TEST)

  gl.useProgram(program)

  var ui = new UI(0, 0, 0.4, 0.4)

  var modelMatrix = glMatrix.mat4.create()
  glMatrix.mat4.translate(modelMatrix,modelMatrix, glMatrix.vec3.fromValues(x, y, z))
  modelMatrix[0] = camera.viewMatrix()[0]
  modelMatrix[1] = camera.viewMatrix()[4]
  modelMatrix[2] = camera.viewMatrix()[8]
  modelMatrix[4] = camera.viewMatrix()[1]
  modelMatrix[5] = camera.viewMatrix()[5]
  modelMatrix[6] = camera.viewMatrix()[9]
  modelMatrix[8] = camera.viewMatrix()[2]
  modelMatrix[9] = camera.viewMatrix()[6]
  modelMatrix[10] = camera.viewMatrix()[10]

  var modelViewMatrix = glMatrix.mat4.create()
  glMatrix.mat4.scale(modelMatrix, modelMatrix, glMatrix.vec3.fromValues(ui.scaleX, ui.scaleY, 1))
  glMatrix.mat4.mul(modelViewMatrix, camera.viewMatrix(), modelMatrix)

  var mouseLoc = gl.getUniformLocation(program, "mousePos")
  gl.uniform2fv(mouseLoc, [mouseX, mouseY]);

  var matWorldUniformLocation = gl.getUniformLocation(program, 'modelViewMatrix');
  gl.uniformMatrix4fv(matWorldUniformLocation, gl.FALSE, modelViewMatrix);



  var colLoc = gl.getUniformLocation(program, "color")
  gl.uniform4fv(colLoc,color)

    var positionAttribLocation = gl.getAttribLocation(program, 'position');

    var VBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, VBO);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ui.positions), gl.STATIC_DRAW);

    gl.vertexAttribPointer(
      positionAttribLocation,
      2,
      gl.FLOAT,
      gl.FALSE,
      0,
      0
    );
    gl.enableVertexAttribArray(positionAttribLocation);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, ui.positions.length/2);
    gl.disable(gl.DEPTH_TEST)
}

function renderAgents(gl, program) {
  for(var i = 0; i < game.renderAgents.length; i++){
    var agent = game.renderAgents[i]
     renderTransformingQuad(gl, program, agent.position[0],agent.position[1],agent.position[2], agent.innerColor)
  }
}


function renderEnemies(gl, program){
  for(var i = 0; i < game.enemies.length; i++){
    var enemy = game.enemies[i]
    renderTransformingQuad(gl, program, enemy.position[0],enemy.position[1],enemy.position[2], [1.0,0.0,0.0,1.0])
  }
}
