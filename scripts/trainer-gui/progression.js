'use strict';

const trainingProgression = (() => {
  const metrics = {
    selectionScore: { label: 'Selection score', unit: 'points' },
    averageVictoryTurn: { label: 'Average victory turn', unit: 'turns' },
    averageWinnerMargin: { label: 'Average winner margin', unit: 'VP' },
    openSkill: { label: 'OpenSkill ordinal', unit: 'rating points' },
    winRate: { label: 'Benchmark win rate', unit: '%' },
    winsAboveEven: { label: 'Win rate above equal-policy odds', unit: 'pp' },
    trainingGames: { label: 'Training games', unit: 'games' },
    continuedGames: { label: 'Games carried forward', unit: 'games' },
    anchorLift: { label: 'Win-rate lift in champion practice', unit: 'pp' },
    trainingDecisions: { label: 'Decision samples', unit: 'samples' },
    meanPlace: { label: 'Mean finishing place', unit: 'place' },
    meanVp: { label: 'Mean victory points', unit: 'VP' },
    vpPerProducedCard: { label: 'Victory points per produced card', unit: 'VP/card' },
    settlements: { label: 'Settlements built', unit: 'settlements' },
    development: { label: 'Development cards bought', unit: 'cards' },
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
    let options = {};
    function draw() {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      ctx.scale(pixelRatio, pixelRatio);
      const points = history.filter(point => Number.isFinite(point[metric]));
      if (!points.length) return;
      const reference = options.reference;
      const extent = points.reduce(([min, max], point) => [
        Math.min(min, point.low ?? point[metric]), Math.max(max, point.high ?? point[metric]),
      ], Number.isFinite(reference) ? [reference, reference] : [Infinity, -Infinity]);
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
      const xLabel = options.xLabel || (metric === 'openSkill' ? 'Run' : 'Gen');
      ctx.fillText(`${xLabel} ${first}`, left, height - 11);
      if (last !== first) {
        ctx.textAlign = 'right';
        ctx.fillText(`${xLabel} ${last}`, right, height - 11);
      }
      if (Number.isFinite(reference)) {
        ctx.strokeStyle = '#89959f';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(left, y(reference));
        ctx.lineTo(right, y(reference));
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.strokeStyle = '#49796f';
      ctx.beginPath();
      for (const point of points) {
        if (!Number.isFinite(point.low) || !Number.isFinite(point.high)) continue;
        const column = x(point.generation);
        ctx.moveTo(column, y(point.low));
        ctx.lineTo(column, y(point.high));
      }
      ctx.stroke();
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
      for (const row of points) ctx.rect(x(row.generation) - 1.5, y(row[metric]) - 1.5, 3, 3);
      ctx.arc(x(point.generation), y(point[metric]), 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#61d8bb';
      ctx.fill();
    }
    new ResizeObserver(draw).observe(canvas);
    return (data, key = 'selectionScore', generation, chartOptions = {}) => {
      history = data;
      metric = key;
      selected = generation;
      options = chartOptions;
      draw();
    };
  }
  return { chart, compare, decimal, metrics };
})();
