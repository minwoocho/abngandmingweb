import { useEffect, useSyncExternalStore } from 'react';
import { Heart, Volume2, VolumeX } from 'lucide-react';
import { letter } from './content';
import { LetterMusic } from './letterMusic';

export function BirthdayLetter({ music }: { music: LetterMusic }) {
  const status = useSyncExternalStore(music.subscribe, music.getSnapshot);
  const muted = status === 'muted' || status === 'unavailable';
  const paragraphs = letter.body.split('\n\n');
  const signature = paragraphs.pop();
  useEffect(() => {
    // Fallback for browsers that skip the animation event. Reduced motion opens immediately.
    const timer = setTimeout(() => music.reveal(), matchMedia('(prefers-reduced-motion: reduce)').matches ? 50 : 1800);
    const hide = () => music.pause();
    const visibility = () => { if (document.hidden) hide(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', hide);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', hide);
      music.close();
    };
  }, [music]);
  return <>
    <div className="letter-toolbar">
      <button className="letter-music" aria-label={muted ? '음악 켜기' : '음악 끄기'} aria-pressed={!muted} disabled={status === 'unavailable'} onClick={() => muted ? music.resume() : music.pause()}>
        {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        <span>{status === 'unavailable' ? '소리 없이 읽기' : muted ? '음악 켜기' : '작은 오르골'}</span>
        {!muted && <span className={`music-bars ${status === 'preparing' ? 'waiting' : ''}`} aria-hidden="true"><i /><i /><i /></span>}
      </button>
    </div>
    <div className="envelope" aria-hidden="true"><div className="envelope-flap" /><span>♥</span></div>
    <article className="letter-paper" onAnimationEnd={event => { if (event.target === event.currentTarget) music.reveal(); }}>
      <div className="letter-heading"><span className="letter-kicker">A LETTER, JUST FOR YOU</span><div className="letter-seal" aria-hidden="true"><Heart size={19} /></div></div>
      <h2>{letter.title}</h2>
      <small className="letter-subtitle">{letter.subtitle}</small>
      <div className="letter-rule" aria-hidden="true"><span>✧</span></div>
      <div className="letter-body">{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
      <div className="letter-signature">{signature}<Heart size={18} strokeWidth={1.4} aria-hidden="true" /></div>
      <div className="letter-ending" aria-hidden="true">09.23 <span>♡</span> 09.24</div>
    </article>
  </>;
}
