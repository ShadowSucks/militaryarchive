const form = document.getElementById("upload-form");
const toggleBtn = document.getElementById("toggle-form");
const statusDiv = document.getElementById("upload-status");
const logoutBtn = document.getElementById("logout-btn");
let username = null;
window.addEventListener("DOMContentLoaded", () => {
  let t = localStorage.getItem("username");
  console.log(t);
  if (!(t != null && t != undefined)) {
    username = t;
    alert("You are not logged in");
    window.location.href = "../login";
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
