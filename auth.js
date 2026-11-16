var Auth = (function () {
  var USERS = "bcirs_users", SESSION = "bcirs_session";
  var RESERVED = ["admin", "administrator"];   // cannot be used at signup

  function readUsers() {
    try { return JSON.parse(localStorage.getItem(USERS)) || []; }
    catch (e) { return []; }
  }
  function writeUsers(list) { localStorage.setItem(USERS, JSON.stringify(list)); }
  function norm(s) { return String(s || "").trim().toLowerCase(); }
  function roleOf(u) { return u.role || "user"; }

  function indexOfEmail(list, email) {
    if (!norm(email)) return -1;
    for (var i = 0; i < list.length; i++) {
      if (norm(list[i].email) === norm(email)) return i;
    }
    return -1;
  }
  // matches a username OR an email
  function indexOfLogin(list, who) {
    if (!norm(who)) return -1;
    for (var i = 0; i < list.length; i++) {
      if (norm(list[i].email) === norm(who)) return i;
      if (list[i].username && norm(list[i].username) === norm(who)) return i;
    }
    return -1;
  }

  // Default admin account (there is no admin signup). CHANGE the password.
  (function seedAdmin() {
    var list = readUsers();
    for (var i = 0; i < list.length; i++) {
      if (list[i].role === "admin") return;
    }
    list.push({
      username: "admin",
      password: "admin123",
      role: "admin",
      name: "Administrator",
      first: "Admin",
      last: "",
      email: "admin@bcirs.local"
    });
    writeUsers(list);
  })();

  return {
    // Signup always creates a "user". Any role passed in is ignored.
    signup: function (u) {
      if (!u.name || !u.dob || !u.sex || !u.email || !u.password) return "Fill in every field.";
      if (u.username && RESERVED.indexOf(norm(u.username)) !== -1) return "That username is not allowed.";
      var list = readUsers();
      if (indexOfEmail(list, u.email) !== -1) return "That email is already registered.";
      if (u.username && indexOfLogin(list, u.username) !== -1) return "That username is already taken.";
      u.role = "user";
      delete u.isAdmin;
      list.push(u);
      writeUsers(list);
      return "";
    },

    // The role comes from the saved account, not from the page.
    login: function (who, pass, role) {
      if (!who || !pass) return "Enter your username and password.";
      var list = readUsers(), i = indexOfLogin(list, who);
      if (i === -1 || list[i].password !== pass) return "Wrong username or password.";
      var actual = roleOf(list[i]);
      if (role && actual !== role) return "This is not a " + role + " account.";

      sessionStorage.setItem(SESSION, list[i].email);
      sessionStorage.setItem("role", actual);                       // "user" or "admin"
      sessionStorage.setItem("IsAdmin", actual === "admin" ? "true" : "false");
      return "";
    },

    current: function () {
      var email = sessionStorage.getItem(SESSION);
      if (!email) return null;
      var list = readUsers(), i = indexOfEmail(list, email);
      return i === -1 ? null : list[i];
    },

    // Role of the signed-in account, read from the saved account
    role: function () {
      var u = Auth.current();
      return u ? roleOf(u) : null;
    },
    isAdmin: function () { return Auth.role() === "admin"; },
    homeFor: function (role) { return role === "admin" ? "home-admin.html" : "home.html"; },

    // Page guard: must be signed in AND have the right role
    require: function (role, loginPage) {
      var u = Auth.current();
      if (!u || (role && roleOf(u) !== role)) {
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
      data.role = roleOf(list[i]);          // role can't be changed from the profile
      delete data.isAdmin;
      if (list[i].username && !data.username) data.username = list[i].username;
      list[i] = data;
      writeUsers(list);
      sessionStorage.setItem(SESSION, data.email);
      return "";
    },

    logout: function () {
      sessionStorage.removeItem(SESSION);
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("IsAdmin");
    }
  };
})();
