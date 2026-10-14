/* Sunday Reset block marks. Each one is drawn by hand on a 24 unit grid with canvas paths,
   in the chunky printed style of the concept art. draw(ctx, name, cx, cy, size, color). */
(function (root) {
  'use strict';

  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  const fillRR = (g, x, y, w, h, r) => { rr(g, x, y, w, h, r); g.fill(); };
  const strokeRR = (g, x, y, w, h, r) => { rr(g, x, y, w, h, r); g.stroke(); };
  const line = (g, pts) => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); };
  const dot = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  const cut = (g, fn) => { g.save(); g.globalCompositeOperation = 'destination-out'; fn(); g.restore(); };
  const poly = (g, pts) => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };

  const ICONS = {
    bed(g) {
      line(g, [3, 5.5, 3, 19]);
      fillRR(g, 3, 12, 18.5, 4.6, 1.2);
      fillRR(g, 5.2, 8.4, 5.4, 3.1, 1.4);
      fillRR(g, 11.6, 9.3, 9.9, 3.1, 1.3);
      line(g, [21, 16, 21, 19]);
    },
    dumbbell(g) {
      g.lineWidth = 2.8; line(g, [7, 12, 17, 12]);
      fillRR(g, 4.3, 6.8, 3.4, 10.4, 1.1); fillRR(g, 16.3, 6.8, 3.4, 10.4, 1.1);
      fillRR(g, 1.8, 9.2, 2.6, 5.6, 0.9); fillRR(g, 19.6, 9.2, 2.6, 5.6, 0.9);
    },
    shower(g) {
      g.beginPath(); g.moveTo(5, 21); g.lineTo(5, 6.5); g.quadraticCurveTo(5, 3.5, 8, 3.5); g.lineTo(10.5, 3.5); g.quadraticCurveTo(13, 3.5, 13, 6); g.stroke();
      g.beginPath(); g.arc(13, 11.2, 5, Math.PI, 0); g.closePath(); g.fill();
      [[9.4, 14.2], [13, 14.2], [16.6, 14.2], [11, 17.4], [15, 17.4], [13, 20.4]].forEach(([x, y]) => dot(g, x, y, 1.15));
    },
    laptop(g) {
      g.lineWidth = 2.3; strokeRR(g, 5, 4.8, 14, 10, 1.4);
      poly(g, [2.3, 16.6, 21.7, 16.6, 20.2, 19.6, 3.8, 19.6]);
    },
    fork(g) {
      g.lineWidth = 2;
      line(g, [5.5, 3, 5.5, 8]); line(g, [8, 3, 8, 8]); line(g, [10.5, 3, 10.5, 8]);
      g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(5.5, 8); g.quadraticCurveTo(5.5, 11.2, 8, 11.2); g.quadraticCurveTo(10.5, 11.2, 10.5, 8); g.stroke();
      line(g, [8, 11, 8, 21]);
      g.beginPath(); g.moveTo(16, 3); g.quadraticCurveTo(20, 5.5, 19.3, 12.5); g.lineTo(16.2, 12.5); g.closePath(); g.fill();
      g.lineWidth = 2.6; line(g, [16.9, 12, 16.9, 21]);
    },
    book(g) {
      g.lineWidth = 2.2;
      g.beginPath(); g.moveTo(12, 7); g.bezierCurveTo(9, 5, 6, 5, 2.8, 5.6); g.lineTo(2.8, 18.6); g.bezierCurveTo(6, 18, 9, 18.2, 12, 20); g.stroke();
      g.beginPath(); g.moveTo(12, 7); g.bezierCurveTo(15, 5, 18, 5, 21.2, 5.6); g.lineTo(21.2, 18.6); g.bezierCurveTo(18, 18, 15, 18.2, 12, 20); g.stroke();
      line(g, [12, 7, 12, 20]);
    },
    people(g) {
      dot(g, 5, 8.6, 2.4); dot(g, 19, 8.6, 2.4);
      g.beginPath(); g.moveTo(0.8, 18); g.quadraticCurveTo(0.8, 12.6, 5, 12.6); g.quadraticCurveTo(8, 12.6, 8.8, 15); g.lineTo(8.8, 18); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(23.2, 18); g.quadraticCurveTo(23.2, 12.6, 19, 12.6); g.quadraticCurveTo(16, 12.6, 15.2, 15); g.lineTo(15.2, 18); g.closePath(); g.fill();
      const center = () => { g.beginPath(); g.arc(12, 7.2, 3.2, 0, Math.PI * 2); g.moveTo(5.8, 20); g.quadraticCurveTo(5.8, 12, 12, 12); g.quadraticCurveTo(18.2, 12, 18.2, 20); g.closePath(); };
      cut(g, () => { g.lineWidth = 2.6; center(); g.stroke(); });
      center(); g.fill();
    },
    shoe(g) {
      g.beginPath(); g.moveTo(2.2, 17.4); g.lineTo(2.6, 11); g.quadraticCurveTo(2.8, 9.2, 4.6, 9.6); g.lineTo(7.8, 10.4);
      g.quadraticCurveTo(9.6, 7, 11.8, 7.7); g.lineTo(13.6, 11.2); g.quadraticCurveTo(17.4, 11.6, 20.2, 13.1); g.quadraticCurveTo(22.2, 14.2, 21.8, 16.4); g.lineTo(21.8, 17.4); g.closePath(); g.fill();
      cut(g, () => { g.lineWidth = 1.3; line(g, [2.4, 15.4, 21.8, 15.4]); line(g, [9.2, 10.6, 10.6, 12.4]); line(g, [11, 9.6, 12.4, 11.6]); });
    },
    sun(g) {
      dot(g, 12, 12, 4.3);
      g.lineWidth = 2.2;
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; line(g, [12 + Math.cos(a) * 6.8, 12 + Math.sin(a) * 6.8, 12 + Math.cos(a) * 9.6, 12 + Math.sin(a) * 9.6]); }
    },
    /* half a sun on the horizon, for mornings */
    sunrise(g) {
      g.beginPath(); g.arc(12, 16, 5, Math.PI, 0); g.closePath(); g.fill();
      g.lineWidth = 2.2;
      for (let i = 0; i < 5; i++) { const a = Math.PI + (i + 0.5) * Math.PI / 5; line(g, [12 + Math.cos(a) * 7.4, 16 + Math.sin(a) * 7.4, 12 + Math.cos(a) * 10, 16 + Math.sin(a) * 10]); }
      g.lineWidth = 2.4; line(g, [2.5, 19.5, 21.5, 19.5]);
    },
    moon(g) {
      dot(g, 11.5, 12.5, 8.2);
      cut(g, () => dot(g, 16.2, 8.6, 6.8));
    },
    cup(g) {
      g.beginPath(); g.moveTo(4, 9.4); g.lineTo(16.2, 9.4); g.lineTo(15.2, 19.3); g.quadraticCurveTo(15, 20.8, 13.5, 20.8); g.lineTo(6.7, 20.8); g.quadraticCurveTo(5.2, 20.8, 5, 19.3); g.closePath(); g.fill();
      g.lineWidth = 2.2; g.beginPath(); g.moveTo(16, 11.4); g.quadraticCurveTo(20.6, 11.2, 20.1, 14.6); g.quadraticCurveTo(19.6, 17.4, 15.5, 17); g.stroke();
      g.lineWidth = 1.8; g.beginPath(); g.moveTo(8, 7); g.quadraticCurveTo(6.8, 5.2, 8, 3.4); g.stroke(); g.beginPath(); g.moveTo(12, 7); g.quadraticCurveTo(10.8, 5.2, 12, 3.4); g.stroke();
    },
    pot(g) {
      fillRR(g, 4, 11, 16, 8.6, 2);
      g.beginPath(); g.moveTo(3, 10); g.lineTo(21, 10); g.quadraticCurveTo(20, 6.6, 12, 6.6); g.quadraticCurveTo(4, 6.6, 3, 10); g.closePath(); g.fill();
      dot(g, 12, 5.3, 1.4);
      g.lineWidth = 2.2; line(g, [1.2, 13, 4, 13]); line(g, [20, 13, 22.8, 13]);
    },
    cart(g) {
      g.lineWidth = 2.2; line(g, [1.8, 4.2, 4.6, 4.2, 7.2, 15.4, 19.2, 15.4]);
      poly(g, [5.8, 7, 21.4, 7, 19.6, 13.2, 7.2, 13.2]);
      dot(g, 9, 19.2, 1.9); dot(g, 17.2, 19.2, 1.9);
    },
    shirt(g) {
      poly(g, [8, 3.4, 3.8, 5.6, 1.4, 10.2, 5, 11.8, 6, 10.4, 6, 20.8, 18, 20.8, 18, 10.4, 19, 11.8, 22.6, 10.2, 20.2, 5.6, 16, 3.4]);
      cut(g, () => { g.beginPath(); g.moveTo(8, 3); g.quadraticCurveTo(9.5, 6.4, 12, 6.4); g.quadraticCurveTo(14.5, 6.4, 16, 3); g.closePath(); g.fill(); });
    },
    handset(g) {
      g.beginPath(); g.moveTo(6.2, 2.8); g.lineTo(9.8, 6.6); g.lineTo(7.8, 9.2); g.quadraticCurveTo(9.8, 13.8, 14.8, 16.4); g.lineTo(17.4, 14.4); g.lineTo(21.2, 17.8);
      g.lineTo(19.2, 20.6); g.quadraticCurveTo(17.4, 22.3, 13.8, 20.3); g.quadraticCurveTo(5.8, 15.8, 2.9, 8.6); g.quadraticCurveTo(1.9, 5.8, 3.6, 4.4); g.closePath(); g.fill();
    },
    envelope(g) {
      g.lineWidth = 2.2; strokeRR(g, 2.8, 5.6, 18.4, 13, 1.6);
      line(g, [3.8, 6.8, 12, 13.4, 20.2, 6.8]);
    },
    gamepad(g) {
      g.beginPath(); g.moveTo(7, 6.6); g.lineTo(17, 6.6); g.quadraticCurveTo(21.6, 6.6, 22.2, 12.6); g.quadraticCurveTo(22.8, 19, 19.2, 18.6); g.quadraticCurveTo(17.2, 18.2, 15.6, 15.4);
      g.lineTo(8.4, 15.4); g.quadraticCurveTo(6.8, 18.2, 4.8, 18.6); g.quadraticCurveTo(1.2, 19, 1.8, 12.6); g.quadraticCurveTo(2.4, 6.6, 7, 6.6); g.closePath(); g.fill();
      cut(g, () => { g.lineWidth = 1.9; line(g, [7.4, 9.2, 7.4, 13.6]); line(g, [5.2, 11.4, 9.6, 11.4]); dot(g, 16.2, 10.2, 1.2); dot(g, 18.4, 12.4, 1.2); });
    },
    note(g) {
      g.save(); g.translate(7, 17.6); g.rotate(-0.4); g.beginPath(); g.ellipse(0, 0, 3.1, 2.3, 0, 0, Math.PI * 2); g.fill(); g.restore();
      g.save(); g.translate(17, 15.6); g.rotate(-0.4); g.beginPath(); g.ellipse(0, 0, 3.1, 2.3, 0, 0, Math.PI * 2); g.fill(); g.restore();
      g.lineWidth = 2; line(g, [9.6, 17, 9.6, 5.4]); line(g, [19.6, 15, 19.6, 3.4]);
      poly(g, [9.6, 5.4, 19.6, 3.4, 19.6, 6.8, 9.6, 8.8]);
    },
    runner(g) {
      dot(g, 15.4, 3.9, 2.3);
      g.lineWidth = 2.7;
      line(g, [13.8, 7.6, 11, 13.2]);
      line(g, [13.4, 8.6, 9.2, 9.6, 7, 12.2]);
      line(g, [13.4, 8.6, 16.6, 11.2, 19.4, 10.2]);
      line(g, [11, 13.2, 14.8, 16, 13.2, 21]);
      line(g, [11, 13.2, 8.2, 16.8, 4.2, 16.6]);
    },
    wave(g) {
      g.lineWidth = 2.2;
      [7, 12, 17].forEach((y) => { g.beginPath(); for (let x = 3; x <= 21.01; x += 0.5) { const yy = y + Math.sin((x - 3) / 18 * Math.PI * 2) * 1.8; if (x === 3) g.moveTo(x, yy); else g.lineTo(x, yy); } g.stroke(); });
    },
    phone(g) {
      g.lineWidth = 2.2; strokeRR(g, 6.8, 2.4, 10.4, 19.2, 2.2);
      dot(g, 12, 18.3, 1.1); line(g, [10.4, 5.2, 13.6, 5.2]);
    },
    cake(g) {
      fillRR(g, 3, 13.2, 18, 7.4, 1.6);
      fillRR(g, 6.2, 8.6, 11.6, 5.6, 1.2);
      cut(g, () => { g.lineWidth = 1.3; line(g, [3, 13.2, 21, 13.2]); });
      g.lineWidth = 2; line(g, [12, 4.4, 12, 7.8]);
      g.beginPath(); g.ellipse(12, 2.6, 1.1, 1.6, 0, 0, Math.PI * 2); g.fill();
    },
    gift(g) {
      fillRR(g, 3.6, 10.4, 16.8, 10.2, 1.2);
      fillRR(g, 2.4, 6.8, 19.2, 4.2, 1);
      cut(g, () => { g.lineWidth = 2.4; line(g, [12, 6.8, 12, 20.6]); line(g, [2.4, 11.2, 21.6, 11.2]); });
      g.lineWidth = 1.9;
      g.beginPath(); g.ellipse(9.4, 4.6, 2.6, 1.6, 0.35, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.ellipse(14.6, 4.6, 2.6, 1.6, -0.35, 0, Math.PI * 2); g.stroke();
    },
    wrench(g) {
      g.lineWidth = 3.4; line(g, [5.6, 18.4, 14.6, 9.4]);
      dot(g, 16.4, 7.6, 4.4);
      cut(g, () => { dot(g, 18.9, 5.1, 2.5); });
      dot(g, 5.2, 18.8, 2);
    },
    basket(g) {
      g.lineWidth = 2.2; g.beginPath(); g.arc(12, 10.6, 6.6, Math.PI, 0); g.stroke();
      g.beginPath(); g.moveTo(2.6, 10); g.lineTo(21.4, 10); g.lineTo(19.3, 20); g.quadraticCurveTo(19, 21.2, 17.8, 21.2); g.lineTo(6.2, 21.2); g.quadraticCurveTo(5, 21.2, 4.7, 20); g.closePath(); g.fill();
      cut(g, () => { g.lineWidth = 1.4; line(g, [8.2, 12.4, 8.8, 19.2]); line(g, [12, 12.4, 12, 19.2]); line(g, [15.8, 12.4, 15.2, 19.2]); });
    },
    tooth(g) {
      g.beginPath(); g.moveTo(6.2, 3.8); g.quadraticCurveTo(9.2, 2.8, 12, 4.4); g.quadraticCurveTo(14.8, 2.8, 17.8, 3.8); g.quadraticCurveTo(21.2, 5.4, 20.2, 10.2);
      g.quadraticCurveTo(19.2, 14.4, 18.1, 19.8); g.quadraticCurveTo(17.3, 21.6, 16, 20.1); g.lineTo(14, 15.2); g.quadraticCurveTo(12, 13.6, 10, 15.2); g.lineTo(8, 20.1);
      g.quadraticCurveTo(6.7, 21.6, 5.9, 19.8); g.quadraticCurveTo(4.8, 14.4, 3.8, 10.2); g.quadraticCurveTo(2.8, 5.4, 6.2, 3.8); g.closePath(); g.fill();
    },
    film(g) {
      fillRR(g, 2.8, 5.6, 18.4, 13, 1.6);
      cut(g, () => {
        [7.4, 11, 14.6].forEach((y) => { fillRR(g, 4.2, y - 1, 1.8, 2, 0.4); fillRR(g, 18, y - 1, 1.8, 2, 0.4); });
        poly(g, [10.2, 8.6, 15.4, 12, 10.2, 15.4]);
      });
    },
    box(g) {
      poly(g, [3, 8.6, 12, 11.8, 12, 21.2, 3, 18]);
      g.save(); g.globalAlpha *= 0.78; poly(g, [12, 11.8, 21, 8.6, 21, 18, 12, 21.2]); g.restore();
      g.save(); g.globalAlpha *= 0.55; poly(g, [3, 8.6, 12, 5.4, 21, 8.6, 12, 11.8]); g.restore();
      cut(g, () => { g.lineWidth = 1.4; line(g, [7.5, 7, 16.5, 10.2]); });
    },
    key(g) {
      g.beginPath(); g.arc(7.5, 12, 5, 0, Math.PI * 2); g.fill();
      cut(g, () => dot(g, 6.4, 12, 1.9));
      g.lineWidth = 3; line(g, [11.5, 12, 21.5, 12]);
      g.lineWidth = 2.6; line(g, [18.5, 12, 18.5, 16]); line(g, [15.2, 12, 15.2, 15]);
    },
    drop(g) {
      g.beginPath(); g.moveTo(12, 2.6); g.bezierCurveTo(15.5, 8, 19, 11.4, 19, 15); g.arc(12, 15, 7, 0, Math.PI, false); g.bezierCurveTo(5, 11.4, 8.5, 8, 12, 2.6); g.closePath(); g.fill();
      cut(g, () => { g.lineWidth = 1.8; g.beginPath(); g.arc(12, 15, 4, Math.PI * 0.6, Math.PI * 0.95); g.stroke(); });
    },
    star(g) {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 4.4 : 10, a = -Math.PI / 2 + i * Math.PI / 5;
        const x = 12 + Math.cos(a) * r, y = 12.6 + Math.sin(a) * r;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.closePath(); g.fill();
    },
    bottle(g) {
      fillRR(g, 9.8, 1.4, 4.4, 4, 2);
      fillRR(g, 7.4, 5, 9.2, 3, 0.9);
      fillRR(g, 7, 8.6, 10, 13.6, 2.8);
      cut(g, () => { g.lineWidth = 1.5; line(g, [9.4, 12.6, 11.8, 12.6]); line(g, [9.4, 15.6, 11.8, 15.6]); line(g, [9.4, 18.6, 11.8, 18.6]); });
    },
    church(g) {
      poly(g, [3.6, 21.4, 3.6, 13, 12, 7.6, 20.4, 13, 20.4, 21.4]);
      fillRR(g, 10, 5.6, 4, 5, 0.4);
      poly(g, [9.4, 6, 12, 3.4, 14.6, 6]);
      g.lineWidth = 1.5; line(g, [12, 0.6, 12, 3.6]); line(g, [10.8, 1.8, 13.2, 1.8]);
      cut(g, () => { fillRR(g, 10.2, 15.2, 3.6, 6.4, 1.8); });
    },
    heart(g) {
      g.beginPath(); g.moveTo(12, 20.8);
      g.bezierCurveTo(4.2, 15.6, 2, 12, 2.5, 8.4); g.bezierCurveTo(3.1, 4.6, 8.4, 3, 12, 7.4);
      g.bezierCurveTo(15.6, 3, 20.9, 4.6, 21.5, 8.4); g.bezierCurveTo(22, 12, 19.8, 15.6, 12, 20.8);
      g.closePath(); g.fill();
    },
    plane(g) {
      g.translate(12, 12); g.rotate(Math.PI / 4); g.translate(-12, -12);
      poly(g, [12, 1.6, 13.5, 3.4, 13.5, 9.2, 21.8, 14, 21.8, 16.2, 13.5, 13.6, 13.5, 18.4, 16, 20.2, 16, 21.8, 12, 20.8, 8, 21.8, 8, 20.2, 10.5, 18.4, 10.5, 13.6, 2.2, 16.2, 2.2, 14, 10.5, 9.2, 10.5, 3.4]);
    },
    car(g) {
      g.beginPath(); g.moveTo(2, 16.8); g.lineTo(2, 13.2); g.quadraticCurveTo(2.2, 11.4, 4, 11); g.lineTo(6.4, 10.6); g.lineTo(8.8, 7.2);
      g.quadraticCurveTo(9.6, 6, 10.9, 6); g.lineTo(15.3, 6); g.quadraticCurveTo(16.6, 6, 17.4, 7.2); g.lineTo(19.8, 10.6); g.quadraticCurveTo(22, 11, 22, 13.2); g.lineTo(22, 16.8); g.closePath(); g.fill();
      cut(g, () => { poly(g, [8.6, 10.6, 10.5, 7.8, 11.6, 7.8, 11.6, 10.6]); poly(g, [12.8, 10.6, 12.8, 7.8, 14.8, 7.8, 16.8, 10.6]); dot(g, 7, 17, 3.1); dot(g, 17, 17, 3.1); });
      dot(g, 7, 17, 2.2); dot(g, 17, 17, 2.2);
    },
    receipt(g) {
      g.beginPath(); g.moveTo(5, 2.4); g.lineTo(19, 2.4); g.lineTo(19, 21.6);
      for (let i = 0; i < 7; i++) g.lineTo(19 - (i + 1) * 2, i % 2 ? 21.6 : 20);
      g.closePath(); g.fill();
      cut(g, () => { g.lineWidth = 1.6; line(g, [8, 7, 16, 7]); line(g, [8, 10.6, 16, 10.6]); line(g, [8, 14.2, 13, 14.2]); });
    },
    broom(g) {
      g.lineWidth = 2.3; line(g, [18.4, 2.2, 12, 11.8]);
      poly(g, [8.6, 11, 14.8, 14.6, 11.8, 21.8, 2.8, 17.2]);
      cut(g, () => { g.lineWidth = 1.2; line(g, [6.4, 16.4, 9.2, 13.2]); line(g, [8.8, 18.4, 11.6, 14.6]); });
    },
    tree(g) {
      poly(g, [12, 1.8, 17, 8.6, 14.8, 8.6, 19, 14.4, 16, 14.4, 20.4, 19.8, 3.6, 19.8, 8, 14.4, 5, 14.4, 9.2, 8.6, 7, 8.6]);
      fillRR(g, 10.5, 19.4, 3, 3, 0.4);
    },
    carrot(g) {
      g.beginPath(); g.moveTo(15.6, 6.4); g.quadraticCurveTo(18.4, 8, 17.6, 10.4); g.lineTo(5, 20.6); g.quadraticCurveTo(3.2, 21.4, 3.6, 19.4); g.lineTo(13.4, 6.8); g.quadraticCurveTo(14.4, 5.8, 15.6, 6.4); g.closePath(); g.fill();
      g.lineWidth = 2; line(g, [16.2, 5.6, 17.8, 1.8]); line(g, [17.2, 6.8, 21.6, 4.8]); line(g, [16.8, 6, 20.2, 2.6]);
      cut(g, () => { g.lineWidth = 1.2; line(g, [8.8, 14.4, 10.8, 15.8]); line(g, [11.6, 11, 13.6, 12.4]); });
    },
    drumstick(g) {
      g.beginPath(); g.ellipse(14.6, 9.4, 6.6, 5.4, -0.75, 0, Math.PI * 2); g.fill();
      g.lineWidth = 2.8; line(g, [10.6, 13.4, 6.2, 17.8]);
      dot(g, 4.4, 17.8, 1.8); dot(g, 6.2, 19.6, 1.8);
    },
    bowl(g) {
      g.beginPath(); g.moveTo(5, 11.6); g.quadraticCurveTo(12, 2.6, 19, 11.6); g.closePath(); g.fill();
      cut(g, () => { g.lineWidth = 1.6; line(g, [2, 12.2, 22, 12.2]); });
      g.beginPath(); g.moveTo(2.6, 13); g.lineTo(21.4, 13); g.quadraticCurveTo(21, 19.8, 12, 20); g.quadraticCurveTo(3, 19.8, 2.6, 13); g.closePath(); g.fill();
      fillRR(g, 8.6, 19.6, 6.8, 2, 0.9);
    },
    tiles(g) {
      fillRR(g, 3, 3, 18, 18, 3.2);
      cut(g, () => { g.lineWidth = 2.5; line(g, [8.2, 16.8, 12, 6.6, 15.8, 16.8]); line(g, [9.6, 13.2, 14.4, 13.2]); g.lineWidth = 1.4; line(g, [17.6, 16.2, 17.6, 18.6]); });
    },
    chat(g) {
      fillRR(g, 2.4, 3.4, 19.2, 12.8, 3.6);
      poly(g, [6.2, 15.4, 5.6, 21.2, 11.6, 15.4]);
      cut(g, () => { dot(g, 7.6, 9.8, 1.35); dot(g, 12, 9.8, 1.35); dot(g, 16.4, 9.8, 1.35); });
    },
    brush(g) {
      g.lineWidth = 2.6; line(g, [20.6, 3.4, 13.2, 10.8]);
      poly(g, [11.4, 9.6, 14.4, 12.6, 12.8, 14.2, 9.8, 11.2]);
      g.beginPath(); g.moveTo(9.4, 11.8); g.quadraticCurveTo(6, 12.4, 5.2, 15.6); g.quadraticCurveTo(4.6, 18.6, 2.6, 20.6);
      g.quadraticCurveTo(7.8, 21.2, 10.8, 18.2); g.quadraticCurveTo(12.8, 16.2, 12.3, 14.6); g.closePath(); g.fill();
    },
    calendar(g) {
      fillRR(g, 3, 4.6, 18, 16.8, 2.4);
      cut(g, () => { fillRR(g, 5, 9.8, 14, 9.6, 1); });
      [6.3, 10.6, 14.9].forEach((x) => [11.2, 15.2].forEach((y) => fillRR(g, x, y, 2.8, 2.4, 0.5)));
      g.lineWidth = 2.3; line(g, [8, 2.4, 8, 6.6]); line(g, [16, 2.4, 16, 6.6]);
    },
    house(g) {
      poly(g, [12, 2.6, 22.2, 11.4, 19.6, 11.4, 19.6, 21.2, 4.4, 21.2, 4.4, 11.4, 1.8, 11.4]);
      cut(g, () => { fillRR(g, 10, 14.2, 4, 7.2, 1); });
    },
    check(g) { g.lineWidth = 3.4; line(g, [4.2, 12.8, 9.6, 18, 19.8, 6.4]); },
    plus(g) { g.lineWidth = 3.2; line(g, [12, 4.2, 12, 19.8]); line(g, [4.2, 12, 19.8, 12]); },
    list(g) {
      g.lineWidth = 2.4;
      [6.2, 12, 17.8].forEach((y) => { dot(g, 4.8, y, 1.7); line(g, [9, y, 20.4, y]); });
    },
    flag(g) {
      g.lineWidth = 2.2; line(g, [5.4, 2.6, 5.4, 21.6]);
      poly(g, [6.4, 3.4, 19.8, 3.4, 16.4, 8.2, 19.8, 13, 6.4, 13]);
    },
    lock(g) {
      g.lineWidth = 2.6; g.beginPath(); g.moveTo(7.6, 11); g.lineTo(7.6, 7.6); g.arc(12, 7.6, 4.4, Math.PI, 0); g.lineTo(16.4, 11); g.stroke();
      fillRR(g, 4.6, 10.4, 14.8, 11, 2.4);
      cut(g, () => { dot(g, 12, 15, 1.7); g.lineWidth = 1.8; line(g, [12, 15, 12, 18.4]); });
    },
    unlock(g) {
      g.lineWidth = 2.6; g.beginPath(); g.moveTo(7.6, 11); g.lineTo(7.6, 6.4); g.arc(12, 6.4, 4.4, Math.PI, -0.35); g.stroke();
      fillRR(g, 4.6, 10.4, 14.8, 11, 2.4);
      cut(g, () => { dot(g, 12, 15, 1.7); g.lineWidth = 1.8; line(g, [12, 15, 12, 18.4]); });
    },
    minus(g) { g.lineWidth = 3.2; line(g, [4.6, 12, 19.4, 12]); },
    up(g) { g.lineWidth = 3.2; line(g, [5, 15.5, 12, 8.5, 19, 15.5]); },
    down(g) { g.lineWidth = 3.2; line(g, [5, 8.5, 12, 15.5, 19, 8.5]); },
    x(g) { g.lineWidth = 3; line(g, [6, 6, 18, 18]); line(g, [18, 6, 6, 18]); },
    earlier(g) { g.lineWidth = 3; line(g, [14.6, 5.4, 8, 12, 14.6, 18.6]); line(g, [20, 12, 9, 12]); g.lineWidth = 2.4; line(g, [4.4, 5, 4.4, 19]); },
    later(g) { g.lineWidth = 3; line(g, [9.4, 5.4, 16, 12, 9.4, 18.6]); line(g, [4, 12, 15, 12]); g.lineWidth = 2.4; line(g, [19.6, 5, 19.6, 19]); },
    more(g) { dot(g, 5.4, 12, 2.2); dot(g, 12, 12, 2.2); dot(g, 18.6, 12, 2.2); },
    shorter(g) { g.lineWidth = 2.6; strokeRR(g, 3, 8, 12, 8, 2); g.lineWidth = 2.8; line(g, [17.2, 12, 22, 12]); },
    longer(g) { g.lineWidth = 2.6; strokeRR(g, 2, 8, 14, 8, 2); g.lineWidth = 2.8; line(g, [17.4, 12, 22.4, 12]); line(g, [19.9, 9.5, 19.9, 14.5]); },
    /* a magnifier with a plus or a minus, for the desk zoom */
    zoomin(g) { g.lineWidth = 2.8; g.beginPath(); g.arc(10, 10, 6.4, 0, Math.PI * 2); g.stroke(); g.lineWidth = 3.4; line(g, [14.8, 14.8, 20.4, 20.4]); g.lineWidth = 2.4; line(g, [10, 7, 10, 13]); line(g, [7, 10, 13, 10]); },
    zoomout(g) { g.lineWidth = 2.8; g.beginPath(); g.arc(10, 10, 6.4, 0, Math.PI * 2); g.stroke(); g.lineWidth = 3.4; line(g, [14.8, 14.8, 20.4, 20.4]); g.lineWidth = 2.4; line(g, [7, 10, 13, 10]); },
    /* four corners pulling in: fit everything back in view */
    fit(g) { g.lineWidth = 2.8; line(g, [4, 9, 4, 4, 9, 4]); line(g, [15, 4, 20, 4, 20, 9]); line(g, [20, 15, 20, 20, 15, 20]); line(g, [9, 20, 4, 20, 4, 15]); fillRR(g, 8.5, 9.5, 7, 5, 1.2); },
    /* the day board with your blocks under it, or beside it */
    below(g) { fillRR(g, 3, 3.5, 18, 9, 2); g.lineWidth = 2.2; strokeRR(g, 3, 15, 18, 5.5, 1.6); },
    beside(g) { fillRR(g, 2.5, 5, 12, 14, 2); g.lineWidth = 2.2; strokeRR(g, 16.5, 5, 5.5, 14, 1.6); },
    /* an empty square drawn in dashes: time held open */
    blank(g) { g.lineWidth = 2.6; g.setLineDash([3.4, 2.6]); strokeRR(g, 4, 4, 16, 16, 3.5); g.setLineDash([]); },
    /* a speaker, with sound waves or with a small cross */
    sound(g) { poly(g, [3, 9, 7.5, 9, 13, 4.5, 13, 19.5, 7.5, 15, 3, 15]); g.lineWidth = 2.2; g.beginPath(); g.arc(13.5, 12, 4.2, -0.9, 0.9); g.stroke(); g.beginPath(); g.arc(13.5, 12, 8, -0.85, 0.85); g.stroke(); },
    mute(g) { poly(g, [3, 9, 7.5, 9, 13, 4.5, 13, 19.5, 7.5, 15, 3, 15]); g.lineWidth = 2.4; line(g, [16, 9, 21, 15]); line(g, [21, 9, 16, 15]); },
    /* a curved arrow back */
    undo(g) { g.lineWidth = 2.8; g.beginPath(); g.arc(13, 13.5, 6.5, Math.PI * 1.05, Math.PI * 0.35, false); g.stroke(); poly(g, [2.6, 9.6, 9.4, 6.4, 8.6, 13.4]); },
    /* an open tray with a dip in its front: where new things land first */
    inbox(g) {
      g.lineWidth = 2.6;
      g.beginPath(); g.moveTo(4, 12.5); g.lineTo(6.8, 4.5); g.lineTo(17.2, 4.5); g.lineTo(20, 12.5); g.stroke();
      poly(g, [3, 12.5, 8.4, 12.5, 9.8, 15.4, 14.2, 15.4, 15.6, 12.5, 21, 12.5, 21, 18.2, 19.4, 20, 4.6, 20, 3, 18.2]);
    },
    /* a looking glass, no plus */
    search(g) { g.lineWidth = 2.8; g.beginPath(); g.arc(10, 10, 6.2, 0, Math.PI * 2); g.stroke(); g.lineWidth = 3.4; line(g, [14.6, 14.6, 20.4, 20.4]); },
    /* two bars that share the same stretch of time */
    overlap(g) { fillRR(g, 2.5, 5, 13, 6, 1.6); g.save(); g.globalAlpha *= 0.62; fillRR(g, 8.5, 13, 13, 6, 1.6); g.restore(); g.lineWidth = 2; g.setLineDash([2.2, 2]); line(g, [8.5, 3, 8.5, 21]); line(g, [15.5, 3, 15.5, 21]); g.setLineDash([]); },
    /* a cloud: the household's copy */
    cloud(g) { g.beginPath(); g.arc(8, 14, 4.4, Math.PI * 0.5, Math.PI * 1.5); g.arc(12.2, 9.6, 5.2, Math.PI * 1.1, Math.PI * 1.95); g.arc(17, 13.4, 4.6, Math.PI * 1.45, Math.PI * 0.5); g.closePath(); g.fill(); },
    /* a sheet coming out of a printer */
    print(g) { fillRR(g, 7, 3, 10, 5, 1); fillRR(g, 3, 8.5, 18, 8, 2); g.fillRect(7, 14, 10, 7); cut(g, () => { g.fillRect(8.6, 15.4, 6.8, 4.2); }); g.lineWidth = 1.4; line(g, [9.6, 17, 14.4, 17]); dot(g, 18, 11, 1); },
    /* a small letter and a big one */
    textsize(g) { g.lineWidth = 2.6; line(g, [2.5, 20, 6.5, 10, 10.5, 20]); line(g, [4.1, 16.4, 8.9, 16.4]); g.lineWidth = 3; line(g, [10.5, 20, 16, 4.5, 21.5, 20]); line(g, [12.6, 14.6, 19.4, 14.6]); },
    /* a leaf, for a lighter desk */
    leaf(g) { g.beginPath(); g.moveTo(4.5, 19.5); g.quadraticCurveTo(3.5, 5, 20, 4); g.quadraticCurveTo(19.5, 19, 4.5, 19.5); g.closePath(); g.fill(); cut(g, () => { g.lineWidth = 1.6; line(g, [6, 18, 16.5, 7.5]); }); },
    /* arrows for going back and on, and for a list that runs off its edge */
    left(g) { g.lineWidth = 3.2; line(g, [15.5, 5, 8.5, 12, 15.5, 19]); },
    right(g) { g.lineWidth = 3.2; line(g, [8.5, 5, 15.5, 12, 8.5, 19]); },
    /* two sliders with open knobs: settings. Two, not three, and the knob breaks its line, so it
       stays clear at the size of a kicker (Russell found three solid ones tight and dense) */
    sliders(g) {
      g.lineWidth = 2.2;
      line(g, [3, 7.5, 5.4, 7.5]); line(g, [11.6, 7.5, 21, 7.5]); g.beginPath(); g.arc(8.5, 7.5, 3, 0, Math.PI * 2); g.stroke();
      line(g, [3, 16.5, 12.4, 16.5]); line(g, [18.6, 16.5, 21, 16.5]); g.beginPath(); g.arc(15.5, 16.5, 3, 0, Math.PI * 2); g.stroke();
    },
    /* six dots: hold here to move it */
    grip(g) { [[9, 6], [15, 6], [9, 12], [15, 12], [9, 18], [15, 18]].forEach(([x, y]) => dot(g, x, y, 1.9)); },
    /* undo's mirror */
    redo(g) { g.lineWidth = 2.8; g.beginPath(); g.arc(11, 13.5, 6.5, Math.PI * 1.95, Math.PI * 0.65, true); g.stroke(); poly(g, [21.4, 9.6, 14.6, 6.4, 15.4, 13.4]); },
    /* a desk lamp: base, arm, and shade */
    lamp(g) { fillRR(g, 4, 18.6, 10, 2.8, 1.2); g.lineWidth = 2.4; line(g, [9, 18.6, 7, 11.5, 13.2, 6.4]); poly(g, [11.2, 3.4, 20.6, 8.6, 17.8, 13.6, 10.2, 8.2]); g.lineWidth = 1.8; line(g, [18.6, 15.4, 19.6, 17.8]); line(g, [15.4, 14.6, 15, 17.2]); },
    /* the tray bar: a bar with three things on it */
    tray(g) { g.lineWidth = 2.2; strokeRR(g, 2.5, 8.5, 19, 9, 3); fillRR(g, 5.4, 11.2, 3.6, 3.6, 1); fillRR(g, 10.2, 11.2, 3.6, 3.6, 1); fillRR(g, 15, 11.2, 3.6, 3.6, 1); },
    /* a bell, for reminders */
    bell(g) { g.beginPath(); g.moveTo(5, 17.2); g.quadraticCurveTo(6.6, 15, 6.6, 11); g.quadraticCurveTo(6.6, 5, 12, 5); g.quadraticCurveTo(17.4, 5, 17.4, 11); g.quadraticCurveTo(17.4, 15, 19, 17.2); g.closePath(); g.fill(); dot(g, 12, 3.8, 1.5); g.beginPath(); g.arc(12, 18.6, 2.5, 0, Math.PI); g.fill(); },
    /* a question mark in a ring */
    help(g) { g.lineWidth = 2.3; g.beginPath(); g.arc(12, 12, 9, 0, Math.PI * 2); g.stroke(); g.lineWidth = 2.5; g.beginPath(); g.arc(12, 9.6, 3, Math.PI * 1.05, Math.PI * 0.35); g.quadraticCurveTo(12, 12.4, 12, 13.8); g.stroke(); dot(g, 12, 17, 1.5); },
    /* a person, for the page about you and home */
    person(g) { dot(g, 12, 7.6, 3.8); g.beginPath(); g.moveTo(4.5, 20.5); g.quadraticCurveTo(4.5, 13, 12, 13); g.quadraticCurveTo(19.5, 13, 19.5, 20.5); g.closePath(); g.fill(); },
    /* a pin: it stays on the bar */
    pin(g) { poly(g, [8, 3.5, 16, 3.5, 15, 9.5, 18.5, 13.5, 5.5, 13.5, 9, 9.5]); g.lineWidth = 2.4; line(g, [12, 13.5, 12, 21]); },
    /* a speech mark with a line in it, for notes back to us */
    note2(g) { fillRR(g, 3, 4, 18, 12.5, 3); poly(g, [7, 15, 12, 15, 6.5, 21]); cut(g, () => { g.lineWidth = 1.8; line(g, [7, 8.6, 17, 8.6]); line(g, [7, 12, 13.5, 12]); }); }
  };

  function draw(ctx, name, cx, cy, size, color) {
    const fn = ICONS[name];
    if (!fn) return;
    ctx.save();
    ctx.translate(cx - size / 2, cy - size / 2);
    ctx.scale(size / 24, size / 24);
    ctx.fillStyle = color; ctx.strokeStyle = color;
    ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    fn(ctx);
    ctx.restore();
  }

  root.Icons = { draw, names: Object.keys(ICONS) };
})(typeof window !== 'undefined' ? window : globalThis);
