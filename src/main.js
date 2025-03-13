const { invoke } = window.__TAURI__.tauri;

let servers;

async function greet() {
  // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
  greetMsgEl.textContent = await invoke("greet", { name: greetInputEl.value });
}

window.addEventListener("DOMContentLoaded", () => {
  
  get_server_list()

  document.getElementById("loading_cover").style.display = "none";
});

async function get_server_list() {
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

