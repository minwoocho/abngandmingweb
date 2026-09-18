import { useEffect, useRef, useState } from 'react';
import { Mic, RotateCcw } from 'lucide-react';

export function Cake({ active }: { active: boolean }) {
  const [lit, setLit] = useState(true);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('마이크를 켜고 화면을 향해 후— 불어보세요.');
  const media = useRef<MediaStream | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const frame = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const generation = useRef(0);
  function stop() {
    generation.current++;
    cancelAnimationFrame(frame.current);
    clearTimeout(timeout.current);
    media.current?.getTracks().forEach(track => track.stop());
    media.current = null;
    void audio.current?.close().catch(() => {});
    audio.current = null;
    setListening(false);
  }
  function extinguish() {
    stop(); setLit(false); setMessage('소원 접수 완료! 생일 축하해요 🎉');
  }
  useEffect(() => { if (!active) stop(); return stop; }, [active]);
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  async function listen() {
    stop();
    if (!navigator.mediaDevices?.getUserMedia) { setMessage('마이크는 HTTPS에서 사용할 수 있어요. 촛불을 톡 눌러 꺼도 좋아요.'); return; }
    const run = generation.current;
    setListening(true);
    setMessage('마이크 사용을 허용하고 크게 후—!');
    try {
      // Create and resume during the user gesture for iOS Web Audio.
      const context = new AudioContext();
      audio.current = context;
      await context.resume();
      if (run !== generation.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      if (run !== generation.current) { stream.getTracks().forEach(t => t.stop()); return; }
      media.current = stream;
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      let loudFrames = 0;
      setMessage('듣고 있어요… 크게 후—!');
      const check = () => {
        analyser.getByteTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / samples.length);
        loudFrames = rms > .065 ? loudFrames + 1 : Math.max(0, loudFrames - 1);
        if (loudFrames >= 8) extinguish();
        else frame.current = requestAnimationFrame(check);
      };
      frame.current = requestAnimationFrame(check);
      timeout.current = setTimeout(() => { stop(); setMessage('다시 후— 불거나 촛불을 톡 눌러주세요.'); }, 20_000);
    } catch {
      if (run === generation.current) { stop(); setMessage('마이크를 사용할 수 없어요. 촛불을 톡 눌러 꺼주세요.'); }
    }
  }
  return <div className="feature cake-card">
    <p className="eyebrow">MAKE A WISH</p><h1>케이키에 소원 빌기,,</h1>
    <p className="muted">눈을 감고,, 소원을 생각헌뒤,,<br />촛불을 향해 후— 불어보십시요,,</p>
    <div className={`cake-scene ${lit ? '' : 'extinguished'}`}>
      {!lit && <><strong className="wish-received">소원 접수! ✨</strong><div className="confetti" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ left: `${(i * 43) % 100}%`, animationDelay: `${i * .07}s`, background: ['#ff6e69','#ffd969','#bde3d1','#b8d6f2'][i % 4] }} />)}</div></>}
      <div className="cake-plate" /><div className="cake-body"><div className="icing" /><span>♥</span></div>
      <div className="candles">{['밍이', '앙이'].map(name => <button key={name} className="candle" aria-label={`${name} 촛불 끄기`} onClick={extinguish} disabled={!lit}><i className="flame" /><span>{name}</span></button>)}</div>
    </div>
    <p className="mic-message" role="status">{message}</p>
    {lit ? <><button className="primary" disabled={listening} onClick={() => void listen()}><Mic size={18} />{listening ? '바람을 듣는 중…' : '마이크 켜고 촛불 불기'}</button>{listening && <button className="text-button" onClick={stop}>마이크 끄기</button>}<button className="text-button" onClick={extinguish}>대신 터치로 후—!</button></> : <button className="secondary" onClick={() => { setLit(true); setMessage('다시 소원을 빌고 후— 불어보세요.'); }}><RotateCcw size={17} />촛불 다시 켜기</button>}
  </div>;
}
