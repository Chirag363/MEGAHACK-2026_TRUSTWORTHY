'use client';

import { motion, useInView } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useRef } from 'react';
import { Target, Lightbulb, TrendingUp, Shield, Users, Globe } from 'lucide-react';

const pillars = [
  { icon: Target,     title: 'The Problem',    desc: 'SMEs generate valuable data from sales, customers, inventory, and operations, but most cannot afford analysts or complex BI teams to turn it into decisions.' },
  { icon: Lightbulb, title: 'Our Solution', desc: 'InsightForge acts as a virtual data analyst that autonomously cleans data, analyzes relationships, builds visualizations, and delivers clear business recommendations.' },
  { icon: TrendingUp, title: 'What Makes Us Different',    desc: 'Unlike dashboard-only tools, our orchestrated AI agents interpret patterns, explain findings, and recommend actions end-to-end.' },
];

const highlights = [
  { icon: Shield, label: 'Affordable Intelligence for SMEs' },
  { icon: Users,  label: 'AI-Orchestrated Multi-Agent Workflow' },
  { icon: Globe,  label: 'Built for Retail, Logistics, Hospitality & Services' },
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
            AI-Orchestrated Autonomous<br />
            <span className="gradient-text">Data Intelligence for SMEs</span>
          </h2>
          <p className="section-desc">
            Every business generates data, but few can use it effectively. InsightForge transforms raw datasets into
            structured insights, visualizations, and actionable recommendations for non-technical decision makers.
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
                Traditional BI tools mainly provide dashboards and charts, but still depend on skilled professionals
                to interpret patterns and generate actions. InsightForge automates the full analytics pipeline with
                specialized AI agents so SMEs can move from raw operational data to clear, decision-ready intelligence.
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
                { label: 'Primary Users',    val: 'SMEs' },
                { label: 'Analytics Pipeline',   val: 'Auto' },
                { label: 'Decision Speed', val: 'Faster' },
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
