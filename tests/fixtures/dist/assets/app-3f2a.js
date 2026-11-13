// A tiny stand-in for a production chunk (bundle.mjs only measures it).
const items = ["cone 06", "cone 04", "cone 6", "cone 10"];
export function render(root) {
  root.innerHTML = items.map((i) => `<li>${i}</li>`).join("");
}
render(document.querySelector("main"));
//# sourceMappingURL=app-3f2a.js.map
