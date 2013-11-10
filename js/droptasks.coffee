nodeTmpl = null

state = {
  prev: null
  cur: null
  undoStack: []
}

init = () ->
  nodeTmpl = $('#nodeTmpl').html()
  loadTaskFile('http://localhost:3001/?get')

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


deserialize = (data) ->
  $('.columns').empty()

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
      #parseNodeTags(newNode)

createNode = (text, classNames) ->
  node = $($.mustache(nodeTmpl, { text : text, className : classNames.join(' ') }))
  node.click(() -> selectNode(node))
  node.dblclick(() -> editNode(node))
  #we have to add it to dom so we can measure it's size with CSS applied
  $('.columns').eq(0).append(node)
  node

$(document).ready(init)