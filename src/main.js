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
      let response = await invoke("attempt_login", { instance: instance, email: email, password: password});
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

// Starts the main app, after a successful login
async function start_app() {
  loading(true);
  dId("main_view").style.display = "";
  build_server_list()
  await new Promise(r => setTimeout(r, 1000));
  await invoke("gather_account_info");
  loading(false);
}

// 
async function build_server_list() {
  let sBar = dId("server_bar");
  interface_state.servers.forEach(server => {
    let instance = server.instance;
    let id = server.id;
    let html_id = "server-" + instance + "-" + id;
    let name = server.name
    sBar.innerHTML += '<button class="server_icon" id="' + html_id + '"  style="background-image: url(http:/' + instance + '/s/' + id + '/img);"><span>' + name + '</span></button >';
    
    let created = dId(html_id);
    created.setAttribute("server-instance", instance);
    created.setAttribute("server-id", id);

    created.addEventListener("click", function(e) {
      open_server(this.getAttribute("server-instance"), this.getAttribute("server-id"))
    });

    console.log("added server " + server.name)
  });
}

async function open_server(server_instance, server_id) {
  function appendChannel(el, ch) {
    el.innerHTML += `<div class="channel_button"><img src="assets/icons/hash.svg">${ch[0]}</div>`;
  }
  console.log("opening server " + server_instance + server_id)
  let server_structure = await invoke("open_server", { instance: server_instance, id: server_id });
  dId("main_sidebar_header").innerHTML = '<span>' + server_structure.name + '</span>'

  let channel_list = dId("main_sidebar_list");
  channel_list.innerHTML = "";

  server_structure.channels.forEach( channel => {
    appendChannel(channel_list, channel)
  });
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