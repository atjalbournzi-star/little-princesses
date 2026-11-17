// src/features/measurement/utils/demoDressGenerator.js
// Generates a photorealistic demo dress & perspective A4 sheet for testing

function createRealisticDemoSceneCanvas() {
  const demoCanvas = document.createElement('canvas');
  demoCanvas.width = 1100;
  demoCanvas.height = 850;
  const dCtx = demoCanvas.getContext('2d');

  // 1. Realistic Floor Background
  const floorGrad = dCtx.createLinearGradient(0, 0, 1100, 850);
  floorGrad.addColorStop(0, '#2a2421');
  floorGrad.addColorStop(0.5, '#362f2b');
  floorGrad.addColorStop(1, '#231e1b');
  dCtx.fillStyle = floorGrad;
  dCtx.fillRect(0, 0, 1100, 850);

  dCtx.strokeStyle = 'rgba(0,0,0,0.22)';
  dCtx.lineWidth = 2;
  for (let y = 40; y < 850; y += 85) {
    dCtx.beginPath();
    dCtx.moveTo(0, y - 15);
    dCtx.lineTo(1100, y + 20);
    dCtx.stroke();
  }

  // 2. Perspective A4 Sheet Corners
  const trueA4Corners = [
    { x: 135, y: 225 },
    { x: 312, y: 238 },
    { x: 294, y: 505 },
    { x: 104, y: 488 }
  ];

  // Paper Shadow & Surface
  dCtx.save();
  dCtx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  dCtx.beginPath();
  dCtx.moveTo(trueA4Corners[0].x + 6, trueA4Corners[0].y + 8);
  dCtx.lineTo(trueA4Corners[1].x + 6, trueA4Corners[1].y + 8);
  dCtx.lineTo(trueA4Corners[2].x + 6, trueA4Corners[2].y + 8);
  dCtx.lineTo(trueA4Corners[3].x + 6, trueA4Corners[3].y + 8);
  dCtx.closePath();
  dCtx.fill();

  const paperGrad = dCtx.createLinearGradient(110, 220, 310, 500);
  paperGrad.addColorStop(0, '#f8fafc');
  paperGrad.addColorStop(1, '#e2e8f0');
  dCtx.fillStyle = paperGrad;
  dCtx.beginPath();
  dCtx.moveTo(trueA4Corners[0].x, trueA4Corners[0].y);
  dCtx.lineTo(trueA4Corners[1].x, trueA4Corners[1].y);
  dCtx.lineTo(trueA4Corners[2].x, trueA4Corners[2].y);
  dCtx.lineTo(trueA4Corners[3].x, trueA4Corners[3].y);
  dCtx.closePath();
  dCtx.fill();

  dCtx.fillStyle = '#475569';
  dCtx.font = 'bold 13px Cairo, sans-serif';
  dCtx.fillText('ورقة معايرة قياسية A4', 150, 340);
  dCtx.font = '11px monospace';
  dCtx.fillText('21.0 cm x 29.7 cm', 155, 362);
  dCtx.restore();

  // 3. Detailed Girl's Dress Laid Flat
  dCtx.save();
  dCtx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  dCtx.shadowBlur = 18;
  dCtx.shadowOffsetX = 4;
  dCtx.shadowOffsetY = 8;

  const dressGrad = dCtx.createLinearGradient(450, 130, 820, 740);
  dressGrad.addColorStop(0, '#be185d');
  dressGrad.addColorStop(0.45, '#9d174d');
  dressGrad.addColorStop(1, '#831843');
  dCtx.fillStyle = dressGrad;

  dCtx.beginPath();
  dCtx.moveTo(565, 145);
  dCtx.quadraticCurveTo(625, 185, 685, 145);
  dCtx.lineTo(735, 150);
  dCtx.lineTo(865, 295);
  dCtx.lineTo(825, 330);
  dCtx.lineTo(755, 245);
  dCtx.lineTo(740, 360);
  dCtx.quadraticCurveTo(815, 520, 875, 725);
  dCtx.quadraticCurveTo(625, 755, 385, 715);
  dCtx.quadraticCurveTo(440, 520, 510, 360);
  dCtx.lineTo(495, 245);
  dCtx.lineTo(430, 325);
  dCtx.lineTo(390, 285);
  dCtx.lineTo(515, 150);
  dCtx.closePath();
  dCtx.fill();

  dCtx.shadowColor = 'transparent';
  dCtx.fillStyle = 'rgba(251, 207, 232, 0.28)';
  dCtx.fillRect(510, 352, 230, 16);
  dCtx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  dCtx.strokeRect(510, 352, 230, 16);

  dCtx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
  dCtx.lineWidth = 3;
  const pleats = [
    [545, 368, 465, 722], [585, 368, 545, 732],
    [625, 368, 625, 738], [665, 368, 705, 734], [705, 368, 785, 725]
  ];
  pleats.forEach(([x1, y1, x2, y2]) => {
    dCtx.beginPath();
    dCtx.moveTo(x1, y1);
    dCtx.lineTo(x2, y2);
    dCtx.stroke();
  });
  dCtx.restore();

  return {
    canvas: demoCanvas,
    a4Corners: trueA4Corners
  };
}

window.DemoDressGenerator = { createRealisticDemoSceneCanvas };
