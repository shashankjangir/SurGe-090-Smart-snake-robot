'use strict';

function drawPlanarPath(ctx, {panX, panY, pixelsPerMeter, targetPath, actualPath, segments, robotPose, currentController}) {
  const {canvas} = ctx;
  const CANVAS_CX = canvas.width / 2;
  const CANVAS_CY = canvas.height / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Clean paper background fill
  ctx.fillStyle = '#fafbfc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Calculate grid size to guarantee at least 64 blocks visible
  const totalArea = (canvas.width / pixelsPerMeter) * (canvas.height / pixelsPerMeter);
  const gridStepMeters = Math.max(0.2, Math.sqrt(totalArea / 64.0));
  const gridStepPixels = gridStepMeters * pixelsPerMeter;

  // Draw light pastel grid lines
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  let startX = (panX + CANVAS_CX) % gridStepPixels;
  if (startX < 0) startX += gridStepPixels;
  for (let x = startX; x <= canvas.width; x += gridStepPixels) {
    ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
  }
  let startY = (panY + CANVAS_CY) % gridStepPixels;
  if (startY < 0) startY += gridStepPixels;
  for (let y = startY; y <= canvas.height; y += gridStepPixels) {
    ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
  }
  ctx.stroke();

  // Draw Axes in clean carbon outline with dashed styling
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(CANVAS_CX + panX, 0); ctx.lineTo(CANVAS_CX + panX, canvas.height);
  ctx.moveTo(0, CANVAS_CY + panY); ctx.lineTo(canvas.width, CANVAS_CY + panY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw Target Path (Electric Blue #4da2ff with solid 1px black backing for sticker sticker feel)
  if (targetPath.length > 1) {
    // Outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < targetPath.length; i++) {
      const px = CANVAS_CX + panX + (targetPath[i][0] * pixelsPerMeter);
      const py = CANVAS_CY + panY - (targetPath[i][1] * pixelsPerMeter);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Inner Electric Blue
    ctx.strokeStyle = '#4da2ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < targetPath.length; i++) {
      const px = CANVAS_CX + panX + (targetPath[i][0] * pixelsPerMeter);
      const py = CANVAS_CY + panY - (targetPath[i][1] * pixelsPerMeter);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Draw Actual Path (Ember #fb4903)
  if (actualPath.length > 1) {
    ctx.strokeStyle = '#fb4903';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < actualPath.length; i++) {
      const px = CANVAS_CX + panX + (actualPath[i][0] * pixelsPerMeter);
      const py = CANVAS_CY + panY - (actualPath[i][1] * pixelsPerMeter);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Draw Snake 10 Segments (if available from simulation or hardware)
  if (segments && segments.length > 1) {
    // Black outline backing
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < segments.length; i++) {
      const px = CANVAS_CX + panX + (segments[i][0] * pixelsPerMeter);
      const py = CANVAS_CY + panY - (segments[i][1] * pixelsPerMeter);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Inner inflatable tube in Electric Blue (#4da2ff)
    ctx.strokeStyle = '#4da2ff';
    ctx.lineWidth = 10;
    ctx.beginPath();
    for (let i = 0; i < segments.length; i++) {
      const px = CANVAS_CX + panX + (segments[i][0] * pixelsPerMeter);
      const py = CANVAS_CY + panY - (segments[i][1] * pixelsPerMeter);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Highlight head segment in Ember (#fb4903)
    const headX = CANVAS_CX + panX + (segments[0][0] * pixelsPerMeter);
    const headY = CANVAS_CY + panY - (segments[0][1] * pixelsPerMeter);
    ctx.fillStyle = '#fb4903';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(headX, headY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Draw Robot Position (Head Badge in Sunburst #ffd731 with 1px black outline)
  const rx = CANVAS_CX + panX + (robotPose.x * pixelsPerMeter);
  const ry = CANVAS_CY + panY - (robotPose.y * pixelsPerMeter);

  ctx.fillStyle = '#ffd731';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(rx, ry, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Draw Controller Arrow (Voltage Violet #5c4ade)
  if (currentController && currentController.active) {
    const cx = currentController.x;
    const cy = currentController.y;
    if (Math.abs(cx) > 0.15 || Math.abs(cy) > 0.15) {
      const stickAngle = Math.atan2(cy, cx) - (Math.PI / 2.0);
      const worldAngle = robotPose.yaw - stickAngle;
      const arrowLen = 42;
      const ax = rx + Math.cos(worldAngle) * arrowLen;
      const ay = ry - Math.sin(worldAngle) * arrowLen;

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(ax, ay);
      ctx.stroke();

      ctx.strokeStyle = '#5c4ade';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(ax, ay);
      ctx.stroke();

      ctx.fillStyle = '#5c4ade';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ax, ay, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}
