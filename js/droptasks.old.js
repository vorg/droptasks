
//var gui = require('nw.gui');
//var win = gui.Window.get();
//win.enterFullscreen();

var nodeTmpl;

var state = {
  prev: null,
  cur: null,
  undoStack: [],
};

function init() {
  nodeTmpl = $("#nodeTmpl").html();
  loadTaskFile("http://localhost:3001/?get");

  //Window.enterFullscreen();
}

function loadTaskFile(file) {
  $.get(file, function(data) {
    deserialize(data);
    state.prev = data;
  })
}

function isProject(line) {
  var s = line.trim();
  var atIndex = s.indexOf('@');
  if (atIndex != -1) s = s.substr(0, atIndex-1).trim();
  return (s.lastIndexOf(':') == s.length - 1);
}

function deserialize(data) {
  $(".columns").empty();

  var lines = data.split("\n");

  var nodesInProject = 0;
  for(var i in lines) {
    var line = lines[i].trim();
    if (line.length == 0) continue;
    if (isProject(line)) {
      var projectName = line.substr(0, line.length);
      createNode(projectName, ["project"]);
    }
    else {
      var task = line;
      task = task.replace(/\s*-\s*/, "");
      var newNode = createNode(task, []);
      parseNodeTags(newNode);
    }
  }
}

function toggleShowNext() {
  $(document.body).toggleClass('onlyNext');
  var currProject = null;
  var hasTag = false;
  $(".node").each(function() {
    if ($(this).hasClass('project')) {
      if (!hasTag && currProject != null) currProject.hide();
      currProject = $(this);
      hasTag = false;
    }
    if ($(this).hasClass('next') && !$(this).hasClass('done')) { hasTag = true; };
  });

  if (!hasTag && currProject != null) currProject.hide();

  if (!$("body").hasClass('onlyNext')) {
    $(".node.project").show();
  }
}

function toggleFocus() {
  if ($(document.body).hasClass('focus')) {
    $(document.body).removeClass('focus');
    $(".node:hidden").show();
    return;
  }

  if (!state.currentNode || !state.currentNode.hasClass('project')) return;

  $(document.body).addClass('focus');

  var inProject = false;
  $(".node").each(function() {
    if (inProject && $(this).hasClass('project')) {
      inProject = false;
    }

    if (state.currentNode.get(0) == this) {
      inProject = true;
    }

    if (!inProject) {
      $(this).hide();
    }
  });

}

function toggleTag(name) {
  if (state.currentNode.hasClass(name)) {
    state.currentNode.removeClass(name);
    var text = state.currentNode.text();
    text = text.replace(new RegExp("@" + name + " "), "");
    text = text.replace(new RegExp("@" + name + "$"), "");
    text = text.trim();
    state.currentNode.text(text);
  }
  else {
    state.currentNode.addClass(name);
    state.currentNode.text(state.currentNode.text() + " @" + name)
  }

  saveChanges();
}

function toggleNext() {
  toggleTag("next");
}


function toggleDone() {
  toggleTag("done");
}


window.addEventListener('keydown', function(e) {
  //state.edited = true;

  if (e.ctrlKey) {
    var c = String.fromCharCode(e.charCode || e.keyCode);
    switch(c) {
      case 'Z': undo(); break;
      case 'N': toggleNext(); break;
      case 'D': toggleDone(); break;
      //case 'S': saveData(); break;
      //case 'L': loadData(); break;
    }
    e.preventDefault();
    return;
  }

  if (!state.editMode && e.shiftKey) {
    var c = String.fromCharCode(e.charCode || e.keyCode);
    var handled = false;
    switch(c) {
      case 'N': toggleShowNext(); handled = true; break;
      case 'F': toggleFocus(); handled = true; break;
    }
    if (handled) {
      e.preventDefault();
      return;
    }
  }

  if (state.currentNode == null) return;

  switch(e.keyCode) {
    //case 9: //Tab
    //  if (e.shiftKey) {
    //    selectParentNode(state.currentNode);
    //    editNode(state.currentNode);
    //  }
    //  else {
    //    selectNode(addChildNode(state.currentNode));
    //    editNode(state.currentNode);
    //  }
    //  e.preventDefault();
    //break;
    case 13: //Enter
      if (state.editMode) {
        exitEditNode(state.currentNode);
        e.preventDefault();
      }
      else if (e.shiftKey) {
        addNewProjectNodeAfter(state.currentNode);
        e.preventDefault();
      }
      else {
        addNewNodeAfter(state.currentNode);
        e.preventDefault();
      }
    //  else {
    //    selectNode(addSiblingNode(state.currentNode));
    //    editNode(state.currentNode);
    //  }
    //  e.preventDefault();
      break;
    case 37: //Left
      if (!state.editMode) {
        selectNodeOnTheLeft(state.currentNode);
        e.preventDefault();
      }
     break;
    case 38: //Up
      if (!state.editMode) {
        if (e.metaKey) { //move up
          if (state.currentNode.hasClass("project")) {
            var prev = state.currentNode.prevUntil(".project");
            if (prev.size() == 0) prev = state.currentNode;
            var prevProject = prev.last().prev();
            if (prevProject.size() > 0) {
              var projectItems = state.currentNode.nextUntil(".project").andSelf();
              prevProject.before(projectItems);
              saveChanges();
            }
          }
          else {
            //we can move nodes only withing the project
            var prev = state.currentNode.prev();
            if (prev.size() > 0 && !prev.hasClass("project")) {
              prev.before(state.currentNode);
              saveChanges();
            }
          }
        }
        else {
            selectPrevNode(state.currentNode);
        }
        e.preventDefault();
      }
      break;
    case 39: //Right
      if (!state.editMode) {
        selectNodeOnTheRight(state.currentNode);
        e.preventDefault();
      }
      break;
    case 40: //Down
      if (!state.editMode) {
        if (e.metaKey) { //move up
          if (state.currentNode.hasClass("project")) {
            if (state.currentNode.hasClass("project")) {
              var next = state.currentNode.nextUntil(".project");
              var nextProject = next.last().next();
              if (next.size() == 0) nextProject = state.currentNode.next();
              if (nextProject.size() > 0) {
                var nextProjectItems = nextProject.nextUntil(".project").andSelf();
                state.currentNode.before(nextProjectItems);
                saveChanges();
              }
            }
          }
          else {
            //we can move nodes only withing the project
            var next = state.currentNode.next();
            if (next.size() > 0 && !next.hasClass("project")) {
              next.after(state.currentNode);
              saveChanges();
            }
          }
        }
        else {
          selectNextNode(state.currentNode);
        }
        e.preventDefault();
      }
      break;
    case 27: //ESC
      if (state.editMode) {
        state.currentNode.text(state.editModePrevText);
        exitEditNode(state.currentNode);
        e.preventDefault();
      }
      break;
    case 46: //DEL
      if (!state.editMode) {
        var nodeToDelete = state.currentNode;
        if (nodeToDelete.hasClass("project")) {
          selectNextNode(state.currentNode, ".project");
          if (state.currentNode == nodeToDelete) selectPrevNode(state.currentNode);
          if (state.currentNode == nodeToDelete) state.currentNode = null;
        }
        else {
          selectNextNode(state.currentNode);
          if (state.currentNode == nodeToDelete) selectPrevNode(state.currentNode);
          if (state.currentNode == nodeToDelete) state.currentNode = null;
        }
        deleteNode(nodeToDelete);
        e.preventDefault();
      }
      break;
    case 113: //F2
      if (!state.editMode) {
        editNode(state.currentNode);
        e.preventDefault();
      }
      break;
  }//
});


function createNode(text, classNames) {
  var node = $($.mustache(nodeTmpl, { text : text, className : classNames.join(" ") }));
  node.click(function() {
    selectNode(node);
  });
  node.dblclick(function() {
    editNode(node);
  });
  //we have to add it to dom so we can measure it's size with CSS applied
  $(".columns").eq(0).append(node);
  return node;
}

function addNewNodeAfter(node, title, classNames) {
  var newNode = createNode(title || "", classNames || ["item"]);
  newNode.insertAfter(node);
  editNode(newNode);
}

function addNewProjectNodeAfter(node) {
  var lastNode = node.nextUntil(".project").last();
  if (lastNode.size() == 0) lastNode = node;
  addNewNodeAfter(lastNode, "New Project", ["item", "project"]);
}

function selectNode(node) {
  if (node == state.currentNode) return;
  if (state.currentNode != null) {
    if (state.editMode) {
      exitEditNode(state.currentNode);
    }
    state.currentNode.removeClass("current");
  }
  state.currentNode = node;
  state.currentNode.addClass("current");
}

function selectPrevNode(node, className) {
  var prev = null;
  if (className) {
    prev = node.prevAll(".project").eq(0);
  }
  else {
    prev = node.prev();
  }
  if (prev.size() > 0) {
    selectNode(prev);
  }
}

function selectNextNode(node, className) {
  var next = null;
  if (className) {
    next = node.nextAll(".project").eq(0);
  }
  else {
    next = node.next();
  }
  if (next.size() > 0) {
    selectNode(next);
  }
}

function selectNodeOnTheLeft(node) {
  var yPos = node.position().top;
  var sibling = node.prev();
  var columns = 0;
  var closesDistance = -1;
  var closestNode = null;
  while(sibling.size() > 0) {
    var siblingY = sibling.position().top;
    var siblingDistance = Math.abs(siblingY - yPos);
    if (siblingY == 0) {
      ++columns;
      if (columns == 2) break;
    }
    if (columns == 1 && closesDistance == -1 || siblingDistance < closesDistance) {
      closestNode = sibling;
      closesDistance = siblingDistance;
    }
    sibling = sibling.prev();
  }
  if (closestNode) {
    selectNode(closestNode);
  }
}

function selectNodeOnTheRight(node) {
  var yPos = node.position().top;
  var sibling = node.next();
  var columns = 0;
  var closesDistance = -1;
  var closestNode = null;
  while(sibling.size() > 0) {
    var siblingY = sibling.position().top;
    var siblingDistance = Math.abs(siblingY - yPos);
    if (siblingY == 0) {
      ++columns;
      if (columns >= 2) break;
    }
    if (columns == 1 && closesDistance == -1 || siblingDistance < closesDistance) {
      closestNode = sibling;
      closesDistance = siblingDistance;
    }
    sibling = sibling.next();
  }
  if (closestNode) {
    selectNode(closestNode);
  }
}

function deleteNode(deleteNode) {
  if (deleteNode.hasClass("project")) {
    deleteNode.nextUntil(".project").andSelf().remove();
  }
  else {
    deleteNode.remove();
  }
  saveChanges();
}

//TODO: editNode() remove tag spans before making node contentEditable
function editNode(node) {
  if (node != state.selectNode) {
    selectNode(node);
  }
  if (state.editMode && node == state.currentNode) return;
  node.attr("contentEditable", "").focus();
  if (node.text() == "-") {
    node.text("");
  }
  selectElementText(node.get(0));
  state.editMode = true;
  state.editModePrevText = node.text();
}

function exitEditNode(node) {
  parseNodeTags(node);
  state.currentNode.removeAttr("contenteditable");
  state.currentNode.blur();
  if (!state.currentNode.text().trim()) {
    state.currentNode.text("-");
  }
  state.editMode = false;
  state.editModePrevText = "";
  saveChanges();
}

function parseNodeTags(node) {
  var task = node.text();
  task = task.replace(/(@[^(\s]+\(*[^)]*\)*)/, "<span class='tag'>$1</span>");
  if (!task) task = "-";
  var tags = task.match(/(?:@)[a-zA-Z0-9\-]+/g);
  var classNames = ["node"];
  if (node.hasClass("project")) classNames.push("project");
  if (node.hasClass("current")) classNames.push("current");
  if (tags) classNames =  classNames.concat(tags.map(function(tag) { return tag.replace("@", "")} ));
  node.removeClass(node.attr("class"));
  classNames.forEach(function(c) {
    node.addClass(c);
  })
}

function serialize() {
  var str = "";
  $(".node").each(function() {
    var value = $(this).text();;

    if ($(this).hasClass("project")) {
      if (value.indexOf(':') == -1) {
        var atIndex = value.indexOf('@');
        if (atIndex != -1) {
          value = value.substr(0, atIndex).trim() + ': ' + value.substr(atIndex);
        }
        else {
          value = value + ':';
        }
      }
      str += value;
    }
    else {
      str += "\t- " + value;
    }
    str += "\n";
  })
  return str;
}

function undo() {
  if (state.undoStack.length > 0) {
    var prevState = state.undoStack.pop();
    deserialize(prevState);
    saveChanges({dontPush:true});
  }
}

function saveChanges(options) {
  var dontPush = options && options.dontPush;
  var currentState = serialize();
  if (!dontPush) {
    state.undoStack.push(state.prev);
    state.prev = currentState;
  }
  $.post("?set", currentState);
}

$(document).ready(init);