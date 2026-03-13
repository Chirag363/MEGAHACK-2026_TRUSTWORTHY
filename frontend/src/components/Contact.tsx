'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useCallback, useState } from 'react';
import { Mail, MapPin, Phone, Send, MessageSquare } from 'lucide-react';
import { gsap } from 'gsap';

/* ─── contact info data ─── */
const contactInfo = [
  { icon: Mail,   label: 'Email',    value: 'hello@insightforge.ai', href: 'mailto:hello@insightforge.ai' },
  { icon: Phone,  label: 'Phone',    value: '+1 (800) INSIGHT',      href: 'tel:+18004676744' },
  { icon: MapPin, label: 'Location', value: 'Mumbai, India',         href: '#' },
];

/* ─── particle helpers ─── */
const GLOW = '255,255,255';

const mkParticle = (x: number, y: number): HTMLDivElement => {
  const el = document.createElement('div');
  el.style.cssText = `
    position:absolute;width:3px;height:3px;border-radius:50%;
    background:rgba(${GLOW},0.85);box-shadow:0 0 5px rgba(${GLOW},0.4);
    pointer-events:none;z-index:10;left:${x}px;top:${y}px;
  `;
  return el;
};

/* ─── animated card wrapper ─── */
function AnimatedCard({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  const ref   = useRef<HTMLDivElement>(null);
  const parts = useRef<HTMLDivElement[]>([]);
  const tids  = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hov   = useRef(false);
  const memo  = useRef<HTMLDivElement[]>([]);
  const init  = useRef(false);

  const initParticles = useCallback(() => {
    if (init.current || !ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    memo.current = Array.from({ length: 10 }, () => mkParticle(Math.random() * width, Math.random() * height));
    init.current = true;
  }, []);

  const clear = useCallback(() => {
    tids.current.forEach(clearTimeout);
    tids.current = [];
    parts.current.forEach(p =>
      void gsap.to(p, { scale: 0, opacity: 0, duration: 0.3, ease: 'back.in(1.7)', onComplete: () => { p.parentNode?.removeChild(p); } })
    );
    parts.current = [];
  }, []);

  const spawn = useCallback(() => {
    if (!ref.current || !hov.current) return;
    if (!init.current) initParticles();
    memo.current.forEach((p, i) => {
      const tid = setTimeout(() => {
        if (!hov.current || !ref.current) return;
        const cl = p.cloneNode(true) as HTMLDivElement;
        ref.current.appendChild(cl);
        parts.current.push(cl);
        gsap.fromTo(cl, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(1.7)' });
        gsap.to(cl, { x: (Math.random() - 0.5) * 80, y: (Math.random() - 0.5) * 80, rotation: Math.random() * 360, duration: 2 + Math.random() * 2, ease: 'none', repeat: -1, yoyo: true });
        gsap.to(cl, { opacity: 0.15, duration: 1.5, ease: 'power2.inOut', repeat: -1, yoyo: true });
      }, i * 100);
      tids.current.push(tid);
    });
  }, [initParticles]);

  /* glow-on-move */
  const onMove = useCallback((e: MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--glow-x', `${((e.clientX - r.left) / r.width) * 100}%`);
    ref.current.style.setProperty('--glow-y', `${((e.clientY - r.top) / r.height) * 100}%`);
    ref.current.style.setProperty('--glow-intensity', '1');
  }, []);

  /* click ripple */
  const onClick = useCallback((e: MouseEvent) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const d = Math.max(Math.hypot(x, y), Math.hypot(x - r.width, y), Math.hypot(x, y - r.height), Math.hypot(x - r.width, y - r.height));
    const rpl = document.createElement('div');
    rpl.style.cssText = `position:absolute;width:${d*2}px;height:${d*2}px;border-radius:50%;background:radial-gradient(circle,rgba(${GLOW},0.25) 0%,rgba(${GLOW},0.08) 40%,transparent 70%);left:${x-d}px;top:${y-d}px;pointer-events:none;z-index:5;`;
    ref.current.appendChild(rpl);
    gsap.fromTo(rpl, { scale: 0, opacity: 1 }, { scale: 1, opacity: 0, duration: 0.8, ease: 'power2.out', onComplete: () => rpl.remove() });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const enter = () => { hov.current = true;  spawn(); el.style.setProperty('--glow-intensity', '1'); };
    const leave = () => { hov.current = false; clear(); el.style.setProperty('--glow-intensity', '0'); };

    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    el.addEventListener('mousemove',  onMove as EventListener);
    el.addEventListener('click',      onClick as EventListener);
    return () => {
      hov.current = false;
      el.removeEventListener('mouseenter', enter);
      el.removeEventListener('mouseleave', leave);
      el.removeEventListener('mousemove',  onMove as EventListener);
      el.removeEventListener('click',      onClick as EventListener);
      clear();
    };
  }, [spawn, clear, onMove, onClick]);

  return (
    <div
      ref={ref}
      className={`animated-glass-card ${className ?? ''}`}
      style={{ ...style, position: 'relative', overflow: 'hidden',
        '--glow-x': '50%', '--glow-y': '50%', '--glow-intensity': '0',
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */

export default function Contact() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [formData, setFormData] = useState({ name: '', email: '', company: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setFormData({ name: '', email: '', company: '', message: '' });
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <section id="contact" ref={ref} className="section">
      <style>{`
        .animated-glass-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          transition: all 0.32s ease;
        }
        .animated-glass-card:hover {
          background: var(--bg-card-hover);
          border-color: var(--border-hover);
          transform: translateY(-3px);
          box-shadow: 0 16px 48px rgba(255,255,255,0.04);
        }
        /* border glow */
        .animated-glass-card::after {
          content: '';
          position: absolute;
          inset: 0;
          padding: 1px;
          background: radial-gradient(
            220px circle at var(--glow-x) var(--glow-y),
            rgba(${GLOW}, calc(var(--glow-intensity) * 0.7)) 0%,
            rgba(${GLOW}, calc(var(--glow-intensity) * 0.3)) 40%,
            transparent 65%
          );
          border-radius: inherit;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          pointer-events: none;
          z-index: 1;
        }
        @media (max-width: 768px) { .contact-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 768px) { .contact-form-row { grid-template-columns: 1fr !important; } }
      `}</style>

      <div className="container">
        <motion.div initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }} style={{ marginBottom: '48px' }}>
          <div className="section-badge"><MessageSquare size={12} />Get In Touch</div>
          <h2 className="section-title">Let&apos;s Build Something <span className="gradient-text">Remarkable</span></h2>
          <p className="section-desc">Have a data challenge or want to see InsightForge in action? Our team is ready to help.</p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px', alignItems: 'start' }} className="contact-grid">

          {/* ── Info ── */}
          <motion.div initial={{ opacity: 0, x: -24 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.55 }}>
            <AnimatedCard style={{ padding: '32px', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: 'Outfit,sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '22px' }}>Contact Information</h3>
              {contactInfo.map(({ icon: Icon, label, value, href }) => (
                <a key={label} href={href} style={{ display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none', color: 'inherit', padding: '12px 14px', borderRadius: '10px', transition: 'background 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={17} color="#bbb" />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{value}</div>
                  </div>
                </a>
              ))}
            </AnimatedCard>

            <AnimatedCard style={{ padding: '24px' }}>
              <h4 style={{ fontFamily: 'Outfit,sans-serif', fontSize: '14px', fontWeight: 700, marginBottom: '14px' }}>Support Hours</h4>
              {[
                { day: 'Mon – Fri', hours: '9 AM – 6 PM IST' },
                { day: 'Saturday',  hours: '10 AM – 4 PM IST' },
                { day: 'Sunday',    hours: 'Closed' },
              ].map(({ day, hours }) => (
                <div key={day} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{day}</span>
                  <span style={{ fontWeight: 500 }}>{hours}</span>
                </div>
              ))}
            </AnimatedCard>
          </motion.div>

          {/* ── Form ── */}
          <motion.div initial={{ opacity: 0, x: 24 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.55, delay: 0.1 }}>
            <AnimatedCard style={{ padding: '36px' }}>
              <h3 style={{ fontFamily: 'Outfit,sans-serif', fontSize: '20px', fontWeight: 700, marginBottom: '26px' }}>Send us a Message</h3>

              {sent ? (
                <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ textAlign: 'center', padding: '44px 20px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '44px', marginBottom: '14px' }}>✓</div>
                  <h4 style={{ fontFamily: 'Outfit,sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Message Sent!</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>We&apos;ll get back to you within 24 hours.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }} className="contact-form-row">
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '7px', color: 'var(--text-secondary)' }}>Full Name *</label>
                      <input required className="input-field" placeholder="John Smith" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '7px', color: 'var(--text-secondary)' }}>Email *</label>
                      <input required type="email" className="input-field" placeholder="john@company.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '7px', color: 'var(--text-secondary)' }}>Company</label>
                    <input className="input-field" placeholder="Your Company Inc." value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '7px', color: 'var(--text-secondary)' }}>Message *</label>
                    <textarea required className="input-field" placeholder="Tell us about your data challenges..." value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} />
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '15px' }}>
                    Send Message <Send size={15} />
                  </button>
                </form>
              )}
            </AnimatedCard>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
