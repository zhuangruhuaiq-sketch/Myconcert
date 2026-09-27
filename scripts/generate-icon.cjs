// Rasterize the original Myconcert stage-and-check mark using Expo's bundled Jimp.
const Jimp = require("jimp-compact");
const path = require("node:path");
const icon = new Jimp(1024, 1024, "#171326");
function disk(x, y, radius, color) {
  for (let iy = Math.floor(y - radius); iy <= y + radius; iy++)
    for (let ix = Math.floor(x - radius); ix <= x + radius; ix++)
      if (
        (ix - x) ** 2 + (iy - y) ** 2 <= radius ** 2 &&
        ix >= 0 &&
        iy >= 0 &&
        ix < 1024 &&
        iy < 1024
      )
        icon.setPixelColor(Jimp.cssColorToHex(color), ix, iy);
}
function line(x1, y1, x2, y2, color, radius = 30) {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1));
  for (let i = 0; i <= steps; i++)
    disk(
      x1 + ((x2 - x1) * i) / steps,
      y1 + ((y2 - y1) * i) / steps,
      radius,
      color,
    );
}
line(232, 644, 232, 440, "#9D82FF");
line(792, 644, 792, 440, "#9D82FF");
line(448, 224, 576, 224, "#9D82FF");
for (let i = 0; i <= 180; i++) {
  const angle = Math.PI + (i * Math.PI) / 360;
  disk(448 + 216 * Math.cos(angle), 440 + 216 * Math.sin(angle), 30, "#9D82FF");
  disk(576 - 216 * Math.cos(angle), 440 + 216 * Math.sin(angle), 30, "#9D82FF");
}
line(312, 644, 712, 644, "#F6C96B");
line(364, 736, 472, 836, "#F6C96B", 32);
line(472, 836, 684, 596, "#F6C96B", 32);
icon.writeAsync(path.join(__dirname, "../assets/images/myconcert-icon.png"));
