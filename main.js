const fs = require('fs');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const isPlaylist = require("is-playlist");
const sanitize = require("sanitize-filename");
const gui = require('nw.gui');
const win = gui.Window.get();
const url_lib = require("url");
const {
  exec
} = require('child_process');

let addpath = null;

if (process.platform === "win32") {
  addpath = (process.execPath.substr(0, process.execPath.lastIndexOf("\\"))) + "\\";
}

function hide_video_ops() {
  for (let i = 0; i < document.getElementsByClassName("video_types").length; i++) {
    document.getElementsByClassName("video_types")[i].hidden = true;
  }
  for (let i = 0; i < document.getElementsByClassName("audio_types").length; i++) {
    document.getElementsByClassName("audio_types")[i].hidden = false;
  }
  document.getElementById("type_input").value = "mp3";
}

function hide_audio_ops() {
  for (let i = 0; i < document.getElementsByClassName("audio_types").length; i++) {
    document.getElementsByClassName("audio_types")[i].hidden = true;
  }
  for (let i = 0; i < document.getElementsByClassName("video_types").length; i++) {
    document.getElementsByClassName("video_types")[i].hidden = false;
  }
  document.getElementById("type_input").value = "mp4";
}

console.log("Loaded all modules ;)");
let urls, input, format, current;

window.onload = () => {
  document.getElementById("downloaders").style.display = "none";
  document.getElementById("end").style.display = "none";
  document.getElementById("format_input").onchange = () => (document.getElementById("format_input").value === "audio") ? hide_video_ops() : hide_audio_ops();
  hide_video_ops();
}

function startdownload_log() {
  document.getElementById("downloaders").style.display = "";
  document.getElementById("downloaders_alt").style.display = "none";
}

function changedSaveDir() {
  document.getElementById("save_loc_show").value = document.getElementById("folder_input").value
}

function check_youtube_url(hostname) {
  if (hostname == null) return false;
  return (hostname.endsWith("youtube.com") || hostname.endsWith("youtu.be"));
}

function handleUserData() {

  if (!check_youtube_url(url_lib.parse(document.getElementById("url_input").value).hostname)) {
    document.getElementById("downloaders_alt").innerHTML = "<p>Please Enter a Valid URL</p>";
    return;
  }
  document.getElementById("downloaders_alt").innerHTML = "<p>Fetching Video Data...</p>";
  //TODO: options should have: url, format, target, override
  let options = {
    url: document.getElementById("url_input").value,
    format: document.getElementById("format_input").value,
    target: (document.getElementById("save_loc_show").value) ? document.getElementById("save_loc_show").value : (((addpath) ? addpath : "") + "../output"),
    override: document.getElementById("override_input").checked,
    filetype: document.getElementById("type_input").value.split(" ")[0],
    res: document.getElementById("type_input").value.split(" ")[1],
  };

  console.log(options);

  urls = [];
  input = options.url;
  format = options.format;
  current = 0;

  if (input != '') {
    if (!(options.target.endsWith('/') || options.target.endsWith('\\'))) {
      options.target += '/';
    }
    if (!fs.existsSync(options.target)) {
      fs.mkdirSync(options.target);
    }

    if (isPlaylist(input)) {
      ytpl(input, {
        limit: Infinity
      }, function (err, playlist) {
        if (err) throw err;
        urls = playlist.items.map((p) => p.url_simple);
        if (!options.quiet) {
          console.log("found " + urls.length + " videos, starting download!");
        }
        startdownload(urls, options);
      });
    } else {
      urls.push(input);
      startdownload(urls, options);
    }
  }
}

function startdownload(urls, options) {
  console.log("starting");
  let data = urls.map((url) => {
    return new Promise((resolve, reject) => {
      ytdl.getInfo(url, (err, info) => {
        console.log("err: ", err);
        console.log("info: ", info);
        if (err || !info) resolve(undefined);
        video_data = {
          name: info.title,
          path: options.target + formatname(info.title) + '.pdtemp',
          url: url,
          image: info.thumbnail_url,
          formats: info.formats.filter((f) => f.itag != undefined),
        };
        resolve(video_data);
      });
    })
  });
  Promise.all(data).then(async function (data) {
    // console.log(data);
    data = data.filter((a) => a != undefined);
    let amount = data.length;
    // console.log(amount);
    let complete = 0;
    startdownload_log();
    let ps = [];
    for (let i = 0; i < 4; i++) {
      if (i < amount) {
        ps.push(downloadvid(data.shift(), options, i));
      } else {
        document.getElementsByClassName("downloader")[i].style.display = "none";
      }
    }
    while (data.length != 0) {
      let me = await Promise.race(ps);
      ps[me] = (downloadvid(data.shift(), options, me));
      complete++;
      document.getElementById("progress").innerHTML = `Completed ${complete}/${amount}`;
    }
    while (complete < amount) {
      console.log(ps);
      let me = await Promise.race(ps);
      ps[me] = new Promise(() => {});
      document.getElementsByClassName("downloader")[me].style.display = "none";
      complete++;
      document.getElementById("progress").innerHTML = `Completed ${complete}/${amount}`;
    }
    console.log("end!");
    setTimeout(() => {
      document.getElementById("downloaders").style.display = "none";
      document.getElementById("end").style.display = "";
      document.getElementById("progress").innerHTML = ``;
    }, 1000);
  });
}

function downloadvid(video_data, options, log_id) {
  let url = video_data.url;
  let name = video_data.name;
  let path = video_data.path;
  let finalpath = path.split(/\.(?=[^\.]+$)/)[0] + "." + options.filetype;
  let img = video_data.image;

  let loader = document.getElementById("d" + (log_id + 1));
  loader.children[0].src = img;
  loader.children[1].children[0].style.width = "0%";

  if ((!fs.existsSync(finalpath)) || options.override) {
    let quality = (options.format === "audio") ? 'highestaudio' : 'highestvideo';
    if (options.res) {
      for (let i = 0; i < video_data.formats.length; i++) {
        if (video_data.formats[i].resolution == options.res) {
          quality = video_data.formats[i].itag;
          break;
        }
      }
    }

    let video = ytdl(url, {
      // filter: (f) => {
      //   console.log(f);
      //   if (options.format === "mp3") return f.container === "m4a";
      //   return f.container === options.format;
      // }
      quality: quality,
    });
    video.pipe(fs.createWriteStream(path));

    video.on('progress', (chunkLength, downloaded, total) => {
      const floatDownloaded = downloaded / total;
      loader.children[1].children[0].style.width = `${floatDownloaded*100}%`;
    });

    return new Promise((resolve, reject) => {
      video.on('end', () => {
        //TODO change format
        console.log("should now convert" + path + " to " + finalpath)
        exec(`ffmpeg${(process.platform === "win32")?"\\":"/"}ffmpeg -i "${path}" "${finalpath}"`, (err, stdout, stderr) => {
          if (err) {
            console.log("node couldn't execute the command");
            throw (err);
            return;
          }
          console.log(`stdout: ${stdout}`);
          console.log(`stderr: ${stderr}`);
          fs.unlinkSync(path);
          resolve(log_id);
        });
      });
    });
  } else {
    return new Promise((resolve, reject) => {
      resolve(log_id);
    });
  }
}

function formatname(name) {
  return sanitize(name).replace('.', '');
}