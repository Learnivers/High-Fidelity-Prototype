var Auth = (function () {
  var USERS = "bcirs_users", SESSION = "bcirs_session";

  function readUsers() {
    try { return JSON.parse(localStorage.getItem(USERS)) || []; }
    catch (e) { return []; }
  }
  function writeUsers(list) { localStorage.setItem(USERS, JSON.stringify(list)); }
  function norm(s) { return String(s).trim().toLowerCase(); }
  function indexOfEmail(list, email) {
    for (var i = 0; i < list.length; i++) {
      if (norm(list[i].email) === norm(email)) return i;
    }
    return -1;
  }
  // matches a username OR an email
  function indexOfLogin(list, who) {
    for (var i = 0; i < list.length; i++) {
      if (norm(list[i].email) === norm(who)) return i;
      if (list[i].username && norm(list[i].username) === norm(who)) return i;
    }
    return -1;
  }

  return {
    signup: function (u) {
      if (!u.name || !u.dob || !u.sex || !u.email || !u.password) return "Fill in every field.";
      var list = readUsers();
      if (indexOfEmail(list, u.email) !== -1) return "That email is already registered.";
      if (u.username && indexOfLogin(list, u.username) !== -1) return "That username is already taken.";
      list.push(u);
      writeUsers(list);
      return "";
    },
    login: function (who, pass, role) {
      if (!who || !pass) return "Enter your username and password.";
      var list = readUsers(), i = indexOfLogin(list, who);
      if (i === -1 || list[i].password !== pass) return "Wrong username or password.";
      if (role && list[i].role !== role) return "This is not a " + role + " account.";
      sessionStorage.setItem(SESSION, list[i].email);
      return "";
    },
    current: function () {
      var email = sessionStorage.getItem(SESSION);
      if (!email) return null;
      var list = readUsers(), i = indexOfEmail(list, email);
      return i === -1 ? null : list[i];
    },
    require: function (role, loginPage) {
      var u = Auth.current();
      if (!u || (role && u.role !== role)) {
        window.location.replace(loginPage || "login.html");
        return null;
      }
      return u;
    },
    update: function (data) {
      var email = sessionStorage.getItem(SESSION);
      var list = readUsers(), i = indexOfEmail(list, email);
      if (i === -1) return "Please sign in again.";
      var j = indexOfEmail(list, data.email);
      if (j !== -1 && j !== i) return "That email is used by another account.";
      data.role = list[i].role;
      if (list[i].username && !data.username) data.username = list[i].username;
      list[i] = data;
      writeUsers(list);
      sessionStorage.setItem(SESSION, data.email);
      return "";
    },
    logout: function () { sessionStorage.removeItem(SESSION); }
  };

  <script>
  if (typeof Auth === "undefined") {
    document.querySelector("main").innerHTML =
      "<p>auth.js was not found. Check the path in the script tag at the bottom of this page.</p>";
    throw new Error("auth.js missing");
  }

  // Loads the account that signed in. Anyone else goes to the user sign in.
  var data = Auth.require("user", "user.html");
  if (!data) { throw new Error("not signed in"); }

  var form = document.getElementById("f");
  var err = document.getElementById("err");
  var ok = document.getElementById("ok");

  var FIELDS = ["first", "last", "dob", "sex", "email", "phone", "street", "brgy", "city"];

  // Older accounts may only have a full name; split it into first/last
  function getFirst(d) {
    if (d.first !== undefined) return d.first;
    var p = String(d.name || "").trim().split(/\s+/);
    return p.length > 1 ? p.slice(0, -1).join(" ") : (p[0] || "");
  }
  function getLast(d) {
    if (d.last !== undefined) return d.last;
    var p = String(d.name || "").trim().split(/\s+/);
    return p.length > 1 ? p[p.length - 1] : "";
  }
  function valueOf(d, k) {
    if (k === "first") return getFirst(d);
    if (k === "last") return getLast(d);
    return d[k] || "";
  }

  function calcAge(dob) {
    if (!dob) return "";
    var b = new Date(dob), t = new Date();
    var age = t.getFullYear() - b.getFullYear();
    var m = t.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
    return age >= 0 ? age : "";
  }

  function prettyDate(dob) {
    if (!dob) return "";
    return new Date(dob + "T00:00:00").toLocaleDateString("en-US",
      { year: "numeric", month: "long", day: "numeric" });
  }

  function initials(d) {
    return ((getFirst(d)[0] || "") + (getLast(d)[0] || "")).toUpperCase();
  }

  function show() {
    document.querySelectorAll("[data-view]").forEach(function (el) {
      var k = el.getAttribute("data-view");
      el.textContent = k === "dob" ? prettyDate(data.dob) : valueOf(data, k);
    });
    document.getElementById("age").textContent = calcAge(data.dob);
    document.getElementById("avatar").textContent = initials(data) || "?";
  }

  function fill() {
    FIELDS.forEach(function (k) {
      document.getElementById(k).value = valueOf(data, k);
    });
    document.getElementById("password").value = "";
    document.getElementById("age").textContent = calcAge(data.dob);
  }

  function setEditing(on) {
    form.classList.toggle("editing", on);
    err.textContent = "";
    if (on) {
      ok.textContent = "";
      fill();
      document.getElementById("first").focus();
    } else {
      show();
    }
  }

  document.getElementById("dob").addEventListener("input", function () {
    document.getElementById("age").textContent = calcAge(this.value);
  });

  document.getElementById("editBtn").addEventListener("click", function () { setEditing(true); });
  document.getElementById("cancelBtn").addEventListener("click", function () { setEditing(false); });
  document.getElementById("signout").addEventListener("click", function () { Auth.logout(); });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    save();
  });

  function val(id) { return document.getElementById(id).value.trim(); }
  function fail(id, msg) {
    err.textContent = msg;
    var el = document.getElementById(id);
    if (el) el.focus();
    return false;
  }

  function getUsers() {
    try { return JSON.parse(localStorage.getItem("users")) || []; }
    catch (e) { return []; }
  }

  // Uses Auth.update if your auth.js has it, otherwise updates the
  // "users" list directly (matched by username).
  function persist(updated) {
    if (typeof Auth.update === "function") {
      Auth.update(updated);
      return true;
    }
    var list = getUsers();
    for (var i = 0; i < list.length; i++) {
      if (list[i].username === updated.username) {
        list[i] = updated;
        try { localStorage.setItem("users", JSON.stringify(list)); }
        catch (e) { return false; }
        return true;
      }
    }
    return false;
  }

  function save() {
    var first = val("first"), last = val("last"), dob = val("dob");
    var sex = document.getElementById("sex").value;
    var email = val("email"), phone = val("phone");
    var street = val("street"), brgy = val("brgy"), city = val("city");
    var pass = document.getElementById("password").value;

    if (!first) return fail("first", "Enter your first name.");
    if (!last) return fail("last", "Enter your last name.");
    if (!dob) return fail("dob", "Enter your birthdate.");
    if (new Date(dob) > new Date()) return fail("dob", "Birthdate cannot be in the future.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("email", "Enter a valid email address.");
    if (!/^(09|\+639)\d{9}$/.test(phone.replace(/[\s-]/g, ""))) {
      return fail("phone", "Enter a valid mobile number (e.g. 09123456789).");
    }
    if (!street) return fail("street", "Enter your street address.");
    if (!brgy) return fail("brgy", "Enter your barangay.");
    if (!city) return fail("city", "Enter your city.");
    if (pass !== "" && pass.length < 6) {
      return fail("password", "Use a password with at least 6 characters.");
    }

    // Email must not belong to a different account
    var list = getUsers();
    for (var i = 0; i < list.length; i++) {
      if (list[i].username !== data.username && list[i].email &&
          list[i].email.toLowerCase() === email.toLowerCase()) {
        return fail("email", "That email is already used by another account.");
      }
    }

    var updated = {};
    for (var key in data) { if (data.hasOwnProperty(key)) updated[key] = data[key]; }
    updated.first = first;
    updated.last = last;
    updated.name = first + " " + last;
    updated.dob = dob;
    updated.sex = sex;
    updated.email = email;
    updated.phone = phone;
    updated.street = street;
    updated.brgy = brgy;
    updated.city = city;
    if (pass !== "") updated.password = pass;   // blank = keep current password

    if (!persist(updated)) {
      return fail("first", "Could not save your changes. Please sign in again.");
    }

    data = updated;
    setEditing(false);
    ok.textContent = "Your profile was updated.";
    return true;
  }

  show();

})();
