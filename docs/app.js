const API_URL = "https://m.bahushbot.ir:3002/api/media";
let debounceTimer = null;

// fetch & render, passing an optional search term
async function fetchMedia(searchTerm = "") {
  try {
    // build URL with ?title=…
    const url = new URL(API_URL);
    if (searchTerm) url.searchParams.set("title", searchTerm);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(res.statusText);
    const { data } = await res.json();

    const gallery = document.getElementById("gallery");
    gallery.innerHTML = ""; // clear old cards

    const tpl = document.getElementById("card-template");

    data.forEach((item) => {
      const clone = tpl.content.cloneNode(true);
      const img = clone.querySelector(".card-img");
      const title = clone.querySelector(".card-title");
      const desc = clone.querySelector(".card-desc");

      img.src = item.imageUrl || item.url;
      img.alt = item.title || item.filename;

      title.textContent = item.title || item.filename;

      if (item.description) {
        desc.textContent = item.description;
      } else {
        desc.remove();
      }

      gallery.appendChild(clone);
    });
  } catch (err) {
    console.error("fetchMedia error:", err);
    document.getElementById("gallery").textContent = "Error loading media.";
  }
}

// Debounce wrapper for the input
function onSearchInput(e) {
  const term = e.target.value.trim();

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchMedia(term);
  }, 300); // 300ms delay; tweak as you like
}

document.addEventListener("DOMContentLoaded", () => {
  // initial load
  fetchMedia();

  // wire up search
  document
    .getElementById("search-input")
    .addEventListener("input", onSearchInput);
});
