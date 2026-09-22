import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { CakeSlice, Check, ChevronRight, Download, Eye, EyeOff, Gift, Heart, Images, Plus, Share, Sparkles, Ticket, Trash2, Upload, X } from 'lucide-react';
import { asset } from './content';
import { outcomes, pickOutcome, resolveSpin } from './game.mjs';
import { bundledURL, exportBackup, importBackup, loadData, preparePhoto, saveData, type AppData, type Photo } from './storage';
import { Cake } from './Cake';
import { BirthdayLetter } from './BirthdayLetter';
import { LetterMusic } from './letterMusic';

const tabs = [{ id: 'home', title: '홈', Icon: Heart }, { id: 'roulette', title: '룰렛', Icon: Ticket }, { id: 'cake', title: '촛불', Icon: CakeSlice }, { id: 'wishes', title: '소원권', Icon: Gift }, { id: 'album', title: '앨범', Icon: Images }] as const;
type Tab = typeof tabs[number]['id'];
type Update = (change: (data: AppData) => AppData) => Promise<boolean>;
const NoticeContext = createContext({ error: '', dismiss: () => { } });
function ErrorNotice() {
  const { error, dismiss } = useContext(NoticeContext);
  return error ? <div className="toast" role="alert"><span>{error}</span><button aria-label="알림 닫기" onClick={dismiss}><X size={18} /></button></div> : null;
}
function currentTab(): Tab { return tabs.find(t => t.id === location.hash.slice(1))?.id ?? 'home'; }

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const latest = useRef<AppData | null>(null);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>(currentTab);
  const [letterMusic, setLetterMusic] = useState<LetterMusic | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [heartBurst, setHeartBurst] = useState(0);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateReady, setUpdateReady] = useState<ServiceWorkerRegistration | null>(null);
  const [pwaError, setPwaError] = useState(false);

  useEffect(() => {
    void loadData().then(value => { latest.current = value; setData(value); }).catch(() => setError('기기 저장소를 열지 못했어요. 일반 Safari 창에서 다시 열어주세요.'));
    const hashChanged = () => setTab(currentTab());
    window.addEventListener('hashchange', hashChanged);
    return () => window.removeEventListener('hashchange', hashChanged);
  }, []);
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let disposed = false;
    navigator.serviceWorker.register(asset('sw.js')).then(registration => {
      if (disposed) return;
      if (registration.active) setOfflineReady(true);
      if (registration.waiting) setUpdateReady(registration);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && !disposed) {
            setOfflineReady(true);
            if (navigator.serviceWorker.controller) setUpdateReady(registration);
          }
          if (worker.state === 'redundant' && !disposed) setPwaError(true);
        });
      });
    }).catch(() => setPwaError(true));
    return () => { disposed = true; };
  }, []);
  async function update(change: (data: AppData) => AppData) {
    if (!latest.current || saving.current) return false;
    saving.current = true; setBusy(true);
    try {
      const next = change(latest.current);
      await saveData(next);
      latest.current = next; setData(next);
      return true;
    } catch { setError('저장하지 못했어요. 기기 여유 공간을 확인해주세요. 기존 데이터는 유지돼요.'); return false; }
    finally { saving.current = false; setBusy(false); }
  }
  function navigate(next: Tab) { setTab(next); location.hash = next; window.scrollTo({ top: 0 }); }
  function installUpdate() {
    if (busy) return;
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
    updateReady?.waiting?.postMessage('ACTIVATE');
  }
  if (!data) return <div className="loading"><Heart fill="currentColor" /><h1>생일 놀이터 준비 중…</h1>{error && <><p role="alert">{error}</p><button onClick={() => location.reload()}>다시 시도</button></>}</div>;
  return <NoticeContext.Provider value={{ error, dismiss: () => setError('') }}>
    <div className="app-shell">
      {tab !== 'home' && <header className="navigation-title">{({ roulette: '꿍찰권 룰렛', cake: '촛불 불기', wishes: '소원권', album: '추억 앨범' })[tab]}</header>}
      <main id="main">
        <section hidden={tab !== 'home'} aria-label="홈">
          <div className="hero">
            <div className="date-pill"><Sparkles size={14} />9월 23일 · 24일</div>
            <p className="eyebrow">HAPPY BIRTHDAY TO US</p>
            <h1>하루 차이로 태어난<br /><span>앙이와 밍이<span className="grandparents">👴🏻👵🏻</span></span></h1>
            <p className="hero-description">두번째,,생일 축하,,오래오래 함께,, 웃으세...</p>
            <button className="hero-mascot" aria-label="밍꿍이 하트 뿅뿅" onClick={() => setHeartBurst(n => n + 1)}>
              <img src={asset('characters/mingkkoong-heart.png')} alt="하트를 안은 밍꿍이" />
              {heartBurst > 0 && <span key={heartBurst} className="heart-burst" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--x': `${Math.cos(i / 12 * Math.PI * 2) * (60 + i % 3 * 15)}px`, '--y': `${Math.sin(i / 12 * Math.PI * 2) * (60 + i % 3 * 15)}px`, '--delay': `${i % 3 * .04}s` } as CSSProperties}>♥</i>)}</span>}
            </button>
            <button className="primary hero-cta" onClick={() => navigate('roulette')}><Sparkles size={18} />오늘의 행운 돌리기</button>
          </div>
          <div className="quick-actions"><h2>놀아보세,,</h2><div className="quick-grid">
            <button className="quick-card peach" onClick={() => navigate('cake')}><CakeSlice /><strong>소원 불기</strong><small>후— 하고 촛불 끄기</small></button>
            <button className="quick-card yellow" onClick={() => navigate('wishes')}><Gift /><strong>소원권 5장</strong><small>앙이에게 바치는,, 소원 쿠폰..</small></button>
            <button className="quick-card mint album-link" onClick={() => navigate('album')}><Images /><strong>우리의 추억 앨범</strong><small>앙앤밍의,, 추억,, 새록새록,,</small><ChevronRight className="card-chevron" /></button>
          </div></div>
          <footer className="home-footer"><button className="couple-button" onClick={() => setLetterMusic(new LetterMusic())} aria-label="생일 편지 열기"><img src={asset('characters/couple-hug.png')} alt="함께 안고 있는 앙이와 밍이" /><span>💌</span></button><div><small>9.23 + 9.24</small><p>태어나줘서 고맙단다 ♥</p></div></footer>
          <div className="home-tools"><button className="text-button" onClick={() => setToolsOpen(true)}>홈 화면에 추가 · 보관함</button><button className="mascot-toggle" aria-label={data.roaming ? '움직이는 캐릭터 끄기' : '움직이는 캐릭터 켜기'} aria-pressed={data.roaming} disabled={busy} onClick={() => void update(d => ({ ...d, roaming: !d.roaming }))}>{data.roaming ? <Eye size={15} /> : <EyeOff size={15} />}</button></div>
        </section>
        <section hidden={tab !== 'roulette'} aria-label="룰렛"><Roulette data={data} update={update} busy={busy} /></section>
        <section hidden={tab !== 'cake'} aria-label="촛불"><Cake active={tab === 'cake'} /></section>
        <section hidden={tab !== 'wishes'} aria-label="소원권"><p className="eyebrow">FIVE WISHES</p><h1>소원권 5장</h1><p className="muted">내용은,,언제든,,바꿀 수 있읍니다,,<br />사용한 소원권은,, 앙이 하는거봐서,, 리필가능합니다,,</p><div className="coupons">{data.wishes.map((wish, i) => <Wish key={`${i}-${wish.title}`} wish={wish} index={i} busy={busy} update={update} />)}</div></section>
        <section hidden={tab !== 'album'} aria-label="앨범"><Album data={data} busy={busy} update={update} onError={setError} /></section>
      </main>
      <nav className="tabbar" aria-label="주 메뉴">{tabs.map(({ id, title, Icon }) => <button key={id} className={tab === id ? 'selected' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={22} fill={tab === id && id === 'home' ? 'currentColor' : 'none'} /><span>{title}</span></button>)}</nav>
    </div>
    {data.roaming && <Roamers />}
    <ErrorNotice />
    {letterMusic && <Modal title="생일 편지" onClose={() => setLetterMusic(null)} className="letter-modal"><BirthdayLetter music={letterMusic} /></Modal>}
    {toolsOpen && <Modal title="우리의 작은 보관함" onClose={() => setToolsOpen(false)}><h2>우리의 작은 보관함</h2><div className="install-guide"><Share className="coral" /><h3>아이폰 홈 화면에 쏙</h3><p>Safari에서 이 페이지를 열고<br /><b>공유 → 홈 화면에 추가</b>를 눌러주세요.<br />‘웹 앱으로 열기’가 보이면 켜주세요.</p><p className="muted">홈 화면 아이콘에서 실행하면 앱처럼 열려요. 처음에는 인터넷에 연결해두세요.</p><small role="status">{offlineReady ? '✓ 기본 사진까지 오프라인 준비 완료' : pwaError ? '오프라인 준비에 실패했어요. 연결 후 다시 열어주세요.' : '인터넷 연결 상태에서 오프라인 사용을 준비해요.'}</small></div>{updateReady && <button className="secondary" disabled={busy} onClick={installUpdate}>새 버전으로 업데이트</button>}<Backup data={data} busy={busy} update={update} onError={setError} /><p className="storage-note">사진과 기록은 이 기기에만 저장돼요. 다른 기기와 자동으로 공유되지 않아요. 사이트 데이터 삭제나 기기 변경 전에 백업해주세요.</p></Modal>}
  </NoticeContext.Provider>;
}

function Modal({ title, onClose, className = '', children }: { title: string; onClose: () => void; className?: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog className={`modal ${className}`} ref={dialog} aria-label={title} onCancel={onClose}><button className="modal-close" onClick={onClose} aria-label="닫기"><X /></button>{children}<ErrorNotice /></dialog>;
}

const wheelGradient = (() => {
  let acc = 0;
  return `conic-gradient(${outcomes.map(o => {
    const start = acc;
    acc += o.weight;
    return `${o.color} ${start}% ${acc}%`;
  }).join(', ')})`;
})();

function Roulette({ data, update, busy }: { data: AppData; update: Update; busy: boolean }) {
  const [draft, setDraft] = useState(String(data.tickets));
  const [bet, setBet] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [spinDuration, setSpinDuration] = useState(3.4);
  const [charging, setCharging] = useState(false);
  const [gauge, setGauge] = useState(0);
  const chargeStartRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastVibratedRef = useRef(0);
  const lock = useRef(false);
  const [result, setResult] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { setDraft(String(data.tickets)); setBet(n => Math.max(1, Math.min(n, data.tickets))); }, [data.tickets]);
  useEffect(() => () => {
    clearTimeout(timer.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);
  const actualBet = Math.min(bet, data.tickets);
  async function spin(power = 0.2) {
    if (lock.current || busy || actualBet + data.carry === 0) return;
    lock.current = true; setSpinning(true); setResult('');
    const chosen = pickOutcome();
    const next = resolveSpin(data.tickets, data.carry, actualBet, chosen.id);
    // Save the settled outcome first: closing or reloading cannot refund/reroll a bet.
    const saved = await update(d => ({ ...d, ...next }));
    if (!saved) { lock.current = false; setSpinning(false); return; }
    const extraTurns = Math.round(power * 10); // 0 to 10
    const totalTurns = 4 + extraTurns; // 4 to 14 turns
    const duration = 2.8 + power * 1.4; // 2.8s to 4.2s
    setSpinDuration(duration);
    setRotation(current => current + totalTurns * 360 + ((360 - chosen.angle - current % 360 + 360) % 360));
    const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : Math.round(duration * 1000);
    timer.current = setTimeout(() => {
      setResult(`${chosen.label} · ${chosen.message}`);
      setSpinning(false);
      lock.current = false;
      setGauge(0);
    }, delay);
  }
  const startCharging = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (lock.current || spinning || busy || actualBet + data.carry === 0) return;
    chargeStartRef.current = performance.now();
    lastVibratedRef.current = 0;
    setCharging(true);
    setGauge(0);
    const tick = () => {
      if (chargeStartRef.current === null) return;
      const elapsed = performance.now() - chargeStartRef.current;
      const p = Math.min(1, elapsed / 1500);
      setGauge(p);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        if (p >= 1 && lastVibratedRef.current < 1) {
          navigator.vibrate?.([30, 30, 50]);
          lastVibratedRef.current = 1;
        } else if (p >= 0.5 && lastVibratedRef.current < 0.5) {
          navigator.vibrate?.(20);
          lastVibratedRef.current = 0.5;
        }
      }
      if (p < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };
    animFrameRef.current = requestAnimationFrame(tick);
    const onRelease = () => {
      window.removeEventListener('pointerup', onRelease);
      window.removeEventListener('pointercancel', onRelease);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (chargeStartRef.current !== null) {
        const elapsed = performance.now() - chargeStartRef.current;
        chargeStartRef.current = null;
        setCharging(false);
        const finalPower = Math.max(0.15, Math.min(1, elapsed / 1500));
        void spin(finalPower);
      }
    };
    window.addEventListener('pointerup', onRelease, { once: true });
    window.addEventListener('pointercancel', onRelease, { once: true });
  };
  return <div className="roulette-page"><div className="balance-header"><div><p className="eyebrow">KKUNGCHAL ROULETTE</p><h1>꿍찰권 카지노</h1></div><div className="balance"><Ticket size={21} /><div><small>보유</small><strong data-testid="balance">{spinning ? '…' : data.tickets}</strong></div></div></div>
    <form className="balance-editor" onSubmit={e => { e.preventDefault(); const parsed = Number(draft); if (!Number.isFinite(parsed) || draft.trim() === '') return; void update(d => ({ ...d, tickets: Math.min(9999, Math.max(0, Math.floor(parsed))) })); }}><label htmlFor="tickets">보유 꿍찰권 직접 입력</label><div><input id="tickets" type="number" inputMode="numeric" min="0" max="9999" step="1" required value={draft} disabled={spinning || busy} onChange={e => setDraft(e.target.value)} /><span>장</span><button disabled={spinning || busy}>적용</button></div><small>0장부터 9,999장까지 이 기기에 저장돼요.</small></form>
    {data.carry > 0 && !spinning && <p className="carry">🔥 이월 판돈 <b>{data.carry}장</b>이 기다려요!</p>}
    <div className="wheel-stage"><span className="wheel-pointer" /><div className="wheel" style={{ transform: `rotate(${rotation}deg)`, background: wheelGradient, transition: spinning ? `transform ${spinDuration}s cubic-bezier(.12,.71,.12,1)` : 'none' }}>{outcomes.map(outcome => <span className="wheel-label" key={outcome.id} style={{ left: `${50 + Math.sin(outcome.angle * Math.PI / 180) * 35}%`, top: `${50 - Math.cos(outcome.angle * Math.PI / 180) * 35}%` }}>{outcome.label === '묻고 더블로' ? <>묻고<br />더블로</> : outcome.label}</span>)}<div className="wheel-hub"><Heart fill="currentColor" /></div></div></div>
    <div className="bet-panel"><div className="row"><b>이번 판 배팅</b><strong className="coral">{actualBet}장</strong></div><input aria-label="배팅할 꿍찰권" type="range" min="1" max={Math.max(2, data.tickets)} value={Math.max(1, actualBet)} disabled={spinning || busy || data.tickets <= 1} onChange={e => setBet(Number(e.target.value))} /><div className="presets">{[1, 3, 5].map(n => <button key={n} disabled={spinning || busy || data.tickets < n} onClick={() => setBet(n)}>{n}장</button>)}<button disabled={spinning || busy || data.tickets === 0} onClick={() => setBet(data.tickets)}>전부</button></div>
    <div className={`gauge-container ${charging ? 'active' : ''} ${gauge >= 1 ? 'max' : ''}`}><div className="gauge-header"><span className="gauge-title">{gauge >= 1 ? '🔥 MAX POWER! (14회전 대폭발)' : charging ? `⚡ ${Math.round(gauge * 100)}% 충전 (${4 + Math.round(gauge * 10)}회전)` : '파워 게이지'}</span><span className="gauge-value">{Math.round(gauge * 100)}%</span></div><div className="gauge-track"><div className="gauge-fill" style={{ width: `${Math.max(4, Math.round(gauge * 100))}%` }} /><span className="gauge-marker m25" /><span className="gauge-marker m50" /><span className="gauge-marker m75" /></div><small className="gauge-hint">버튼을 <b>길게 누를수록</b> 파워가 차서 룰렛이 많이 회전해요!</small></div>
    <button type="button" className={`primary spin-btn ${charging ? 'charging' : ''} ${gauge >= 1 ? 'max' : ''}`} disabled={spinning || busy || actualBet + data.carry === 0} onPointerDown={startCharging} onContextMenu={e => e.preventDefault()} onClick={() => { if (!lock.current && !spinning && !charging) void spin(0.2); }}><Sparkles size={18} />{spinning ? '두근두근…' : charging ? (gauge >= 1 ? '🔥 손을 떼면 최대 파워 발사!' : `⚡ 파워 충전 중… (${Math.round(gauge * 100)}%)`) : `${actualBet + data.carry}장으로 돌리기`}</button>{data.tickets === 0 && data.carry === 0 && !spinning && <small>꿍찰권을 직접 입력해서 다시 시작해보세요.</small>}</div>
    {result && <div className="result" role="status"><b>{result}</b><p>현재 {data.tickets}장 보유</p></div>}
    <details className="rules"><summary>룰렛 규칙과 확률 보기</summary>{outcomes.map(o => <div className="row" key={o.id}><span>{o.id === 'half' ? '나머지 꿍찰권 ½배' : o.label}</span><b>{o.weight}%</b></div>)}<p>배팅한 장수는 먼저 차감돼요. 3배는 판돈의 세 배, 2배는 판돈의 두 배를 지급하고, +5회/+2회는 각각 5장/2장을 추가해요. ½배는 남은 보유량의 절반(소수점 버림), -1회/-2회는 각각 1장/2장 추가 차감, 꽝은 판돈 소멸이에요.</p><p>‘묻고 더블로’는 판돈을 다음 판으로 넘겨요. 보유량이 0이어도 이월금만으로 돌릴 수 있어요.</p></details>
  </div>;
}

function Wish({ wish, index, busy, update }: { wish: AppData['wishes'][number]; index: number; busy: boolean; update: Update }) {
  const [title, setTitle] = useState(wish.title);
  return <div className={`coupon ${wish.used ? 'used' : ''}`}><span className="coupon-number">{String(index + 1).padStart(2, '0')}</span><div className="coupon-content"><small>WISH COUPON</small><input aria-label={`소원권 ${index + 1} 내용`} value={title} maxLength={100} disabled={busy} onChange={e => setTitle(e.target.value)} onBlur={() => { if (title.trim() && title !== wish.title) void update(d => ({ ...d, wishes: d.wishes.map((w, i) => i === index ? { ...w, title: title.trim() } : w) })); else setTitle(wish.title); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} /></div><button aria-label={`${index + 1}번 소원권 ${wish.used ? '사용 취소' : '사용'}`} disabled={busy} onClick={() => void update(d => ({ ...d, wishes: d.wishes.map((w, i) => i === index ? { ...w, used: !w.used } : w) }))}>{wish.used ? <Check /> : <Heart />}</button></div>;
}

function PhotoImage({ photo, className = '' }: { photo: Photo; className?: string }) {
  const [url, setUrl] = useState(() => bundledURL(photo));
  useEffect(() => {
    if (!photo.blob) { setUrl(bundledURL(photo)); return; }
    const objectURL = URL.createObjectURL(photo.blob); setUrl(objectURL);
    return () => URL.revokeObjectURL(objectURL);
  }, [photo.blob, photo.bundled]);
  return url ? <img className={className} src={url} alt={photo.caption || '앙이와 밍이의 추억 사진'} loading="lazy" /> : <span className="photo-placeholder" />;
}

function Album({ data, busy, update, onError }: { data: AppData; busy: boolean; update: Update; onError: (text: string) => void }) {
  const picker = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const photo = data.photos.find(p => p.id === selected);
  async function upload(files: FileList | null) {
    if (!files?.length || uploading) return;
    setUploading(true);
    try {
      if (files.length > 20) throw new Error('한 번에 20장까지 선택해주세요.');
      const photos: Photo[] = [];
      for (const file of Array.from(files)) photos.push(await preparePhoto(file));
      await update(d => ({ ...d, photos: [...photos, ...d.photos] }));
      void navigator.storage?.persist?.().catch(() => false);
    } catch (error) { onError(error instanceof Error ? error.message : '사진을 추가하지 못했어요.'); }
    finally { setUploading(false); if (picker.current) picker.current.value = ''; }
  }
  return <><div className="row album-heading"><div><p className="eyebrow">OUR LITTLE MOMENTS</p><h1>우리의 추억 앨범</h1></div><span className="photo-count">{data.photos.length}장</span></div><p className="muted">앙앤밍의,, 추억,, 새록새록,,<br />사진을 누르면 한 줄의 마음도 남길 수 있어요.</p><input ref={picker} type="file" accept="image/*" multiple hidden onChange={e => void upload(e.target.files)} /><button className="secondary add-photo" disabled={busy || uploading} onClick={() => picker.current?.click()}><Plus size={18} />{uploading ? '추억을 담는 중…' : '새로운 추억 담기'}</button><div className="photo-grid">{data.photos.map(photo => <button className="photo-card" key={photo.id} onClick={() => { setSelected(photo.id); setCaption(photo.caption); }}><PhotoImage photo={photo} /><span>{photo.caption || '이 순간에 한마디…'}</span></button>)}</div>{data.photos.length === 0 && <div className="empty"><Images size={36} /><p>첫 번째 추억을 담아주세요 ♥</p></div>}{photo && <Modal title="추억 사진과 메모" onClose={() => setSelected(null)} className="photo-modal"><PhotoImage photo={photo} className="full-photo" /><label htmlFor="caption">이 순간의 이야기</label><textarea id="caption" placeholder="짧은 마음을 남겨보세요…" maxLength={500} rows={3} value={caption} onChange={e => setCaption(e.target.value)} /><button className="primary" disabled={busy} onClick={async () => { if (await update(d => ({ ...d, photos: d.photos.map(p => p.id === photo.id ? { ...p, caption } : p) }))) setSelected(null); }}>메모 저장</button><button className="text-button danger" disabled={busy} onClick={async () => { if (confirm('이 사진과 메모를 앨범에서 삭제할까요?')) { if (await update(d => ({ ...d, photos: d.photos.filter(p => p.id !== photo.id) }))) setSelected(null); } }}><Trash2 size={15} />사진 삭제</button></Modal>}</>;
}

function Backup({ data, busy, update, onError }: { data: AppData; busy: boolean; update: Update; onError: (message: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');
  return <div className="backup"><h3>추억 오래 보관하기</h3><p>사진·메모·소원권·꿍찰권을 파일로 보관하고 다른 기기로 옮길 수 있어요.</p><button className="secondary" disabled={working || busy} onClick={async () => { setWorking(true); try { await exportBackup(data); setMessage('백업 파일을 다운로드했어요. 파일 앱에 보관해주세요.'); } catch { onError('백업 파일을 만들지 못했어요.'); } finally { setWorking(false); } }}><Download size={17} />백업 파일 저장</button><button className="secondary" disabled={working || busy} onClick={() => input.current?.click()}><Upload size={17} />백업 파일 불러오기</button><input type="file" accept=".json,application/json" hidden ref={input} onChange={async e => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; setWorking(true); try { const restored = await importBackup(file); if (confirm('현재 이 기기의 사진과 기록을 백업 내용으로 교체할까요? 먼저 현재 데이터를 백업하는 것을 권장해요.')) { if (await update(() => restored)) setMessage('사진과 기록을 모두 복원했어요.'); } } catch (error) { onError(error instanceof Error ? error.message : '백업을 읽지 못했어요.'); } finally { setWorking(false); } }} /><small role="status">{working ? '잠시만 기다려주세요…' : message}</small></div>;
}

function Roamers() {
  const characters = [
    ['mingkkoong', '추카추카~'], ['mingkkoong-heart', '♥'], ['mingkkoong', '얏!'],
    ['mingkkoong-heart', '생일이닷!'], ['mingkkoong', ''], ['mingkkoong-heart', '추카!'],
    ['mingbae', '몰랑배~~'], ['mingbae', '부디럽단다'], ['mingbae', '최상의 컨디션이란다'],
  ];
  return <div className="roamers" aria-hidden="true">{characters.map(([name, phrase], i) => <div className="roamer" key={i} style={{ '--lane': `${10 + i * 9}%`, '--duration': `${16 + i * 1.7}s`, '--offset': `${-i * 5}s`, '--size': `${40 + i % 4 * 4}px`, '--direction': i % 2 ? 'reverse' : 'normal' } as CSSProperties}><div className="roamer-bob"><img src={asset(`characters/${name}.png`)} alt="" />{phrase && <span>{phrase}</span>}</div></div>)}</div>;
}
