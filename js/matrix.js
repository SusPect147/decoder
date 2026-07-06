(function () {
  const canvas = document.getElementById('matrix-canvas');
  const ctx    = canvas.getContext('2d');

  let W = 0, H = 0;
  let animId = null;
  let scrollX = 0;
  let scrollZ = 0;

  const CONFIG = {
    gridSpacingX: 75,
    gridSpacingZ: 60,
    speedX:       -0.25, 
    speedZ:       -0.5,  
    focalLength:  220,
  };

  function getAccentColor() {
    return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#10b981';
  }

  function getAccentColorWithAlpha(alpha) {
    const color = getAccentColor();
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (color.startsWith('rgb')) {
      return color.replace(/rgb(a)?/, 'rgba').replace(/\)$/, `, ${alpha})`).replace(/,\s*\d+(\.\d+)?\)$/, `, ${alpha})`);
    }
    return color;
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function init() {
    resize();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    const Vx = W * 0.30; 
    const Vy = -200;     
    const F = CONFIG.focalLength;
    
    
    const yFloor = H - Vy + 100; 
    const zMax = Math.ceil(F * (yFloor / -Vy)) + 100;

    
    ctx.strokeStyle = getAccentColorWithAlpha(0.12);
    ctx.lineWidth = 1.0;

    
    const scaleMax = F / (F + zMax);
    const xMin3D = -Vx / scaleMax - Math.abs(scrollX) - CONFIG.gridSpacingX * 2;
    const xMax3D = (W - Vx) / scaleMax + Math.abs(scrollX) + CONFIG.gridSpacingX * 2;

    
    let xStart = Math.floor(xMin3D / CONFIG.gridSpacingX) * CONFIG.gridSpacingX;
    xStart += (scrollX % CONFIG.gridSpacingX);
    if (xStart > xMin3D) xStart -= CONFIG.gridSpacingX;

    for (let x = xStart; x < xMax3D; x += CONFIG.gridSpacingX) {
      const zMin = 0;

      const scaleMin = F / (F + zMin);
      const scaleMaxVal = F / (F + zMax);

      const sxMin = Vx + x * scaleMin;
      const syMin = Vy + yFloor * scaleMin;

      const sxMax = Vx + x * scaleMaxVal;
      const syMax = Vy + yFloor * scaleMaxVal;

      ctx.beginPath();
      ctx.moveTo(sxMin, syMin);
      ctx.lineTo(sxMax, syMax);
      ctx.stroke();
    }

    
    let zStart = (scrollZ % CONFIG.gridSpacingZ);
    if (zStart < 0) zStart += CONFIG.gridSpacingZ;
    for (let z = zStart; z < zMax; z += CONFIG.gridSpacingZ) {
      const scale = F / (F + z);
      const y = Vy + yFloor * scale;

      ctx.beginPath();
      ctx.moveTo(-50, y);
      ctx.lineTo(W + 50, y);
      ctx.stroke();
    }

    
    scrollX += CONFIG.speedX;
    scrollZ += CONFIG.speedZ;

    
    scrollX = scrollX % (CONFIG.gridSpacingX * 100);
    scrollZ = scrollZ % (CONFIG.gridSpacingZ * 100);

    animId = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);

  init();
  draw();
})();
