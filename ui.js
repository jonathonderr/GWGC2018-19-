function UI(x, y, scaleX, scaleY, type, data, height, color, action){
  this.x = x;
  this.y = y;
  this.scaleX = scaleX;
  this.scaleY = scaleY;
  this.type = type;
  this.data = data;
  this.positions = [-1,1,-1,-1,1,1,1,-1];
  this.height = height;
  this.color = [1.0, 1.0, 1.0, 1.0]
  if(type == "text"){
    this.height = 0
    this.color = color
    this.textHeight(this.data)
  }
  if(type == "button"){
    this.selected = []
    this.active = true;
    this.action = action;
  }
}

UI.prototype = {
  textHeight: function (text){
    var words = String(text).split(' ');
    var line = '';
    ctx.font = '20px serif';
    var length = ctx.measureText(text).width
    var mFac = parseInt(length/ 710)
    for(var i = 0; i < words.length; i++){
      var tl = line + words[i] + ' ';
      var tw = ctx.measureText(tl).width;
      if(tw > scrollWidth && i > 0){
        this.height += 29
        line = words[i] + ' ';
      }else{
        line = tl;
      }

    }
    this.height += 29
  }
}
