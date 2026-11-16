'use strict';

const trainingProgression = (() => {
  const metrics = {
    selectionScore: { label: 'Selection score', unit: 'points' },
    averageVictoryTurn: { label: 'Average victory turn', unit: 'turns' },
    averageWinnerMargin: { label: 'Average winner margin', unit: 'VP' },
    openSkill: { label: 'OpenSkill ordinal', unit: 'rating points' },
  };
  const decimal = value => Number.isFinite(value) ? value.toFixed(2) : '—';
  const signed = new Intl.NumberFormat(undefined, { signDisplay: 'exceptZero', maximumFractionDigits: 2 });

  function compare(history, key) {
    const first = history[0]?.[key];
    const last = history.at(-1)?.[key];
    if (!Number.isFinite(first) || !Number.isFinite(last) || history.length < 2) return '—';
    return `${signed.format(last - first)} ${metrics[key].unit}`;
  }

  function chart(canvas) {
    const ctx = canvas.getContext('2d');
    let history = [];
    let metric = 'selectionScore';
    let selected;
    function draw() {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      ctx.scale(pixelRatio, pixelRatio);
      const points = history.filter(point => Number.isFinite(point[metric]));
      if (!points.length) return;
      const extent = points.reduce(([min, max], point) => [Math.min(min, point[metric]), Math.max(max, point[metric])], [Infinity, -Infinity]);
      const padding = extent[0] === extent[1] ? 1 : (extent[1] - extent[0]) * 0.1;
      const min = extent[0] - padding;
      const max = extent[1] + padding;
      const left = 54, right = width - 16, top = 14, bottom = height - 28;
      const first = points[0].generation;
      const last = points.at(-1).generation;
      const x = generation => left + (right - left) * (first === last ? 0.5 : (generation - first) / (last - first));
      const y = value => top + (bottom - top) * (max - value) / (max - min);
      ctx.font = '11px "Segoe UI", system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      for (let tick = 0; tick <= 3; tick++) {
        const value = max - (max - min) * tick / 3;
        const line = y(value);
        ctx.strokeStyle = '#2a3540';
        ctx.beginPath();
        ctx.moveTo(left, line);
        ctx.lineTo(right, line);
        ctx.stroke();
        ctx.textAlign = 'right';
        ctx.fillStyle = '#a4b6c0';
        ctx.fillText(decimal(value), left - 8, line);
      }
      ctx.textAlign = 'left';
      const xLabel = metric === 'openSkill' ? 'Run' : 'Gen';
      ctx.fillText(`${xLabel} ${first}`, left, height - 11);
      if (last !== first) {
        ctx.textAlign = 'right';
        ctx.fillText(`${xLabel} ${last}`, right, height - 11);
      }
      ctx.beginPath();
      points.forEach((point, index) => {
        const position = [x(point.generation), y(point[metric])];
        if (index) ctx.lineTo(...position);
        else ctx.moveTo(...position);
      });
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#61d8bb';
      ctx.stroke();
      const point = points.find(entry => entry.generation === selected) || points.at(-1);
      ctx.beginPath();
      ctx.arc(x(point.generation), y(point[metric]), 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#61d8bb';
      ctx.fill();
    }
    new ResizeObserver(draw).observe(canvas);
    return (data, key = 'selectionScore', generation) => {
      history = data;
      metric = key;
      selected = generation;
      draw();
    };
  }
  return { chart, compare, decimal, metrics };
})();
