'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { ArrowRight, Rocket } from 'lucide-react';

export default function CTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} style={{ padding: '60px 24px 100px', position: 'relative', zIndex: 1 }}>
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 36 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          style={{
            borderRadius: '24px', overflow: 'hidden',
            padding: '72px 44px', textAlign: 'center', position: 'relative',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}>
          {/* Soft glow blobs */}
          <div className="orb orb-purple" style={{ width: '380px', height: '380px', top: '-100px', left: '-100px', opacity: 0.4 }} />
          <div className="orb orb-cyan"   style={{ width: '280px', height: '280px', bottom: '-80px', right: '-80px', opacity: 0.35 }} />
          {/* Grid overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '40px 40px', pointerEvents: 'none',
          }} />

          <motion.div animate={{ y: [-7, 7, -7] }} transition={{ duration: 4, repeat: Infinity }}
            style={{
              display: 'inline-flex', marginBottom: '22px',
              width: '64px', height: '64px', borderRadius: '18px',
              background: '#fff', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 32px rgba(255,255,255,0.12)', position: 'relative', zIndex: 1,
            }}>
            <Rocket size={28} color="#000" />
          </motion.div>

          <h2 style={{
            fontFamily: 'Outfit,sans-serif', fontSize: 'clamp(28px, 4.5vw, 48px)',
            fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '14px',
            position: 'relative', zIndex: 1,
          }}>
            Ready to Transform Your Data?
          </h2>
          <p style={{
            color: 'var(--text-secondary)', fontSize: '17px', lineHeight: 1.75,
            maxWidth: '500px', margin: '0 auto 36px', position: 'relative', zIndex: 1,
          }}>
            Join forward-thinking businesses using InsightForge to turn raw data into competitive advantage — in minutes, not weeks.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
            <a href="#contact" className="btn-primary">Start Your Journey <ArrowRight size={16} /></a>
            <a href="#about"   className="btn-outline">See How It Works</a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
