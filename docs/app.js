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
      const clone = tpl.content.cloneNode(true);
      const img = clone.querySelector(".card-img");
      const vid = clone.querySelector(".card-video");
      const title = clone.querySelector(".card-title");
      const desc = clone.querySelector(".card-desc");
      const fullscreenBtn = clone.querySelector(".btn-fullscreen");
      const downloadBtn = clone.querySelector(".btn-download");

      const isVideo = item.fileType == "video";
      const mediaUrl = item.imageUrl || item.url;
      const titlet = item.title || item.filename;
      if (isVideo) {
        vid.src = mediaUrl;
        vid.alt = titlet;
        img.style.display = "none";
      } else {
        img.src = mediaUrl;
        img.alt = titlet;
        vid.style.display = "none";
      }

      downloadBtn.href = mediaUrl;
      // Fullscreen (modal)
      fullscreenBtn.onclick = () => {
        modal.classList.remove("hidden");
        if (isVideo) {
          modalImg.style.display = "none";
          modalVideo.style.display = "block";
          modalVideo.src = mediaUrl;
          modalVideo.play();
        } else {
          modalVideo.pause();
          modalVideo.style.display = "none";
          modalImg.style.display = "block";
          modalImg.src = mediaUrl;
        }
      };

      // Set text
      title.textContent = titlet;
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

const modal = document.getElementById("media-modal");
const modalImg = document.getElementById("modal-img");
const modalVideo = document.getElementById("modal-video");
const closeBtn = document.querySelector(".modal-close");

closeBtn.onclick = () => {
  modal.classList.add("hidden");
  modalImg.src = "";
  modalVideo.pause();
  modalVideo.src = "";
};
