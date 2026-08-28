document.getElementById("search-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = document.getElementById("search-input").value;
  const res = await fetch("/api/search?q=" + encodeURIComponent(q));
  const data = await res.json();
  const list = document.getElementById("search-results");
  list.innerHTML = "";
  data.results.forEach((r) => {
    const li = document.createElement("li");
    li.textContent = r;
    list.appendChild(li);
  });
});
