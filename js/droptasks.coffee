nodeTmpl = null

state = {
  prev: null
  cur: null
  undoStack: []
}

init = () ->
  nodeTmpl = $('#nodeTmpl').html()
  initCalendar()
  loadTaskFile('http://localhost:3001/?get')

initCalendar = () ->
  past = { label: 'Past', tasks: []}
  future = { label: 'Future', tasks: []}
  days = [past]
  for i in [0..3]
    dayDate = Date.today().add(i).days()
    dayName = dayDate.toString('dddd')
    days.push({ label: dayName, date: dayDate, tasks : []})

  days.push(future)

  state.days = days

  updateCalendar()

updateCalendar = () ->
  $('#calendar.columns').empty()
  for day in state.days
    node = $($.mustache(nodeTmpl, { text : day.label, className : 'weekDay' }))
    $('#calendar.columns').eq(0).append(node)
    for task in day.tasks
      taskLabel = task
      tagIndex = taskLabel.indexOf('@')
      #if tagIndex
        #taskLabel = taskLabel.substr(0, tagIndex-1)

      taskNode = $($.mustache(nodeTmpl, { text : taskLabel, className : '' }))
      $('#calendar.columns').eq(0).append(taskNode)

loadTaskFile = (file) ->
  $.get file, (data) ->
    deserialize(data)
    state.prev = data

isProject = (line) ->
  s = line.trim()
  atIndex = s.indexOf('@')
  if atIndex != -1
    s = s.substr(0, atIndex-1).trim()
  s.lastIndexOf(':') == s.length - 1

serialize = () ->
  str = ''
  $('.node').each ->
    value = $(this).text()
    if $(this).hasClass('project')
      if value.indexOf(':') is -1
        atIndex = value.indexOf('@')
        if atIndex != -1
          value = value.substr(0, atIndex).trim() + ': ' + value.substr(atIndex)
        else
          value = value + ':'
      str += value
    else
      str += '\t- ' + value
    str += '\n'
  str

deserialize = (data) ->
  $('#items.columns').empty()

  lines = data.split('\n');

  nodesInProject = 0
  for line in lines
    line = line.trim()
    if line.length == 0 then continue
    if isProject(line)
      projectName = line.substr(0, line.length)
      createNode(projectName, ['project'])
    else
      task = line
      task = task.replace(/\s*-\s*/, '')
      newNode = createNode(task, [])
      parseNodeTags(newNode)
  updateCalendar()

createNode = (text, classNames) ->
  node = $($.mustache(nodeTmpl, { text : text, className : classNames.join(' ') }))
  node.click(() -> selectNode(node))
  node.dblclick(() -> editNode(node))
  #we have to add it to dom so we can measure it's size with CSS applied
  $('#items.columns').eq(0).append(node)
  node

addNewNodeAfter = (node, title, classNames) ->
  newNode = createNode(title || '', classNames || ['item'])
  newNode.insertAfter(node)
  editNode(newNode)

addNewProjectNodeAfter = (node) ->
  lastNode = node.nextUntil('.project').last()
  if lastNode.size() == 0
    lastNode = node
  addNewNodeAfter(lastNode, 'New Project', ['item', 'project'])

selectNode = (node) ->
  #If the node is already selected then there is nothing to do
  if node == state.currentNode then return

  #If there is another node selected quit edit mode (if necessary) and deselect it
  if state.currentNode
    if state.editMode
      exitEditNode(state.currentNode)
    state.currentNode.removeClass('current')

  #Select the new node
  state.currentNode = node
  state.currentNode.addClass('current')

selectPrevNode = (node, className) ->
  prev = null
  if className
    prev = node.prevAll('.project').eq(0)
  else
    prev = node.prev()
  selectNode prev  if prev.size() > 0

selectNextNode = (node, className) ->
  next = null
  if className
    next = node.nextAll('.project').eq(0)
  else
    next = node.next()
  selectNode next  if next.size() > 0

selectNodeOnTheLeft = (node) ->
  yPos = node.position().top
  sibling = node.prev()
  columns = 0
  closesDistance = -1
  closestNode = null
  while sibling.size() > 0
    siblingY = sibling.position().top
    siblingDistance = Math.abs(siblingY - yPos)
    if siblingY is 0
      ++columns
      break if columns is 2
    if columns is 1 and closesDistance is -1 or siblingDistance < closesDistance
      closestNode = sibling
      closesDistance = siblingDistance
    sibling = sibling.prev()
  selectNode closestNode  if closestNode

selectNodeOnTheRight = (node) ->
  yPos = node.position().top
  sibling = node.next()
  columns = 0
  closesDistance = -1
  closestNode = null
  while sibling.size() > 0
    siblingY = sibling.position().top
    siblingDistance = Math.abs(siblingY - yPos)
    if siblingY is 0
      ++columns
      break  if columns >= 2
    if columns is 1 and closesDistance is -1 or siblingDistance < closesDistance
      closestNode = sibling
      closesDistance = siblingDistance
    sibling = sibling.next()
  selectNode closestNode  if closestNode

parseNodeTags = (node) ->
  task = node.text()
  task = task.replace(/(@[^(\s]+\(*[^)]*\)*)/, '<span class="tag">$1</span>')
  if !task then task = '-'
  tags = task.match(/(?:@)[\(\) \:a-zA-Z0-9\-]+/g)
  if tags
    for tag in tags
      if tag.indexOf('@due') != -1
        dueDate = tag.match(/\(([^\)]+)\)/)
        if dueDate
          dueDate = new Date(dueDate[1].split(' ')[0])
          for day in state.days
            if day.date && dueDate.compareTo(day.date) == 0
              day.tasks.push(task)
  classNames = ['node']
  if node.hasClass('project') then classNames.push('project')
  if node.hasClass('current') then classNames.push('current')
  if tags then classNames =  classNames.concat(tags.map((tag) -> tag.replace('@', '')))
  node.removeClass(node.attr('class'))
  classNames.forEach((c) -> node.addClass(c))

deleteNode = (deleteNode) ->
  if deleteNode.hasClass('project')
    deleteNode.nextUntil('.project').andSelf().remove()
  else
    deleteNode.remove()
  saveChanges()

editNode = (node) ->
  if node != state.selectNode
    selectNode(node)
  if state.editMode && node == state.currentNode
    return
  node.attr('contentEditable', '').focus()
  if node.text() == '-'
    node.text('')
  selectElementText(node.get(0))
  state.editMode = true
  state.editModePrevText = node.text()

exitEditNode = (node) ->
  parseNodeTags(node)
  state.currentNode.removeAttr('contenteditable')
  state.currentNode.blur()
  if !state.currentNode.text().trim()
    state.currentNode.text('-')
  state.editMode = false
  state.editModePrevText = ''
  saveChanges()

handleKeyCommands = (e) ->
  c = String.fromCharCode(e.charCode || e.keyCode)
  if e.ctrlKey
    switch c
      when 'Z' then undo()
      when 'N' then toggleNext()
      when 'D' then toggleDone()

  if e.shiftKey
    switch c
      when 'N' then toggleShowNext()
      when 'F' then toggleFocus()

handleMoveCommands = (e) ->
  switch e.keyCode
    when 38 # Up
      if state.currentNode.hasClass('project')
        prev = state.currentNode.prevUntil('.project')
        if prev.size() == 0
          prev = state.currentNode
        prevProject = prev.last().prev()
        if prevProject.size() > 0
          projectItems = state.currentNode.nextUntil('.project').andSelf()
          prevProject.before(projectItems)
          saveChanges()
          return true
      else
        #we can move nodes only withing the project
        prev = state.currentNode.prev()
        if prev.size() > 0 && !prev.hasClass('project')
          prev.before(state.currentNode)
          saveChanges()
          return true
    when 40 # Down
      handled = true
      if state.currentNode.hasClass('project')
        next = state.currentNode.nextUntil('.project')
        nextProject = next.last().next()
        if next.size() == 0
          nextProject = state.currentNode.next()
        if nextProject.size() > 0
          nextProjectItems = nextProject.nextUntil('.project').andSelf()
          state.currentNode.before(nextProjectItems)
          saveChanges()
          return true
      else
        #we can move nodes only withing the project
        next = state.currentNode.next()
        if next.size() > 0 && !next.hasClass('project')
          next.after(state.currentNode)
          saveChanges()
          return true

handleEnter = (e) ->
  if state.editMode
    exitEditNode(state.currentNode)
    return true
  else if e.shiftKey
    addNewProjectNodeAfter(state.currentNode)
    return true
  else
    addNewNodeAfter(state.currentNode)
    return true

handleEsc = (e) ->
  if state.editMode
    state.currentNode.text(state.editModePrevText)
    exitEditNode(state.currentNode)
    e.preventDefault()
    return true

handleArrowKeys = (e) ->
  if !state.editMode
    switch e.keyCode
      when 37 then selectNodeOnTheLeft(state.currentNode) # Left
      when 38 then selectPrevNode(state.currentNode) # Up
      when 39 then selectNodeOnTheRight(state.currentNode) # Right
      when 40 then selectNextNode(state.currentNode) # Down
    return true

handleDeleteKey = (e) ->
  if !state.editMode
    nodeToDelete = state.currentNode
    if nodeToDelete.hasClass('project')
      selectNextNode(state.currentNode, '.project')
      if state.currentNode == nodeToDelete then selectPrevNode(state.currentNode)
      if state.currentNode == nodeToDelete then state.currentNode = null
    else
      selectNextNode(state.currentNode)
      if state.currentNode == nodeToDelete then selectPrevNode(state.currentNode)
      if state.currentNode == nodeToDelete then state.currentNode = null
    deleteNode(nodeToDelete)
    return true

handleF12Key = (e) ->
  if !state.editMode
    editNode(state.currentNode)
    return true

window.addEventListener 'keydown', (e) ->
  if !state.editMode && (e.ctrlKey || e.shiftKey)
    if handleKeyCommands(e)
      e.preventDefault()
      return

  if state.currentNode == null
    return

  if !state.editMode && e.metaKey
    if handleMoveCommands(e)
      e.preventDefault()
      return

  if e.keyCode == 13 # Enter
    if handleEnter(e)
      e.preventDefault()
      return

  if e.keyCode == 27 # Esc
    if handleEsc(e)
      e.preventDefault()
      return

  if e.keyCode >= 37 && e.keyCode <= 40 # Arrow keys
    if handleArrowKeys(e)
      e.preventDefault()
      return

  if e.keyCode == 46 # Delete
    if handleDeleteKey(e)
      e.preventDefault()
      return

  if e.keyCode == 113 # F2
    if handleF12Key(e)
      e.preventDefault()
      return

undo = () ->
  if state.undoStack.length > 0
    prevState = state.undoStack.pop()
    deserialize(prevState)
    saveChanges({dontPush:true})

saveChanges = (options) ->
  dontPush = options && options.dontPush
  currentState = serialize()
  console.log('saveChanges', dontPush)
  if !dontPush
    state.undoStack.push(state.prev)
    state.prev = currentState
  #$.post('?set', currentState)

$(document).ready(init)