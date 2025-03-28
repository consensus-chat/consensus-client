const invoke = window.__TAURI__.core.invoke;
const { getCurrentWindow } = window.__TAURI__.window;

var interface_state;
const appWindow = getCurrentWindow();

function loading(l) {
  if (l) {
    dId("loading_cover").style.display = "block";
  } else {
    dId("loading_cover").style.display = "none";
  }
}

function dId(id) {
  return document.getElementById(id);
}

function search_json(el, sfield, sval) {
  var res;
  for (let index = 0; index < el.length; index++) {
    const element = el[index];
    if (element[sfield] == sval) {
      res = element;
    }
  }
  return res;
}

window.addEventListener("DOMContentLoaded", () => {
  setup_titlebar();
  setup_left_sidebar();

  // Pull state
  pull_state();
  // Is logged in?
  check_login();
});

async function setup_titlebar() {
  document
    .getElementById('titlebar-minimize')
    ?.addEventListener('click', () => appWindow.minimize());
  document
    .getElementById('titlebar-maximize')
    ?.addEventListener('click', () => appWindow.toggleMaximize());
  document
    .getElementById('titlebar-close')
    ?.addEventListener('click', () => appWindow.close());

  const max = await appWindow.isMaximized()
  if (max) {
    dId('titlebar-maximize').firstElementChild.setAttribute('src', 'assets/icons/window_restore.png')
  } else {
    dId('titlebar-maximize').firstElementChild.setAttribute('src', 'assets/icons/window_maximize.png')
  }

  const unlisten = await appWindow.onResized(async ({ payload: size }) => {
    const max = await appWindow.isMaximized()
    if (max) {
      dId('titlebar-maximize').firstElementChild.setAttribute('src', 'assets/icons/window_restore.png')
    } else {
      dId('titlebar-maximize').firstElementChild.setAttribute('src', 'assets/icons/window_maximize.png')
    }
  });

}

async function setup_left_sidebar() {
  let startData;
  const handle = dId("left_resize_handle");
  const container = dId('left_sidebar');

  function resizeHandler(e) {
    const eventPos = e.clientX
    const diff = eventPos - startData.startPos;
    const newWidth = Math.max(0, startData.startWidth + diff);
    container.style.width = `${newWidth}px`;
  }

  handle.addEventListener('pointerdown', e => {
    console.log(e)

    const currentWidth = container.clientWidth;
    startData = {
      startPos: e.clientX,
      startWidth: currentWidth,
    };
    console.log(startData)

    window.addEventListener('pointermove', resizeHandler);

    window.addEventListener('pointerup', e => {
      window.removeEventListener('pointermove', resizeHandler);
    });
  })
}

async function pull_state() {
  interface_state = await invoke("pull_state");
}


// Login

async function check_login() {
  await pull_state();
  
  loading(false);
  if (!(interface_state.account === null)) {
    start_app();
  } else {
    display_login_screen();
  }
}

async function display_login_screen() {
  dId("login_screen").style.display = "block";
  dId("login_form_container").innerHTML = el_login();
  dId("login_form_container").style.transform = "translateX(0px)"
  dId("login_button").addEventListener("click", e => {
    attempt_login();
  })
  dId("register_button").addEventListener("click", async e => {
    dId("login_form_container").style.transform = "translateX(-1000px)";
    await new Promise(r => setTimeout(r, 300));
    display_register_screen();
  })
}

async function display_register_screen() {
  dId("login_screen").style.display = "block";
  dId("login_form_container").innerHTML = el_register();
  dId("login_form_container").style.transform = "translateX(0px)"
  dId("register_button").addEventListener("click", e => {
    attempt_registration();
  })
  dId("login_button").addEventListener("click", async e => {
    dId("login_form_container").style.transform = "translateX(-1000px)";
    await new Promise(r => setTimeout(r, 300));
    display_login_screen();
  })
}

// Validate login data
async function attempt_login() {
  let instance = dId("login_instance").value;
  let email = dId("login_email").value;
  let password = dId("login_password").value;
  dId("login_button").style.opacity = 0.7;

  try {
    if (!instance == "" && !email == "" && !password == "") {
      let response = await invoke("attempt_login", { instance: instance, email: email, password: password });
      console.log("Logged in with " + response)
      interface_state.account = response;
      dId("login_screen").style.display = "none";
      start_app()
    } else {
      dId("login_failure").innerHTML = "Please fill in the fields.";
    }
  } catch (err) {
    dId("login_failure").innerHTML = err;
  }
  dId("login_button").style.opacity = 1;
}

// Validate login data
async function attempt_registration() {
  let instance = dId("register_instance").value;
  let username = dId("register_username").value;
  let email = dId("register_email").value;
  let password = dId("register_password").value;
  dId("register_button").style.opacity = 0.7;

  try {
    if (!instance == "" && !email == "" && !password == "") {
      let response = await invoke("attempt_registration", { instance: instance, username: username, email: email, password: password });
      console.log("Logged in with " + response)
      interface_state.account = response;
      dId("login_screen").style.display = "none";
      start_app()
    } else {
      dId("register_failure").innerHTML = "Please fill in the fields.";
    }
  } catch (err) {
    dId("register_failure").innerHTML = err;
  }

  dId("register_button").style.opacity = 1;
}


// Popup overlay

// Enable the popup overlay
async function activate_popup() {
  dId("popup_cover").style.display = "flex";
  await new Promise(r => setTimeout(r, 1));
  dId("popup_cover").style.opacity = "1.0";
  dId("popup_container").style.transform = "scale(1.0)";
  dId("popup_close").addEventListener('click', async e => { await close_popup() });
  dId("popup_cover").addEventListener('click', async e => { if (e.target === e.currentTarget) { await close_popup() } });
}

// Close the popup overlay
async function close_popup() {
  dId("popup_container").style.transform = "scale(0.8)";
  dId("popup_cover").style.opacity = "0.0";
  await new Promise(r => setTimeout(r, 100));
  dId("popup_cover").style.display = "none";
}


// Add server

async function display_new_server_popup() {
  activate_popup()
  dId('popup_content').innerHTML = el_new_server_landing();
  dId('popup_create_server_button').addEventListener('click', async e => {await display_create_server_dialog()})
  dId('popup_join_server_button').addEventListener('click', async e => { await display_join_server_dialog() })
}

async function display_create_server_dialog() {
  dId("popup_container").style.transform = "scale(0.8)";
  await new Promise(r => setTimeout(r, 100));
  dId('popup_content').innerHTML = el_create_server_dialog();
  dId("popup_container").style.transform = "scale(1.0)";
  dId('create_server_button').addEventListener('click', async e => { await attempt_create_server() });
}

async function attempt_create_server() {
  let instance = dId("new_server_instance").value;
  let name = dId("new_server_name").value;
  let response;

  dId("create_server_button").style.opacity = 0.7;

  try {
    if (!instance == "" && !name == "") {
      response = await invoke("create_server", { instance: instance, serverName: name });
      console.log("Created server with " + response)
      console.log(response)
      interface_state.servers.push(response);
      build_server_list();
      close_popup();
    } else {
      dId("server_failure").innerHTML = "Please fill in the fields.";
    }
  } catch (err) {
    dId("server_failure").innerHTML = err;
  }
  dId("create_server_button").style.opacity = 1;
}

async function display_join_server_dialog() {
  dId("popup_container").style.transform = "scale(0.8)";
  await new Promise(r => setTimeout(r, 100));
  dId('popup_content').innerHTML = el_join_server_dialog();
  dId("popup_container").style.transform = "scale(1.0)";
  dId('join_server_button').addEventListener('click', async e => { await attempt_join_server() });
}

async function attempt_join_server() {
  let instance = dId("new_server_instance").value;
  let id = dId("new_server_id").value;
  let response;

  dId("join_server_button").style.opacity = 0.7;

  try {
    if (!instance == "" && !id == "") {
      response = await invoke("join_server", { instance: instance, serverId: id });
      console.log("Joined server with " + response)
      console.log(response)
      interface_state.servers.push(response);
      build_server_list();
      close_popup();
    } else {
      dId("server_failure").innerHTML = "Please fill in the fields.";
    }
  } catch (err) {
    dId("server_failure").innerHTML = err;
  }
  dId("join_server_button").style.opacity = 1;
}



// Starts the main app, after a successful login
async function start_app() {
  loading(true);
  dId("main_view").style.display = "";
  await pull_state();
  build_server_list()
  await new Promise(r => setTimeout(r, 1000));
  await invoke("gather_account_info");
  dId('sidebar_settings_account').innerHTML = interface_state.account.username;
  loading(false);
}

// 
async function build_server_list() {
  let sBar = dId("server_bar");
  sBar.innerHTML = "";

  function sAbrv(name) {
    const words = name.split(" ");
    var abrv = "";
    words.forEach(word => {
      abrv += word.charAt(0);
    });
    return abrv.substring(0, Math.min(2, abrv.length))
  }

  function handleOpenServer(e) {
    open_server(e.target.getAttribute("server-instance"), e.target.getAttribute("server-id"))
  }

  interface_state.servers.forEach(server => {
    let instance = server.instance;
    let id = server.id;
    let html_id = "server-" + instance + "-" + id;
    let name = server.name
    let abrv = sAbrv(name);
    sBar.innerHTML += `
<button class="server_icon" id="${html_id}">
  <img src="http://${instance}/s/${id}/img" alt="${abrv}">
  <span>${name}</span>
</button >`;
    
    let created = dId(html_id);
    created.setAttribute("server-instance", instance);
    created.setAttribute("server-id", id);

    //dId(html_id).addEventListener("click", e=> handleOpenServer(e));

    console.log("added server " + server.name)
  });

  interface_state.servers.forEach(server => {
    let instance = server.instance;
    let id = server.id;
    let html_id = "server-" + instance + "-" + id;
    dId(html_id).addEventListener("click", e => open_server(e.currentTarget.getAttribute("server-instance"), e.currentTarget.getAttribute("server-id")));
  });

  let createServer = dId("server_create_button");
  createServer.addEventListener('click', async e => {
    //await invoke("create_server", { instance: "localhost:3000", serverName: "Test Server" });
    await display_new_server_popup();
  })
}

async function open_server(server_instance, server_id) {
  function appendChannel(el, ch) {
    let n = ch.Channel.name
    el.innerHTML += `<div class="channel_button"><img src="assets/icons/hash.svg">${n}</div>`;
  }
  console.log("opening server " + server_instance + server_id)
  let server_structure = await invoke("open_server", { instance: server_instance, id: server_id });
  let sname = search_json(interface_state.servers, "id", server_id).name;
  dId("main_sidebar_header").innerHTML = '<span>' + sname + '</span>'

  let channel_list = dId("main_sidebar_list");
  channel_list.innerHTML = "";

  server_structure.channels.forEach( channel => {
    appendChannel(channel_list, channel)
  });

  var elements = document.getElementsByClassName('server_icon active');
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    element.classList.toggle('active');
  }
  dId("server-" + server_instance + "-" + server_id).classList.toggle('active');
}



// HTML Elements

function el_login() {
  return `<div class="no_scroll_bar">
  <h1>Consensus Login</h1>
  <p>Enter your details here to authenticate this client with your sign-on instance.</p>
  <form>
    <label for="instance">Instance</label><br>
    <input type="text" id="login_instance" name="instance" placeholder="your-instance.org" minlength="4" required><br>

    <label for="email">Email</label><br>
    <input type="email" id="login_email" name="email" placeholder="your@mail.org" required><br>

    <label for="password">Password</label><br>
    <input type="password" id="login_password" name="password" placeholder="Password" minlength="1" required><br>

    <label style="color: var(--accent-error-c);" id="login_failure"></label>

    <input type="button" id="login_button" style="margin-top: 16px;" class="highlighted" value="Login"><br>
    <input type="button" id="register_button" value="Register"><br>
  </form>
  <p style="font-style: italic;">Do you need help? Click <a href="https://consensus-chat.github.io/help#login" target="_blank">here</a>.</p>
</div>`
}

function el_register() {
  return `<div class="no_scroll_bar">
  <h1>Consensus Registration</h1>
  <p>Enter your details here to register a new account on an instance.</p>
  <form>
    <label for="instance">Instance</label><br>
    <input type="text" id="register_instance" name="instance" placeholder="your-instance.org" minlength="4" required><br>

    <label for="instance">Username</label><br>
    <input type="text" id="register_username" name="username" placeholder="YourUsername" minlength="1" required><br>

    <label for="email">Email</label><br>
    <input type="email" id="register_email" name="email" placeholder="your@mail.org" required><br>

    <label for="password">Password</label><br>
    <input type="password" id="register_password" name="password" placeholder="Password" minlength="1" required><br>

    <label style="color: var(--accent-error-c);" id="register_failure"></label>

    <input type="button" id="register_button" style="margin-top: 16px;" class="highlighted" value="Register"><br>
    <input type="button" id="login_button" value="Login"><br>
  </form>
  <p style="font-style: italic;">Do you need help? Click <a href="https://consensus-chat.github.io/help#login" target="_blank">here</a>.</p>
</div>`
}

function el_new_server_landing() {
  return `
<div class="create_server_popup">
  <h2>Create or join server</h2>
  <p>
    Servers are collections of chat channels. They are usually dedicated to a specific topic.
    You can either join an existing server or create a new one on an instance of your choice.
  </p>
  <button id="popup_create_server_button">
    Create a Server
  </button>
  <button id="popup_join_server_button">
    Join a Server
  </button>
</div>
  `
}

function el_create_server_dialog() {
  return `
<div class="create_server_popup">
  <h2>Create a server</h2>
  <p>Enter details here to create a new server. Note that not all instances allow server creation.</p>
  <form>
    <label for="instance">Instance</label><br>
    <input type="text" id="new_server_instance" name="instance" placeholder="your-instance.org" minlength="4" required><br>
    <label for="server_name">Server Name</label><br>
    <input type="text" id="new_server_name" name="server_name" placeholder="Your Server Name" required><br>
    <label style="color: var(--accent-error-c);" id="server_failure"></label>
    <input type="button" id="create_server_button" style="margin-top: 16px;" class="highlighted" value="Create">
  </form>
</div>
  `
}

function el_join_server_dialog() {
  return `
<div class="create_server_popup">
  <h2>Join a server</h2>
  <p>Enter details here to join a new server. Note that not all instances allow server creation.</p>
  <form>
    <label for="instance">Instance</label><br>
    <input type="text" id="new_server_instance" name="instance" placeholder="your-instance.org" minlength="4" required><br>
    <label for="server_id">Server Id</label><br>
    <input type="text" id="new_server_id" name="server_id" placeholder="0123456789abcdef" required><br>
    <label style="color: var(--accent-error-c);" id="server_failure"></label>
    <input type="button" id="join_server_button" style="margin-top: 16px;" class="highlighted" value="Join">
  </form>
</div>
  `
}