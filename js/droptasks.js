// Generated by CoffeeScript 1.6.2
var addNewNodeAfter, addNewProjectNodeAfter, createNode, deleteNode, deserialize, editNode, exitEditNode, handleArrowKeys, handleDeleteKey, handleEnter, handleEsc, handleF12Key, handleKeyCommands, handleMoveCommands, init, initCalendar, isProject, loadTaskFile, nodeTmpl, parseNodeTags, saveChanges, selectNextNode, selectNode, selectNodeOnTheLeft, selectNodeOnTheRight, selectPrevNode, serialize, state, toggleDone, toggleFocus, toggleNext, toggleShowCalendar, toggleShowNext, toggleTag, undo, updateCalendar, weekDayTmpl;

nodeTmpl = null;

weekDayTmpl = null;

state = {
  prev: null,
  cur: null,
  undoStack: [],
  editMode: false
};

init = function() {
  nodeTmpl = $('#nodeTmpl').html();
  weekDayTmpl = $('#weekDayTmpl').html();
  initCalendar();
  return loadTaskFile('http://localhost:3001/?get');
};

initCalendar = function() {
  var dayDate, dayName, days, future, i, past, _i;

  past = {
    label: 'Past',
    tasks: []
  };
  future = {
    label: 'Future',
    tasks: []
  };
  days = [past];
  for (i = _i = 0; _i <= 3; i = ++_i) {
    dayDate = Date.today().add(i).days();
    dayName = dayDate.toString('dddd');
    days.push({
      label: dayName,
      date: dayDate,
      tasks: []
    });
  }
  days.push(future);
  state.days = days;
  return updateCalendar();
};

updateCalendar = function() {
  var day, dayNode, tagIndex, task, taskLabel, taskNode, weekDayColumn, weekDayColumnList, _i, _j, _len, _len1, _ref, _ref1;

  $('#calendar').empty();
  _ref = state.days;
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    day = _ref[_i];
    weekDayColumn = $($.mustache(weekDayTmpl, {}));
    weekDayColumnList = weekDayColumn.find('ul');
    $('#calendar').eq(0).append(weekDayColumn);
    dayNode = $($.mustache(nodeTmpl, {
      text: day.label,
      className: 'weekDay'
    }));
    weekDayColumn.prepend(dayNode);
    _ref1 = day.tasks;
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      task = _ref1[_j];
      taskLabel = task.label;
      tagIndex = taskLabel.indexOf('<');
      if (tagIndex) {
        taskLabel = taskLabel.substr(0, tagIndex - 1);
      }
      taskNode = $($.mustache(nodeTmpl, {
        text: taskLabel,
        className: '',
        projectLabel: task.project
      }));
      weekDayColumnList.append(taskNode);
    }
  }
  return $('#items').css('height', $(window).height() - $('#calendar').height() - 20);
};

loadTaskFile = function(file) {
  return $.get(file, function(data) {
    deserialize(data);
    return state.prev = data;
  });
};

isProject = function(line) {
  var atIndex, s;

  s = line.trim();
  atIndex = s.indexOf('@');
  if (atIndex !== -1) {
    s = s.substr(0, atIndex - 1).trim();
  }
  return s.lastIndexOf(':') === s.length - 1;
};

serialize = function() {
  var str;

  str = '';
  $('#items .node').each(function() {
    var atIndex, value;

    value = $(this).text();
    if ($(this).hasClass('project')) {
      if (value.indexOf(':') === -1) {
        atIndex = value.indexOf('@');
        if (atIndex !== -1) {
          value = value.substr(0, atIndex).trim() + ': ' + value.substr(atIndex);
        } else {
          value = value + ':';
        }
      }
      str += value.trim();
    } else {
      str += '\t- ' + value;
    }
    return str += '\n';
  });
  return str;
};

deserialize = function(data) {
  var currentProject, line, lines, newNode, nodesInProject, projectName, task, _i, _len;

  $('#items.columns').empty();
  lines = data.split('\n');
  nodesInProject = 0;
  currentProject = '';
  for (_i = 0, _len = lines.length; _i < _len; _i++) {
    line = lines[_i];
    line = line.trim();
    if (line.length === 0) {
      continue;
    }
    if (isProject(line)) {
      projectName = line.substr(0, line.length);
      currentProject = projectName.replace(':', '');
      createNode(projectName, ['project']);
    } else {
      task = line;
      task = task.replace(/\s*-\s*/, '');
      newNode = createNode(task, [], currentProject);
      parseNodeTags(newNode);
    }
  }
  return updateCalendar();
};

createNode = function(text, classNames, currentProject) {
  var node;

  node = $($.mustache(nodeTmpl, {
    text: text,
    className: classNames.join(' '),
    project: currentProject
  }));
  node.click(function() {
    return selectNode(node);
  });
  node.dblclick(function() {
    return editNode(node);
  });
  $('#items.columns').eq(0).append(node);
  return node;
};

addNewNodeAfter = function(node, title, classNames) {
  var newNode;

  newNode = createNode(title || '', classNames || ['item']);
  newNode.insertAfter(node);
  return editNode(newNode);
};

addNewProjectNodeAfter = function(node) {
  var lastNode;

  lastNode = node.nextUntil('.project').last();
  if (lastNode.size() === 0) {
    lastNode = node;
  }
  return addNewNodeAfter(lastNode, 'New Project', ['item', 'project']);
};

selectNode = function(node) {
  if (node === state.currentNode) {
    return;
  }
  if (state.currentNode) {
    if (state.editMode) {
      exitEditNode(state.currentNode);
    }
    state.currentNode.removeClass('current');
  }
  state.currentNode = node;
  return state.currentNode.addClass('current');
};

selectPrevNode = function(node, className) {
  var prev;

  prev = null;
  if (className) {
    prev = node.prevAll('.project').eq(0);
  } else {
    prev = node.prev();
  }
  if (prev.size() > 0) {
    return selectNode(prev);
  }
};

selectNextNode = function(node, className) {
  var next;

  next = null;
  if (className) {
    next = node.nextAll('.project').eq(0);
  } else {
    next = node.next();
  }
  if (next.size() > 0) {
    return selectNode(next);
  }
};

selectNodeOnTheLeft = function(node) {
  var closesDistance, closestNode, columns, itemsTop, sibling, siblingDistance, siblingY, yPos;

  itemsTop = $('#items').position().top;
  yPos = node.position().top - itemsTop;
  sibling = node.prev();
  columns = 0;
  closesDistance = -1;
  closestNode = null;
  while (sibling.size() > 0) {
    siblingY = sibling.position().top - itemsTop;
    siblingDistance = Math.abs(siblingY - yPos);
    if (siblingY < 10) {
      ++columns;
      if (columns === 2) {
        break;
      }
    }
    if (columns === 1 && closesDistance === -1 || siblingDistance < closesDistance) {
      closestNode = sibling;
      closesDistance = siblingDistance;
    }
    sibling = sibling.prev();
  }
  if (closestNode) {
    return selectNode(closestNode);
  }
};

selectNodeOnTheRight = function(node) {
  var closesDistance, closestNode, columns, itemsTop, sibling, siblingDistance, siblingY, yPos;

  itemsTop = $('#items').position().top;
  yPos = node.position().top - itemsTop;
  sibling = node.next();
  columns = 0;
  closesDistance = -1;
  closestNode = null;
  while (sibling.size() > 0) {
    siblingY = sibling.position().top - itemsTop;
    siblingDistance = Math.abs(siblingY - yPos);
    if (siblingY < 10) {
      ++columns;
      if (columns >= 2) {
        break;
      }
    }
    if (columns === 1 && closesDistance === -1 || siblingDistance < closesDistance) {
      closestNode = sibling;
      closesDistance = siblingDistance;
    }
    sibling = sibling.next();
  }
  if (closestNode) {
    return selectNode(closestNode);
  }
};

parseNodeTags = function(node) {
  var classNames, day, dueDate, tag, tags, task, _i, _j, _len, _len1, _ref;

  task = node.text();
  task = task.replace(/(@[^(\s]+\(*[^)]*\)*)/, '<span class="tag">$1</span>');
  if (!task) {
    task = '-';
  }
  tags = task.match(/(?:@)[\(\) \:a-zA-Z0-9\-]+/g);
  if (tags) {
    for (_i = 0, _len = tags.length; _i < _len; _i++) {
      tag = tags[_i];
      if (tag.indexOf('@due') !== -1 && task.indexOf('@done') === -1) {
        dueDate = tag.match(/\(([^\)]+)\)/);
        if (dueDate && state.days) {
          dueDate = new Date(dueDate[1].split(' ')[0]);
          _ref = state.days;
          for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
            day = _ref[_j];
            if (day.date && dueDate.compareTo(day.date) === 0) {
              day.tasks.push({
                label: task,
                project: node.data('project')
              });
            }
          }
          if (dueDate.compareTo(state.days[1].date) === -1) {
            state.days[0].tasks.push({
              label: task,
              project: node.data('project')
            });
          }
          if (dueDate.compareTo(state.days[state.days.length - 2].date) === 1) {
            state.days[state.days.length - 1].tasks.push({
              label: task,
              project: node.data('project')
            });
          }
        }
      }
    }
  }
  classNames = ['node'];
  node.html(task);
  if (node.hasClass('project')) {
    classNames.push('project');
  }
  if (node.hasClass('current')) {
    classNames.push('current');
  }
  if (tags) {
    classNames = classNames.concat(tags.map(function(tag) {
      return tag.replace('@', '');
    }));
  }
  node.removeClass(node.attr('class'));
  return classNames.forEach(function(c) {
    return node.addClass(c);
  });
};

deleteNode = function(deleteNode) {
  if (deleteNode.hasClass('project')) {
    deleteNode.nextUntil('.project').andSelf().remove();
  } else {
    deleteNode.remove();
  }
  return saveChanges();
};

editNode = function(node) {
  if (node !== state.selectNode) {
    selectNode(node);
  }
  if (state.editMode && node === state.currentNode) {
    return;
  }
  node.attr('contentEditable', '').focus();
  if (node.text() === '-') {
    node.text('');
  }
  selectElementText(node.get(0));
  state.editMode = true;
  return state.editModePrevText = node.text();
};

exitEditNode = function(node) {
  parseNodeTags(node);
  state.currentNode.removeAttr('contenteditable');
  state.currentNode.blur();
  if (!state.currentNode.text().trim()) {
    state.currentNode.text('-');
  }
  state.editMode = false;
  state.editModePrevText = '';
  return saveChanges();
};

toggleShowNext = function() {
  var currProject, hasTag;

  $(document.body).toggleClass('onlyNext');
  currProject = null;
  hasTag = false;
  $('#items .node').each(function() {
    if ($(this).hasClass('project')) {
      if (!hasTag && currProject !== null) {
        currProject.hide();
      }
      currProject = $(this);
      hasTag = false;
    }
    if ($(this).hasClass('next') && !$(this).hasClass('done')) {
      return hasTag = true;
    }
  });
  if (!hasTag && currProject !== null) {
    currProject.hide();
  }
  if (!$('body').hasClass('onlyNext')) {
    return $('#items .node.project').show();
  }
};

toggleFocus = function() {
  var inProject;

  if ($(document.body).hasClass('focus')) {
    $(document.body).removeClass('focus');
    $('.node:hidden').show();
    return;
  }
  if (!state.currentNode || !state.currentNode.hasClass('project')) {
    return;
  }
  $(document.body).addClass('focus');
  inProject = false;
  return $('.node').each(function() {
    if (inProject && $(this).hasClass('project')) {
      inProject = false;
    }
    if (state.currentNode.get(0) === this) {
      inProject = true;
    }
    if (!inProject) {
      return $(this).hide();
    }
  });
};

toggleTag = function(name) {
  var text;

  if (state.currentNode.hasClass(name)) {
    state.currentNode.removeClass(name);
    text = state.currentNode.text();
    text = text.replace(new RegExp('@' + name + ' '), '');
    text = text.replace(new RegExp('@' + name + '$'), '');
    text = text.trim();
    state.currentNode.text(text);
  } else {
    state.currentNode.addClass(name);
    state.currentNode.text(state.currentNode.text() + ' @' + name);
  }
  return saveChanges();
};

toggleNext = function() {
  return toggleTag('next');
};

toggleDone = function() {
  return toggleTag('done');
};

toggleShowCalendar = function() {
  if ($('#calendar').hasClass('hidden')) {
    $('#calendar').removeClass('hidden');
    return $('#items').css('height', $(window).height() - $('#calendar').height() - 20);
  } else {
    $('#items').css('height', $(window).height());
    return $('#calendar').addClass('hidden');
  }
};

handleKeyCommands = function(e) {
  var c;

  c = String.fromCharCode(e.charCode || e.keyCode);
  if (e.ctrlKey) {
    switch (c) {
      case 'Z':
        undo();
        break;
      case 'N':
        toggleNext();
        break;
      case 'D':
        toggleDone();
    }
  }
  if (e.shiftKey) {
    switch (c) {
      case 'N':
        return toggleShowNext();
      case 'C':
        return toggleShowCalendar();
      case 'F':
        return toggleFocus();
    }
  }
};

handleMoveCommands = function(e) {
  var handled, next, nextProject, nextProjectItems, prev, prevProject, projectItems;

  switch (e.keyCode) {
    case 38:
      if (state.currentNode.hasClass('project')) {
        prev = state.currentNode.prevUntil('.project');
        if (prev.size() === 0) {
          prev = state.currentNode;
        }
        prevProject = prev.last().prev();
        if (prevProject.size() > 0) {
          projectItems = state.currentNode.nextUntil('.project').andSelf();
          prevProject.before(projectItems);
          saveChanges();
          return true;
        }
      } else {
        prev = state.currentNode.prev();
        if (prev.size() > 0 && !prev.hasClass('project')) {
          prev.before(state.currentNode);
          saveChanges();
          return true;
        }
      }
      break;
    case 40:
      handled = true;
      if (state.currentNode.hasClass('project')) {
        next = state.currentNode.nextUntil('.project');
        nextProject = next.last().next();
        if (next.size() === 0) {
          nextProject = state.currentNode.next();
        }
        if (nextProject.size() > 0) {
          nextProjectItems = nextProject.nextUntil('.project').andSelf();
          state.currentNode.before(nextProjectItems);
          saveChanges();
          return true;
        }
      } else {
        next = state.currentNode.next();
        if (next.size() > 0 && !next.hasClass('project')) {
          next.after(state.currentNode);
          saveChanges();
          return true;
        }
      }
  }
};

handleEnter = function(e) {
  if (state.editMode) {
    exitEditNode(state.currentNode);
    return true;
  } else if (e.shiftKey) {
    addNewProjectNodeAfter(state.currentNode);
    return true;
  } else {
    addNewNodeAfter(state.currentNode);
    return true;
  }
};

handleEsc = function(e) {
  if (state.editMode) {
    state.currentNode.text(state.editModePrevText);
    exitEditNode(state.currentNode);
    e.preventDefault();
    return true;
  }
};

handleArrowKeys = function(e) {
  if (!state.editMode) {
    switch (e.keyCode) {
      case 37:
        selectNodeOnTheLeft(state.currentNode);
        break;
      case 38:
        selectPrevNode(state.currentNode);
        break;
      case 39:
        selectNodeOnTheRight(state.currentNode);
        break;
      case 40:
        selectNextNode(state.currentNode);
    }
    return true;
  }
};

handleDeleteKey = function(e) {
  var nodeToDelete;

  if (!state.editMode) {
    nodeToDelete = state.currentNode;
    if (nodeToDelete.hasClass('project')) {
      selectNextNode(state.currentNode, '.project');
      if (state.currentNode === nodeToDelete) {
        selectPrevNode(state.currentNode);
      }
      if (state.currentNode === nodeToDelete) {
        state.currentNode = null;
      }
    } else {
      selectNextNode(state.currentNode);
      if (state.currentNode === nodeToDelete) {
        selectPrevNode(state.currentNode);
      }
      if (state.currentNode === nodeToDelete) {
        state.currentNode = null;
      }
    }
    deleteNode(nodeToDelete);
    return true;
  }
};

handleF12Key = function(e) {
  if (!state.editMode) {
    editNode(state.currentNode);
    return true;
  }
};

window.addEventListener('keydown', function(e) {
  if (!state.editMode && (e.ctrlKey || e.shiftKey)) {
    if (handleKeyCommands(e)) {
      e.preventDefault();
      return;
    }
  }
  if (state.currentNode === null) {
    return;
  }
  if (!state.editMode && e.metaKey) {
    if (handleMoveCommands(e)) {
      e.preventDefault();
      return;
    }
  }
  if (e.keyCode === 13) {
    if (handleEnter(e)) {
      e.preventDefault();
      return;
    }
  }
  if (e.keyCode === 27) {
    if (handleEsc(e)) {
      e.preventDefault();
      return;
    }
  }
  if (e.keyCode >= 37 && e.keyCode <= 40) {
    if (handleArrowKeys(e)) {
      e.preventDefault();
      return;
    }
  }
  if (e.keyCode === 46) {
    if (handleDeleteKey(e)) {
      e.preventDefault();
      return;
    }
  }
  if (e.keyCode === 113) {
    if (handleF12Key(e)) {
      e.preventDefault();
    }
  }
});

undo = function() {
  var prevState;

  if (state.undoStack.length > 0) {
    prevState = state.undoStack.pop();
    deserialize(prevState);
    return saveChanges({
      dontPush: true
    });
  }
};

saveChanges = function(options) {
  var currentState, dontPush;

  dontPush = options && options.dontPush;
  currentState = serialize();
  console.log('saveChanges', dontPush);
  if (!dontPush) {
    state.undoStack.push(state.prev);
    state.prev = currentState;
  }
  return $.post('?set', currentState);
};

$(document).ready(init);

/*
//@ sourceMappingURL=droptasks.map
*/
