document.addEventListener("DOMContentLoaded", function () {
  // ---------- Storage ----------
  var store = {
    read: function (key, fallback) {
      try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
      catch (e) { return fallback; }
    },
    write: function (key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  };

  var groceries = store.read("groceryItems", []);
  var todos     = store.read("todoItems", []);

  // ---------- Helpers ----------
  function $(s, p){ return (p || document).querySelector(s); }
  function $all(s, p){ return Array.prototype.slice.call((p || document).querySelectorAll(s)); }
  function uid(){ return Math.random().toString(36).slice(2, 10); }

  // Notes modal state
  var modal = {
    el: $("#modal"),
    title: $("#modal-title"),
    notes: $("#modal-notes"),
    openFor: null, // {type:'grocery'|'todo', id}
    open: function (title, text, ctx){
      this.title.textContent = title || "Notes";
      this.notes.value = text || "";
      this.openFor = ctx;
      this.el.classList.add("open");
      this.el.setAttribute("aria-hidden","false");
      this.notes.focus();
    },
    close: function (){
      this.el.classList.remove("open");
      this.el.setAttribute("aria-hidden","true");
      this.openFor = null;
    }
  };

  // ---------- Tabs ----------
  function switchPage(targetId){
    $all(".page").forEach(function(p){
      var active = p.id === targetId;
      if (!active) { p.setAttribute("hidden",""); } else { p.removeAttribute("hidden"); }
      p.classList.toggle("active", active);
    });
    $all(".tab").forEach(function(b){
      var active = b.getAttribute("data-target") === targetId;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  $all(".tab").forEach(function(btn){
    btn.addEventListener("click", function(){ switchPage(btn.getAttribute("data-target")); });
  });

  // ---------- Due date formatting ----------
  function formatDue(dateStr){
    if(!dateStr) return { text: "No date", cls: "due-none" };
    var today = new Date(); today.setHours(0,0,0,0);
    var d = new Date(dateStr + "T00:00:00");
    var diffDays = Math.round((d - today) / 86400000);
    var opts = { weekday: "short", month: "short", day: "numeric" };
    var pretty = d.toLocaleDateString(undefined, opts); // Mon, Aug 19
    if (diffDays < 0)  return { text: "Overdue · " + pretty, cls: "due-overdue" };
    if (diffDays === 0) return { text: "Today", cls: "due-today" };
    if (diffDays === 1) return { text: "Tomorrow", cls: "due-today" };
    if (diffDays <= 7) return { text: pretty, cls: "due-soon" };
    return { text: pretty, cls: "" };
  }

  // ---------- Renderers ----------
  function renderGrocery(){
    var ul = $("#grocery-list");
    ul.innerHTML = "";
    groceries.forEach(function(it){
      var li = document.createElement("li");
      li.className = "item";
      li.dataset.id = it.id;

      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!it.checked;
      cb.addEventListener("change", function () {
        it.checked = cb.checked; store.write("groceryItems", groceries); renderGrocery();
      });

      var main = document.createElement("div");
      var name = document.createElement("div"); name.className = "name"; name.textContent = it.name;
      var sub  = document.createElement("div"); sub.className = "sub"; sub.textContent = "Qty " + it.qty;
      main.appendChild(name); main.appendChild(sub);
      main.addEventListener("click", function(){ openNotesFor("grocery", it.id); });

      var right = document.createElement("div"); right.style.display="flex"; right.style.gap="8px";

      var noteBtn = document.createElement("button");
      noteBtn.className = "iconbtn"; noteBtn.title = "Notes"; noteBtn.textContent = "📝";
      noteBtn.addEventListener("click", function(){ openNotesFor("grocery", it.id); });

      var delBtn = document.createElement("button");
      delBtn.className = "iconbtn"; delBtn.title = "Delete"; delBtn.textContent = "🗑️";
      delBtn.addEventListener("click", function(){
        groceries = groceries.filter(function(g){ return g.id !== it.id; });
        store.write("groceryItems", groceries); renderGrocery();
      });

      right.appendChild(noteBtn); right.appendChild(delBtn);
      li.appendChild(cb); li.appendChild(main); li.appendChild(right);
      ul.appendChild(li);
    });
  }

  function renderTodo(){
    var ul = $("#todo-list");
    ul.innerHTML = "";
    todos.forEach(function(it){
      var li = document.createElement("li");
      li.className = "item";
      li.dataset.id = it.id;

      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!it.checked;
      cb.addEventListener("change", function () {
        it.checked = cb.checked; store.write("todoItems", todos); renderTodo();
      });

      var main = document.createElement("div");
      var name = document.createElement("div"); name.className = "name"; name.textContent = it.name;

      var sub = document.createElement("div"); sub.className = "sub";
      var due = formatDue(it.date);
      var badge = document.createElement("span"); badge.className = "badge " + due.cls; badge.textContent = due.text;
      sub.appendChild(badge);

      main.appendChild(name); main.appendChild(sub);
      main.addEventListener("click", function(){ openNotesFor("todo", it.id); });

      var right = document.createElement("div"); right.style.display="flex"; right.style.gap="8px";

      var dateBtn = document.createElement("button");
      dateBtn.className = "iconbtn"; dateBtn.title = "Change due date"; dateBtn.textContent = "📅";
      dateBtn.addEventListener("click", function(){ openInlineDatePicker(it.id, it.date); });

      var noteBtn = document.createElement("button");
      noteBtn.className = "iconbtn"; noteBtn.title = "Notes"; noteBtn.textContent = "📝";
      noteBtn.addEventListener("click", function(){ openNotesFor("todo", it.id); });

      var delBtn = document.createElement("button");
      delBtn.className = "iconbtn"; delBtn.title = "Delete"; delBtn.textContent = "🗑️";
      delBtn.addEventListener("click", function(){
        todos = todos.filter(function(t){ return t.id !== it.id; });
        store.write("todoItems", todos); renderTodo();
      });

      right.appendChild(dateBtn); right.appendChild(noteBtn); right.appendChild(delBtn);
      li.appendChild(cb); li.appendChild(main); li.appendChild(right);
      ul.appendChild(li);
    });
  }

  // ---------- Add / Mutations ----------
  $("#grocery-form").addEventListener("submit", function(e){
    e.preventDefault();
    var name = $("#g-name").value ? $("#g-name").value.trim() : "";
    var qty  = parseInt($("#g-qty").value || "1", 10);
    if(!name) return;
    if(isNaN(qty) || qty < 1) qty = 1;

    groceries.unshift({ id: uid(), name: name, qty: qty, checked:false, notes:"" });
    store.write("groceryItems", groceries);
    $("#g-name").value = ""; $("#g-qty").value = "1";
    renderGrocery();
  });

  $("#todo-form").addEventListener("submit", function(e){
    e.preventDefault();
    var name = $("#t-name").value ? $("#t-name").value.trim() : "";
    var date = $("#t-date").value || "";
    if(!name) return;

    todos.unshift({ id: uid(), name: name, date: date, checked:false, notes:"" });
    store.write("todoItems", todos);
    $("#t-name").value = ""; $("#t-date").value = "";
    renderTodo();
  });

  // qty +/- for grocery
  $all(".qtybtn").forEach(function(b){
    b.addEventListener("click", function(){
      var n = $("#g-qty");
      var delta = parseInt(b.getAttribute("data-q"), 10);
      var val = parseInt(n.value || "1", 10);
      if(isNaN(val)) val = 1;
      n.value = Math.max(1, val + delta);
    });
  });

  // Hide/Clear/Reset — Grocery
  $("#g-hide-checked").addEventListener("click", function(){
    var ul = $("#grocery-list");
    $all(".item", ul).forEach(function(li){
      var id = li.dataset.id;
      var it = groceries.find(function(g){ return g.id === id; });
      li.style.display = it && it.checked ? "none" : "";
    });
  });
  $("#g-clear-checked").addEventListener("click", function(){
    groceries = groceries.filter(function(g){ return !g.checked; });
    store.write("groceryItems", groceries); renderGrocery();
  });
  $("#g-reset").addEventListener("click", function(){
    if(confirm("Clear all grocery items?")){
      groceries = []; store.write("groceryItems", groceries); renderGrocery();
    }
  });

  // Hide/Clear/Reset — To-Do
  $("#t-hide-checked").addEventListener("click", function(){
    var ul = $("#todo-list");
    $all(".item", ul).forEach(function(li){
      var id = li.dataset.id;
      var it = todos.find(function(t){ return t.id === id; });
      li.style.display = it && it.checked ? "none" : "";
    });
  });
  $("#t-clear-checked").addEventListener("click", function(){
    todos = todos.filter(function(t){ return !t.checked; });
    store.write("todoItems", todos); renderTodo();
  });
  $("#t-reset").addEventListener("click", function(){
    if(confirm("Clear all tasks?")){
      todos = []; store.write("todoItems", todos); renderTodo();
    }
  });

  // ---------- Notes Modal ----------
  function openNotesFor(type, id){
    var list = type === "grocery" ? groceries : todos;
    var item = list.find(function(x){ return x.id === id; });
    if(!item) return;
    modal.open(item.name, item.notes || "", { type: type, id: id });
  }
  $("#modal-close").addEventListener("click", function(){ modal.close(); });
  $("#modal-backdrop").addEventListener("click", function(){ modal.close(); });
  $("#modal-save").addEventListener("click", function(){
    if(!modal.openFor) return;
    var type = modal.openFor.type, id = modal.openFor.id;
    var list = type === "grocery" ? groceries : todos;
    var item = list.find(function(x){ return x.id === id; });
    if(item){
      item.notes = $("#modal-notes").value.trim();
      if(type === "grocery") store.write("groceryItems", groceries);
      else store.write("todoItems", todos);
      if(type === "grocery") renderGrocery(); else renderTodo();
    }
    modal.close();
  });
  document.addEventListener("keydown", function(e){
    if(e.key === "Escape" && $("#modal").classList.contains("open")) modal.close();
  });

  // ---------- Inline date picker (shared hidden input) ----------
  var editingTodoId = null;
  function openInlineDatePicker(id, current){
    var input = $("#inline-date");
    editingTodoId = id;
    input.value = current || "";
    if (input.showPicker) { try { input.showPicker(); } catch(e){ input.click(); } }
    else { input.click(); }
  }
  $("#inline-date").addEventListener("change", function(e){
    if(!editingTodoId) return;
    var t = todos.find(function(x){ return x.id === editingTodoId; });
    if(t){
      t.date = e.target.value || "";
      store.write("todoItems", todos); renderTodo();
    }
    editingTodoId = null;
  });

  // ---------- Init ----------
  renderGrocery();
  renderTodo();
});
