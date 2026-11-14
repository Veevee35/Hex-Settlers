'use strict';

const PRIORITIES = Object.freeze([
  { key: 'victory', label: 'Victory points', detail: 'Direct points and closing out a win' },
  { key: 'production', label: 'Resource production', detail: 'Expected income from buildings' },
  { key: 'economy', label: 'Hand economy', detail: 'Resource reserves and build readiness' },
  { key: 'settlements', label: 'Settlements', detail: 'Building settlements and opening new sites' },
  { key: 'cities', label: 'Cities', detail: 'Upgrading settlements to cities' },
  { key: 'development', label: 'Development cards', detail: 'Card purchases and Largest Army progress' },
  { key: 'exploration', label: 'Exploration', detail: 'Revealing fog with roads and ships' },
  { key: 'routes', label: 'Longest route', detail: 'Extending the longest road or shipping route' },
  { key: 'denial', label: 'Opponent denial', detail: 'Pressure on leaders and opposing production' },
  { key: 'network', label: 'Learned evaluation', detail: 'Influence of the neural network’s prediction' },
]);
const DEFAULT_PRIORITIES = Object.freeze(Object.fromEntries(PRIORITIES.map(({ key }) => [key, 100])));

function normalizePriorities(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid AI priorities');
  return Object.fromEntries(PRIORITIES.map(({ key, label }) => {
    const percent = value[key] ?? DEFAULT_PRIORITIES[key];
    if (!Number.isInteger(percent) || percent < 0 || percent > 200) {
      throw new Error(`${label} priority must be an integer from 0% to 200%`);
    }
    return [key, percent];
  }));
}

function normalizeCandidatePriorities(value = [], count) {
  if (!Array.isArray(value) || value.length > count) throw new Error('Invalid candidate priority profiles');
  return Array.from({ length: count }, (_, index) => normalizePriorities(value[index]));
}

function priorityMultipliers(value) {
  return Object.fromEntries(Object.entries(normalizePriorities(value)).map(([key, percent]) => [key, percent / 100]));
}

module.exports = { PRIORITIES, normalizeCandidatePriorities, priorityMultipliers };
