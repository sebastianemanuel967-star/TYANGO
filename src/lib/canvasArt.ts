
export const fruitArt = {
  mango: (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    const g = ctx.createRadialGradient(x - r * 0.15, y - r * 0.15, r * 0.08, x, y, r);
    g.addColorStop(0, "#FFF176");
    g.addColorStop(0.45, "#FFB800");
    g.addColorStop(1, "#E07000");
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.72, r, 0, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(180,90,0,.5)";
    ctx.lineWidth = 2;
    ctx.stroke();
  },
  pina: (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    const g = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
    g.addColorStop(0, "#FFFDE7");
    g.addColorStop(0.55, "#FFD600");
    g.addColorStop(1, "#E65100");
    ctx.beginPath();
    ctx.arc(x, y, r * 0.82, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(180,80,0,.4)";
    ctx.lineWidth = 2;
    ctx.stroke();
  },
  fresa: (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.2, r * 0.05, x, y, r);
    g.addColorStop(0, "#FF8A80");
    g.addColorStop(0.4, "#F44336");
    g.addColorStop(1, "#B71C1C");
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.88);
    ctx.bezierCurveTo(x - r * 0.82, y + r * 0.22, x - r * 0.95, y - r * 0.28, x - r * 0.5, y - r * 0.58);
    ctx.bezierCurveTo(x - r * 0.18, y - r * 0.92, x, y - r * 0.48, x, y - r * 0.28);
    ctx.bezierCurveTo(x, y - r * 0.48, x + r * 0.18, y - r * 0.92, x + r * 0.5, y - r * 0.58);
    ctx.bezierCurveTo(x + r * 0.95, y - r * 0.28, x + r * 0.82, y + r * 0.22, x, y + r * 0.88);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(130,15,15,.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  },
  sandia: (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.88);
    ctx.lineTo(x - r * 0.88, y + r * 0.72);
    ctx.lineTo(x + r * 0.88, y + r * 0.72);
    ctx.closePath();
    const g = ctx.createLinearGradient(x, y - r * 0.88, x, y + r * 0.72);
    g.addColorStop(0, "#FF5252");
    g.addColorStop(0.82, "#E53935");
    g.addColorStop(1, "#B71C1C");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "#43A047";
    ctx.lineWidth = r * 0.16;
    ctx.stroke();
  },
  pepino: (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    const g = ctx.createRadialGradient(x, y, r * 0.04, x, y, r);
    g.addColorStop(0, "#E8F5E9");
    g.addColorStop(0.48, "#81C784");
    g.addColorStop(1, "#2E7D32");
    ctx.beginPath();
    ctx.arc(x, y, r * 0.82, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "#1B5E20";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  },
  melon: (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.82, 0, Math.PI, false);
    ctx.lineTo(x - r * 0.82, y);
    ctx.closePath();
    const g = ctx.createLinearGradient(x - r, y - r * 0.5, x + r * 0.5, y + r * 0.2);
    g.addColorStop(0, "#FFF9C4");
    g.addColorStop(0.5, "#FFD54F");
    g.addColorStop(1, "#FF8F00");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(150,80,0,.4)";
    ctx.lineWidth = 2;
    ctx.stroke();
  },
  manzana: (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    const g = ctx.createRadialGradient(x - r * 0.22, y - r * 0.22, r * 0.08, x, y, r);
    g.addColorStop(0, "#FFCDD2");
    g.addColorStop(0.5, "#EF5350");
    g.addColorStop(1, "#C62828");
    ctx.beginPath();
    ctx.arc(x, y, r * 0.82, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(120,20,20,.4)";
    ctx.lineWidth = 2;
    ctx.stroke();
  },
  uva: (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
    const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.05, x, y, r);
    g.addColorStop(0, "#9C27B0");
    g.addColorStop(0.5, "#7B1FA2");
    g.addColorStop(1, "#4A148C");
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const px = x + Math.cos(angle) * r * 0.4;
      const py = y + Math.sin(angle) * r * 0.4;
      ctx.beginPath();
      ctx.arc(px, py, r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "rgba(100,50,150,.6)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(100,50,150,.6)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  },
};

export const toppingArt = {
  tajin: (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = r * 0.12 + Math.random() * r * 0.65;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.2 + Math.random() * 2.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,${45 + Math.random() * 55},15,${0.5 + Math.random() * 0.38})`;
      ctx.fill();
    }
  },
  tajin_picante: (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = r * 0.1 + Math.random() * r * 0.72;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.2 + Math.random() * 3.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(195,${25 + Math.random() * 35},8,${0.55 + Math.random() * 0.4})`;
      ctx.fill();
    }
  },
  limon: (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * r * 0.7;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 3.5 + Math.random() * 5.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,235,59,${0.22 + Math.random() * 0.28})`;
      ctx.fill();
    }
  },
  miel: (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    for (let i = 0; i < 6; i++) {
      const sx = cx + (Math.random() - 0.5) * r * 0.9;
      ctx.beginPath();
      ctx.moveTo(sx, cy - r * 0.52);
      ctx.quadraticCurveTo(sx + (Math.random() - 0.5) * 10, cy, sx + (Math.random() - 0.5) * 5, cy + r * 0.62);
      ctx.strokeStyle = `rgba(255,179,0,${0.4 + Math.random() * 0.38})`;
      ctx.lineWidth = 3 + Math.random() * 3.5;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  },
  gomitas: (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    const cols = ["#FF5252", "#FF4081", "#40C4FF", "#69F0AE", "#FFFF00", "#FF6D00", "#EA80FC", "#80D8FF"];
    for (let i = 0; i < 11; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = r * 0.08 + Math.random() * r * 0.72;
      const x2 = cx + Math.cos(a) * d;
      const y2 = cy + Math.sin(a) * d;
      const col = cols[Math.floor(Math.random() * cols.length)];
      ctx.beginPath();
      ctx.arc(x2, y2, 5 + Math.random() * 4.5, 0, Math.PI * 2);
      ctx.fillStyle = col + "bb";
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  },
  takis: (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * r * 0.68;
      const x2 = cx + Math.cos(a) * d;
      const y2 = cy + Math.sin(a) * d;
      const rot = Math.random() * Math.PI;
      ctx.save();
      ctx.translate(x2, y2);
      ctx.rotate(rot);
      const g = ctx.createLinearGradient(-11, 0, 11, 0);
      g.addColorStop(0, "#BF360C");
      g.addColorStop(0.5, "#FF5722");
      g.addColorStop(1, "#BF360C");
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 5.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "rgba(60,10,0,.55)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  },
};
