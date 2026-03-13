'use client';

import { useEffect, useState } from 'react';

export default function Loader() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Start fade-out after 2.2 s, fully remove after 2.8 s
    const fadeTimer = setTimeout(() => setFadeOut(true), 2200);
    const hideTimer = setTimeout(() => setVisible(false), 2800);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);

  if (!visible) return null;

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          transition: 'opacity 0.7s ease',
          opacity: fadeOut ? 0 : 1,
          pointerEvents: fadeOut ? 'none' : 'all',
        }}
      >
        {/* 3-D tower loader */}
        <div className="if-loader">
          <div className="if-box if-box-1">
            <div className="if-side-left" />
            <div className="if-side-right" />
            <div className="if-side-top" />
          </div>
          <div className="if-box if-box-2">
            <div className="if-side-left" />
            <div className="if-side-right" />
            <div className="if-side-top" />
          </div>
          <div className="if-box if-box-3">
            <div className="if-side-left" />
            <div className="if-side-right" />
            <div className="if-side-top" />
          </div>
          <div className="if-box if-box-4">
            <div className="if-side-left" />
            <div className="if-side-right" />
            <div className="if-side-top" />
          </div>
        </div>

    
      </div>

      <style>{`
        /* ── 3-D tower loader (scoped with if- prefix) ── */
        .if-loader {
          scale: 3;
          height: 50px;
          width: 40px;
        }

        .if-box {
          position: relative;
          opacity: 0;
          left: 10px;
        }

        .if-side-left {
          position: absolute;
          background-color: #cec5c5ff;
          width: 19px;
          height: 5px;
          transform: skew(0deg, -25deg);
          top: 14px;
          left: 10px;
        }

        .if-side-right {
          position: absolute;
          background-color: #cec5c5ff;
          width: 19px;
          height: 5px;
          transform: skew(0deg, 25deg);
          top: 14px;
          left: -9px;
        }

        .if-side-top {
          position: absolute;
          background-color: #ffffffff;
          width: 20px;
          height: 20px;
          rotate: 45deg;
          transform: skew(-20deg, -20deg);
        }

        .if-box-1 { animation: if-from-left  4s infinite; }
        .if-box-2 { animation: if-from-right 4s infinite; animation-delay: 1s; }
        .if-box-3 { animation: if-from-left  4s infinite; animation-delay: 2s; }
        .if-box-4 { animation: if-from-right 4s infinite; animation-delay: 3s; }

        @keyframes if-from-left {
          0%   { z-index: 20; opacity: 0; translate: -20px -6px; }
          20%  { z-index: 10; opacity: 1; translate:   0px  0px; }
          40%  { z-index:  9;             translate:   0px  4px; }
          60%  { z-index:  8;             translate:   0px  8px; }
          80%  { z-index:  7; opacity: 1; translate:   0px 12px; }
          100% { z-index:  5; opacity: 0; translate:   0px 30px; }
        }

        @keyframes if-from-right {
          0%   { z-index: 20; opacity: 0; translate:  20px -6px; }
          20%  { z-index: 10; opacity: 1; translate:   0px  0px; }
          40%  { z-index:  9;             translate:   0px  4px; }
          60%  { z-index:  8;             translate:   0px  8px; }
          80%  { z-index:  7; opacity: 1; translate:   0px 12px; }
          100% { z-index:  5; opacity: 0; translate:   0px 30px; }
        }
      `}</style>
    </>
  );
}
