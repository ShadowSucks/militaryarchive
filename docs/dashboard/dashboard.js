const form = document.getElementById("upload-form");
const toggleBtn = document.getElementById("toggle-form");
const statusDiv = document.getElementById("upload-status");
const logoutBtn = document.getElementById("logout-btn");
let username = null;
window.addEventListener("DOMContentLoaded", () => {
  let t = localStorage.getItem("username");
  if (!(t != null && t != undefined)) {
    alert("You are not logged in");
    window.location.href = "../login";
  } else {
    username = t;
  }
});
toggleBtn.addEventListener("click", () => {
  form.style.display = form.style.display === "none" ? "block" : "none";
  statusDiv.textContent = "";
});
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("username");
  alert("Successfully logged out");
  window.location.href = "../login";
});
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  formData.append("createdBy", username);
  formData.append("createdAt", new Date().toISOString());

  statusDiv.textContent = "Uploading...";

  try {
    const res = await fetch("https://m.bahushbot.ir:3002/api/add", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (data.success) {
      statusDiv.textContent = "✅ Uploaded successfully!";
      form.reset();
    } else {
      statusDiv.textContent = "❌ Failed: " + data.error;
    }
  } catch (err) {
    console.error(err);
    statusDiv.textContent = "❌ Error uploading file.";
  }
});

document
  .getElementById("file-input")
  .addEventListener("change", function (event) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById("preview-container");
    previewContainer.innerHTML = ""; // Clear previous previews

    if (!file) return;

    const fileType = file.type;
    const fileURL = URL.createObjectURL(file);

    if (fileType.startsWith("image/")) {
      const img = document.createElement("img");
      img.src = fileURL;
      img.alt = "Image Preview";
      img.style.maxWidth = "300px";
      img.style.marginTop = "1rem";
      previewContainer.appendChild(img);
    } else if (fileType.startsWith("video/")) {
      const video = document.createElement("video");
      video.src = fileURL;
      video.controls = true;
      video.style.maxWidth = "300px";
      video.style.marginTop = "1rem";
      previewContainer.appendChild(video);
    } else {
      const message = document.createElement("p");
      message.textContent =
        "Selected file is not a supported image or video format.";
      previewContainer.appendChild(message);
    }
  });
