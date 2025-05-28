const API_LOGIN = "https://m.bahushbot.ir:3002/auth/login";

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = document.getElementById("error-msg");
  errEl.textContent = "";

  const username = e.target.username.value.trim();
  const password = e.target.password.value;

  try {
    const res = await fetch(API_LOGIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        errEl.textContent = "Invalid credentials";
      } else {
        errEl.textContent = "Login failed";
      }
      return;
    }
    localStorage.setItem("username", username);
    window.location.href = "../dashboard";
  } catch (err) {
    console.error(err);
    errEl.textContent = "Network error";
  }
});
