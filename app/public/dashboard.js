fetch("/api/me")
  .then((r) => r.json())
  .then((data) => {
    document.getElementById("whoami").textContent = data.username
      ? "Signed in as: " + data.username
      : "Not authenticated";
  });
