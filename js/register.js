async function registerUser() {
  const btn = document.querySelector("button");
  btn.disabled = true;

  try {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
    });

    console.log("DATA:", data);
    console.log("ERROR:", error);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Registration successful!");
  } finally {
    btn.disabled = false;
  }
}
