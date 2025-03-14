const { invoke } = window.__TAURI__.tauri;

let logged_in = false;
let servers;

window.addEventListener("DOMContentLoaded", () => {
  // Pull state
  
  if (logged_in) {
    start_app();
  } else {
    document.getElementById("login_button").addEventListener("click", e => {
      validate_login();
    })
  }

  document.getElementById("loading_cover").style.display = "none";
});


// Validate login data
async function validate_login() {
  let instance = document.getElementById("login_instance").value;
  let email = document.getElementById("login_email").value;
  let password = document.getElementById("login_password").value;
  try {
    let response = await invoke("attempt_login", { instance: instance, email: email, password: password });
    console.log("Logged in.")
    start_app()
  } catch (err) {
    document.getElementById("login_failure").innerHTML = err;
  }
}

// Starts the main app, after a successful login
function start_app() {
  document.getElementById("login_screen").style.display = "none";
  build_server_list()
}

// 
async function build_server_list() {
  servers = await invoke("get_server_list");
  let sBar = document.getElementById("server_bar")
  servers.forEach(server => {
    let instance = server.instance;
    let id = server.id;
    let html_id = "server-" + instance + "-" + id;
    let name = server.name
    sBar.innerHTML += '<button class="server_icon" id="' + html_id + '"  style="background-image: url(http:/' + instance + '/s/' + id + '/img);"><span>' + name + '</span></button >';
    
    let created = document.getElementById(html_id);
    created.setAttribute("server-instance", instance);
    created.setAttribute("server-id", id);

    created.addEventListener("click", function(e) {
      open_server(this.getAttribute("server-instance"), this.getAttribute("server-id"))
    });

    console.log("added server " + server.name)
  });
}

async function open_server(server_instance, server_id) {
  console.log("opening server " + server_instance + server_id)
  let server_structure = await invoke("open_server", { instance: server_instance, id: server_id });
  document.getElementById("main_sidebar_header").innerHTML = '<span>' + server_structure.name + '</span>'

  let channel_list = document.getElementById("main_sidebar_list");
  channel_list.innerHTML = "";

  server_structure.channels.forEach( channel => {
    channel_list.innerHTML += '<p>' + channel[0] + '</p>';
  });
}

