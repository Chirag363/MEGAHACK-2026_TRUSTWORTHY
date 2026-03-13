'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Variants } from 'framer-motion';

const words = ['Intelligence', 'Insights', 'Decisions', 'Growth'];

export default function Hero() {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [deleting, setDeleting] = useState(false);

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

  const container: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
  };

  return (
    <section id="home" className="grid-bg" style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      paddingTop: '100px', paddingBottom: '60px',
      paddingLeft: '24px', paddingRight: '24px',
    }}>
      {/* Subtle orbs */}
      <div className="orb orb-purple" style={{ width: '500px', height: '500px', top: '-80px', right: '-100px', opacity: 0.8 }} />
      <div className="orb orb-cyan"   style={{ width: '380px', height: '380px', bottom: '-40px', left: '-80px', opacity: 0.6 }} />

      <div className="container" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <motion.div variants={container} initial="hidden" animate="show">

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
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #fff 30%, #777 100%)',
              WebkitBackgroundClip: 'text', backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {displayed}
            </span>
            <span className="cursor" />
          </motion.div>

          <motion.p variants={item} style={{
            fontSize: 'clamp(15px, 1.6vw, 18px)', color: 'var(--text-secondary)',
            maxWidth: '560px', margin: '0 auto 40px', lineHeight: 1.8,
          }}>
            InsightForge uses specialized AI agents to automate data cleaning, analysis,
            visualization, and insight generation — turning messy datasets into strategic
            decisions at the speed of thought.
          </motion.p>

          <motion.div variants={item} style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }} className="hero-btns">
            <a href="#contact" className="btn-primary">Get Started <ArrowRight size={16} /></a>
            <a href="#about"   className="btn-outline">Learn More</a>
          </motion.div>

          <motion.div variants={item} style={{
            display: 'flex', gap: '10px', justifyContent: 'center',
            flexWrap: 'wrap', marginTop: '44px',
          }}>
            {['Auto-cleaning', 'Real-time Analysis', 'AI Insights', 'Visual Reports'].map((t) => (
              <span key={t} className="tag-pill">{t}</span>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
