'use client';

import { motion, useInView } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useRef } from 'react';
import { Target, Lightbulb, TrendingUp, Shield, Users, Globe } from 'lucide-react';

const pillars = [
  { icon: Target,     title: 'Mission',    desc: 'Democratize data analytics so every business can make AI-powered decisions in real time.' },
  { icon: Lightbulb, title: 'Innovation', desc: 'We orchestrate specialized AI agents that collaborate to clean, analyze, and synthesize insights.' },
  { icon: TrendingUp, title: 'Impact',    desc: 'Reduce time-to-insight from weeks to minutes, empowering teams to act with full confidence.' },
];

const highlights = [
  { icon: Shield, label: 'Enterprise-Grade Security' },
  { icon: Users,  label: 'Multi-Agent Collaboration' },
  { icon: Globe,  label: 'Scalable Infrastructure' },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.58 } },
};

export default function About() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="about" ref={ref} style={{ padding: '80px 24px 100px', position: 'relative', zIndex: 1, overflow: 'hidden' }}>
      <div className="orb orb-violet" style={{ width: '500px', height: '500px', left: '-200px', top: '0', opacity: 0.5 }} />
      <div className="container">

        <motion.div variants={fadeUp} initial="hidden" animate={inView ? 'show' : 'hidden'}
          style={{ marginBottom: '52px', maxWidth: '600px' }}>
          <div className="section-badge">About InsightForge</div>
          <h2 className="section-title">
            We Built the Platform<br />
            <span className="gradient-text">Data Teams Dream Of</span>
          </h2>
          <p className="section-desc">
            InsightForge is an AI-orchestrated analytics platform where specialized agents handle the full pipeline —
            from raw data to polished, boardroom-ready insights.
          </p>
        </motion.div>

        {/* Pillars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', marginBottom: '28px' }}>
          {pillars.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div key={p.title} variants={fadeUp} initial="hidden"
                animate={inView ? 'show' : 'hidden'} transition={{ delay: 0.1 * i }}
                className="glass-card" style={{ padding: '28px' }}>
                <div className="feature-icon"><Icon size={20} color="#fff" /></div>
                <h3 style={{ fontFamily: 'Outfit,sans-serif', fontSize: '19px', fontWeight: 700, marginBottom: '10px' }}>{p.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7 }}>{p.desc}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Story card */}
        <motion.div variants={fadeUp} initial="hidden" animate={inView ? 'show' : 'hidden'} transition={{ delay: 0.32 }}
          className="glass-card" style={{ padding: '38px', borderColor: 'rgba(255,255,255,0.14)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '36px', alignItems: 'center' }}
            className="about-inner-grid">
            <div>
              <h3 style={{ fontFamily: 'Outfit,sans-serif', fontSize: '24px', fontWeight: 800, marginBottom: '14px' }}>
                The Problem We Solve
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.8, marginBottom: '22px' }}>
                Traditional BI tools demand data experts, weeks of setup, and endless manual work.
                InsightForge deploys AI agents that instantly understand your data, clean inconsistencies,
                run deep analysis, and produce human-readable narratives — all within minutes.
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {highlights.map(({ icon: Icon, label }) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 14px', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border)', borderRadius: '50px',
                    fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)',
                  }}>
                    <Icon size={12} color="#fff" />{label}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '150px' }}
              className="about-stat-col">
              {[
                { label: 'Data Cleaned',    val: '99.2%' },
                { label: 'Agents Active',   val: '12+' },
                { label: 'Faster Insights', val: '40×' },
              ].map((s) => (
                <div key={s.label} style={{
                  padding: '16px 20px', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)', borderRadius: '12px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'Outfit', color: '#fff', marginBottom: '4px' }}>{s.val}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .about-inner-grid { grid-template-columns: 1fr !important; }
          .about-stat-col   { display: none !important; }
        }
      `}</style>
    </section>
  );
}
