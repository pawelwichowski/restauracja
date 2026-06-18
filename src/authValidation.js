const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "qwerty",
  "qwerty123",
  "12345678",
  "admin123",
  "meow",
]);

function isRegistrationForm(form) {
  return Boolean(form.querySelector('input[name="username"]'));
}

function isNewPasswordForm(form) {
  return Boolean(form.querySelector('input[autocomplete="new-password"]'));
}

function getFieldMessage(input) {
  const form = input.closest("form");
  if (!form) return "";

  const value = input.value.trim();

  if (input.name === "username" && isRegistrationForm(form)) {
    if (!value) return "Podaj nazwę użytkownika.";
    if (value.length < 3) return "Nazwa użytkownika musi mieć co najmniej 3 znaki.";
    if (value.length > 150) return "Nazwa użytkownika jest zbyt długa.";
    if (!/^[a-zA-Z0-9_.-]+$/.test(value)) {
      return "Nazwa może zawierać litery, cyfry, kropkę, myślnik i podkreślenie.";
    }
  }

  if (input.name === "password" && isNewPasswordForm(form)) {
    if (!input.value) return "Podaj hasło.";
    if (input.value.length < 8) return "Hasło musi mieć co najmniej 8 znaków.";
    if (COMMON_PASSWORDS.has(input.value.toLowerCase())) {
      return "To hasło jest zbyt proste. Wybierz inne hasło.";
    }

    const username = form.querySelector('input[name="username"]')?.value.trim().toLowerCase();
    const email = form.querySelector('input[name="email"]')?.value.trim().toLowerCase();
    const password = input.value.toLowerCase();

    if (username && password.includes(username)) {
      return "Hasło nie może zawierać nazwy użytkownika.";
    }
    if (email && password.includes(email.split("@")[0])) {
      return "Hasło nie może zawierać nazwy z adresu e-mail.";
    }
  }

  if (input.name === "passwordConfirmation" && isNewPasswordForm(form)) {
    const password = form.querySelector('input[name="password"]')?.value || "";
    if (!input.value) return "Powtórz hasło.";
    if (input.value !== password) return "Hasła nie są takie same.";
  }

  return "";
}

function showFieldMessage(input, message) {
  const label = input.closest("label");
  if (!label) return;

  let errorElement = label.querySelector(".field-validation-message");
  if (!errorElement) {
    errorElement = document.createElement("span");
    errorElement.className = "field-validation-message";
    errorElement.setAttribute("role", "alert");
    label.append(errorElement);
  }

  errorElement.textContent = message;
  errorElement.hidden = !message;
  input.setCustomValidity(message);
  input.setAttribute("aria-invalid", message ? "true" : "false");
  input.classList.toggle("input-invalid", Boolean(message));
}

function validateInput(input) {
  const message = getFieldMessage(input);
  showFieldMessage(input, message);
  return !message;
}

function validateForm(form) {
  const inputs = [...form.querySelectorAll("input[name]")];
  return inputs.map(validateInput).every(Boolean);
}

document.addEventListener("input", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.closest(".auth-form")) return;

  validateInput(input);

  if (input.name === "password" || input.name === "username" || input.name === "email") {
    const confirmation = input.closest("form")?.querySelector('input[name="passwordConfirmation"]');
    if (confirmation?.value) validateInput(confirmation);
  }
});

document.addEventListener("blur", (event) => {
  const input = event.target;
  if (input instanceof HTMLInputElement && input.closest(".auth-form")) validateInput(input);
}, true);

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.classList.contains("auth-form")) return;

  if (!validateForm(form)) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);
