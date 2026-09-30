/* Project emblems: simple drawings on a 480 px canvas that the particle field samples.
   White strokes take the text colour; amber (#ffb547) parts stay amber. Keys match project slugs. */
(() => {
  const W = "#fff", A = "#ffb547";
  const pen = (c, width = 22, colour = W) => { c.lineWidth = width; c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = colour; c.fillStyle = colour; };
  const line = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); };
  const dot = (c, x, y, r, colour = W) => { c.fillStyle = colour; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
  const box = (c, x, y, w, h, r) => {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  };
  // Clears a disc so an overlapping part reads on top.
  const cut = (c, x, y, r) => { c.save(); c.globalCompositeOperation = "destination-out"; dot(c, x, y, r); c.restore(); };

  window.Emblems = {
    // A question and its answer.
    creta(c) {
      pen(c);
      box(c, 40, 50, 290, 190, 56); c.stroke();
      line(c, [[96, 238], [80, 312], [160, 240]]);
      [125, 185, 245].forEach((x) => dot(c, x, 145, 21, A));
      c.fillStyle = W;
      box(c, 190, 262, 250, 150, 52); c.fill();
      c.beginPath(); c.moveTo(370, 400); c.lineTo(430, 456); c.lineTo(318, 404); c.fill();
    },
    // Code, generated.
    genxai(c) {
      pen(c, 32);
      line(c, [[150, 110], [50, 240], [150, 370]]);
      line(c, [[330, 110], [430, 240], [330, 370]]);
      pen(c, 32, A);
      line(c, [[285, 70], [195, 410]]);
    },
    // A document, searched.
    rag(c) {
      pen(c);
      c.beginPath(); c.moveTo(60, 30); c.lineTo(250, 30); c.lineTo(330, 110); c.lineTo(330, 430); c.lineTo(60, 430); c.closePath(); c.stroke();
      line(c, [[250, 30], [250, 110], [330, 110]]);
      pen(c, 16);
      [[170, 270], [220, 230], [270, 270], [320, 190]].forEach(([y, x]) => line(c, [[112, y], [x, y]]));
      cut(c, 340, 330, 104);
      pen(c, 26, A);
      c.beginPath(); c.arc(330, 320, 78, 0, Math.PI * 2); c.stroke();
      line(c, [[388, 378], [448, 438]]);
    },
    // A letter, spoken aloud.
    english_teacher(c) {
      pen(c, 30);
      line(c, [[40, 410], [140, 70], [240, 410]]);
      line(c, [[80, 300], [200, 300]]);
      pen(c, 24, A);
      [[296, 70], [334, 190], [372, 290], [410, 170], [448, 90]].forEach(([x, h]) => line(c, [[x, 240 - h / 2], [x, 240 + h / 2]]));
    },
    // Hand landmarks, as a tracker sees them.
    "sign-detection"(c) {
      const wrist = [228, 440];
      const fingers = [
        [[172, 400], [124, 352], [92, 302], [70, 254]],
        [[176, 290], [166, 206], [160, 150], [156, 100]],
        [[232, 282], [234, 192], [236, 132], [238, 76]],
        [[286, 290], [298, 208], [304, 156], [310, 110]],
        [[332, 312], [354, 252], [366, 212], [376, 172]],
      ];
      pen(c, 10);
      fingers.forEach((f) => line(c, [wrist, ...f]));
      line(c, [fingers[1][0], fingers[2][0], fingers[3][0], fingers[4][0]]);
      dot(c, wrist[0], wrist[1], 16);
      fingers.forEach((f) => f.forEach(([x, y], i) => dot(c, x, y, i === 3 ? 19 : 14, i === 3 ? A : W)));
    },
    // An open book with a picture on the right page.
    "story-teller"(c) {
      pen(c, 20);
      c.beginPath(); c.moveTo(240, 110); c.quadraticCurveTo(150, 70, 30, 96); c.lineTo(30, 380); c.quadraticCurveTo(150, 356, 240, 400); c.closePath(); c.stroke();
      c.beginPath(); c.moveTo(240, 110); c.quadraticCurveTo(330, 70, 450, 96); c.lineTo(450, 380); c.quadraticCurveTo(330, 356, 240, 400); c.closePath(); c.stroke();
      pen(c, 12);
      [165, 210, 255, 300].forEach((y, i) => line(c, [[76, y], [i === 3 ? 160 : 196, y]]));
      line(c, [[276, 318], [320, 246], [352, 288], [378, 256], [414, 318]]);
      dot(c, 372, 176, 24, A);
    },
    // A captured page and the layout inside it.
    screenshot_html(c) {
      pen(c, 20);
      box(c, 30, 60, 420, 340, 30); c.stroke();
      line(c, [[30, 128], [450, 128]]);
      dot(c, 76, 94, 12, A); dot(c, 112, 94, 12); dot(c, 148, 94, 12);
      box(c, 74, 162, 332, 42, 10); c.fillStyle = A; c.fill();
      box(c, 74, 230, 150, 126, 12); c.fillStyle = W; c.fill();
      pen(c, 14);
      [[246, 406], [292, 370], [338, 406]].forEach(([y, x]) => line(c, [[262, y], [x, y]]));
    },
    // Layers of a network, one output lit.
    "web-app"(c) {
      const layers = [[70, [110, 200, 290, 380]], [240, [60, 150, 240, 330, 420]], [410, [150, 240, 330]]];
      pen(c, 5);
      for (let l = 0; l < 2; l++) layers[l][1].forEach((a) => layers[l + 1][1].forEach((b) => line(c, [[layers[l][0], a], [layers[l + 1][0], b]])));
      layers.forEach(([x, ys], l) => ys.forEach((y, i) => dot(c, x, y, 24, l === 2 && i === 1 ? A : W)));
    },
    // Scissors, mid-cut.
    rps(c) {
      pen(c, 24);
      c.beginPath(); c.arc(140, 372, 58, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(340, 372, 58, 0, Math.PI * 2); c.stroke();
      c.fillStyle = W;
      c.beginPath(); c.moveTo(174, 318); c.lineTo(378, 36); c.lineTo(402, 58); c.lineTo(210, 332); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(306, 318); c.lineTo(102, 36); c.lineTo(78, 58); c.lineTo(270, 332); c.closePath(); c.fill();
      dot(c, 240, 257, 17, A);
    },
  };
})();
