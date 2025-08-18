// ---------- Storage ----------
const store = {
  read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
};

let groceries = store.read("groceryItems", []);
let todos     = store.read("todoItems", []);

// ---------- Helpers ----------
const $  = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => [...p.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 10);

// Modal state
const modal = {
  el: $("#modal"),
  title: $("#modal-title"),
  notes: $("#modal-notes"),
  openFor: null, // {type:'grocery'|'todo', id}
  open(title, text, ctx){
    this.title.textContent = title || "Notes";
    this.notes.value = text || "";
    this.openFor = ctx;
    this.el.classList.add("open");
    this.el.setAttribute("aria-hidden","false");
    this.notes.focus({ preventScroll:true });
  },
  close(){
    this.el.classList.remove("open");
    this.el.setAttribute("aria-hidden","true");
    this.openFor = null;
  }
};

// ---------- Tabs ----------
function switchPage(targetId){
  $$(".page").forEach(p => {
    const active = p.id === targetId;
    p.toggleAttribute("hidden", !active);
    p.classList.toggle("active", active);
  });
  $$(".tab").forEach(b=>{
    const active = b.dataset.target === targetId;
    b.classList.toggle("active", active);
    b.setAttribute("aria-selected", String(active));
  });
  // prevent Safari auto-scroll to inputs
  document.activeElement && document.activeElement.blur();
}
$$(".tab").forEach(btn => btn.addEventListener("click", () => switchPage(btn.dataset.target)));

// ---------- Renderers ----------
function renderGrocery(){
  const ul = $("#grocery-list");
  ul.innerHTML = "";
  groceries.forEach(it=>{
    const li = document.createElement("li");
    li.className = "item";
    li.dataset.id = it.id;

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!it.checked;
    cb.addEventListener("change", () => {
      it.checked = cb.checked;
      store.write("groceryItems", groceries);
      renderGrocery();
    });

    const main = document.createElement("div");
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = it.name;
    const sub = document.createElement("div");
    sub.className = "sub";
    sub.textContent = `Qty ${it.qty}`;
    main.appendChild(name);
    main.appendChild(sub);
    main.addEventListener("click", ()=> openNotesFor("grocery", it.id));

    const right = document.createElement("div");
    right.style.display = "flex"; right.style.gap = "8px";

    const noteBtn = document.createElement("button");
    noteBtn.className = "iconbtn";
    noteBtn.title = "Notes";
    noteBtn.textContent = "📝";
    noteBtn.addEventListener("click", ()=> openNotesFor("grocery", it.id));

    const delBtn = document.createElement("button");
    delBtn.className = "iconbtn";
    delBtn.title = "Delete";
    delBtn.textContent = "🗑️";
    delBtn.addEventListener("click", ()=>{
      groceries = groceries.filter(g => g.id !== it.id);
      store.write("groceryItems", groceries);
      renderGrocery();
    });

    right.append(noteBtn, delBtn);
    li.append(cb, main, right);
    ul.appendChild(li);
  });
}

function renderTodo(){
  const ul = $("#todo-list");
  ul.innerHTML = "";
  todos.forEach(it=>{
    const li = document.createElement("li");
    li.className = "item";
    li.dataset.id = it.id;

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!it.checked;
    cb.addEventListener("change", () => {
      it.checked = cb.checked;
      store.write("todoItems", todos);
      renderTodo();
    });

    const main = document.createElement("div");
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = it.name;
    const sub = document.createElement("div");
    sub.className = "sub";
    sub.textContent = it.date ? `Due ${it.date}` : "No date";
    main.appendChild(name);
    main.appendChild(sub);
    main.addEventListener("click", ()=> openNotesFor("todo", it.id));

    const right = document.createElement("div");
    right.style.display = "flex"; right.style.gap = "8px";

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = it.date ? it.date : "—";

    const noteBtn = document.createElement("button");
    noteBtn.className = "iconbtn"; noteBtn.textContent = "📝";
    noteBtn.title = "Notes";
    noteBtn.addEventListener("click", ()=> openNotesFor("todo", it.id));

    const delBtn = document.createElement("button");
    delBtn.className = "iconbtn"; delBtn.textContent = "🗑️";
    delBtn.title = "Delete";
    delBtn.addEventListener("click", ()=>{
      todos = todos.filter(t => t.id !== it.id);
      store.write("todoItems", todos);
      renderTodo();
    });

    right.append(badge, noteBtn, delBtn);
    li.append(cb, main, right);
    ul.appendChild(li);
  });
}

// ---------- Add / Mutations ----------
$("#grocery-form").addEventListener("submit", (e)=>{
  e.preventDefault();
  const name = $("#g-name").value.trim();
  const qty  = Math.max(1, parseInt($("#g-qty").value || "1", 10));
  if(!name) return;

  groceries.unshift({ id: uid(), name, qty, checked:false, notes:"" });
  store.write("groceryItems", groceries);
  $("#g-name").value = "";
  $("#g-qty").value = "1";
  // Do NOT refocus the text input (your request)
  renderGrocery();
});

$("#todo-form").addEventListener("submit", (e)=>{
  e.preventDefault();
  const name = $("#t-name").value.trim();
  const date = $("#t-date").value || "";
  if(!name) return;

  todos.unshift({ id: uid(), name, date, checked:false, notes:"" });
  store.write("todoItems", todos);
  $("#t-name").value = "";
  $("#t-date").value = "";
  renderTodo();
});

// qty +/- for grocery
$$(".qtybtn").forEach(b=>{
  b.addEventListener("click", ()=>{
    const n = $("#g-qty");
    const delta = parseInt(b.dataset.q,10);
    n.value = Math.max(1, (parseInt(n.value||"1",10) + delta));
  });
});

// Hide/Clear/Reset — Grocery
$("#g-hide-checked").addEventListener("click", ()=>{
  const ul = $("#grocery-list");
  $$(".item", ul).forEach(li=>{
    const id = li.dataset.id;
    const it = groceries.find(g=>g.id===id);
    li.style.display = it?.checked ? "none" : "";
  });
});
$("#g-clear-checked").addEventListener("click", ()=>{
  groceries = groceries.filter(g=>!g.checked);
  store.write("groceryItems", groceries);
  renderGrocery();
});
$("#g-reset").addEventListener("click", ()=>{
  if(confirm("Clear all grocery items?")){
    groceries = [];
    store.write("groceryItems", groceries);
    renderGrocery();
  }
});

// Hide/Clear/Reset — To-Do
$("#t-hide-checked").addEventListener("click", ()=>{
  const ul = $("#todo-list");
  $$(".item", ul).forEach(li=>{
    const id = li.dataset.id;
    const it = todos.find(t=>t.id===id);
    li.style.display = it?.checked ? "none" : "";
  });
});
$("#t-clear-checked").addEventListener("click", ()=>{
  todos = todos.filter(t=>!t.checked);
  store.write("todoItems", todos);
  renderTodo();
});
$("#t-reset").addEventListener("click", ()=>{
  if(confirm("Clear all tasks?")){
    todos = [];
    store.write("todoItems", todos);
    renderTodo();
  }
});

// ---------- Notes Modal ----------
function openNotesFor(type, id){
  const list   = type === "grocery" ? groceries : todos;
  const idx    = list.findIndex(x=>x.id===id);
  if(idx === -1) return;
  const item   = list[idx];
  modal.open(item.name, item.notes || "", { type, id });
}

$("#modal-close").addEventListener("click", ()=> modal.close());
$("#modal-backdrop").addEventListener("click", ()=> modal.close());
$("#modal-save").addEventListener("click", ()=>{
  if(!modal.openFor) return;
  const { type, id } = modal.openFor;
  const list = type === "grocery" ? groceries : todos;
  const item = list.find(x=>x.id===id);
  if(item){
    item.notes = $("#modal-notes").value.trim();
    if(type === "grocery") store.write("groceryItems", groceries);
    else store.write("todoItems", todos);
    if(type === "grocery") renderGrocery(); else renderTodo();
  }
  modal.close();
});

// keyboard ESC to close modal
document.addEventListener("keydown", (e)=>{
  if(e.key === "Escape" && $("#modal").classList.contains("open")) modal.close();
});

// ---------- Init ----------
renderGrocery();
renderTodo();
