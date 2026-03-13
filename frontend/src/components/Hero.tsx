'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Pause, Play, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Variants } from 'framer-motion';

const words = ['Intelligence', 'Insights', 'Decisions', 'Growth'];

export default function Hero() {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const currentWord = words[wordIndex];
    let timeout: ReturnType<typeof setTimeout>;
    if (!deleting && displayed.length < currentWord.length) {
      timeout = setTimeout(() => setDisplayed(currentWord.slice(0, displayed.length + 1)), 80);
    } else if (!deleting && displayed.length === currentWord.length) {
      timeout = setTimeout(() => setDeleting(true), 2500);
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 40);
    } else {
      setDeleting(false);
      setWordIndex((i) => (i + 1) % words.length);
    }
    return () => clearTimeout(timeout);
  }, [displayed, deleting, wordIndex]);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    videoEl.addEventListener('play', onPlay);
    videoEl.addEventListener('pause', onPause);
    videoEl.addEventListener('ended', onEnded);

    return () => {
      videoEl.removeEventListener('play', onPlay);
      videoEl.removeEventListener('pause', onPause);
      videoEl.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlayback = async () => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (videoEl.paused) {
      try {
        await videoEl.play();
      } catch {
        setIsPlaying(false);
      }
      return;
    }

    videoEl.pause();
  };

  const container: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
  };

  const panelHeight = 'min(70vh, 620px)';
  const panelMinHeight = '460px';

  return (
    <section id="home" className="grid-bg" style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      paddingTop: '180px', paddingBottom: '60px',
      paddingLeft: '24px', paddingRight: '24px',
    }}>
      {/* Subtle orbs */}
      <div className="orb orb-purple" style={{ width: '500px', height: '500px', top: '-80px', right: '-100px', opacity: 0.8 }} />
      <div className="orb orb-cyan"   style={{ width: '380px', height: '380px', bottom: '-40px', left: '-80px', opacity: 0.6 }} />

      <div className="container" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '1240px' }}>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '26px',
            alignItems: 'stretch',
          }}
        >
          <div style={{
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            height: panelHeight,
            minHeight: panelMinHeight,
          }}>

          <motion.div variants={item} style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
            {/* RGB glow badge */}
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              {/* Animated RGB ring behind the badge */}
              
              <div style={{
                position: 'relative', zIndex: 1,
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                padding: '6px 16px',
                background: '#0a0a0a',
                borderRadius: '50px',
                fontSize: '11px', fontWeight: 700,
                color: '#e0e0e0',
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                <Sparkles size={12} />
                AI-Orchestrated Analytics Platform
              </div>
            </div>
          </motion.div>

          <motion.h1 variants={item} style={{
            fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900,
            lineHeight: 1.1, letterSpacing: '-0.03em',
            marginBottom: '4px', fontFamily: 'Outfit, sans-serif',
          }}>
            Turn Raw Data Into
          </motion.h1>

          <motion.div variants={item} style={{
            fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900,
            lineHeight: 1.1, letterSpacing: '-0.03em',
            marginBottom: '28px', fontFamily: 'Outfit, sans-serif',
            minHeight: '1.1em',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
          }}>
            <span style={{
              background: 'var(--gradient-hero)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {displayed}
            </span>
            <span className="cursor" />
          </motion.div>

          <motion.p variants={item} style={{
            fontSize: 'clamp(15px, 1.6vw, 18px)', color: 'var(--text-secondary)',
            maxWidth: '560px', margin: '0 0 40px', lineHeight: 1.8,
          }}>
            InsightForge uses specialized AI agents to automate data cleaning, analysis,
            visualization, and insight generation — turning messy datasets into strategic
            decisions at the speed of thought.
          </motion.p>

          <motion.div variants={item} style={{ display: 'flex', gap: '12px', justifyContent: 'flex-start', flexWrap: 'wrap' }} className="hero-btns">
            <a href="/dashboard" className="btn-primary">Get Started <ArrowRight size={16} /></a>
            <a href="#about"   className="btn-outline">Learn More</a>
          </motion.div>

          <motion.div variants={item} style={{
            display: 'flex', gap: '10px', justifyContent: 'flex-start',
            flexWrap: 'wrap', marginTop: '44px',
          }}>
            {['Auto-cleaning', 'Real-time Analysis', 'AI Insights', 'Visual Reports'].map((t) => (
              <span key={t} className="tag-pill">{t}</span>
            ))}
          </motion.div>

          </div>

          <motion.div variants={item}>
            <div style={{
              position: 'relative',
              height: panelHeight,
              minHeight: panelMinHeight,
              width: '100%',
              overflow: 'visible',
            }}>
              <motion.div
                initial={{ opacity: 0, y: 58, scale: 0.62 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, delay: 0.55, type: 'spring', stiffness: 220, damping: 18 }}
                style={{
                  position: 'absolute',
                  top: '-84px',
                  right: '6px',
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  flexDirection: 'row-reverse',
                  gap: '10px',
                  pointerEvents: 'none',
                }}
              >
                <motion.div
                  animate={{ x: [0, -6, 4, -4, 0], rotate: [8, 5, 11, 7, 8] }}
                  transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
                  style={{
                    width: '104px',
                    height: '104px',
                    filter: 'drop-shadow(0 10px 18px rgba(0, 0, 0, 0.32))',
                    transformOrigin: '50% 100%',
                  }}
                >
                  <svg width="104" height="104" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Robot assistant" style={{ width: '100%', height: '100%' }}>
                    <defs>
                      <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#f3f4f6" />
                        <stop offset="100%" stopColor="#d1d5db" />
                      </linearGradient>
                      <linearGradient id="faceGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#4b5563" />
                        <stop offset="100%" stopColor="#374151" />
                      </linearGradient>
                      <linearGradient id="eyeGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#7dd3fc" />
                        <stop offset="100%" stopColor="#38bdf8" />
                      </linearGradient>
                    </defs>

                    <rect x="18" y="14" width="184" height="120" rx="58" fill="url(#bodyGrad)" />
                    <rect x="40" y="35" width="140" height="78" rx="38" fill="url(#faceGrad)" />
                    <rect x="0" y="56" width="28" height="36" rx="10" fill="#cbd5e1" />
                    <rect x="192" y="56" width="28" height="36" rx="10" fill="#cbd5e1" />

                    <motion.ellipse
                      cx="82"
                      cy="74"
                      rx="16"
                      fill="url(#eyeGrad)"
                      initial={{ ry: 16 }}
                      animate={{ ry: [16, 16, 16, 2, 16, 16] }}
                      transition={{ duration: 4.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', times: [0, 0.72, 0.82, 0.86, 0.9, 1] }}
                    />
                    <motion.ellipse
                      cx="138"
                      cy="74"
                      rx="16"
                      fill="url(#eyeGrad)"
                      initial={{ ry: 16 }}
                      animate={{ ry: [16, 16, 16, 2, 16, 16] }}
                      transition={{ duration: 4.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut', times: [0, 0.72, 0.82, 0.86, 0.9, 1] }}
                    />

                    <ellipse cx="110" cy="165" rx="62" ry="14" fill="#d1d5db" />
                    <path d="M56 164C58 196 81 214 110 214C139 214 162 196 164 164H56Z" fill="url(#bodyGrad)" />
                    <path d="M95 164H125L112 178C110 180 107 180 105 178L95 164Z" fill="#f59e0b" />
                  </svg>
                </motion.div>

                <div style={{
                  background: 'rgba(12, 12, 16, 0.86)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: '999px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 6px 16px rgba(0, 0, 0, 0.25)',
                }}>
                  Watch this video
                </div>
              </motion.div>

              <div style={{
                position: 'relative',
                zIndex: 2,
                height: '100%',
                width: '100%',
                borderRadius: '50px',
                border: 'none',
                background: 'linear-gradient(135deg, rgba(255, 137, 77, 0.24), rgba(255, 255, 255, 0.08) 36%, rgba(16, 16, 20, 0.82) 72%)',
                boxShadow: '0 28px 80px rgba(0, 0, 0, 0.45), 0 0 45px rgba(255, 120, 72, 0.22)',
                overflow: 'hidden',
              }}>

              <video
                ref={videoRef}
                src="/videos/hero-demo.mp4"
                controls={showControls}
                preload="metadata"
                onClick={togglePlayback}
                onMouseEnter={() => setShowControls(true)}
                onMouseLeave={() => setShowControls(false)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  borderRadius: '50px',
                  cursor: 'pointer',
                  backgroundColor: '#050505',
                }}
              >
                Your browser does not support the video tag.
              </video>

              <button
                type="button"
                onClick={togglePlayback}
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
                style={{
                  position: 'absolute',
                  inset: '50% auto auto 50%',
                  transform: 'translate(-50%, -50%)',
                  width: '66px',
                  height: '66px',
                  borderRadius: '999px',
                  border: '1px solid rgba(255, 255, 255, 0.22)',
                  background: 'rgba(0, 0, 0, 0.34)',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  backdropFilter: 'blur(5px)',
                  zIndex: 3,
                }}
              >
                {isPlaying ? <Pause size={28} strokeWidth={2.1} /> : <Play size={28} strokeWidth={2.1} />}
              </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
