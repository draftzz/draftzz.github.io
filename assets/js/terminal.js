(function () {
  var root = document.getElementById('terminal');
  if (!root) return;

  var output = document.getElementById('term-output');
  var form = document.getElementById('term-form');
  var input = document.getElementById('term-input');
  var dataEl = document.getElementById('term-data');
  var launcher = document.querySelector('[data-term-open]');

  var data = { email: '', github: '', linkedin: '', baseurl: '', projects: [] };
  try { if (dataEl) data = Object.assign(data, JSON.parse(dataEl.textContent)); } catch (e) { /* ignore */ }
  var base = data.baseurl || '';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var history = [];
  var histIndex = 0;
  var opened = false;

  var sections = {
    about: '#about', method: '#method', projects: '#projects',
    writeups: '#writeups', research: '#writeups', contact: '#contact'
  };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function print(html, cls) {
    var p = document.createElement('p');
    if (cls) p.className = cls;
    p.innerHTML = html;
    output.appendChild(p);
    output.scrollTop = output.scrollHeight;
  }
  function printCmd(cmd) {
    print('<span class="terminal__prompt">draftzz@portfolio:~$</span>' + esc(cmd), 'terminal__line-cmd');
  }

  function onHome() {
    var p = location.pathname.replace(/index\.html$/, '');
    return p === (base + '/') || p === '/' || p === base + '' || p === (base || '/');
  }
  function navAnchor(anchor) {
    var el = document.querySelector(anchor);
    if (el && onHome()) {
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      close();
    } else {
      location.href = base + '/' + anchor;
    }
  }

  var commands = {
    help: function () {
      print('available commands:', 'muted');
      print('  <span class="accent">help</span>             this list');
      print('  <span class="accent">ls</span> [projects]    list sections (or projects)');
      print('  <span class="accent">open</span> &lt;name&gt;      jump to a section');
      print('  <span class="accent">cat</span> &lt;about|contact&gt; read info');
      print('  <span class="accent">whoami</span>           identity');
      print('  <span class="accent">projects</span>         open the full project index');
      print('  <span class="accent">writeups</span>         jump to research');
      print('  <span class="accent">tags</span>             browse by technique');
      print('  <span class="accent">github</span> · <span class="accent">linkedin</span> · <span class="accent">email</span>');
      print('  <span class="accent">date</span>             current time');
      print('  <span class="accent">clear</span>            wipe the screen');
      print('  <span class="accent">exit</span>             close the shell');
    },
    ls: function (args) {
      if (args[0] && args[0].toLowerCase().indexOf('proj') === 0) {
        if (!data.projects.length) { print('no projects indexed.', 'muted'); return; }
        data.projects.forEach(function (p, i) {
          var n = (i < 9 ? '0' : '') + (i + 1);
          print('<span class="accent">' + n + '</span>  ' + esc(p.name) + '  <span class="muted">' + esc(p.type || '') + '</span>');
        });
        return;
      }
      print('about  method  projects  writeups  contact  tags', 'accent');
    },
    open: function (args) {
      var t = (args[0] || '').toLowerCase();
      if (!t) { print('usage: open &lt;about|method|projects|writeups|contact&gt;', 'err'); return; }
      if (sections[t]) { print('→ opening ' + t + ' ...', 'muted'); navAnchor(sections[t]); return; }
      print('no such section: ' + esc(t), 'err');
    },
    cd: function (args) { commands.open(args); },
    goto: function (args) { commands.open(args); },
    cat: function (args) {
      var t = (args[0] || '').toLowerCase().replace(/\.md$/, '');
      if (t === 'about') {
        print('Bruno "draftzz" Moreira — applied AI, industrial software,');
        print('automotive systems, and security research. I build systems for');
        print('technical environments where the answer is rarely in one place.');
      } else if (t === 'contact') {
        commands.email(); commands.github(); commands.linkedin();
      } else if (t === 'whoami') {
        commands.whoami();
      } else {
        print('usage: cat &lt;about|contact&gt;', 'err');
      }
    },
    about: function () { commands.cat(['about']); },
    whoami: function () {
      print('draftzz', 'accent');
      print('Bruno Antonio Moreira · applied-systems builder', 'muted');
    },
    projects: function () { print('→ opening project index ...', 'muted'); location.href = base + '/projects/'; },
    writeups: function () { navAnchor('#writeups'); },
    research: function () { navAnchor('#writeups'); },
    tags: function () { print('→ opening tags ...', 'muted'); location.href = base + '/tags/'; },
    home: function () { location.href = base + '/'; },
    github: function () {
      var url = 'https://github.com/' + data.github;
      print('opening <a href="' + url + '" target="_blank" rel="noopener">' + esc(url) + '</a> ...');
      window.open(url, '_blank', 'noopener');
    },
    linkedin: function () {
      var url = 'https://www.linkedin.com/in/' + data.linkedin + '/';
      print('opening <a href="' + url + '" target="_blank" rel="noopener">linkedin/' + esc(data.linkedin) + '</a> ...');
      window.open(url, '_blank', 'noopener');
    },
    email: function () { print('<a href="mailto:' + esc(data.email) + '">' + esc(data.email) + '</a>'); },
    date: function () { print(new Date().toString(), 'muted'); },
    echo: function (args) { print(esc(args.join(' '))); },
    clear: function () { output.innerHTML = ''; },
    sudo: function () { print("nice try — you don't have root here ☺", 'muted'); },
    exit: function () { close(); },
    quit: function () { close(); },
    close: function () { close(); }
  };

  function run(raw) {
    var line = raw.trim();
    if (!line) return;
    printCmd(line);
    history.push(line);
    histIndex = history.length;
    var parts = line.split(/\s+/);
    var cmd = parts.shift().toLowerCase();
    if (commands.hasOwnProperty(cmd)) {
      commands[cmd](parts);
    } else {
      print('command not found: ' + esc(cmd) + ' — type <span class="accent">help</span>', 'err');
    }
  }

  function open() {
    if (opened) return;
    opened = true;
    root.hidden = false;
    if (!output.childElementCount) {
      print('draftzz shell — type <span class="accent">help</span> for commands, <span class="accent">exit</span> to close.', 'muted');
    }
    window.setTimeout(function () { input.focus(); }, 10);
  }
  function close() {
    if (!opened) return;
    opened = false;
    root.hidden = true;
    if (launcher) launcher.focus();
  }
  function toggle() { opened ? close() : open(); }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      run(input.value);
      input.value = '';
    });
  }
  function caretEnd() { var v = input.value; input.value = ''; input.value = v; }
  if (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') {
        if (histIndex > 0) { histIndex--; input.value = history[histIndex] || ''; e.preventDefault(); caretEnd(); }
      } else if (e.key === 'ArrowDown') {
        if (histIndex < history.length - 1) { histIndex++; input.value = history[histIndex] || ''; }
        else { histIndex = history.length; input.value = ''; }
        e.preventDefault(); caretEnd();
      } else if (e.key === 'Escape') {
        close();
      }
    });
  }

  if (launcher) launcher.addEventListener('click', open);
  Array.prototype.forEach.call(root.querySelectorAll('[data-term-close]'), function (el) {
    el.addEventListener('click', close);
  });

  document.addEventListener('keydown', function (e) {
    var t = e.target;
    var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if ((e.key === '`' || e.key === '~') && !typing) {
      e.preventDefault();
      toggle();
    }
  });
})();
