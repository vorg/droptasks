String.prototype.format = String.prototype.f = function() {
    var s = this,
        i = arguments.length;

    while (i--) {
        s = s.replace(new RegExp('\\{' + i + '\\}', 'gm'), arguments[i]);
    }
    return s;
};

function selectElementText(el) {
  if (window.getSelection && document.createRange) {
    var range = document.createRange();
    if (el.childNodes.length > 0) {
      range.setStart(el.childNodes[0], el.childNodes[0].length);
      range.setEnd(el.childNodes[0], el.childNodes[0].length);
    }
    else {
      range.setStart(el, 0);
      range.setEnd(el, 0);
    }

    var sel = window.getSelection();
    sel.empty();
    sel.addRange(range);
  }
}