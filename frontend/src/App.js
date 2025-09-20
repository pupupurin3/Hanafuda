import { useEffect, useMemo, useReducer } from 'react';
import {
  createInitialState,
  gameReducer,
  PLAYER_CPU,
  PLAYER_HUMAN,
} from './utils/gameLogic';
import './index.css';

const typeLabels = {
  bright: '光',
  animal: '種',
  ribbon: '短',
  chaff: 'カス',
};

const typeOrder = {
  bright: 0,
  animal: 1,
  ribbon: 2,
  chaff: 3,
};

const cardStyles = {
  bright:
    'from-amber-200 via-rose-200 to-orange-300 text-slate-900 border-amber-400',
  animal:
    'from-emerald-200 via-emerald-300 to-teal-400 text-emerald-950 border-emerald-400',
  ribbon:
    'from-sky-200 via-indigo-200 to-purple-300 text-slate-900 border-sky-400',
  chaff:
    'from-slate-200 via-slate-300 to-slate-100 text-slate-900 border-slate-300',
};

function sortCards(cards) {
  return [...cards].sort((a, b) => {
    if (a.month !== b.month) {
      return a.month - b.month;
    }
    if (typeOrder[a.type] !== typeOrder[b.type]) {
      return typeOrder[a.type] - typeOrder[b.type];
    }
    return a.id.localeCompare(b.id);
  });
}

function summarizeCapture(cards) {
  return cards.reduce(
    (acc, card) => {
      acc[card.type] += 1;
      return acc;
    },
    { bright: 0, animal: 0, ribbon: 0, chaff: 0 },
  );
}

function HanafudaCard({ card, onClick, disabled, highlight = false, size = 'md' }) {
  const baseSize =
    size === 'sm'
      ? 'w-16 h-24 text-xs'
      : size === 'lg'
      ? 'w-28 h-44 text-base'
      : 'w-20 h-32 text-sm';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'relative inline-flex flex-col justify-between rounded-xl border-2 bg-gradient-to-br p-2 shadow transition-transform duration-150',
        cardStyles[card.type],
        baseSize,
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:-translate-y-1',
        highlight ? 'ring-4 ring-amber-300 ring-offset-2 ring-offset-slate-900' : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between text-[11px] font-semibold">
        <span>{card.month}月</span>
        <span>{card.suit}</span>
      </div>
      <div className="flex-1 py-1 text-left leading-tight">
        <p className="font-semibold">{card.name}</p>
      </div>
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase">
        <span>{typeLabels[card.type]}</span>
        {card.ribbonColor === 'red' && <span className="text-rose-600">赤短</span>}
        {card.ribbonColor === 'blue' && <span className="text-sky-600">青短</span>}
      </div>
    </button>
  );
}

function CardBack({ label = '札', size = 'md' }) {
  const baseSize =
    size === 'sm'
      ? 'w-16 h-24 text-xs'
      : size === 'lg'
      ? 'w-28 h-44 text-base'
      : 'w-20 h-32 text-sm';

  return (
    <div
      className={[
        'flex items-center justify-center rounded-xl border-2 border-slate-700 bg-slate-800 text-slate-200 shadow-inner',
        baseSize,
      ].join(' ')}
    >
      <span>{label}</span>
    </div>
  );
}

function CaptureStrip({ title, cards }) {
  const summary = useMemo(() => summarizeCapture(cards), [cards]);
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <header className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-300">
        <span>{title}</span>
        <span>
          光 {summary.bright} / 種 {summary.animal} / 短 {summary.ribbon} / カス {summary.chaff}
        </span>
      </header>
      <div className="flex flex-wrap gap-2">
        {cards.length === 0 ? (
          <span className="text-xs text-slate-500">まだ獲得していません</span>
        ) : (
          sortCards(cards).map((card) => (
            <HanafudaCard key={card.id} card={card} size="sm" disabled />
          ))
        )}
      </div>
    </section>
  );
}

function RoundResult({ result, scores, onNextRound, onReset }) {
  const title = result.winner
    ? `${result.winner === PLAYER_HUMAN ? 'あなた' : 'つばめAI'}の勝利！`
    : '流局';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-lg space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-amber-300">{title}</h2>
        {result.winner && (
          <div className="rounded-xl border border-amber-500/60 bg-amber-500/10 p-4">
            <p className="text-lg font-semibold">
              {result.yaku.map((item) => item.name).join('、')} → {result.points}点
            </p>
            <ul className="mt-2 space-y-1 text-sm text-amber-100">
              {result.yaku.map((item) => (
                <li key={item.name}>
                  {item.name}（{item.points}点）
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
            <p className="text-slate-400">あなた</p>
            <p className="text-xl font-bold text-slate-100">{scores[PLAYER_HUMAN]} 点</p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-3">
            <p className="text-slate-400">つばめAI</p>
            <p className="text-xl font-bold text-slate-100">{scores[PLAYER_CPU]} 点</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onNextRound(true)}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-400"
          >
            次の局へ進む
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
          >
            スコアをリセット
          </button>
        </div>
      </div>
    </div>
  );
}

function LogPanel({ logs }) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900/70">
      <header className="border-b border-slate-800 p-3 text-sm font-semibold text-slate-300">対局ログ</header>
      <div className="flex-1 space-y-2 overflow-y-auto p-3 text-xs leading-relaxed text-slate-200">
        {logs.length === 0 && <p className="text-slate-500">まだ動きはありません。</p>}
        {logs.map((entry) => (
          <div key={entry.id} className="rounded-lg bg-slate-800/60 p-2 shadow">
            <p>{entry.message}</p>
            <p className="mt-1 text-[10px] text-slate-500">{new Date(entry.timestamp).toLocaleTimeString()}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const {
    hands,
    field,
    captures,
    deck,
    scores,
    logs,
    turn,
    pendingSelection,
    roundOver,
    roundResult,
    roundNumber,
  } = state;

  const playerHand = useMemo(() => sortCards(hands[PLAYER_HUMAN]), [hands]);
  const cpuHand = hands[PLAYER_CPU];
  const fieldCards = useMemo(() => sortCards(field), [field]);
  const playerCaptures = captures[PLAYER_HUMAN];
  const cpuCaptures = captures[PLAYER_CPU];

  const pendingFieldIds = useMemo(() => {
    if (!pendingSelection) {
      return new Set();
    }
    return new Set(pendingSelection.options.map((card) => card.id));
  }, [pendingSelection]);

  useEffect(() => {
    if (turn === PLAYER_CPU && !roundOver && !pendingSelection) {
      const timer = setTimeout(() => {
        dispatch({ type: 'CPU_TURN' });
      }, 750);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [turn, roundOver, pendingSelection]);

  const handleHandClick = (card) => {
    if (turn !== PLAYER_HUMAN || roundOver) {
      return;
    }
    dispatch({ type: 'PLAYER_PLAY_CARD', cardId: card.id });
  };

  const handleFieldClick = (card) => {
    if (!pendingSelection || pendingSelection.playerId !== PLAYER_HUMAN) {
      return;
    }
    if (!pendingFieldIds.has(card.id)) {
      return;
    }
    dispatch({ type: 'PLAYER_SELECT_FIELD', fieldCardId: card.id });
  };

  const handleNextRound = (keepScores = true) => {
    dispatch({ type: 'START_NEXT_ROUND', keepScores });
  };

  const handleResetScores = () => {
    dispatch({ type: 'RESET_GAME' });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-amber-300">花札 対戦（簡易こいこい）</h1>
              <p className="text-sm text-slate-300">第{roundNumber}局・山札 {deck.length} 枚 / 手番：{turn === PLAYER_HUMAN ? 'あなた' : 'つばめAI'}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleNextRound(true)}
                className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
              >
                次の局を配る
              </button>
              <button
                type="button"
                onClick={handleResetScores}
                className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-400"
              >
                新しく始める
              </button>
            </div>
          </div>
          {pendingSelection && pendingSelection.playerId === PLAYER_HUMAN && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-400/20 p-3 text-sm text-amber-100">
              <p>{pendingSelection.card.name} の取り札を選択してください。</p>
            </div>
          )}
        </header>

        <main className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-200">つばめAI（手札 {cpuHand.length} 枚）</h2>
                <span className="text-sm text-slate-400">得点: {scores[PLAYER_CPU]} 点</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {cpuHand.map((_, idx) => (
                  <CardBack key={`cpu-card-${idx}`} label="裏" />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-200">場札</h2>
                <span className="text-sm text-slate-400">合計 {fieldCards.length} 枚</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {fieldCards.length === 0 && (
                  <span className="text-sm text-slate-500">場札はありません。</span>
                )}
                {fieldCards.map((card) => (
                  <HanafudaCard
                    key={card.id}
                    card={card}
                    onClick={() => handleFieldClick(card)}
                    disabled={!pendingFieldIds.has(card.id)}
                    highlight={pendingFieldIds.has(card.id)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-200">あなたの手札（{playerHand.length} 枚）</h2>
                <span className="text-sm text-slate-400">得点: {scores[PLAYER_HUMAN]} 点</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {playerHand.length === 0 && (
                  <span className="text-sm text-slate-500">手札はありません。</span>
                )}
                {playerHand.map((card) => (
                  <HanafudaCard
                    key={card.id}
                    card={card}
                    onClick={() => handleHandClick(card)}
                    disabled={turn !== PLAYER_HUMAN || roundOver}
                    highlight={pendingSelection?.card?.id === card.id}
                  />
                ))}
              </div>
            </div>
          </section>

          <aside className="flex h-full flex-col gap-4">
            <CaptureStrip title="つばめAI の獲得札" cards={cpuCaptures} />
            <CaptureStrip title="あなたの獲得札" cards={playerCaptures} />
            <LogPanel logs={logs} />
          </aside>
        </main>
      </div>
      {roundOver && roundResult && (
        <RoundResult
          result={roundResult}
          scores={scores}
          onNextRound={handleNextRound}
          onReset={handleResetScores}
        />
      )}
    </div>
  );
}

export default App;
