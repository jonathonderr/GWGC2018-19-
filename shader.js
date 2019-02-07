var vsRoom =
[
  'precision mediump float;',
  '',
  'attribute vec3 vertPosition;',
  'attribute vec3 normPosition;',
  'attribute vec2 texCoord;',
  'varying vec2 fragTexCoord;',
  'varying vec2 mousePos;',
  'varying vec4 position;',
  '',
  'uniform  mat4 mWorld;',
  'uniform mat4 mView;',
  'uniform mat4 mProj;',
  'uniform vec2 mouse;',
  '',
  'void main()',
  '{',
   'fragTexCoord = texCoord;',
  // 'vBC  = fragColor;',
  'mousePos = vec2(mouse.x + (573.0 / 1920.0),  mouse.y + (100.0 / 1080.0));',
  'position = mProj * mView * mWorld * vec4(vertPosition.xyz, 1.0);',
  'position = vec4(-position.x/position.z, position.y/position.z, 1.0, 1.0);',
  //'position = vec4(vertPosition.xy/vertPosition.z, 1.0, 1.0);',
  'gl_Position = mProj * mView * mWorld * vec4(vertPosition.xyz, 1.0);',
  '}'
].join('\n');

var fsRoom =
[
  '#extension GL_OES_standard_derivatives : enable',
  'precision mediump float;',
  '',
  'varying vec2 fragTexCoord;',
  'uniform sampler2D sampler;',
  'varying vec2 mousePos;',
  'varying vec4 position;',
  'uniform vec4 selected;',
  'void main()',
  '{',
  'gl_FragColor = vec4(position.x + 0.3, 0.0, position.y + 0.3, 0.2);',
  'gl_FragColor = texture2D(sampler, fragTexCoord);',
  'vec4 positionM = position + vec4(mousePos.x, -mousePos.y, 1.0, 1.0);',
  'float distance = sqrt((positionM.x * positionM.x) + (positionM.y * positionM.y));',
  'if(distance < 0.1)',
  '{',
  '   //gl_FragColor = mix(gl_FragColor, vec4(0.0,1.0,0.0,1.0), 0.2);',
  '}',

  'gl_FragColor = vec4(gl_FragColor.x + position.x, (gl_FragColor.y) - distance/10.0, gl_FragColor.z + position.y, gl_FragColor.w);',
  'gl_FragColor = vec4(gl_FragColor.x + (selected.x), gl_FragColor.y * (selected.y), gl_FragColor.z + (selected.z), (gl_FragColor.w - distance/5.0 + 0.2) * selected.a);',
  '}'
].join('\n');

var vsUI =
[
  'precision mediump float;',
  '',
  'attribute vec2 position;',
  'uniform float t;',
  'varying vec2 fragTexCoord;',
  'varying vec2 mousePos;',
  'varying float type;',
  '',
  'uniform  mat4 mWorld;',
  'uniform vec2 mouse;',
  '',
  'void main()',
  '{',
  'type = t;',
  'mousePos = mouse;',
  'gl_Position = mWorld * vec4(position, 0.0, 1.0);',
  'fragTexCoord = vec2((position.x+1.0)/2.0, 1.0 - (position.y+1.0)/2.0);',
  'if(type == 3.0){',
  'fragTexCoord = vec2((position.x+1.0)/2.0, (position.y+1.0)/2.0);',
  '}',
  '}'
].join('\n');

var fsUI =
[
  '#extension GL_OES_standard_derivatives : enable',
  'precision mediump float;',
  '',
  'varying vec2 fragTexCoord;',
  'uniform sampler2D sampler;',
  'uniform vec4 color;',
  'varying vec2 mousePos;',
  'varying float type;',
  'uniform float width;',
  'uniform float height;',
  'uniform float x;',
  'uniform float y;',
  'uniform float selected;',
  '',
  'void main()',
  '{',
  'gl_FragColor = texture2D(sampler, fragTexCoord);',
  'if(type == 2.0){',
  'gl_FragColor = vec4(color.x, color.y, color.z, color.w);',
  '}',
  'if(type == 3.0){',

  'vec2 p = fragTexCoord.st;',
  'vec2 pixels = vec2(300.0, 300.0);',
  'p.x -= mod(p.x, 1.0 / pixels.x);',
  'p.y -= mod(p.y, 1.0 / pixels.y);',

  'vec2 fc = p;',
  'float dx = abs(0.5-fc.x);',
  'float dy = abs(0.5-fc.y);',
  'dx *= dx;',
  'dy *= dy;',
  'fc.x -= 0.5;',
  'fc.x *= 1.0 + (dy/2.0);',
  'fc.x += 0.5;',
  'fc.y -= 0.5;',
  'fc.y *= 1.0 + (dx/2.0);',
  'fc.y += 0.5;',

  'vec2 fcFringe = fragTexCoord - vec2(.5);',
  'float d = 0.35 * length(fcFringe);',
  'normalize(fcFringe);',
  'vec2 fringe = d * fcFringe * vec2(200.0, 200.0);',
  'vec4 r = texture2D(sampler, (fc - fringe / 1024.0));',
  'vec4 g = texture2D(sampler, fc);',
  'vec4 b = texture2D(sampler, (fc + fringe / 768.0));',
  'gl_FragColor = vec4(r.r, g.g, b.b, 1.0);',

  '}',
  'if(type == 4.0){',
  'vec2 position = vec2(fragTexCoord.xy * vec2(2.0 * width, 2.0 * height)) ',
  '- vec2(1.0 * width, 1.0 * height) + vec2(x, -y); ',
  'float aspect = height / width;',
  'float borderWidth = 0.009;',
  'float minX = borderWidth;',
  'float maxX = 1.0 - borderWidth;',
  'float minY = minX / aspect;',
  'float maxY = 1.0 - minY;',
  '',

  'if(fragTexCoord.x < maxX && fragTexCoord.x > minX',
  '&& fragTexCoord.y < maxY && fragTexCoord.y > minY){',
  'vec2 positionM = position + vec2(-mousePos.x, mousePos.y);',
  'float distance = sqrt((positionM.x * positionM.x) + (positionM.y * positionM.y));',
  'gl_FragColor = vec4(0.0, -distance + 0.3 + (selected * 7.0), 0.0, 0.5 - (selected * 0.3));',
  '}else{',
    'gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);',
  '}',

  '}',
  '}'
].join('\n');

var vsChar =
[
  'precision mediump float;',
  '',
  'attribute vec2 position;',
  'varying vec2 fragTexCoord;',
  'varying vec2 mousePos;',

  'uniform mat4 modelViewMatrix;',
  'uniform mat4 mProj;',
  'uniform vec2 mouse;',
  'uniform mat4 viewMat;',
  '',
  'void main()',
  '{',
  'mousePos = mouse;',
  'gl_Position = mProj * modelViewMatrix * vec4(position, 0.0, 1.0);',
  'fragTexCoord = vec2((position.x+1.0)/2.0, 1.0 - (position.y+1.0)/2.0);',
  '}'
].join('\n');

var fsChar =
[
  '#extension GL_OES_standard_derivatives : enable',
  'precision mediump float;',
  '',
  'varying vec2 fragTexCoord;',
  'uniform vec4 color;',
  'varying vec2 mousePos;',
  '',
  'void main()',
  '{',
  'float distance = sqrt(((fragTexCoord.x - 0.5) * (fragTexCoord.x - 0.5)) + ((fragTexCoord.y - 0.5) * (fragTexCoord.y - 0.5)));',
  'if(distance < 0.4){',
  'gl_FragColor = vec4(color.x , color.y, color.z, 0.7);',
  '}',
  'if(distance > 0.4 && distance < 0.45){',
  'gl_FragColor = vec4(1.0 , color.y, color.z, (distance - 0.45) * -1.0 + 0.3);',
  '}',
  '',
  '}'
].join('\n');


function Shader(vText, fText, gl){
  this.vText = vText;
  this.fText = fText;
  this.gl = gl;
}


Shader.prototype = {
  compile: function(){
    var gl = this.gl;
    this.vs = gl.createShader(gl.VERTEX_SHADER);
    this.fs = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(this.vs, this.vText);
    gl.shaderSource(this.fs, this.fText);

    gl.compileShader(this.vs);

    //YOU CAN REMOVE SYNTAX ERROR MSG
    if(!gl.getShaderParameter(this.vs, gl.COMPILE_STATUS)){
      console.error('ERROR compiling vertex shader!', gl.getShaderInfoLog(this.vs));
      return;
    }

    gl.compileShader(this.fs);

    if(!gl.getShaderParameter(this.fs, gl.COMPILE_STATUS)){
      console.error('ERROR compiling fragment shader!', gl.getShaderInfoLog(this.fs));
      return;
    }
  },

  linkProgram: function(){
    var gl = this.gl;
    var p = gl.createProgram();
    gl.attachShader(p, this.vs);
    gl.attachShader(p, this.fs);
    gl.linkProgram(p);

    if (!gl.getProgramParameter(p, gl.LINK_STATUS)){
      console.error('ERROR linking program!', gl.getProgramInfoLog(p));
      return;
    }

    //GET RID OF DURING MINIFICATION
    gl.validateProgram(p);
    if(!gl.getProgramParameter(p, gl.VALIDATE_STATUS)){
      console.error('ERROR validating program!', gl.getProgramInfoLog(p));
    }

    this.program = p;

  }
}
