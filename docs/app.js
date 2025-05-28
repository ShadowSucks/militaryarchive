const API_URL = "http://m.bahushbot.ir:3002/api/media";
async function fetchMedia() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(res.statusText);
    const { data } = await res.json();

    const gallery = document.getElementById("gallery");
    const tpl = document.getElementById("card-template");

    data.forEach((item) => {
      const clone = tpl.content.cloneNode(true);
      const img = clone.querySelector(".card-img");
      const title = clone.querySelector(".card-title");
      const desc = clone.querySelector(".card-desc");

      img.src = item.url;
      img.alt = item.title || item.filename;

      title.textContent = item.title || item.filename;
      if (item.description) {
        desc.textContent = item.description;
      } else {
        desc.remove(); // no description → remove the <p>
      }

      gallery.appendChild(clone);
    });
  } catch (err) {
    console.error("Failed to fetch media:", err);
    document.getElementById("gallery").textContent = "Error loading media.";
  }
}

document.addEventListener("DOMContentLoaded", fetchMedia);
