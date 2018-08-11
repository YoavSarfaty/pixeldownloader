const fs = require('fs');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const isPlaylist = require("is-playlist");

let urls = [];
let input, format;

let time = 0;

process.argv.forEach(function (val, index, array) {
  if (index === 2) {
    input = val;
  }
  if (index === 3) {
    format = val;
  }
});

if (!input) {
  console.log("plz enter a youtube url!");
} else {

  if (!format) {
    format = "mp3";
  }

  if (isPlaylist(input)) {
    ytpl(input, {
      limit: Infinity
    }, function (err, playlist) {
      if (err) throw err;
      urls = playlist.items.map((p) => p.url_simple);
      console.log("found " + urls.length + " videos, starting download!");
      startdownload();
    });
  } else {
    urls.push(input);
    startdownload();
  }
}

function startdownload() {
  urls.forEach((url) => {
    setTimeout(() => {
      try {
        ytdl.getInfo(url, (err, info) => {
          try {
            if (err) throw err;
            try {
              let name = info.title;
              console.log("now downloading " + name);
              name = formatname(name);
              ytdl(url, {
                  format: format
                })
                .pipe(fs.createWriteStream(name + '.' + format));
            } catch (e) {
              console.log("catch " + e);
            }
          } catch (e) {
            console.log(e);
          }
        });
      } catch (e) {
        console.log("catch " + e);
      }
    }, time);
    time += 5000;
  });
}

function formatname(name) {
  // return name;
  return name.replace(/[^a-z0-9]/gi, '');
}