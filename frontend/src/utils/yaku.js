import { MONTH_NAMES } from '../data/cards';

const BOAR_MONTH = 7;
const DEER_MONTH = 10;
const BUTTERFLY_MONTH = 6;
const CHERRY_BRIGHT_ID = '3-1';
const MOON_BRIGHT_ID = '8-1';
const SAKE_ID = '9-1';
const RAIN_BRIGHT_ID = '11-1';

function aggregateCaptured(cards) {
  const summary = {
    bright: 0,
    brightWithoutRain: 0,
    hasRain: false,
    hasCherryBright: false,
    hasMoonBright: false,
    hasSake: false,
    animals: 0,
    animalMonths: new Set(),
    ribbons: 0,
    redRibbons: 0,
    blueRibbons: 0,
    plainRibbons: 0,
    chaff: 0,
  };

  cards.forEach((card) => {
    if (card.type === 'bright') {
      summary.bright += 1;
      if (card.id === RAIN_BRIGHT_ID) {
        summary.hasRain = true;
      } else {
        summary.brightWithoutRain += 1;
      }
      if (card.id === CHERRY_BRIGHT_ID) {
        summary.hasCherryBright = true;
      }
      if (card.id === MOON_BRIGHT_ID) {
        summary.hasMoonBright = true;
      }
    }

    if (card.type === 'animal') {
      summary.animals += 1;
      summary.animalMonths.add(card.month);
      if (card.id === SAKE_ID) {
        summary.hasSake = true;
      }
    }

    if (card.type === 'ribbon') {
      summary.ribbons += 1;
      const color = card.ribbonColor || 'plain';
      if (color === 'red') {
        summary.redRibbons += 1;
      } else if (color === 'blue') {
        summary.blueRibbons += 1;
      } else {
        summary.plainRibbons += 1;
      }
    }

    if (card.type === 'chaff') {
      summary.chaff += 1;
    }
  });

  return summary;
}

export function calculateYaku(capturedCards) {
  const summary = aggregateCaptured(capturedCards);
  const yaku = [];

  if (summary.bright === 5) {
    yaku.push({ name: '五光', points: 15 });
  } else if (summary.bright === 4) {
    if (summary.hasRain) {
      yaku.push({ name: '雨四光', points: 7 });
    } else {
      yaku.push({ name: '四光', points: 8 });
    }
  } else if (summary.brightWithoutRain >= 3) {
    yaku.push({ name: '三光', points: 5 });
  }

  if (
    summary.animalMonths.has(BOAR_MONTH) &&
    summary.animalMonths.has(DEER_MONTH) &&
    summary.animalMonths.has(BUTTERFLY_MONTH)
  ) {
    yaku.push({ name: '猪鹿蝶', points: 5 });
  }

  if (summary.hasCherryBright && summary.hasSake) {
    yaku.push({ name: '花見で一杯', points: 5 });
  }

  if (summary.hasMoonBright && summary.hasSake) {
    yaku.push({ name: '月見で一杯', points: 5 });
  }

  if (summary.redRibbons === 3) {
    yaku.push({ name: '赤短', points: 5 });
  }

  if (summary.blueRibbons === 3) {
    yaku.push({ name: '青短', points: 5 });
  }

  if (summary.animals >= 5) {
    yaku.push({ name: `たね ${summary.animals}枚`, points: summary.animals - 4 });
  }

  if (summary.ribbons >= 5) {
    yaku.push({ name: `たん ${summary.ribbons}枚`, points: summary.ribbons - 4 });
  }

  if (summary.chaff >= 10) {
    yaku.push({ name: `かす ${summary.chaff}枚`, points: summary.chaff - 9 });
  }

  const total = yaku.reduce((sum, item) => sum + item.points, 0);

  return { total, list: yaku };
}

export function describeCard(card) {
  if (!card) {
    return '';
  }
  const monthLabel = MONTH_NAMES[card.month];
  const tag =
    card.type === 'bright'
      ? '光'
      : card.type === 'animal'
      ? '種'
      : card.type === 'ribbon'
      ? '短'
      : 'カス';
  return `${monthLabel}「${card.name}」(${tag})`;
}
