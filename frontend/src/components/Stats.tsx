'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';

const stats = [
  { number: 6,   suffix: '',     label: 'AI Agents',                 desc: 'Specialized agents in one orchestrated workflow' },
  { number: 4,   suffix: '+',    label: 'SME Sectors',               desc: 'Retail, logistics, hospitality, and services' },
  { number: 100, suffix: '%',    label: 'Pipeline Automation',       desc: 'From data cleaning to recommendations' },
  { number: 3,   suffix: ' min', label: 'Time to First Insight',     desc: 'Typical turnaround is around 2-3 minutes' },
];

function CountUp({ to, suffix }: { to: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let n = 0;
    const step = to / 50;
    const timer = setInterval(() => {
      n += step;
      if (n >= to) { setCount(to); clearInterval(timer); }
      else setCount(Math.floor(n));
    }, 28);
    return () => clearInterval(timer);
  }, [inView, to]);

  return <span ref={ref} className="stat-number">{count}{suffix}</span>;
}

export default function Stats() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} style={{ padding: '72px 24px', position: 'relative', zIndex: 1 }}>
      <div className="divider" style={{ marginBottom: '72px' }} />
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }} style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className="section-badge" style={{ justifyContent: 'center' }}>
            <TrendingUp size={12} />Proven Impact
          </div>
          <h2 className="section-title" style={{ textAlign: 'center' }}>
            Numbers That <span className="gradient-text">Speak for Themselves</span>
          </h2>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, scale: 0.92 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.45, delay: i * 0.09 }}
              className="glass-card" style={{ padding: '36px 28px', textAlign: 'center' }}>
              <CountUp to={s.number} suffix={s.suffix} />
              <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: '16px', fontWeight: 700, marginTop: '10px', marginBottom: '5px' }}>{s.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="divider" style={{ marginTop: '72px' }} />
    </section>
  );
}
