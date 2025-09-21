import { useEffect, useMemo, useReducer, useState } from 'react';
import {
  createInitialState,
  gameReducer,
  PLAYER_CPU,
  PLAYER_HUMAN,
} from './utils/gameLogic';
import { describeCard, YAKU_REFERENCE } from './utils/yaku';
import './index.css';
import './App.css';

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
  bright: 'hanafuda-card--bright',
  animal: 'hanafuda-card--animal',
  ribbon: 'hanafuda-card--ribbon',
  chaff: 'hanafuda-card--chaff',
};

const playerLabels = {
  [PLAYER_HUMAN]: 'あなた',
  [PLAYER_CPU]: 'つばめAI',
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

function HanafudaCard({
  card,
  onClick,
  disabled,
  highlight = false,
  size = 'md',
  focus = 'player',
}) {
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
        'hanafuda-card',
        cardStyles[card.type],
        baseSize,
        disabled ? 'is-disabled' : '',
        highlight ? 'is-highlighted' : '',
        focus === 'opponent' ? 'is-opponent-highlight' : '',
      ]
        .filter(Boolean)
        .join(' ')}
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
      className={['hanafuda-card-back', baseSize].join(' ')}
    >
      <span>{label}</span>
    </div>
  );
}

function CaptureStrip({ title, cards, variant = 'panel' }) {
  const summary = useMemo(() => summarizeCapture(cards), [cards]);
  const sortedCards = useMemo(() => sortCards(cards), [cards]);

  if (variant === 'inline') {
    return (
      <div className="hanafuda-capture-shelf">
        <div className="hanafuda-capture-shelf__header">
          <span>{title}</span>
          <span>
            光 {summary.bright} / 種 {summary.animal} / 短 {summary.ribbon} / カス {summary.chaff}
          </span>
        </div>
        <div className="hanafuda-capture-shelf__body">
          {sortedCards.length === 0 ? (
            <span className="hanafuda-capture-empty">まだ獲得していません</span>
          ) : (
            sortedCards.map((card) => <HanafudaCard key={card.id} card={card} size="sm" disabled />)
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="hanafuda-panel hanafuda-panel--subtle p-3 lg:p-4">
      <header className="hanafuda-panel-header mb-2 flex items-center justify-between text-xs font-semibold sm:text-sm">
        <span>{title}</span>
        <span>
          光 {summary.bright} / 種 {summary.animal} / 短 {summary.ribbon} / カス {summary.chaff}
        </span>
      </header>
      <div className="flex flex-wrap gap-2">
        {sortedCards.length === 0 ? (
          <span className="text-xs text-white/40">まだ獲得していません</span>
        ) : (
          sortedCards.map((card) => <HanafudaCard key={card.id} card={card} size="sm" disabled />)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="hanafuda-panel hanafuda-panel--overlay w-full max-w-lg space-y-5 p-6 lg:p-7">
        <h2 className="hanafuda-title text-2xl font-semibold">{title}</h2>
        {result.winner && (
          <div className="hanafuda-alert space-y-2 p-4">
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
          <div className="hanafuda-badge space-y-1">
            <p className="hanafuda-meta">あなた</p>
            <p className="text-xl font-semibold text-white">{scores[PLAYER_HUMAN]} 点</p>
          </div>
          <div className="hanafuda-badge space-y-1">
            <p className="hanafuda-meta">つばめAI</p>
            <p className="text-xl font-semibold text-white">{scores[PLAYER_CPU]} 点</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onNextRound(true)}
            className="hanafuda-button hanafuda-button--primary flex-1 px-5 py-2 text-xs font-semibold sm:text-sm"
          >
            次の局へ進む
          </button>
          <button
            type="button"
            onClick={onReset}
            className="hanafuda-button hanafuda-button--outline flex-1 px-5 py-2 text-xs font-semibold sm:text-sm"
          >
            スコアをリセット
          </button>
        </div>
      </div>
    </div>
  );
}

function YakuReferenceModal({ onClose }) {
  return (
    <div className="hanafuda-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="hanafuda-panel hanafuda-panel--overlay hanafuda-modal-panel w-full max-w-3xl space-y-6 p-6 lg:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="hanafuda-title text-2xl font-semibold">役の一覧</h2>
            <p className="text-xs text-white/60 sm:text-sm">こいこいで使用する代表的な役の条件と得点を確認できます。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hanafuda-button hanafuda-button--outline px-4 py-2 text-xs font-semibold sm:text-sm"
          >
            閉じる
          </button>
        </header>
        <div className="hanafuda-reference-grid">
          {YAKU_REFERENCE.map((yaku) => (
            <article key={yaku.name} className="hanafuda-reference-card">
              <header className="hanafuda-reference-card__header">
                <h3>{yaku.name}</h3>
                <span>{yaku.points}</span>
              </header>
              <p>{yaku.description}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function LogPanel({ logs }) {
  const orderedLogs = useMemo(() => logs.slice().reverse(), [logs]);
  return (
    <section className="hanafuda-panel hanafuda-panel--overlay flex h-full flex-col">
      <header className="hanafuda-panel-header border-b border-transparent p-3 text-xs font-semibold sm:text-sm">
        対局ログ
      </header>
      <div className="hanafuda-scroll flex-1 space-y-2 overflow-y-auto p-3 text-xs leading-relaxed text-white/80">
        {orderedLogs.length === 0 && <p className="text-white/40">まだ動きはありません。</p>}
        {orderedLogs.map((entry) => (
          <div key={entry.id} className="hanafuda-log-entry p-2 text-[13px]">
            <p>{entry.message}</p>
            <p className="mt-1 text-[10px] text-white/40">{new Date(entry.timestamp).toLocaleTimeString()}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CardChip({ card }) {
  if (!card) {
    return null;
  }
  return (
    <span className={`hanafuda-chip hanafuda-chip--${card.type}`} title={describeCard(card)}>
      <span className="hanafuda-chip-month">{card.month}月</span>
      <span className="hanafuda-chip-name">{card.name}</span>
    </span>
  );
}

function CardCollection({ title, cards }) {
  if (!cards || cards.length === 0) {
    return null;
  }
  return (
    <div className="hanafuda-chip-stack">
      {title && <span className="hanafuda-chip-label">{title}</span>}
      <div className="hanafuda-chip-row">
        {cards.map((card) => (
          <CardChip key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

function ActionTimeline({ feed }) {
  if (!feed || feed.length === 0) {
    return (
      <section className="hanafuda-panel hanafuda-panel--overlay p-3 lg:p-4">
        <header className="hanafuda-panel-header mb-3 text-xs font-semibold sm:text-sm">可視化された進行</header>
        <p className="text-xs text-white/40">まだ対局は始まっていません。</p>
      </section>
    );
  }

  const renderEntry = (entry) => {
    const actor = entry.playerId ? playerLabels[entry.playerId] : '進行';
    switch (entry.type) {
      case 'round-start':
        return <p className="hanafuda-timeline-text">第{entry.roundNumber}局が始まりました。</p>;
      case 'play-to-field':
        return (
          <div className="space-y-2">
            <p className="hanafuda-timeline-text">
              <strong className="hanafuda-timeline-actor">{actor}</strong> が <CardChip card={entry.card} /> を場に出しました。
            </p>
          </div>
        );
      case 'select-field':
        return (
          <div className="space-y-2">
            <p className="hanafuda-timeline-text">
              <strong className="hanafuda-timeline-actor">{actor}</strong> が <CardChip card={entry.handCard} /> の取り札を選択しています。
            </p>
            <CardCollection title="選択候補" cards={entry.options} />
          </div>
        );
      case 'capture':
        return (
          <div className="space-y-2">
            <p className="hanafuda-timeline-text">
              <strong className="hanafuda-timeline-actor">{actor}</strong> が <CardChip card={entry.handCard} /> で取り札を獲得しました。
            </p>
            <CardCollection title="獲得" cards={entry.captured} />
          </div>
        );
      case 'capture-triple':
        return (
          <div className="space-y-2">
            <p className="hanafuda-timeline-text">
              <strong className="hanafuda-timeline-actor">{actor}</strong> が <CardChip card={entry.handCard} /> で同月札三枚をまとめ取りしました。
            </p>
            <CardCollection title="まとめ取り" cards={entry.captured} />
          </div>
        );
      case 'draw-to-field':
        return (
          <p className="hanafuda-timeline-text">
            <strong className="hanafuda-timeline-actor">{actor}</strong> が山札から <CardChip card={entry.drawnCard} /> をめくり、場に置きました。
          </p>
        );
      case 'capture-draw':
        return (
          <div className="space-y-2">
            <p className="hanafuda-timeline-text">
              <strong className="hanafuda-timeline-actor">{actor}</strong> が山札から <CardChip card={entry.drawnCard} /> をめくって取り札にしました。
            </p>
            <CardCollection title="同時に取った札" cards={entry.captured} />
          </div>
        );
      case 'turn-end':
        return (
          <p className="hanafuda-timeline-text">
            <strong className="hanafuda-timeline-actor">{actor}</strong> の手番が終了しました。
          </p>
        );
      case 'round-result':
        return (
          <div className="space-y-2">
            <p className="hanafuda-timeline-text">
              <strong className="hanafuda-timeline-actor">{actor}</strong> が役を完成させ、{entry.points}点を獲得しました。
            </p>
            {entry.yaku && entry.yaku.length > 0 && (
              <ul className="hanafuda-yaku-list">
                {entry.yaku.map((item) => (
                  <li key={item.name}>{item.name}（{item.points}点）</li>
                ))}
              </ul>
            )}
          </div>
        );
      case 'round-draw':
        return <p className="hanafuda-timeline-text">山札が尽きたため流局になりました。</p>;
      default:
        return <p className="hanafuda-timeline-text">進行中のイベント。</p>;
    }
  };

  return (
    <section className="hanafuda-panel hanafuda-panel--overlay p-3 lg:p-4">
      <header className="hanafuda-panel-header mb-3 text-xs font-semibold sm:text-sm">可視化された進行</header>
      <ol className="hanafuda-timeline space-y-3">
        {feed.map((entry) => (
          <li key={entry.id} className="hanafuda-timeline-item">
            <div
              className={['hanafuda-timeline-marker', entry.playerId ? `is-${entry.playerId}` : ''].join(' ')}
              aria-hidden
            />
            <div className="hanafuda-timeline-content">
              {renderEntry(entry)}
              <span className="hanafuda-timeline-meta">{new Date(entry.timestamp).toLocaleTimeString()}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const [showYakuModal, setShowYakuModal] = useState(false);
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
    actionFeed,
  } = state;

  const playerHand = useMemo(() => sortCards(hands[PLAYER_HUMAN]), [hands]);
  const cpuHand = hands[PLAYER_CPU];
  const fieldCards = useMemo(() => sortCards(field), [field]);
  const playerCaptures = captures[PLAYER_HUMAN];
  const cpuCaptures = captures[PLAYER_CPU];

  const pendingFieldIds = useMemo(() => {
    if (!pendingSelection || pendingSelection.playerId !== PLAYER_HUMAN) {
      return new Set();
    }
    return new Set(pendingSelection.options.map((card) => card.id));
  }, [pendingSelection]);

  const cpuTargetFieldId = useMemo(() => {
    if (!pendingSelection || pendingSelection.playerId !== PLAYER_CPU) {
      return null;
    }
    return pendingSelection.selectedFieldId || null;
  }, [pendingSelection]);

  const cpuSelectionCard = pendingSelection?.playerId === PLAYER_CPU ? pendingSelection.card : null;

  useEffect(() => {
    if (turn === PLAYER_CPU && !roundOver && !pendingSelection) {
      const timer = setTimeout(() => {
        dispatch({ type: 'CPU_TURN' });
      }, 750);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [turn, roundOver, pendingSelection]);

  useEffect(() => {
    if (pendingSelection && pendingSelection.playerId === PLAYER_CPU) {
      const timer = setTimeout(() => {
        dispatch({
          type: 'CPU_SELECT_FIELD',
          fieldCardId: pendingSelection.selectedFieldId,
        });
      }, 900);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [pendingSelection]);

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
    <div className="hanafuda-shell">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
        <header className="hanafuda-panel flex flex-col gap-4 p-6 lg:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="hanafuda-title text-3xl font-semibold">花札 対戦（簡易こいこい）</h1>
              <p className="hanafuda-subtitle text-sm">第{roundNumber}局・山札 {deck.length} 枚 / 手番：{turn === PLAYER_HUMAN ? 'あなた' : 'つばめAI'}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowYakuModal(true)}
                className="hanafuda-button hanafuda-button--outline px-5 py-2 text-xs font-semibold sm:text-sm"
              >
                役一覧を表示
              </button>
              <button
                type="button"
                onClick={() => handleNextRound(true)}
                className="hanafuda-button hanafuda-button--outline px-5 py-2 text-xs font-semibold sm:text-sm"
              >
                次の局を配る
              </button>
              <button
                type="button"
                onClick={handleResetScores}
                className="hanafuda-button hanafuda-button--primary px-5 py-2 text-xs font-semibold sm:text-sm"
              >
                新しく始める
              </button>
            </div>
          </div>
          {pendingSelection && pendingSelection.playerId === PLAYER_HUMAN && (
            <div className="hanafuda-alert p-3 text-sm">
              <p>{pendingSelection.card.name} の取り札を選択してください。</p>
            </div>
          )}
          {pendingSelection && pendingSelection.playerId === PLAYER_CPU && (
            <div className="hanafuda-alert hanafuda-alert--cpu p-3 text-sm">
              <p>つばめAIが {pendingSelection.card.name} の取り札を選択しています…</p>
            </div>
          )}
        </header>

        <main className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <section className="hanafuda-panel hanafuda-panel--subtle space-y-4 p-4 lg:p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="hanafuda-subtitle text-base font-semibold sm:text-lg">つばめAI（手札 {cpuHand.length} 枚）</h2>
                <span className="hanafuda-meta text-xs sm:text-sm">得点: {scores[PLAYER_CPU]} 点</span>
              </div>
              <CaptureStrip title="つばめAI の獲得札" cards={cpuCaptures} variant="inline" />
              <div className="flex flex-wrap items-center gap-2">
                {cpuHand.map((_, idx) => (
                  <CardBack key={`cpu-card-${idx}`} label="裏" size="lg" />
                ))}
                {cpuSelectionCard && (
                  <HanafudaCard
                    key={cpuSelectionCard.id}
                    card={cpuSelectionCard}
                    size="lg"
                    disabled
                    highlight
                    focus="opponent"
                  />
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="hanafuda-subtitle text-base font-semibold sm:text-lg">場札</h2>
                <span className="hanafuda-meta text-xs sm:text-sm">合計 {fieldCards.length} 枚</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {fieldCards.length === 0 && (
                  <span className="text-sm text-white/40">場札はありません。</span>
                )}
                {fieldCards.map((card) => {
                  const isHumanSelectable =
                    pendingSelection?.playerId === PLAYER_HUMAN && pendingFieldIds.has(card.id);
                  const isCpuFocus = cpuTargetFieldId === card.id;
                  return (
                    <HanafudaCard
                      key={card.id}
                      card={card}
                      onClick={() => handleFieldClick(card)}
                      disabled={!isHumanSelectable}
                      highlight={isHumanSelectable || isCpuFocus}
                      focus={isCpuFocus ? 'opponent' : 'player'}
                    />
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="hanafuda-subtitle text-base font-semibold sm:text-lg">あなたの手札（{playerHand.length} 枚）</h2>
                <span className="hanafuda-meta text-xs sm:text-sm">得点: {scores[PLAYER_HUMAN]} 点</span>
              </div>
              <CaptureStrip title="あなたの獲得札" cards={playerCaptures} variant="inline" />
              <div className="flex flex-wrap gap-2">
                {playerHand.length === 0 && (
                  <span className="text-sm text-white/40">手札はありません。</span>
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
            <ActionTimeline feed={actionFeed} />
            <LogPanel logs={logs} />
          </aside>
        </main>
      </div>
      {showYakuModal && <YakuReferenceModal onClose={() => setShowYakuModal(false)} />}
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
