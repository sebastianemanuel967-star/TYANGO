
const drawChunk = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  size: number,
  rotation: number,
  colors: string[],
  detailColor?: string
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // Sombra suave
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;

  // Cuerpo del trozo - forma de cuadrado redondeado ligeramente irregular
  ctx.beginPath();
  const w = size * (0.85 + Math.random() * 0.3);
  const h = size * (0.75 + Math.random() * 0.3);
  const radius = size * 0.22;
  
  // Using roundRect if available, otherwise manual path
  if (ctx.roundRect) {
    ctx.roundRect(-w/2, -h/2, w, h, radius);
  } else {
    ctx.moveTo(-w/2 + radius, -h/2);
    ctx.lineTo(w/2 - radius, -h/2);
    ctx.quadraticCurveTo(w/2, -h/2, w/2, -h/2 + radius);
    ctx.lineTo(w/2, h/2 - radius);
    ctx.quadraticCurveTo(w/2, h/2, w/2 - radius, h/2);
    ctx.lineTo(-w/2 + radius, h/2);
    ctx.quadraticCurveTo(-w/2, h/2, -w/2, h/2 - radius);
    ctx.lineTo(-w/2, -h/2 + radius);
    ctx.quadraticCurveTo(-w/2, -h/2, -w/2 + radius, -h/2);
  }
  ctx.closePath();

  // Gradiente del trozo
  const grad = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(0.5, colors[1] || colors[0]);
  grad.addColorStop(1, colors[2] || colors[1] || colors[0]);
  ctx.fillStyle = grad;
  ctx.fill();

  // Borde
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = colors[2] || colors[1] || colors[0];
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Reflejo de luz (esquina superior izquierda)
  ctx.beginPath();
  ctx.ellipse(-w*0.15, -h*0.18, w*0.18, h*0.12, -0.4, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fill();

  // Detalle interior (textura/fibra)
  if (detailColor) {
    ctx.beginPath();
    ctx.moveTo(-w*0.2, h*0.1);
    ctx.quadraticCurveTo(0, -h*0.05, w*0.2, h*0.1);
    ctx.strokeStyle = detailColor;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
};

// Posiciones predefinidas para 8 trozos naturalmente dispersos
const getChunkPositions = (cx: number, cy: number, r: number) => [
  { x: cx - r*0.45, y: cy - r*0.5,  rot: -0.3,  size: r*0.52 },
  { x: cx + r*0.38, y: cy - r*0.42, rot: 0.4,   size: r*0.48 },
  { x: cx - r*0.55, y: cy + r*0.1,  rot: -0.6,  size: r*0.44 },
  { x: cx + r*0.5,  y: cy + r*0.05, rot: 0.25,  size: r*0.50 },
  { x: cx - r*0.15, y: cy - r*0.62, rot: 0.15,  size: r*0.46 },
  { x: cx + r*0.15, y: cy + r*0.52, rot: -0.2,  size: r*0.45 },
  { x: cx - r*0.38, y: cy + r*0.52, rot: 0.5,   size: r*0.42 },
  { x: cx + r*0.0,  y: cy + r*0.1,  rot: -0.1,  size: r*0.55 },
];

export const fruitArt: Record<string, (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => void> = {

  mango: (ctx, cx, cy, r) => {
    const positions = getChunkPositions(cx, cy, r);
    positions.forEach(p => {
      drawChunk(ctx, p.x, p.y, p.size, p.rot,
        ['#FFE066', '#FFA726', '#E65100'],
        '#BF360C'
      );
    });
    // Pequeños puntos de fibra naranja sobre algunos trozos
    positions.slice(0,3).forEach(p => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x + p.size*0.15, p.y - p.size*0.1, p.size*0.07, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(191,54,12,0.4)';
      ctx.fill();
      ctx.restore();
    });
  },

  pina: (ctx, cx, cy, r) => {
    const positions = getChunkPositions(cx, cy, r);
    positions.forEach(p => {
      drawChunk(ctx, p.x, p.y, p.size, p.rot,
        ['#FFF176', '#FFD600', '#F57F17'],
        'rgba(230,81,0,0.3)'
      );
    });
  },

  fresa: (ctx, cx, cy, r) => {
    const positions = getChunkPositions(cx, cy, r);
    positions.forEach(p => {
      drawChunk(ctx, p.x, p.y, p.size, p.rot,
        ['#FF8A80', '#E53935', '#B71C1C'],
        '#FF1744'
      );
      // Semillitas amarillas características de la fresa
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      for (let s = 0; s < 4; s++) {
        const sx = (s % 2 === 0 ? -1 : 1) * p.size * (0.12 + s*0.06);
        const sy = (s < 2 ? -1 : 1) * p.size * 0.15;
        ctx.beginPath();
        ctx.ellipse(sx, sy, p.size*0.055, p.size*0.08, 0.2, 0, Math.PI*2);
        ctx.fillStyle = '#FFD740';
        ctx.fill();
      }
      ctx.restore();
    });
  },

  sandia: (ctx, cx, cy, r) => {
    const positions = getChunkPositions(cx, cy, r);
    positions.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      const s = p.size;

      // Capa verde (corteza exterior)
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-s*0.5, -s*0.5, s, s, s*0.2);
      else ctx.rect(-s*0.5, -s*0.5, s, s);
      ctx.fillStyle = '#388E3C';
      ctx.fill();

      // Capa blanca (corteza interior)
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-s*0.42, -s*0.42, s*0.84, s*0.84, s*0.16);
      else ctx.rect(-s*0.42, -s*0.42, s*0.84, s*0.84);
      ctx.fillStyle = '#F1F8E9';
      ctx.fill();

      // Interior rojo
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-s*0.35, -s*0.35, s*0.7, s*0.7, s*0.13);
      else ctx.rect(-s*0.35, -s*0.35, s*0.7, s*0.7);
      const wGrad = ctx.createRadialGradient(0, -s*0.05, s*0.05, 0, 0, s*0.38);
      wGrad.addColorStop(0, '#FF5252');
      wGrad.addColorStop(1, '#C62828');
      ctx.fillStyle = wGrad;
      ctx.fill();

      // Reflejo
      ctx.beginPath();
      ctx.ellipse(-s*0.1, -s*0.12, s*0.12, s*0.08, -0.4, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fill();

      // Semillas negras
      [[-0.08, -0.08], [0.1, 0.05], [-0.05, 0.12], [0.05, -0.15]].forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.ellipse(dx*s, dy*s, s*0.05, s*0.085, 0.3, 0, Math.PI*2);
        ctx.fillStyle = '#212121';
        ctx.fill();
      });
      ctx.restore();
    });
  },

  pepino: (ctx, cx, cy, r) => {
    const positions = getChunkPositions(cx, cy, r);
    positions.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      const s = p.size * 0.9;

      // Piel verde exterior
      ctx.beginPath();
      ctx.arc(0, 0, s*0.5, 0, Math.PI*2);
      ctx.fillStyle = '#388E3C';
      ctx.fill();
      ctx.strokeStyle = '#1B5E20';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Interior verde claro
      ctx.beginPath();
      ctx.arc(0, 0, s*0.4, 0, Math.PI*2);
      const cucGrad = ctx.createRadialGradient(0, 0, s*0.05, 0, 0, s*0.4);
      cucGrad.addColorStop(0, '#F1F8E9');
      cucGrad.addColorStop(0.4, '#DCEDC8');
      cucGrad.addColorStop(1, '#AED581');
      ctx.fillStyle = cucGrad;
      ctx.fill();

      // Líneas de semilla
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * s*0.28, Math.sin(angle) * s*0.28);
        ctx.strokeStyle = 'rgba(100,160,60,0.4)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Semillas
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(
          Math.cos(angle)*s*0.24,
          Math.sin(angle)*s*0.24,
          s*0.055, s*0.04, angle, 0, Math.PI*2
        );
        ctx.fillStyle = '#C5E1A5';
        ctx.fill();
      }

      // Reflejo
      ctx.beginPath();
      ctx.ellipse(-s*0.1, -s*0.12, s*0.14, s*0.09, -0.5, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
      ctx.restore();
    });
  },

  melon: (ctx, cx, cy, r) => {
    const positions = getChunkPositions(cx, cy, r);
    positions.forEach(p => {
      drawChunk(ctx, p.x, p.y, p.size, p.rot,
        ['#FFF9C4', '#FDD835', '#F57F17'],
        'rgba(255,255,255,0.4)'
      );
    });
  },

  manzana: (ctx, cx, cy, r) => {
    const positions = getChunkPositions(cx, cy, r);
    positions.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      const s = p.size;
      
      // Piel roja lateral
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-s*0.5, -s*0.5, s, s, s*0.2);
      else ctx.rect(-s*0.5, -s*0.5, s, s);
      ctx.fillStyle = '#D32F2F';
      ctx.fill();

      // Interior blanco/crema
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-s*0.35, -s*0.45, s*0.7, s*0.9, s*0.1);
      else ctx.rect(-s*0.35, -s*0.45, s*0.7, s*0.9);
      ctx.fillStyle = '#FFFDE7';
      ctx.fill();
      
      ctx.restore();
    });
  },

  uva: (ctx, cx, cy, r) => {
    const positions = getChunkPositions(cx, cy, r);
    positions.forEach(p => {
      drawChunk(ctx, p.x, p.y, p.size, p.rot,
        ['#BA68C8', '#7B1FA2', '#4A148C'],
        'rgba(255,255,255,0.2)'
      );
    });
  },
};

export const toppingArt: Record<string, (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => void> = {
  tajin: (ctx, cx, cy, r) => {
    // Granitos de tajín naranja-rojo
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = r * (0.15 + Math.random() * 0.65);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle)*dist, cy + Math.sin(angle)*dist, r*0.035, 0, Math.PI*2);
      ctx.fillStyle = i % 3 === 0 ? 'rgba(220,80,20,0.75)' : i % 3 === 1 ? 'rgba(200,150,20,0.65)' : 'rgba(180,50,10,0.55)';
      ctx.fill();
      ctx.restore();
    }
  },
  
  tajin_picante: (ctx, cx, cy, r) => {
    // Granitos de tajín más oscuros y abundantes
    for (let i = 0; i < 32; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = r * (0.12 + Math.random() * 0.7);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle)*dist, cy + Math.sin(angle)*dist, r*0.04, 0, Math.PI*2);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(183,28,28,0.8)' : 'rgba(127,0,0,0.7)';
      ctx.fill();
      ctx.restore();
    }
  },

  limon: (ctx, cx, cy, r) => {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * r * 0.7;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 3.5 + Math.random() * 5.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,235,59,${0.25 + Math.random() * 0.25})`;
      ctx.fill();
    }
  },

  miel: (ctx, cx, cy, r) => {
    for (let i = 0; i < 8; i++) {
      const sx = cx + (Math.random() - 0.5) * r * 0.95;
      ctx.beginPath();
      ctx.moveTo(sx, cy - r * 0.55);
      ctx.quadraticCurveTo(sx + (Math.random() - 0.5) * 12, cy, sx + (Math.random() - 0.5) * 6, cy + r * 0.65);
      ctx.strokeStyle = `rgba(255,160,0,${0.45 + Math.random() * 0.35})`;
      ctx.lineWidth = 4 + Math.random() * 4;
      ctx.lineCap = "round";
      ctx.stroke();
    }
  },

  gomitas: (ctx, cx, cy, r) => {
    const cols = ["#FF5252", "#FF4081", "#40C4FF", "#69F0AE", "#FFFF00", "#FF6D00", "#EA80FC", "#80D8FF"];
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = r * 0.1 + Math.random() * r * 0.75;
      const x2 = cx + Math.cos(a) * d;
      const y2 = cy + Math.sin(a) * d;
      const col = cols[Math.floor(Math.random() * cols.length)];
      ctx.beginPath();
      ctx.arc(x2, y2, 5 + Math.random() * 5, 0, Math.PI * 2);
      ctx.fillStyle = col + "cc";
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  },

  takis: (ctx, cx, cy, r) => {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * r * 0.72;
      const x2 = cx + Math.cos(a) * d;
      const y2 = cy + Math.sin(a) * d;
      ctx.save();
      ctx.translate(x2, y2);
      ctx.rotate(Math.random() * Math.PI);
      const g = ctx.createLinearGradient(-12, 0, 12, 0);
      g.addColorStop(0, "#BF360C");
      g.addColorStop(0.5, "#FF5722");
      g.addColorStop(1, "#BF360C");
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "rgba(60,10,0,.6)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  },
};
