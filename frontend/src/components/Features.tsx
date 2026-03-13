'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import {
  CheckCircle2, ArrowRight,
} from 'lucide-react';

const features = [
  {
    iconSrc: '/feature-agent-icons/orchestration.png',
    iconAlt: 'Orchestration Agent icon',
    iconCreditHref: 'https://www.flaticon.com/free-icons/agent',
    iconCreditText: 'Agent icons created by Freepik - Flaticon',
    number: '01',
    title: 'Orchestration Agent',
    desc: 'Coordinates the workflow and manages communication between all agents.',
    tags: ['Orchestration', 'Routing', 'Task Management'],
  },
  {
    iconSrc: '/feature-agent-icons/cleaning.png',
    iconAlt: 'Data Cleaning Agent icon',
    iconCreditHref: 'https://www.flaticon.com/free-icons/toilet',
    iconCreditText: 'Toilet icons created by IconBaandar - Flaticon',
    number: '02',
    title: 'Data Cleaning Agent',
    desc: 'Handles missing values, detects incorrect data types, removes duplicates, and prepares the dataset.',
    tags: ['Auto-impute', 'Deduplication', 'Type Checking'],
  },
  {
    iconSrc: '/feature-agent-icons/feature.png',
    iconAlt: 'Feature Analysis Agent icon',
    iconCreditHref: 'https://www.flaticon.com/free-icons/financial-report',
    iconCreditText: 'Financial report icons created by fatihicon - Flaticon',
    number: '03',
    title: 'Feature Analysis Agent',
    desc: 'Identifies relationships between columns, calculates correlations, and finds important features using analytical tools.',
    tags: ['Correlation', 'Relationships', 'Feature Importance'],
  },
  {
    iconSrc: '/feature-agent-icons/visualization.png',
    iconAlt: 'Visualization Agent icon',
    iconCreditHref: 'https://www.flaticon.com/free-icons/data-visualization',
    iconCreditText: 'Data visualization icons created by smashingstocks - Flaticon',
    number: '04',
    title: 'Visualization Agent',
    desc: 'Generates charts such as pie charts, bar graphs, correlation heatmaps, and diagram representations (e.g., Mermaid diagrams).',
    tags: ['Heatmaps', 'Interactive Charts', 'Mermaid Diagrams'],
  },
  {
    iconSrc: '/feature-agent-icons/insights.png',
    iconAlt: 'Insight Generation Agent icon',
    iconCreditHref: 'https://www.flaticon.com/free-icons/user-research',
    iconCreditText: 'User research icons created by Iconic Artisan - Flaticon',
    number: '05',
    title: 'Insight Generation Agent',
    desc: 'Interprets the cleaned data and feature analysis results to extract meaningful insights and patterns.',
    tags: ['Pattern Extraction', 'NLP Summaries', 'Advanced Algorithms'],
  },
  {
    iconSrc: '/feature-agent-icons/recommendation.png',
    iconAlt: 'Recommendation Agent icon',
    iconCreditHref: 'https://www.flaticon.com/free-icons/recomendation',
    iconCreditText: 'Recomendation icons created by Blackonion02 - Flaticon',
    number: '06',
    title: 'Recommendation Agent',
    desc: 'Converts insights into actionable business recommendations and highlights potential impact.',
    tags: ['Actionable Steps', 'Business ROI', 'Impact Tracking'],
  },
];

const COUNT = features.length;

/* ─── Single feature slide ─── */
function FeatureSlide({
  feature,
  scrollYProgress,
  index,
}: {
  feature: typeof features[0];
  scrollYProgress: MotionValue<number>;
  index: number;
}) {
  const start = index / COUNT;
  const end   = (index + 1) / COUNT;

  const opacity = useTransform(scrollYProgress, [start, start + 0.08, end - 0.08, end], [0, 1, 1, 0]);
  const y       = useTransform(scrollYProgress, [start, start + 0.08, end - 0.08, end], [50, 0, 0, -50]);
  const scale   = useTransform(scrollYProgress, [start, start + 0.08, end - 0.08, end], [0.93, 1, 1, 0.97]);

  return (
    <motion.div style={{ opacity, y, scale, position: 'absolute', inset: 0 }}>
      <div style={{
        height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
      }}>
        <div style={{
          maxWidth: '900px', width: '100%',
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '64px', alignItems: 'center',
        }} className="feature-slide-inner">

          {/* Text */}
          <div>
            <div style={{
              fontFamily: 'Outfit, sans-serif', fontSize: '88px',
              fontWeight: 900, lineHeight: 1,
              color: 'rgba(255,255,255,0.04)',
              marginBottom: '-12px', letterSpacing: '-0.04em',
            }}>
              {feature.number}
            </div>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              padding: '4px 12px', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50px',
              fontSize: '10px', fontWeight: 700, color: 'var(--text-primary)',
              letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              marginBottom: '18px',
            }}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.6)',
                }}
              />
              Agent
            </div>

            <h3 style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 'clamp(26px, 3.5vw, 42px)',
              fontWeight: 800, lineHeight: 1.15,
              letterSpacing: '-0.025em',
              marginBottom: '16px', color: 'var(--text-primary)',
            }}>
              {feature.title}
            </h3>

            <p style={{
              fontSize: '15px', color: 'var(--text-secondary)',
              lineHeight: 1.8, marginBottom: '24px', maxWidth: '400px',
            }}>
              {feature.desc}
            </p>

            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' as const }}>
              {feature.tags.map((tag) => (
                <span key={tag} style={{
                  padding: '4px 12px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '20px', fontSize: '11px',
                  color: 'var(--text-primary)', fontWeight: 500,
                }}>
                  {tag}
                </span>
              ))}
            </div>
            <a
              href={feature.iconCreditHref}
              target="_blank"
              rel="noreferrer"
              style={{
                marginTop: '14px',
                display: 'inline-block',
                fontSize: '11px',
                color: '#8f8f8f',
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
              }}
            >
              {feature.iconCreditText}
            </a>
          </div>

          {/* Icon card */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: '240px', height: '240px', borderRadius: '28px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', width: '180px', height: '180px',
                borderRadius: '50%', background: 'rgba(255,255,255,0.03)',
                filter: 'blur(40px)',
              }} />
              {(['tl','tr','bl','br'] as const).map((c) => (
                <span key={c} style={{
                  position: 'absolute', width: '16px', height: '16px',
                  border: '2px solid rgba(255,255,255,0.18)',
                  ...(c === 'tl' ? { top: 14, left: 14, borderRight: 'none', borderBottom: 'none' } : {}),
                  ...(c === 'tr' ? { top: 14, right: 14, borderLeft: 'none', borderBottom: 'none' } : {}),
                  ...(c === 'bl' ? { bottom: 14, left: 14, borderRight: 'none', borderTop: 'none' } : {}),
                  ...(c === 'br' ? { bottom: 14, right: 14, borderLeft: 'none', borderTop: 'none' } : {}),
                }} />
              ))}
              <img
                src={feature.iconSrc}
                alt={feature.iconAlt}
                width={112}
                height={112}
                style={{
                  width: '112px',
                  height: '112px',
                  objectFit: 'contain',
                  opacity: 1,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Progress dot (own component so useTransform is a top-level hook) ─── */
function ProgressDot({
  index,
  scrollYProgress,
}: {
  index: number;
  scrollYProgress: MotionValue<number>;
}) {
  const mid   = (index + 0.5) / COUNT;
  const start = index / COUNT;
  const end   = (index + 1) / COUNT;

  const active  = useTransform(scrollYProgress, [start, mid, end], [0, 1, 0]);
  const width   = useTransform(active, [0, 1], ['6px', '22px']);
  const opacity = useTransform(active, [0, 1], [0.22, 1]);

  return (
    <motion.div style={{
      height: '6px', width, borderRadius: '3px',
      background: '#fff', opacity,
    }} />
  );
}

/* ─── Counter label (own component) ─── */
function SlideCounter({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const rawIndex = useTransform(
    scrollYProgress,
    features.map((_, i) => (i + 0.5) / COUNT),
    features.map((_, i) => i + 1),
  );
  const label = useTransform(rawIndex, (v: number) => `0${Math.round(v)}`.slice(-2));

  return (
    <div style={{
      position: 'absolute', bottom: '32px', left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '12px', color: 'var(--text-muted)',
      letterSpacing: '0.1em', fontWeight: 600,
      display: 'flex', gap: '2px',
    }}>
      <motion.span>{label}</motion.span>
      <span>{'/ 06'}</span>
    </div>
  );
}

/* ─── Main export ─── */
export default function Features() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  return (
    <>
      {/* Tall scroll container */}
      <div ref={containerRef} id="features" style={{ height: `${COUNT * 100}vh`, position: 'relative' }}>

        {/* Sticky viewport */}
        <div style={{
          position: 'sticky', top: 0, height: '100vh',
          overflow: 'hidden', background: 'var(--bg-primary)',
        }}>

          {/* Header */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            padding: '96px 24px 0', textAlign: 'center', zIndex: 2,
          }}>
            <div className="section-badge" style={{ justifyContent: 'center' }}>
              <CheckCircle2 size={12} /> Platform Capabilities
            </div>
            <h2 className="section-title" style={{ textAlign: 'center', marginTop: '12px' }}>
              Six AI Agents, <span className="gradient-text">One Platform</span>
            </h2>
          </div>

          {/* Slides */}
          <div style={{ position: 'absolute', inset: 0, top: '168px' }}>
            {features.map((f, i) => (
              <FeatureSlide key={f.title} feature={f} scrollYProgress={scrollYProgress} index={i} />
            ))}
          </div>

          {/* Progress dots — right side */}
          <div style={{
            position: 'absolute', right: '24px', top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 10,
          }}>
            {features.map((_, i) => (
              <ProgressDot key={i} index={i} scrollYProgress={scrollYProgress} />
            ))}
          </div>

          {/* Slide counter */}
          <SlideCounter scrollYProgress={scrollYProgress} />

          {/* CTA */}
  
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .feature-slide-inner {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }
          .feature-slide-inner > div:last-child { display: none; }
        }
      `}</style>
    </>
  );
}
