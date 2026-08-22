import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import {
  Send, ArrowRight, CheckCircle2, Sparkles, Zap, ShieldCheck, Mail, Users, BarChart3, ChevronDown, Lock, Globe
} from 'lucide-react';

import { useReducedMotion } from '../../hooks/useReducedMotion';
import SupportBubble from '../common/SupportBubble';

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  // Navigation hide/show on scroll state
  const [navScrolled, setNavScrolled] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Section refs for GSAP animations
  const heroRef = useRef<HTMLDivElement>(null);
  const heroMockupRef = useRef<HTMLDivElement>(null);
  const heroImageRef = useRef<HTMLImageElement>(null);
  const trustRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const whyFreeRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const ctaImageRef = useRef<HTMLImageElement>(null);

  // How it works scroll line ref
  const linePathRef = useRef<SVGPathElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 3D Tilt & Parallax Motion Values for Modern Hero
  const rotateX = useSpring(useMotionValue(0), { stiffness: 120, damping: 14 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 120, damping: 14 });
  const avatar1X = useSpring(useMotionValue(0), { stiffness: 90, damping: 18 });
  const avatar1Y = useSpring(useMotionValue(0), { stiffness: 90, damping: 18 });
  const avatar2X = useSpring(useMotionValue(0), { stiffness: 70, damping: 18 });
  const avatar2Y = useSpring(useMotionValue(0), { stiffness: 70, damping: 18 });
  const avatar3X = useSpring(useMotionValue(0), { stiffness: 110, damping: 18 });
  const avatar3Y = useSpring(useMotionValue(0), { stiffness: 110, damping: 18 });

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    if (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) return;
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const normX = (e.clientX - centerX) / (rect.width / 2);
    const normY = (e.clientY - centerY) / (rect.height / 2);

    rotateY.set(normX * 8);
    rotateX.set(-normY * 8);

    avatar1X.set(normX * -24);
    avatar1Y.set(normY * -24);
    avatar2X.set(normX * 28);
    avatar2Y.set(normY * 28);
    avatar3X.set(normX * 18);
    avatar3Y.set(normY * -18);
  };

  const handleHeroMouseLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    avatar1X.set(0);
    avatar1Y.set(0);
    avatar2X.set(0);
    avatar2Y.set(0);
    avatar3X.set(0);
    avatar3Y.set(0);
  };

  // 1. Lenis Smooth Scroll Setup
  useEffect(() => {
    if (reducedMotion) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
    });

    lenis.on('scroll', (e: any) => {
      ScrollTrigger.update();

      const currentScroll = e.scroll;
      if (currentScroll > 50) {
        setNavScrolled(true);
      } else {
        setNavScrolled(false);
      }

      if (currentScroll > lastScrollY.current && currentScroll > 200) {
        setNavVisible(false); // Hide on scroll down
      } else {
        setNavVisible(true); // Show on scroll up
      }
      lastScrollY.current = currentScroll;
    });

    const updateRaf = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateRaf);

    return () => {
      gsap.ticker.remove(updateRaf);
      lenis.destroy();
    };
  }, [reducedMotion]);

  // 2. GSAP ScrollTrigger Animations
  useEffect(() => {
    if (reducedMotion) return;

    const ctx = gsap.context(() => {
      // Centered Hero Staggered Load Sequence
      if (heroRef.current) {
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        tl.fromTo('.hero-grain-bg', { opacity: 0 }, { opacity: 0.04, duration: 0.6 })
          .fromTo('.hero-badge', { opacity: 0, y: 15, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.5 }, '-=0.3')
          .fromTo('.hero-headline', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7 }, '-=0.2')
          .fromTo('.hero-subheadline', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.3')
          .fromTo('.hero-cta-group', { opacity: 0, y: 20, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.5 }, '-=0.3')
          .fromTo('.hero-avatar-edge', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.6)' }, '-=0.4')
          .fromTo('.hero-mockup-peeking', { opacity: 0, y: 80, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'power2.out' }, '-=0.5');
      }

      // Scroll-triggered Mockup Elevation
      if (heroMockupRef.current && heroRef.current) {
        gsap.to(heroMockupRef.current, {
          yPercent: -12,
          scale: 1.02,
          ease: 'none',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'center center',
            end: 'bottom top',
            scrub: true,
          },
        });
      }

      // Trust Strip Reveal
      if (trustRef.current) {
        gsap.fromTo(
          trustRef.current,
          { opacity: 0, y: 25 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: trustRef.current,
              start: 'top 85%',
            },
          }
        );
      }

      // Feature Blocks Staggered Reveal
      if (featuresRef.current) {
        const featureCards = gsap.utils.toArray('.feature-card');
        featureCards.forEach((card: any, idx) => {
          gsap.fromTo(
            card,
            { opacity: 0, y: 40, scale: 0.96 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.8,
              delay: idx * 0.15,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: card,
                start: 'top 85%',
              },
            }
          );
        });
      }

      // How It Works Connected Progress Line Animation
      if (howItWorksRef.current && linePathRef.current) {
        const path = linePathRef.current;
        const length = path.getTotalLength();

        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: length,
        });

        gsap.to(path, {
          strokeDashoffset: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: howItWorksRef.current,
            start: 'top 70%',
            end: 'bottom 80%',
            scrub: true,
          },
        });

        stepRefs.current.forEach((step, idx) => {
          if (!step) return;
          gsap.fromTo(
            step,
            { opacity: 0, y: 35 },
            {
              opacity: 1,
              y: 0,
              duration: 0.7,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: step,
                start: 'top 80%',
                onEnter: () => {
                  const numEl = step.querySelector('.step-number');
                  if (numEl) {
                    numEl.classList.add('bg-[#054048]', 'text-white', 'scale-110');
                    numEl.classList.remove('bg-white', 'text-[#5A5A5A]');
                  }
                },
              },
            }
          );
        });
      }

      // Why Free Section Reveal
      if (whyFreeRef.current) {
        gsap.fromTo(
          whyFreeRef.current,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: whyFreeRef.current,
              start: 'top 80%',
            },
          }
        );
      }

      // Final CTA Section Parallax & Reveal
      if (ctaRef.current) {
        gsap.fromTo(
          '.cta-stagger',
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            stagger: 0.15,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: ctaRef.current,
              start: 'top 75%',
            },
          }
        );

        if (ctaImageRef.current) {
          gsap.to(ctaImageRef.current, {
            yPercent: -12,
            ease: 'none',
            scrollTrigger: {
              trigger: ctaRef.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          });
        }
      }
    });

    return () => ctx.revert();
  }, [reducedMotion]);

  // Magnetic Button Effect Hook (for Final CTA button)
  const buttonX = useMotionValue(0);
  const buttonY = useMotionValue(0);
  const springX = useSpring(buttonX, { stiffness: 150, damping: 15 });
  const springY = useSpring(buttonY, { stiffness: 150, damping: 15 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (reducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distanceX = e.clientX - centerX;
    const distanceY = e.clientY - centerY;
    buttonX.set(distanceX * 0.25);
    buttonY.set(distanceY * 0.25);
  };

  const handleMouseLeave = () => {
    buttonX.set(0);
    buttonY.set(0);
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-[#1A1A1A] font-sans antialiased overflow-x-hidden">
      
      {/* 1. GUMROAD-INSPIRED SOLID BORDER TOP NAVIGATION */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-[#F8F8F8] border-b-2 border-black shadow-sm ${
          navVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16">
          {/* Logo / Wordmark */}
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer group py-2"
          >
            <div className="w-9 h-9 rounded-xl bg-[#054048] text-white flex items-center justify-center border-2 border-black shadow-sm transition-transform group-hover:scale-105">
              <Send className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-base md:text-lg text-[#1A1A1A] tracking-tight">
              The Mailling Company
            </span>
          </div>

          {/* Nav Center Links */}
          <div className="hidden md:flex items-center gap-2 text-xs font-extrabold text-[#1A1A1A]">
            <a href="#features" className="px-4 py-2 rounded-full hover:bg-black hover:text-white transition-all">
              Features
            </a>
            <a href="#how-it-works" className="px-4 py-2 rounded-full hover:bg-black hover:text-white transition-all">
              How it works
            </a>
            <a href="#why-free" className="px-4 py-2 rounded-full hover:bg-black hover:text-white transition-all">
              Why it's free
            </a>
          </div>

          {/* Action Buttons Right (Gumroad Boxed Border Style) */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-black text-[#1A1A1A] hover:bg-[#FEF6EA] hover:text-[#054048] px-4 py-2 rounded-xl border-2 border-black transition-all cursor-pointer"
            >
              Sign in
            </button>

            <motion.button
              whileHover={reducedMotion ? {} : { scale: 1.02 }}
              whileTap={reducedMotion ? {} : { scale: 0.98 }}
              onClick={() => navigate('/login')}
              className="py-2 px-5 text-xs font-black bg-black text-white hover:bg-[#054048] border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all cursor-pointer"
            >
              Get started free
            </motion.button>
          </div>
        </div>
      </nav>

      {/* 2. CENTERED HERO SECTION */}
      <section
        ref={heroRef}
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
        className="relative pt-36 pb-16 md:pt-44 md:pb-24 px-6 max-w-7xl mx-auto flex flex-col items-center text-center overflow-hidden bg-[#F8F8F8]"
      >
        {/* Subtle Background Noise Grain & Ambient Depth Glow */}
        <div className="hero-grain-bg absolute inset-0 opacity-[0.035] pointer-events-none z-0 bg-[radial-gradient(#1A1A1A_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="hero-blob absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#FEF6EA] rounded-full blur-3xl opacity-60 -z-10 pointer-events-none" />

        {/* Floating Decorative Character Avatars (Framing Page Edges on Tablet & Desktop) */}
        {/* Avatar 1: Top-Left Corner (Hidden on mobile < 768px so it never overlaps mobile text) */}
        <motion.div
          style={{ x: reducedMotion ? 0 : avatar1X, y: reducedMotion ? 0 : avatar1Y }}
          className="hero-avatar-edge absolute top-32 lg:top-36 left-4 lg:left-12 xl:left-20 hidden md:flex z-10 pointer-events-none select-none"
        >
          <motion.div
            animate={reducedMotion ? {} : { y: [-8, 8], rotate: [-14, -8] }}
            transition={{ duration: 4.2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            className="flex flex-col items-center gap-2"
          >
            <img
              src="/assets/Avatar1.png"
              alt="Personalized AI Avatar"
              className="w-24 h-24 lg:w-36 lg:h-36 rounded-3xl border-2 border-black object-cover bg-[#FEF6EA] shadow-card transform -rotate-12"
            />
            <div className="bg-white border-2 border-black px-2.5 py-1 rounded-full text-[10px] font-black text-[#1A1A1A] shadow-sm flex items-center gap-1">
              <span>👋 Personalized AI</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Avatar 2: Top-Right Corner (Hidden on mobile < 768px) */}
        <motion.div
          style={{ x: reducedMotion ? 0 : avatar2X, y: reducedMotion ? 0 : avatar2Y }}
          className="hero-avatar-edge absolute top-32 lg:top-36 right-4 lg:right-12 xl:right-20 hidden md:flex z-10 pointer-events-none select-none"
        >
          <motion.div
            animate={reducedMotion ? {} : { y: [-10, 10], rotate: [16, 22] }}
            transition={{ duration: 4.8, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 0.4 }}
            className="flex flex-col items-center gap-2"
          >
            <img
              src="/assets/Avatar3.png"
              alt="Verified Domain Avatar"
              className="w-24 h-24 lg:w-36 lg:h-36 rounded-3xl border-2 border-black object-cover bg-[#FEF6EA] shadow-card transform rotate-16"
            />
            <div className="bg-white border-2 border-black px-2.5 py-1 rounded-full text-[10px] font-black text-[#054048] shadow-sm flex items-center gap-1">
              <span>🎯 Verified Domain</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Avatar 3: Middle-Left Edge (Desktop only) */}
        <motion.div
          style={{ x: reducedMotion ? 0 : avatar3X, y: reducedMotion ? 0 : avatar3Y }}
          className="hero-avatar-edge absolute top-[52%] left-3 lg:left-8 xl:left-14 hidden lg:flex z-10 pointer-events-none select-none"
        >
          <motion.div
            animate={reducedMotion ? {} : { y: [-7, 7], rotate: [12, 6] }}
            transition={{ duration: 4.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 0.8 }}
            className="flex flex-col items-center gap-1.5"
          >
            <img
              src="/assets/Avatar5.png"
              alt="Native Inbox Send Avatar"
              className="w-24 h-24 lg:w-32 lg:h-32 rounded-3xl border-2 border-black object-cover bg-[#E6F4F1] shadow-card transform rotate-12"
            />
            <div className="bg-white border-2 border-black px-2 py-0.5 rounded-full text-[9px] font-black text-[#1A1A1A] shadow-sm">
              <span>⚡ Direct Inbox Send</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Avatar 4: Middle-Right Edge (Desktop only) */}
        <motion.div
          style={{ x: reducedMotion ? 0 : avatar1X, y: reducedMotion ? 0 : avatar1Y }}
          className="hero-avatar-edge absolute top-[52%] right-3 lg:right-8 xl:right-14 hidden lg:flex z-10 pointer-events-none select-none"
        >
          <motion.div
            animate={reducedMotion ? {} : { y: [-9, 9], rotate: [-18, -12] }}
            transition={{ duration: 5.1, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 1.2 }}
            className="flex flex-col items-center gap-1.5"
          >
            <img
              src="/assets/Avatar6.png"
              alt="Zero Spam Risk Avatar"
              className="w-24 h-24 lg:w-32 lg:h-32 rounded-3xl border-2 border-black object-cover bg-[#FEF6EA] shadow-card transform -rotate-18"
            />
            <div className="bg-white border-2 border-black px-2 py-0.5 rounded-full text-[9px] font-black text-[#054048] shadow-sm">
              <span>✓ 0 Spam Filter Risk</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Centered Column Content Block */}
        <div className="max-w-4xl mx-auto space-y-7 z-20 relative pt-2 sm:pt-4">
          {/* Eyebrow Badge */}
          <div className="hero-badge inline-flex items-center gap-2 bg-[#FEF6EA] border-2 border-black px-4 py-1.5 rounded-full text-xs sm:text-sm font-black text-[#054048] shadow-sm hover:scale-105 transition-transform cursor-default">
            <Sparkles className="w-4 h-4 text-[#054048]" />
            <span>✦ Free forever — no credit card</span>
          </div>

          {/* Centered Large Bold Headline (Responsive scaling so it's spacious on mobile & huge on desktop) */}
          <h1 className="hero-headline text-3xl sm:text-6xl md:text-7xl lg:text-[88px] xl:text-[96px] font-black text-[#1A1A1A] tracking-tight leading-[1.05] max-w-4xl mx-auto px-2">
            The inbox likes you again.
          </h1>

          {/* Centered Subheadline */}
          <p className="hero-subheadline text-base sm:text-lg md:text-xl text-[#5A5A5A] leading-relaxed font-semibold max-w-2xl mx-auto">
            Write one email. AI makes it personal for every single contact — sent straight from your own inbox. No per-email fees, ever.
          </p>

          {/* Primary CTA & Secondary Link */}
          <div className="hero-cta-group flex flex-col items-center gap-3 pt-2">
            <motion.button
              whileHover={reducedMotion ? {} : { scale: 1.05, y: -2 }}
              whileTap={reducedMotion ? {} : { scale: 0.98 }}
              onClick={() => navigate('/login')}
              className="btn-primary py-4 px-10 text-base font-black gap-3 flex items-center justify-center cursor-pointer shadow-md"
            >
              <span>Start sending free</span>
              <ArrowRight className="w-5 h-5 stroke-[3]" />
            </motion.button>

            <a
              href="#how-it-works"
              className="text-xs font-extrabold text-[#5A5A5A] hover:text-black flex items-center gap-1.5 transition-colors cursor-pointer pt-1"
            >
              <span>See how it works</span>
              <ChevronDown className="w-4 h-4 text-[#054048]" />
            </a>
          </div>
        </div>

        {/* FULL UN-CROPPED VIBRANT DASHBOARD MOCKUP */}
        <div className="w-full max-w-5xl z-20 mt-14 mb-8 sm:mb-12 relative px-2 sm:px-4">
          <div
            ref={heroMockupRef}
            className="hero-mockup-peeking w-full bg-white border-2 border-black rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 transform-gpu"
          >
            {/* Browser Window Header Chrome */}
            <div className="bg-[#F0F0F0] border-b-2 border-black px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border border-black bg-[#FF5F56]" />
                <div className="w-3 h-3 rounded-full border border-black bg-[#FFBD2E]" />
                <div className="w-3 h-3 rounded-full border border-black bg-[#27C93F]" />
              </div>
              <div className="bg-white border-2 border-black rounded-lg text-[11px] font-mono text-[#5A5A5A] px-4 py-1 flex items-center gap-2 shadow-inner max-w-xs truncate">
                <Lock className="w-3 h-3 text-[#054048]" />
                <span>app.themaillingcompany.com/dashboard</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 bg-[#E6F4F1] border-2 border-black px-3 py-0.5 rounded-full text-[10px] font-black text-[#054048]">
                <Zap className="w-3 h-3 text-[#054048]" />
                <span>Dashboard Active</span>
              </div>
            </div>

            {/* Vibrant Rich Inner Dashboard Mockup Content */}
            <div className="p-5 sm:p-8 space-y-6 bg-[#F8F8F8] text-left">
              {/* Vibrant Overview Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-[#FEF6EA] border-2 border-black rounded-2xl p-4 space-y-1 shadow-sm">
                  <div className="text-[11px] font-bold text-[#5A5A5A] uppercase tracking-wider">Total Delivered</div>
                  <div className="text-2xl sm:text-3xl font-black text-[#054048]">12,840</div>
                  <div className="text-[10px] text-[#054048] font-black bg-white/80 border border-black/20 rounded-full px-2 py-0.5 inline-block">
                    ↑ 100% Inbox Rate
                  </div>
                </div>

                <div className="bg-[#E6F4F1] border-2 border-black rounded-2xl p-4 space-y-1 shadow-sm">
                  <div className="text-[11px] font-bold text-[#5A5A5A] uppercase tracking-wider">Avg Open Rate</div>
                  <div className="text-2xl sm:text-3xl font-black text-[#054048]">68.4%</div>
                  <div className="text-[10px] text-[#054048] font-black bg-white/80 border border-black/20 rounded-full px-2 py-0.5 inline-block">
                    ✦ Verified Native Inbox
                  </div>
                </div>

                <div className="bg-[#F0FDF4] border-2 border-black rounded-2xl p-4 space-y-1 shadow-sm">
                  <div className="text-[11px] font-bold text-[#15803D] uppercase tracking-wider">Inbox Placement</div>
                  <div className="text-2xl sm:text-3xl font-black text-[#15803D]">99.8%</div>
                  <div className="text-[10px] text-[#15803D] font-black bg-white/80 border border-black/20 rounded-full px-2 py-0.5 inline-block">
                    ✓ Zero Spam Filter Risk
                  </div>
                </div>

                <div className="bg-[#F5F3FF] border-2 border-black rounded-2xl p-4 space-y-1 shadow-sm">
                  <div className="text-[11px] font-bold text-[#6D28D9] uppercase tracking-wider">Active Campaigns</div>
                  <div className="text-2xl sm:text-3xl font-black text-[#6D28D9]">4 Running</div>
                  <div className="text-[10px] text-[#6D28D9] font-black bg-white/80 border border-black/20 rounded-full px-2 py-0.5 inline-block">
                    ⚡ Unlimited Free Scale
                  </div>
                </div>
              </div>

              {/* Rich Colorful Active Campaign Feed */}
              <div className="bg-white border-2 border-black rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-black/10 pb-4 gap-3">
                  <div>
                    <h3 className="text-base font-black text-[#1A1A1A]">Q3 Founders Outreach Campaign</h3>
                    <p className="text-xs text-[#5A5A5A] font-semibold">842 Contacts · 1-of-1 AI Personalization Enabled</p>
                  </div>
                  <span className="bg-[#FEF6EA] text-[#054048] border-2 border-black text-xs font-black px-3.5 py-1.5 rounded-full self-start sm:self-auto shadow-sm">
                    ● Live Sending (100% Safe)
                  </span>
                </div>

                {/* Recipient Activity Stream */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-bold text-[#1A1A1A] bg-[#FEF6EA]/60 p-3.5 rounded-xl border-2 border-black gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#34A853]" />
                      <span>alex.rivera@startup.io → <strong className="text-[#054048]">sarah.chen@innovate.co</strong> (VP Marketing)</span>
                    </div>
                    <span className="text-[#054048] font-black bg-white border border-black/30 px-2.5 py-1 rounded-full text-[11px] self-start sm:self-auto">
                      ✓ Delivered directly to Inbox
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-bold text-[#1A1A1A] bg-[#E6F4F1]/60 p-3.5 rounded-xl border-2 border-black gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#34A853]" />
                      <span>alex.rivera@startup.io → <strong className="text-[#054048]">marcus.vane@nexus.io</strong> (Head of Growth)</span>
                    </div>
                    <span className="text-[#054048] font-black bg-white border border-black/30 px-2.5 py-1 rounded-full text-[11px] self-start sm:self-auto">
                      ✓ Delivered directly to Inbox
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-bold text-[#1A1A1A] bg-[#F5F3FF]/60 p-3.5 rounded-xl border-2 border-black gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#6D28D9]" />
                      <span>alex.rivera@startup.io → <strong className="text-[#6D28D9]">elena.rostova@alpha.com</strong> (Product Lead)</span>
                    </div>
                    <span className="text-[#6D28D9] font-black bg-white border border-black/30 px-2.5 py-1 rounded-full text-[11px] self-start sm:self-auto">
                      ✓ Delivered directly to Inbox
                    </span>
                  </div>
                </div>

                {/* Progress Bar & Health Status */}
                <div className="pt-2 space-y-2">
                  <div className="flex justify-between text-xs font-black text-[#1A1A1A]">
                    <span>Sending Progress</span>
                    <span className="text-[#054048]">842 / 842 Sent (100% Completed)</span>
                  </div>
                  <div className="w-full h-4 bg-[#F0F0F0] border-2 border-black rounded-full overflow-hidden p-0.5">
                    <div className="h-full bg-gradient-to-r from-[#054048] via-[#0A5D66] to-[#4A9D6E] rounded-full transition-all duration-500 w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TRUST STRIP SECTION */}
      <section ref={trustRef} className="py-12 bg-white border-y-2 border-black">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <img
              src="/assets/Avatar7.png"
              alt="Trust Avatar Accent"
              className="w-10 h-10 rounded-xl border-2 border-black object-cover bg-[#FEF6EA]"
            />
            <p className="text-sm md:text-base font-extrabold text-[#1A1A1A] leading-relaxed max-w-2xl">
              "Built for small businesses and solo founders who want outreach that actually gets read — not filtered, not ignored, not robotic."
            </p>
          </div>
        </div>
      </section>

      {/* 4. FEATURES SECTION */}
      <section ref={featuresRef} id="features" className="py-24 bg-[#FEF6EA] border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          {/* Section Title */}
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-[#1A1A1A] tracking-tight">
              Everything outreach should have been from the start
            </h2>
            <p className="text-xs md:text-sm text-[#5A5A5A] font-semibold">
              Power cold email tools designed for real deliverability and human conversations.
            </p>
          </div>

          {/* 4 Feature Blocks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Feature 1 */}
            <motion.div
              whileHover={reducedMotion ? {} : { y: -6, rotate: 0.5 }}
              transition={{ duration: 0.2 }}
              className="feature-card bg-white border-2 border-black rounded-2xl p-8 space-y-6 flex flex-col justify-between shadow-sm"
            >
              <div className="space-y-3 text-left">
                <span className="bg-[#FEF6EA] text-[#054048] border-2 border-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  AI Personalization
                </span>
                <h3 className="text-xl font-extrabold text-[#1A1A1A]">
                  Write once, personalize for everyone
                </h3>
                <p className="text-xs text-[#5A5A5A] leading-relaxed font-medium">
                  Give it your message once. AI rewrites it — genuinely, not just find-and-replace — for every single contact, using whatever you know about them.
                </p>
              </div>

              <div className="pt-4 flex justify-center">
                <img
                  src="/assets/feature1.png"
                  alt="Write once personalize for everyone illustration"
                  className="w-full max-h-56 rounded-xl border-2 border-black object-cover bg-[#F8F8F8]"
                  loading="lazy"
                />
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              whileHover={reducedMotion ? {} : { y: -6, rotate: -0.5 }}
              transition={{ duration: 0.2 }}
              className="feature-card bg-white border-2 border-black rounded-2xl p-8 space-y-6 flex flex-col justify-between shadow-sm"
            >
              <div className="space-y-3 text-left">
                <span className="bg-[#FEF6EA] text-[#054048] border-2 border-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  Native Inbox Sending
                </span>
                <h3 className="text-xl font-extrabold text-[#1A1A1A]">
                  Send from your own inbox
                </h3>
                <p className="text-xs text-[#5A5A5A] leading-relaxed font-medium">
                  Connect Gmail, any SMTP account, or verify your own domain through Amazon SES. Your emails come from you — real deliverability, your own reputation.
                </p>
              </div>

              <div className="pt-4 flex justify-center">
                <img
                  src="/assets/feature2.png"
                  alt="Send from your own inbox illustration"
                  className="w-full max-h-56 rounded-xl border-2 border-black object-cover bg-[#F8F8F8]"
                  loading="lazy"
                />
              </div>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              whileHover={reducedMotion ? {} : { y: -6, rotate: 0.5 }}
              transition={{ duration: 0.2 }}
              className="feature-card bg-white border-2 border-black rounded-2xl p-8 space-y-6 flex flex-col justify-between shadow-sm"
            >
              <div className="space-y-3 text-left">
                <span className="bg-[#FEF6EA] text-[#054048] border-2 border-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  Visual Email Studio
                </span>
                <h3 className="text-xl font-extrabold text-[#1A1A1A]">
                  Design it your way
                </h3>
                <p className="text-xs text-[#5A5A5A] leading-relaxed font-medium">
                  Add your logo, pick your colors, build a branded template — or skip all of it and send clean plain text that reads like a real person wrote it.
                </p>
              </div>

              <div className="pt-4 flex justify-center">
                <img
                  src="/assets/feature3.png"
                  alt="Design it your way illustration"
                  className="w-full max-h-56 rounded-xl border-2 border-black object-cover bg-[#F8F8F8]"
                  loading="lazy"
                />
              </div>
            </motion.div>

            {/* Feature 4 */}
            <motion.div
              whileHover={reducedMotion ? {} : { y: -6, rotate: -0.5 }}
              transition={{ duration: 0.2 }}
              className="feature-card bg-white border-2 border-black rounded-2xl p-8 space-y-6 flex flex-col justify-between shadow-sm"
            >
              <div className="space-y-3 text-left">
                <span className="bg-[#FEF6EA] text-[#054048] border-2 border-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  Realtime Analytics
                </span>
                <h3 className="text-xl font-extrabold text-[#1A1A1A]">
                  Know what's actually working
                </h3>
                <p className="text-xs text-[#5A5A5A] leading-relaxed font-medium">
                  See opens, clicks, and delivery status per campaign, in a dashboard that updates live while you send.
                </p>
              </div>

              <div className="pt-4 flex justify-center">
                <img
                  src="/assets/feature4.png"
                  alt="Know whats working illustration"
                  className="w-full max-h-56 rounded-xl border-2 border-black object-cover bg-[#F8F8F8]"
                  loading="lazy"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS SECTION (GSAP Scroll-Linked Line Animation) */}
      <section ref={howItWorksRef} id="how-it-works" className="py-24 bg-[#F8F8F8] border-b-2 border-black">
        <div className="max-w-5xl mx-auto px-6 space-y-16">
          {/* Section Header */}
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-[#1A1A1A] tracking-tight">
              From spreadsheet to sent, in four steps
            </h2>
            <p className="text-xs md:text-sm text-[#5A5A5A] font-semibold">
              No complex setup or engineering needed — start reaching out in under 10 minutes.
            </p>
          </div>

          {/* Steps Timeline Container with SVG Connecting Line */}
          <div className="relative space-y-12">
            {/* SVG Progressive Line (Desktop view) */}
            <svg
              className="absolute left-8 top-12 bottom-12 w-1 hidden md:block pointer-events-none z-0"
              style={{ height: 'calc(100% - 96px)' }}
            >
              <path
                ref={linePathRef}
                d="M 2 0 L 2 1200"
                stroke="#054048"
                strokeWidth="4"
                fill="none"
              />
            </svg>

            {/* Step 1 */}
            <div
              ref={(el) => (stepRefs.current[0] = el)}
              className="relative z-10 flex flex-col md:flex-row items-center gap-8 bg-white border-2 border-black rounded-2xl p-6 md:p-8 shadow-sm"
            >
              <div className="step-number w-12 h-12 rounded-2xl bg-white border-2 border-black text-[#5A5A5A] font-black text-lg flex items-center justify-center shrink-0 transition-all duration-300">
                1
              </div>

              <div className="flex-1 space-y-2 text-left">
                <h3 className="text-lg md:text-xl font-extrabold text-[#1A1A1A]">
                  Upload your contacts
                </h3>
                <p className="text-xs text-[#5A5A5A] leading-relaxed font-medium">
                  Drop in a CSV. We handle the rest — even if it's just a list of email addresses. Automatic column detection and validation.
                </p>
              </div>

              <img
                src="/assets/step1.png"
                alt="Upload contacts step illustration"
                className="w-full md:w-56 h-40 rounded-xl border-2 border-black object-cover bg-[#FEF6EA]"
                loading="lazy"
              />
            </div>

            {/* Step 2 */}
            <div
              ref={(el) => (stepRefs.current[1] = el)}
              className="relative z-10 flex flex-col md:flex-row items-center gap-8 bg-white border-2 border-black rounded-2xl p-6 md:p-8 shadow-sm"
            >
              <div className="step-number w-12 h-12 rounded-2xl bg-white border-2 border-black text-[#5A5A5A] font-black text-lg flex items-center justify-center shrink-0 transition-all duration-300">
                2
              </div>

              <div className="flex-1 space-y-2 text-left">
                <h3 className="text-lg md:text-xl font-extrabold text-[#1A1A1A]">
                  Write or generate your email
                </h3>
                <p className="text-xs text-[#5A5A5A] leading-relaxed font-medium">
                  Draft it yourself, or describe what you want and let AI write the first version. Tailors body text per contact dynamically.
                </p>
              </div>

              <img
                src="/assets/step2.png"
                alt="Write or generate email step illustration"
                className="w-full md:w-56 h-40 rounded-xl border-2 border-black object-cover bg-[#E6F4F1]"
                loading="lazy"
              />
            </div>

            {/* Step 3 */}
            <div
              ref={(el) => (stepRefs.current[2] = el)}
              className="relative z-10 flex flex-col md:flex-row items-center gap-8 bg-white border-2 border-black rounded-2xl p-6 md:p-8 shadow-sm"
            >
              <div className="step-number w-12 h-12 rounded-2xl bg-white border-2 border-black text-[#5A5A5A] font-black text-lg flex items-center justify-center shrink-0 transition-all duration-300">
                3
              </div>

              <div className="flex-1 space-y-2 text-left">
                <h3 className="text-lg md:text-xl font-extrabold text-[#1A1A1A]">
                  Connect your sending account
                </h3>
                <p className="text-xs text-[#5A5A5A] leading-relaxed font-medium">
                  Link Gmail, SMTP, or your own domain in a few clicks — no AWS expertise required. Your sender reputation stays yours.
                </p>
              </div>

              <img
                src="/assets/step3.png"
                alt="Connect sending account step illustration"
                className="w-full md:w-56 h-40 rounded-xl border-2 border-black object-cover bg-[#FEF6EA]"
                loading="lazy"
              />
            </div>

            {/* Step 4 */}
            <div
              ref={(el) => (stepRefs.current[3] = el)}
              className="relative z-10 flex flex-col md:flex-row items-center gap-8 bg-white border-2 border-black rounded-2xl p-6 md:p-8 shadow-sm"
            >
              <div className="step-number w-12 h-12 rounded-2xl bg-white border-2 border-black text-[#5A5A5A] font-black text-lg flex items-center justify-center shrink-0 transition-all duration-300">
                4
              </div>

              <div className="flex-1 space-y-2 text-left">
                <h3 className="text-lg md:text-xl font-extrabold text-[#1A1A1A]">
                  Send and track results
                </h3>
                <p className="text-xs text-[#5A5A5A] leading-relaxed font-medium">
                  Launch your campaign and watch opens, clicks, and replies come in, live. Detailed analytics right from your dashboard.
                </p>
              </div>

              <img
                src="/assets/step4.png"
                alt="Send and track results step illustration"
                className="w-full md:w-56 h-40 rounded-xl border-2 border-black object-cover bg-[#E6F4F1]"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 6. WHY IT'S FREE SECTION */}
      <section ref={whyFreeRef} id="why-free" className="py-20 bg-white border-b-2 border-black">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#FEF6EA] border-2 border-black flex items-center justify-center mx-auto shadow-sm">
            <img
              src="/assets/Avatar3.png"
              alt="Orange Mountain Avatar"
              className="w-12 h-12 rounded-xl object-cover"
            />
          </div>

          <div className="space-y-3 max-w-xl mx-auto">
            <h2 className="text-3xl font-black text-[#1A1A1A] tracking-tight">
              Why free, actually
            </h2>
            <p className="text-xs md:text-sm text-[#5A5A5A] leading-relaxed font-medium">
              You send through your own Gmail, SMTP, or Amazon SES account — so there's no per-email cost for us to pass on to you. You bring the inbox, we bring the tooling.
            </p>
          </div>
        </div>
      </section>

      {/* 7. FINAL CTA SECTION */}
      <section
        ref={ctaRef}
        className="py-24 bg-[#054048] text-white border-b-2 border-black relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
          {/* CTA Copy Left */}
          <div className="flex-1 space-y-6 text-left max-w-xl">
            <h2 className="cta-stagger text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Send your first campaign in the next 10 minutes
            </h2>
            <p className="cta-stagger text-sm md:text-base text-[#FEF6EA] font-medium leading-relaxed">
              Free forever. No credit card required. No per-email charges. Connect your inbox and launch outreach today.
            </p>

            <div className="cta-stagger pt-2">
              <motion.button
                style={{ x: springX, y: springY }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                whileHover={reducedMotion ? {} : { scale: 1.05 }}
                whileTap={reducedMotion ? {} : { scale: 0.98 }}
                onClick={() => navigate('/login')}
                className="bg-[#FEF6EA] text-[#054048] border-2 border-black text-sm font-black py-4 px-8 rounded-xl cursor-pointer shadow-lg hover:bg-white transition-colors inline-flex items-center gap-2"
              >
                Get started free <ArrowRight className="w-4 h-4 stroke-[3]" />
              </motion.button>
            </div>
          </div>

          {/* CTA Illustration Right */}
          <div className="flex-1 flex justify-center">
            <img
              ref={ctaImageRef}
              src="/assets/CTA.png"
              alt="Final CTA Section Illustration"
              className="w-full max-w-md rounded-3xl border-2 border-black object-cover shadow-2xl bg-white"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="py-12 bg-[#F8F8F8] text-[#1A1A1A]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#054048] text-white flex items-center justify-center border-2 border-black">
              <Send className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-sm text-[#1A1A1A]">
              The Mailling Company
            </span>
            <img
              src="/assets/Avatar6.png"
              alt="Footer Avatar Accent"
              className="w-6 h-6 rounded-full border border-black object-cover ml-2"
            />
          </div>

          <div className="flex items-center gap-6 text-xs font-bold text-[#5A5A5A]">
            <a href="/privacy" className="hover:text-black transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-black transition-colors">
              Terms of Service
            </a>
          </div>

          <p className="text-xs text-[#5A5A5A] font-semibold">
            © {new Date().getFullYear()} The Mailling Company. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Reusable Floating Support Contact Bubble */}
      <SupportBubble />
    </div>
  );
}
