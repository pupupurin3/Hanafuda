import cards from '../data/cards';
import { calculateYaku, describeCard } from './yaku';

export const PLAYER_HUMAN = 'human';
export const PLAYER_CPU = 'cpu';

const PLAYER_LABEL = {
  [PLAYER_HUMAN]: 'あなた',
  [PLAYER_CPU]: 'つばめAI',
};

const LOG_LIMIT = 80;
const ACTION_FEED_LIMIT = 12;

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function cloneDeck() {
  return cards.map((card) => ({ ...card }));
}

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createLog(message) {
  return {
    id: createId('log'),
    message,
    timestamp: new Date().toISOString(),
  };
}

function addLog(logs, message) {
  const nextLogs = [...logs, createLog(message)];
  if (nextLogs.length > LOG_LIMIT) {
    return nextLogs.slice(nextLogs.length - LOG_LIMIT);
  }
  return nextLogs;
}

function createFeedEntry(type, payload = {}) {
  return {
    id: createId('feed'),
    type,
    timestamp: new Date().toISOString(),
    ...payload,
  };
}

function addActionFeed(feed, entry) {
  const nextFeed = [...feed, entry];
  if (nextFeed.length > ACTION_FEED_LIMIT) {
    return nextFeed.slice(nextFeed.length - ACTION_FEED_LIMIT);
  }
  return nextFeed;
}

function dealInitial(stateScores, roundNumber) {
  let deck = [];
  let field = [];
  let hasFourOfAKind = true;

  while (hasFourOfAKind) {
    deck = shuffle(cloneDeck());
    field = deck.slice(0, 8);
    hasFourOfAKind = field.some((card, _, arr) => arr.filter((c) => c.month === card.month).length === 4);
  }

  const humanHand = deck.slice(8, 16);
  const cpuHand = deck.slice(16, 24);
  const remainingDeck = deck.slice(24);

  return {
    deck: remainingDeck,
    field,
    hands: {
      [PLAYER_HUMAN]: humanHand,
      [PLAYER_CPU]: cpuHand,
    },
    captures: {
      [PLAYER_HUMAN]: [],
      [PLAYER_CPU]: [],
    },
    scores: stateScores || {
      [PLAYER_HUMAN]: 0,
      [PLAYER_CPU]: 0,
    },
    turn: PLAYER_HUMAN,
    phase: 'hand',
    pendingSelection: null,
    roundOver: false,
    roundResult: null,
    roundNumber,
    logs: [createLog(`第${roundNumber}局開始！`)],
    actionFeed: [
      createFeedEntry('round-start', {
        roundNumber,
      }),
    ],
  };
}

function removeCardFromField(field, removeIds) {
  const removeSet = new Set(removeIds);
  return field.filter((card) => !removeSet.has(card.id));
}

function playCard(state, playerId, cardId, chosenFieldId) {
  const hand = state.hands[playerId];
  const cardIndex = hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    return { state, pending: null };
  }

  const card = hand[cardIndex];
  const matches = state.field.filter((c) => c.month === card.month);
  const nextHands = {
    ...state.hands,
    [playerId]: hand.filter((c) => c.id !== cardId),
  };

  if (matches.length === 0) {
    const nextState = {
      ...state,
      hands: nextHands,
      field: [...state.field, card],
      logs: addLog(state.logs, `${PLAYER_LABEL[playerId]}は${describeCard(card)}を場に出しました。`),
      phase: 'draw',
      actionFeed: addActionFeed(
        state.actionFeed,
        createFeedEntry('play-to-field', {
          playerId,
          card,
        }),
      ),
    };
    return { state: nextState, pending: null };
  }

  if (matches.length === 3) {
    const capturedFieldCards = [...matches];
    const nextState = {
      ...state,
      hands: nextHands,
      field: removeCardFromField(state.field, capturedFieldCards.map((fieldCard) => fieldCard.id)),
      captures: {
        ...state.captures,
        [playerId]: [...state.captures[playerId], card, ...capturedFieldCards],
      },
      logs: addLog(
        state.logs,
        `${PLAYER_LABEL[playerId]}は${describeCard(card)}で場の同月札三枚をまとめて取りました。`,
      ),
      phase: 'draw',
      actionFeed: addActionFeed(
        state.actionFeed,
        createFeedEntry('capture-triple', {
          playerId,
          handCard: card,
          captured: capturedFieldCards,
        }),
      ),
    };
    return { state: nextState, pending: null };
  }

  if (matches.length === 1) {
    const fieldCard = matches[0];
    const nextState = {
      ...state,
      hands: nextHands,
      field: removeCardFromField(state.field, [fieldCard.id]),
      captures: {
        ...state.captures,
        [playerId]: [...state.captures[playerId], card, fieldCard],
      },
      logs: addLog(state.logs, `${PLAYER_LABEL[playerId]}は${describeCard(card)}で${describeCard(fieldCard)}を取りました。`),
      phase: 'draw',
      actionFeed: addActionFeed(
        state.actionFeed,
        createFeedEntry('capture', {
          playerId,
          handCard: card,
          captured: [fieldCard],
        }),
      ),
    };
    return { state: nextState, pending: null };
  }

  if (!chosenFieldId) {
    const pending = {
      playerId,
      card,
      options: matches,
    };
    const selectionMessage =
      playerId === PLAYER_HUMAN
        ? `${PLAYER_LABEL[playerId]}は${describeCard(card)}を出しました。取り札を選んでください。`
        : `${PLAYER_LABEL[playerId]}は${describeCard(card)}を出しました。取り札を選択しています。`;
    const nextState = {
      ...state,
      hands: nextHands,
      pendingSelection: pending,
      logs: addLog(state.logs, selectionMessage),
      phase: 'select-field',
      actionFeed: addActionFeed(
        state.actionFeed,
        createFeedEntry('select-field', {
          playerId,
          handCard: card,
          options: matches,
        }),
      ),
    };
    return { state: nextState, pending };
  }

  const fieldCard = matches.find((c) => c.id === chosenFieldId) || matches[0];
  const nextState = {
    ...state,
    hands: nextHands,
    field: removeCardFromField(state.field, [fieldCard.id]),
    captures: {
      ...state.captures,
      [playerId]: [...state.captures[playerId], card, fieldCard],
    },
    logs: addLog(state.logs, `${PLAYER_LABEL[playerId]}は${describeCard(card)}で${describeCard(fieldCard)}を取りました。`),
    phase: 'draw',
    pendingSelection: null,
    actionFeed: addActionFeed(
      state.actionFeed,
      createFeedEntry('capture', {
        playerId,
        handCard: card,
        captured: [fieldCard],
      }),
    ),
  };

  return { state: nextState, pending: null };
}

function captureFromDraw(state, playerId, drawnCard, matches) {
  if (matches.length === 0) {
    return {
      ...state,
      field: [...state.field, drawnCard],
      logs: addLog(state.logs, `${PLAYER_LABEL[playerId]}は山札から${describeCard(drawnCard)}をめくり、場に置きました。`),
      actionFeed: addActionFeed(
        state.actionFeed,
        createFeedEntry('draw-to-field', {
          playerId,
          drawnCard,
        }),
      ),
    };
  }

  const capturedFieldCards = matches.length === 1 ? [matches[0]] : matches;
  const nextField = removeCardFromField(state.field, capturedFieldCards.map((card) => card.id));
  const capturedCards = [...capturedFieldCards, drawnCard];
  const nextCaptures = {
    ...state.captures,
    [playerId]: [...state.captures[playerId], ...capturedCards],
  };

  const actionWord = capturedCards.length === 2 ? '合わせ取りしました' : 'まとめて取りました';

  return {
    ...state,
    field: nextField,
    captures: nextCaptures,
    logs: addLog(state.logs, `${PLAYER_LABEL[playerId]}は山札から${describeCard(drawnCard)}をめくり、${actionWord}。`),
    actionFeed: addActionFeed(
      state.actionFeed,
      createFeedEntry('capture-draw', {
        playerId,
        drawnCard,
        captured: capturedFieldCards,
      }),
    ),
  };
}

function finalizeTurn(state, playerId) {
  const { total, list } = calculateYaku(state.captures[playerId]);
  if (total > 0) {
    const nextScores = {
      ...state.scores,
      [playerId]: state.scores[playerId] + total,
    };
    const yakuNames = list.map((item) => item.name).join('、');
    return {
      ...state,
      scores: nextScores,
      logs: addLog(state.logs, `${PLAYER_LABEL[playerId]}が${yakuNames}で${total}点を獲得し、あがりました。`),
      roundOver: true,
      roundResult: {
        winner: playerId,
        reason: 'yaku',
        points: total,
        yaku: list,
      },
      turn: playerId,
      phase: 'hand',
      pendingSelection: null,
      actionFeed: addActionFeed(
        state.actionFeed,
        createFeedEntry('round-result', {
          playerId,
          points: total,
          yaku: list,
        }),
      ),
    };
  }

  const bothHandsEmpty =
    state.hands[PLAYER_HUMAN].length === 0 && state.hands[PLAYER_CPU].length === 0;

  if (state.deck.length === 0 && bothHandsEmpty) {
    return {
      ...state,
      logs: addLog(state.logs, '山札が尽きたため流局です。'),
      roundOver: true,
      roundResult: {
        winner: null,
        reason: 'draw',
        points: 0,
        yaku: [],
      },
      turn: playerId,
      phase: 'hand',
      pendingSelection: null,
      actionFeed: addActionFeed(
        state.actionFeed,
        createFeedEntry('round-draw', {}),
      ),
    };
  }

  const nextPlayer = playerId === PLAYER_HUMAN ? PLAYER_CPU : PLAYER_HUMAN;

  return {
    ...state,
    turn: nextPlayer,
    logs: addLog(state.logs, `${PLAYER_LABEL[playerId]}の手番が終了しました。`),
    phase: 'hand',
    pendingSelection: null,
    actionFeed: addActionFeed(
      state.actionFeed,
      createFeedEntry('turn-end', {
        playerId,
      }),
    ),
  };
}

function resolveDraw(state, playerId) {
  if (state.roundOver) {
    return state;
  }

  if (state.deck.length === 0) {
    return finalizeTurn(state, playerId);
  }

  const [drawnCard, ...restDeck] = state.deck;
  const nextState = {
    ...state,
    deck: restDeck,
  };

  const matches = nextState.field.filter((card) => card.month === drawnCard.month);
  const afterDraw = captureFromDraw(nextState, playerId, drawnCard, matches);

  return finalizeTurn(afterDraw, playerId);
}

function handlePlayerPlay(state, cardId) {
  if (state.turn !== PLAYER_HUMAN || state.roundOver || state.pendingSelection) {
    return state;
  }

  const result = playCard(state, PLAYER_HUMAN, cardId);
  if (result.pending) {
    return {
      ...result.state,
      pendingSelection: result.pending,
    };
  }

  return resolveDraw(result.state, PLAYER_HUMAN);
}

function handlePlayerFieldSelection(state, fieldCardId) {
  const pending = state.pendingSelection;
  if (!pending || pending.playerId !== PLAYER_HUMAN || state.roundOver) {
    return state;
  }

  const matches = pending.options;
  const chosen = matches.find((card) => card.id === fieldCardId) || matches[0];

  const nextCaptures = {
    ...state.captures,
    [PLAYER_HUMAN]: [...state.captures[PLAYER_HUMAN], pending.card, chosen],
  };

  const nextField = removeCardFromField(state.field, [chosen.id]);
  const nextState = {
    ...state,
    captures: nextCaptures,
    field: nextField,
    pendingSelection: null,
    logs: addLog(state.logs, `${PLAYER_LABEL[PLAYER_HUMAN]}は${describeCard(pending.card)}で${describeCard(chosen)}を取りました。`),
    phase: 'draw',
    actionFeed: addActionFeed(
      state.actionFeed,
      createFeedEntry('capture', {
        playerId: PLAYER_HUMAN,
        handCard: pending.card,
        captured: [chosen],
      }),
    ),
  };

  return resolveDraw(nextState, PLAYER_HUMAN);
}

function pickBestFieldMatch(matches) {
  const priority = {
    bright: 4,
    animal: 3,
    ribbon: 2,
    chaff: 1,
  };
  return [...matches].sort((a, b) => priority[b.type] - priority[a.type])[0];
}

function chooseCpuCard(state) {
  const hand = state.hands[PLAYER_CPU];
  const options = hand.map((card) => {
    const matches = state.field.filter((fieldCard) => fieldCard.month === card.month);
    return { card, matches };
  });

  const capturing = options.filter((option) => option.matches.length > 0);
  if (capturing.length > 0) {
    const best = capturing
      .map((option) => {
        const priority = { bright: 4, animal: 3, ribbon: 2, chaff: 1 };
        const score = option.matches.reduce((sum, fieldCard) => sum + priority[fieldCard.type], 0) + priority[option.card.type];
        return { ...option, score };
      })
      .sort((a, b) => b.score - a.score)[0];
    const fieldChoice = pickBestFieldMatch(best.matches);
    return { cardId: best.card.id, fieldCardId: fieldChoice ? fieldChoice.id : null };
  }

  const fallback = [...options].sort((a, b) => b.card.month - a.card.month)[0];
  return { cardId: fallback.card.id, fieldCardId: null };
}

function handleCpuFieldSelection(state, fieldCardId) {
  const pending = state.pendingSelection;
  if (!pending || pending.playerId !== PLAYER_CPU) {
    return state;
  }

  const matches = pending.options;
  const chosen = matches.find((card) => card.id === fieldCardId) || matches[0];

  const nextCaptures = {
    ...state.captures,
    [PLAYER_CPU]: [...state.captures[PLAYER_CPU], pending.card, chosen],
  };

  const nextField = removeCardFromField(state.field, [chosen.id]);
  const nextState = {
    ...state,
    captures: nextCaptures,
    field: nextField,
    pendingSelection: null,
    logs: addLog(state.logs, `${PLAYER_LABEL[PLAYER_CPU]}は${describeCard(pending.card)}で${describeCard(chosen)}を取りました。`),
    phase: 'draw',
    actionFeed: addActionFeed(
      state.actionFeed,
      createFeedEntry('capture', {
        playerId: PLAYER_CPU,
        handCard: pending.card,
        captured: [chosen],
      }),
    ),
  };

  return resolveDraw(nextState, PLAYER_CPU);
}

function handleCpuTurn(state) {
  if (state.turn !== PLAYER_CPU || state.roundOver || state.pendingSelection) {
    return state;
  }

  const choice = chooseCpuCard(state);
  const card = state.hands[PLAYER_CPU].find((c) => c.id === choice.cardId);
  const availableMatches = card
    ? state.field.filter((fieldCard) => fieldCard.month === card.month)
    : [];
  const shouldPauseSelection = Boolean(choice.fieldCardId && availableMatches.length > 1);

  const result = playCard(
    state,
    PLAYER_CPU,
    choice.cardId,
    shouldPauseSelection ? null : choice.fieldCardId,
  );

  if (shouldPauseSelection && result.pending) {
    return {
      ...result.state,
      pendingSelection: {
        ...result.pending,
        selectedFieldId: choice.fieldCardId,
      },
    };
  }

  return resolveDraw(result.state, PLAYER_CPU);
}

function startNextRound(state, keepScores = true) {
  const nextScores = keepScores
    ? state.scores
    : {
        [PLAYER_HUMAN]: 0,
        [PLAYER_CPU]: 0,
      };
  const nextRoundNumber = state.roundNumber + 1;
  const resetState = dealInitial({ ...nextScores }, nextRoundNumber);
  return {
    ...resetState,
    logs: addLog(resetState.logs, '新しい局を配りました。'),
  };
}

export function resetGame() {
  return dealInitial(
    {
      [PLAYER_HUMAN]: 0,
      [PLAYER_CPU]: 0,
    },
    1,
  );
}

export function createInitialState() {
  return resetGame();
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'PLAYER_PLAY_CARD':
      return handlePlayerPlay(state, action.cardId);
    case 'PLAYER_SELECT_FIELD':
      return handlePlayerFieldSelection(state, action.fieldCardId);
    case 'CPU_TURN':
      return handleCpuTurn(state);
    case 'CPU_SELECT_FIELD':
      return handleCpuFieldSelection(state, action.fieldCardId);
    case 'START_NEXT_ROUND':
      return startNextRound(state, action.keepScores !== false);
    case 'RESET_GAME':
      return resetGame();
    default:
      return state;
  }
}
