const API_URL = "https://m.bahushbot.ir:3002/api/media";
let debounceTimer = null;
let currentPage = 1;
let currentSearch = "";

async function fetchMedia(searchTerm = "", page = 1) {
  try {
    const url = new URL(API_URL);
    if (searchTerm) url.searchParams.set("title", searchTerm);
    url.searchParams.set("page", page);
    url.searchParams.set("limit", 20); // or whatever

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(res.statusText);
    const { data, page: current, total, limit } = await res.json();

    const gallery = document.getElementById("gallery");
    gallery.innerHTML = "";

    const tpl = document.getElementById("card-template");

    data.forEach((item) => {
      console.log(item);
      const clone = tpl.content.cloneNode(true);
      const img = clone.querySelector(".card-img");
      const vid = clone.querySelector(".card-video");
      const title = clone.querySelector(".card-title");
      const desc = clone.querySelector(".card-desc");
      if (item.filetype == "video") {
        vid.src = item.imageUrl || item.url;
        vid.alt = item.title || item.filename;
        img.style.display = "none";
      } else {
        img.src = item.imageUrl || item.url;
        img.alt = item.title || item.filename;
        vid.style.display = "none";
      }

      title.textContent = item.title || item.filename;

      if (item.description) {
        desc.textContent = item.description;
      } else {
        desc.remove();
      }

      gallery.appendChild(clone);
    });

    // pagination info
    document.getElementById("page-info").textContent = `Page ${current}`;
    document.getElementById("prev-page").disabled = current <= 1;
    document.getElementById("next-page").disabled = current * limit >= total;
  } catch (err) {
    console.error("fetchMedia error:", err);
    document.getElementById("gallery").textContent = "Error loading media.";
  }
}

function onSearchInput(e) {
  const term = e.target.value.trim();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    currentSearch = term;
    currentPage = 1;
    fetchMedia(term, currentPage);
  }, 300);
}

document.addEventListener("DOMContentLoaded", () => {
  fetchMedia();

  document
    .getElementById("search-input")
    .addEventListener("input", onSearchInput);

  document.getElementById("prev-page").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      fetchMedia(currentSearch, currentPage);
    }
  });

  document.getElementById("next-page").addEventListener("click", () => {
    currentPage++;
    fetchMedia(currentSearch, currentPage);
  });
});
