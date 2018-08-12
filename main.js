const optionDefinitions = [{
    name: 'url',
    type: String,
    defaultOption: true,
    defaultValue: '',
    typeLabel: '{underline url}',
    description: 'YouTube video or playlist url.'
  },
  {
    name: 'target',
    alias: 't',
    type: String,
    defaultValue: './output',
    typeLabel: '{underline path}',
    description: 'Where to save the videos or music.'
  },
  {
    name: 'format',
    alias: 'f',
    type: String,
    defaultValue: "mp3",
    typeLabel: '{underline format}',
    description: 'File format to save the videos or music.'
  },
  {
    name: 'override',
    alias: 'o',
    type: Boolean,
    defaultValue: false,
    description: 'Override existing files.'
  },
  {
    name: 'quiet',
    alias: 'q',
    type: Boolean,
    defaultValue: false,
    description: 'Quiet mode.'
  },

  {
    name: 'help',
    alias: 'h',
    type: Boolean,
    defaultValue: false,
    description: 'Print this usage guide.'
  }
]

const fs = require('fs');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const isPlaylist = require("is-playlist");
const commandLineArgs = require('command-line-args')
const commandLineUsage = require('command-line-usage')
const sanitize = require("sanitize-filename");

let options = commandLineArgs(optionDefinitions)

// console.log(options);

let urls = [];
let input = options.url;
let format = options.format;
let time = 0;

if (input == '' || options.help) {
  console.log(commandLineUsage([{
      header: 'Pixel Downloader',
      content: 'Downloading video or music from a YouTube video or playlist'
    },
    {
      header: 'Usage',
      content: [
        '$ pixeldownloader {underline YouTubeURL}',
        '$ pixeldownloader [{bold -t} {underline target}] {underline YouTubeURL}',
        '$ pixeldownloader [{bold -t} {underline target}] [{bold -f} {underline format}] {underline YouTubeURL}',
      ]
    },
    {
      header: 'Options',
      optionList: optionDefinitions
    },
    {
      content: [
        'Pixel Downloader created by Yoav Sarfaty © 2018.',
        'https://github.com/YoavSarfaty/pixeldownloader'
      ],
      raw: true
    }
  ]));
} else {
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
              path = options.target + formatname(name) + '.' + format;
              if ((!fs.existsSync(path)) || options.override) {
                if (!options.quiet) {
                  console.log("now downloading " + name + " -> " + path);
                }
                ytdl(url, {
                    format: format
                  })
                  .pipe(fs.createWriteStream(path));
              }
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
  return sanitize(name).replace('.', '');
}