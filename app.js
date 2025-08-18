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

// Notes modal state
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
  document.activeElement?.blur();
}
$$(".tab").forEach(btn => btn.addEventListener
