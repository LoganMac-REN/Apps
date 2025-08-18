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
  function todayISO(){
    var d = new Date(), y=d.getFullYear(), m=('0'+(d.getMonth()+1)).slice(-2), dd=('0'+d.getDate()).slice(-2);
    return y+'-'+m+'-'+dd;
  }
  function dayDiff(dateStr){
    if(!dateStr) return 1e9;
    var today = new Date(); today.setHours(0,0,0,0);
    var d = new Date(dateStr + "T00:00:00");
    return Math.round((d - today) / 86400000);
  }

  // ---------- UI State (toggles) ----------
  var hideCheckedGroceries = false;
  var hideCompletedTodos   = false;

  // ---------- Default To-Do date today ----------
  var tDate = $("#t-date"); if (tDate) tDate.value = todayISO();

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
  // Make To-Do the landing page for sure
  switchPage("page-todo");

  // ---------- Due badge formatter ----------
  function formatDue(dateStr){
    if(!dateStr) return { text: "No date", cls: "due-none" };
    var now = new Date(); now.setHours(0,0,0,0);
    var d = new Date(dateStr + "T00:00:00");
    var diff = Math.round((d - now) / 86400000);
    var pretty = d.toLocaleDateString(undefined, { weekday:"short", month:"short", day:"numeric" });
    if (diff < 0)  return { text: "Overdue · " + pretty, cls: "due-overdue" };
    if (diff === 0) return { text: "Today", cls: "due-today" };
    if (diff === 1) return { text: "Tomorrow", cls: "due-today" };
    if (diff <= 7)  return { text: pretty, cls: "due-soon" };
    return { text: pretty, cls: "" };
  }

  // ---------- Inline edit helpers ----------
  function startEdit(li, currentText, onSave){
    if (li.classList.contains("editing")) return;
    li.classList.add("editing");

    var editWrap = document.createElement("div");
    var input = document.createElement("input");
    input.className = "edit-input";
    input.value = currentText || "";
    input.setAttribute("aria-label", "Edit item");
    editWrap.appendChild(input);

    var actions = document.createElement("div");
    actions.className = "edit-actions";
    var save = document.createElement("button");
    save.type = "button"; save.className = "primary small"; save.textContent = "Save";
    var cancel = document.createElement("button");
    cancel.type = "button"; cancel.className = "small"; cancel.textContent = "Cancel";
    actions.appendChild(save); actions.appendChild(cancel);
    editWrap.appendChild(actions);

    // Place edit UI right under the name container
    var main = li.querySelector("div:nth-child(2)");
    main.appendChild(editWrap);
    input.focus();

    function commit(){
      var v = input.value.trim();
      if (v) onSave(v);
      cleanup();
    }
    function cleanup(){
      li.classList.remove("editing");
      editWrap.remove();
    }

    save.addEventListener("click", commit);
    cancel.addEventListener("click", cleanup);
    input.addEventListener("keydown", function(e){
      if (e.key === "Enter") commit();
      if (e.key === "Escape") cleanup();
    });
  }

  // ---------- Renderers ----------
  function renderGrocery(){
    var ul = $("#grocery-list");
    ul.innerHTML = "";

    var items = groceries.slice();
    if (hideCheckedGroceries) items = items.filter(function(it){ return !it.checked; });

    items.forEach(function(it){
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

      // Double-tap the name area to edit text
      var tapTimer = null;
      main.addEventListener("click", function(){
        if (tapTimer){ clearTimeout(tapTimer); tapTimer = null; // double tap
          startEdit(li, it.name, function(newText){
            it.name = newText; store.write("groceryItems", groceries); renderGrocery();
          });
        } else {
          tapTimer = setTimeout(function(){ tapTimer = null; }, 250);
        }
      });

      var right = document.createElement("div"); right.style.display="flex"; right.style.gap="8px";

      // Edit button (pencil)
      var editBtn = document.createElement("button");
      editBtn.className = "iconbtn"; editBtn.title = "Edit name";
      editBtn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>' +
        '</svg>';
      editBtn.addEventListener("click", function(){
        startEdit(li, it.name, function(newText){
          it.name = newText; store.write("groceryItems", groceries); renderGrocery();
        });
      });

      var delBtn = document.createElement("button");
      delBtn.className = "iconbtn"; delBtn.title = "Delete";
      delBtn.textContent = "🗑️";
      delBtn.addEventListener("click", function(){
        groceries = groceries.filter(function(g){ return g.id !== it.id; });
        store.write("groceryItems", groceries); renderGrocery();
      });

      right.appendChild(editBtn); right.appendChild(delBtn);
      li.appendChild(cb); li.appendChild(main); li.appendChild(right);
      ul.appendChild(li);
    });

    $("#g-toggle-checked").textContent = hideCheckedGroceries ? "Show checked" : "Hide checked";
  }

  function renderTodo(){
    var ul = $("#todo-list");
    ul.innerHTML = "";

    // sort: completed last; dated first; by soonest (overdue -> today -> ...); then created
    var items = todos.slice().sort(function(a,b){
      if (!!a.checked !== !!b.checked) return a.checked ? 1 : -1;
      var aHas = !!a.date, bHas = !!b.date;
      if (aHas !== bHas) return aHas ? -1 : 1;
      if (aHas && bHas) {
        var da = dayDiff(a.date), db = dayDiff(b.date);
        if (da !== db) return da - db;
      }
      return (a.created||0) - (b.created||0);
    });

    if (hideCompletedTodos) items = items.filter(function(it){ return !it.checked; });

    items.forEach(function(it){
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

      // Double-tap to edit task name
      var tapTimer = null;
      main.addEventListener("click", function(){
        if (tapTimer){ clearTimeout(tapTimer); tapTimer = null;
          startEdit(li, it.name, function(newText){
            it.name = newText; store.write("todoItems", todos); renderTodo();
          });
        } else {
          tapTimer = setTimeout(function(){ tapTimer = null; }, 250);
        }
      });

      var right = document.createElement("div"); right.style.display="flex"; right.style.gap="8px";

      // Calendar button with transparent date input overlay
      var dateWrap = document.createElement("div");
      dateWrap.className = "iconbtn datepick-wrap"; dateWrap.title = "Change due date";
      dateWrap.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>' +
        '<line x1="16" y1="2" x2="16" y2="6"></line>' +
        '<line x1="8" y1="2" x2="8" y2="6"></line>' +
        '<line x1="3" y1="10" x2="21" y2="10"></line>' +
        '</svg>';
      var inline = document.createElement("input");
      inline.type = "date";
      inline.className = "datepick-overlay";
      inline.value = it.date || "";
      inline.addEventListener("change", function(e){
        it.date = e.target.value || "";
        store.write("todoItems", todos);
        renderTodo();
      });
      dateWrap.appendChild(inline);

      // Edit name button (pencil)
      var editBtn = document.createElement("button");
      editBtn.className = "iconbtn"; editBtn.title = "Edit task";
      editBtn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>' +
        '</svg>';
      editBtn.addEventListener("click", function(){
        startEdit(li, it.name, function(newText){
          it.name = newText; store.write("todoItems", todos); renderTodo();
        });
      });

      var delBtn = document.createElement("button");
      delBtn.className = "iconbtn"; delBtn.title = "Delete"; delBtn.textContent = "🗑️";
      delBtn.addEventListener("click", function(){
        todos = todos.filter(function(t){ return t.id !== it.id; });
        store.write("todoItems", todos); renderTodo();
      });

      right.appendChild(dateWrap); right.appendChild(editBtn); right.appendChild(delBtn);
      li.appendChild(cb); li.appendChild(main); li.appendChild(right);
      ul.appendChild(li);
    });

    $("#t-toggle-completed").textContent = hideCompletedTodos ? "Show completed" : "Hide completed";
  }

  // ---------- Add / Mutations ----------
  $("#grocery-form").addEventListener("submit", function(e){
    e.preventDefault();
    var name = $("#g-name").value ? $("#g-name").value.trim() : "";
    var qty  = parseInt($("#g-qty").value || "1", 10);
    if(!name) return;
    if(isNaN(qty) || qty < 1) qty = 1;

    groceries.unshift({ id: uid(), name: name, qty: qty, checked:false });
    store.write("groceryItems", groceries);
    $("#g-name").value = ""; $("#g-qty").value = "1";
    renderGrocery();
  });

  $("#todo-form").addEventListener("submit", function(e){
    e.preventDefault();
    var name = $("#t-name").value ? $("#t-name").value.trim() : "";
    var date = $("#t-date").value || "";
    if(!name) return;

    todos.unshift({ id: uid(), name: name, date: date, checked:false, created: Date.now() });
    store.write("todoItems", todos);

    $("#t-name").value = "";
    $("#t-date").value = todayISO();

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

  // Grocery toggles & clears
  $("#g-toggle-checked").addEventListener("click", function(){
    hideCheckedGroceries = !hideCheckedGroceries; renderGrocery();
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

  // To-Do toggles & clears
  $("#t-toggle-completed").addEventListener("click", function(){
    hideCompletedTodos = !hideCompletedTodos; renderTodo();
  });
  $("#t-clear-completed").addEventListener("click", function(){
    todos = todos.filter(function(t){ return !t.checked; });
    store.write("todoItems", todos); renderTodo();
  });
  $("#t-reset").addEventListener("click", function(){
    if(confirm("Clear all tasks?")){
      todos = []; store.write("todoItems", todos); renderTodo();
    }
  });

  // ---------- Initial render ----------
  renderGrocery();
  renderTodo();
});
