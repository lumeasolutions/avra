'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  FolderOpen, Receipt, Calendar, BarChart3, Sparkles, Users,
  CheckCircle, ArrowRight, Star, Shield, Zap, Package, Bell,
  CreditCard, Menu, X, Play, TrendingUp, Clock, Award,
  ChevronDown, Send, MessageCircle, Bot, ThumbsUp,
  AlertTriangle, CheckSquare, XCircle, Minus,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const H = 'var(--font-heading)';
const B = 'var(--font-body)';

const FEATURES = [
  { id: 'dossiers', icon: FolderOpen, tag: 'Dossiers', title: 'Pilotez chaque\nprojet de A à Z', desc: "De la prospection à la réception chantier, suivez l'avancement en temps réel. Dossiers urgents, signés, en cours — vision 360°.", bullets: ['Statuts personnalisables (Urgent, En cours, Finition, Signé)', 'Sous-dossiers Plans, Devis, Rendus IA, Contrats', 'Historique complet des actions par dossier', 'Alertes automatiques sur les délais critiques'], color: '#304035', statVal: '20+', statLabel: 'dossiers simultanés' },
  { id: 'ia', icon: Sparkles, tag: 'IA Réalisme', title: 'Des rendus qui\nbluffent vos clients', desc: "Générez des perspectives photoréalistes en quelques secondes directement depuis le dossier client. L'outil de vente le plus puissant du marché.", bullets: ['Génération en moins de 10 secondes', 'Styles variés : contemporain, scandinave, industriel…', 'Export HD pour présentations et plaquettes', 'Intégration directe dans les dossiers clients'], color: '#a67749', statVal: '10s', statLabel: 'pour un rendu photoréaliste' },
  { id: 'facturation', icon: Receipt, tag: 'Facturation', title: 'Facturez vite,\nencaissez sans effort', desc: "Créez factures, avoirs, acomptes en quelques clics. Le suivi des impayés et les relances automatiques s'occupent du reste.", bullets: ['Factures, avoirs et acomptes en 1 clic', 'Relances automatiques paramétrables', 'Tableau de bord CA en temps réel', 'Export comptable (PDF, CSV)'], color: '#2d5a8e', statVal: '-80%', statLabel: 'de temps sur la facturation' },
  { id: 'planning', icon: Calendar, tag: 'Planning', title: 'Un calendrier\npartagé pour tous', desc: "Planifiez poses, livraisons et chantiers sur un seul calendrier partagé. Coordonnez poseurs et fournisseurs sans email ni appel.", bullets: ['Calendrier équipe en temps réel', 'Notifications automatiques aux intervenants', 'Gestion des ressources et conflits de planning', 'Vue semaine, mois et par projet'], color: '#2d6a4f', statVal: '-3h', statLabel: 'par semaine sur la coordination' },
  { id: 'stock', icon: Package, tag: 'Stock', title: 'Votre stock\ntoujours en ordre', desc: "Catalogue produits centralisé, alertes rupture, suivi des marges fournisseurs. Ne ratez plus jamais une commande critique.", bullets: ['Catalogue produits avec photos et prix', 'Alertes automatiques à rupture de stock', 'Suivi des marges par fournisseur', 'Commandes directement depuis les dossiers'], color: '#5b4fcf', statVal: '0', statLabel: 'rupture de stock manquée' },
  { id: 'stats', icon: BarChart3, tag: 'Statistiques', title: 'Pilotez par\nles données', desc: "Analysez votre activité en temps réel. CA mensuel, taux de signature, performance équipe — prenez les bonnes décisions au bon moment.", bullets: ['CA mensuel et tendances sur 12 mois', 'Taux de signature par commercial', 'Analyse des dossiers perdus', 'Export des rapports en PDF'], color: '#b5451b', statVal: '+35%', statLabel: 'de CA moyen après 6 mois' },
];

const STEPS = [
  { num: '01', icon: FolderOpen, title: 'Créez votre dossier', desc: "En 30 secondes, un dossier complet est créé avec toutes les informations client et les sous-dossiers structurés.", detail: "Nom, coordonnées, type de projet, budget estimatif. AVRA génère automatiquement l'arborescence de sous-dossiers adaptée à votre métier." },
  { num: '02', icon: Sparkles, title: 'Gérez et impressionnez', desc: "Plans, devis, rendus IA. Suivez l'avancement, coordonnez votre équipe, envoyez des visuels qui font signer.", detail: "L'IA génère des perspectives photoréalistes en quelques secondes. Partagez-les directement par email depuis AVRA pour convertir 2× plus." },
  { num: '03', icon: Receipt, title: 'Signez et encaissez', desc: "Signature électronique, facturation automatique, e-paiement sécurisé. AVRA gère le cycle complet du projet.", detail: "Dès la signature, une facture d'acompte est générée automatiquement. Le suivi des paiements et les relances se déclenchent sans intervention." },
];

const TESTIMONIALS = [
  { name: 'Sophie Marchand', role: 'Cuisiniste', location: 'Lyon', text: "AVRA a complètement transformé ma façon de travailler. Je gère 20 dossiers simultanément sans perdre le fil. Et le rendu IA… mes clients signent sur le premier RDV maintenant.", stars: 5, metric: '+60% de taux de signature', avatar: 'SM', avatarBg: '#304035' },
  { name: 'Pierre Deschamps', role: 'Menuisier-agenceur', location: 'Bordeaux', text: "La coordination des intervenants et le planning partagé m'ont fait gagner au moins 3h par semaine. Plus aucun oubli de facture en retard. C'est du sérieux.", stars: 5, metric: '3h économisées / semaine', avatar: 'PD', avatarBg: '#a67749' },
  { name: 'Amina Benali', role: "Architecte d'intérieur", location: 'Paris', text: "L'interface est magnifique — mes clients me demandent même quel outil j'utilise. Et l'assistant IA qui répond à mes questions métier est bluffant. Je ne reviendrais jamais en arrière.", stars: 5, metric: 'Recommande à 100%', avatar: 'AB', avatarBg: '#5b4fcf' },
];

const PLANS = [
  { name: 'Starter', monthlyPrice: 79, yearlyPrice: 63, desc: 'Parfait pour démarrer en solo', badge: null, highlight: false, features: ['1 utilisateur', 'Dossiers illimités', 'Facturation & devis', 'Planning chantier', 'Stock basique', 'Support email'], excluded: ['IA Photo Réalisme', 'E-paiement intégré', 'Statistiques avancées'], cta: 'Démarrer gratuitement' },
  { name: 'Pro', monthlyPrice: 149, yearlyPrice: 119, desc: 'Pour les équipes qui veulent performer', badge: '⭐ Le plus populaire', highlight: true, features: ["Jusqu'à 10 utilisateurs", 'Tout Starter inclus', 'IA Photo Réalisme illimité', 'E-paiement sécurisé', 'Statistiques avancées', 'Relances automatiques', 'Support prioritaire 24/7'], excluded: [], cta: "Commencer l'essai Pro" },
  { name: 'Entreprise', monthlyPrice: null, yearlyPrice: null, desc: 'Pour les réseaux, franchises et grandes équipes', badge: null, highlight: false, features: ['Utilisateurs illimités', 'Tout Pro inclus', 'API & intégrations custom', 'Onboarding & formation dédiés', 'SLA & uptime garanti', 'Account manager personnel'], excluded: [], cta: 'Nous contacter' },
];

const COMPARISON = [
  { before: 'Excel dispersé + post-its partout', after: 'Tout centralisé en une seule app' },
  { before: "Coordination par WhatsApp et appels", after: 'Planning partagé + notifications auto' },
  { before: 'Oublis de relances, factures en retard', after: 'Relances automatiques, aucun oubli' },
  { before: 'Devis sur papier ou Word', after: 'Devis en 2 clics, envoyés par email' },
  { before: 'Pas de visuel à montrer au client', after: 'Rendu photoréaliste en 10 secondes' },
  { before: 'Équipe désynchronisée, conflits de planning', after: 'Calendrier temps réel, tout le monde à jour' },
];

const FAQ_ITEMS = [
  { q: "Est-ce que AVRA est fait pour un artisan solo ?", a: "Absolument. Le plan Starter est conçu pour les indépendants : 1 utilisateur, dossiers illimités, facturation, planning et stock. Aucun salarié nécessaire pour en tirer le maximum." },
  { q: "Dois-je migrer toutes mes données existantes ?", a: "Non. Vous pouvez commencer avec de nouveaux dossiers et continuer à gérer vos projets en cours sur vos outils actuels en parallèle. La migration se fait à votre rythme, et notre équipe vous accompagne si vous souhaitez importer des données existantes." },
  { q: "Mes données sont-elles sécurisées et m'appartiennent-elles ?", a: "Vos données sont hébergées en France, chiffrées (AES-256), et conformes au RGPD. Elles vous appartiennent à 100% : vous pouvez les exporter à tout moment en CSV ou PDF. Nous ne les utilisons jamais à des fins commerciales." },
  { q: "Est-ce que ça fonctionne sur mobile et tablette ?", a: "Oui, AVRA est entièrement responsive. L'application fonctionne parfaitement sur smartphone et tablette — pratique pour mettre à jour un dossier directement sur chantier." },
  { q: "Puis-je annuler à tout moment ?", a: "Oui, sans engagement et sans frais. Résiliez en un clic depuis les paramètres de votre compte. Vos données restent accessibles 30 jours après la résiliation pour vous permettre de tout exporter." },
  { q: "Y a-t-il une formation ou une prise en main nécessaire ?", a: "AVRA est conçu pour être pris en main sans formation. La plupart de nos clients sont opérationnels en moins de 5 minutes. Un guide de démarrage et des tutoriels vidéo sont disponibles, et notre support répond en moins de 2h en semaine." },
];

// Chatbot responses
const CHAT_BOT: Record<string, string> = {
  prix: "AVRA propose 3 formules : **Starter à 79€/mois**, **Pro à 149€/mois** (best-seller), et Entreprise sur mesure. Essai gratuit 14 jours sur tous les plans, sans carte bancaire.",
  pour: "AVRA est conçu pour les **cuisinistes, menuisiers, agenceurs et architectes d'intérieur** — indépendants ou équipes jusqu'à 10+ personnes. Si vous gérez des projets d'agencement, c'est pour vous.",
  démarrer: "Créez votre compte en 30 secondes, ajoutez votre premier dossier client, et AVRA structure tout automatiquement. **Aucune formation requise.** La plupart de nos clients sont opérationnels en 5 minutes.",
  mobile: "Oui ! AVRA fonctionne sur tous les appareils — ordinateur, tablette, **smartphone**. Vos données sont synchronisées en temps réel, idéal pour mettre à jour un dossier sur chantier.",
  données: "Hébergement **en France**, chiffrement AES-256, **conformité RGPD** totale. Vos données vous appartiennent et sont exportables à tout moment. Aucune utilisation commerciale.",
  ia: "L'IA génère des **rendus photoréalistes de cuisines et d'agencements en 8-10 secondes**, directement depuis le dossier client. Vos clients voient le résultat avant même que vous commenciez — le meilleur outil de vente du marché.",
  default: "Je peux répondre à vos questions sur AVRA 👋 Essayez : *\"C'est pour qui ?\"*, *\"Combien ça coûte ?\"*, *\"Comment démarrer ?\"*, *\"Mes données ?\"* ou *\"L'IA, comment ça marche ?\"*",
};

function getChatResponse(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('prix') || m.includes('coût') || m.includes('tarif') || m.includes('combien') || m.includes('€')) return CHAT_BOT.prix;
  if (m.includes('pour qui') || m.includes('métier') || m.includes('cuisin') || m.includes('menuisier') || m.includes('architecte') || m.includes('agenc')) return CHAT_BOT.pour;
  if (m.includes('démarrer') || m.includes('commencer') || m.includes('débuter') || m.includes('créer') || m.includes('essai') || m.includes('gratuit')) return CHAT_BOT.démarrer;
  if (m.includes('mobile') || m.includes('téléphone') || m.includes('tablette') || m.includes('iphone') || m.includes('android') || m.includes('smartphone')) return CHAT_BOT.mobile;
  if (m.includes('données') || m.includes('sécurité') || m.includes('rgpd') || m.includes('confidentiel') || m.includes('appartien')) return CHAT_BOT.données;
  if (m.includes('ia') || m.includes('photo') || m.includes('réalisme') || m.includes('image') || m.includes('rendu') || m.includes('visuel')) return CHAT_BOT.ia;
  return CHAT_BOT.default;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); observer.unobserve(e.target); } }),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function useCounter(target: number, decimals = 0) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const duration = 1800;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setValue(parseFloat((target * eased).toFixed(decimals)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, decimals]);
  return { value, ref };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function FaqItem({ q, a, idx }: { q: string; a: string; idx: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div data-reveal data-delay={String(idx * 80)} className="rounded-2xl border border-[#304035]/10 bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-7 py-5 text-left hover:bg-[#304035]/2 transition-colors">
        <span className="font-semibold text-[#304035] pr-6 text-[15px]">{q}</span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-[#a67749] transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`faq-content ${open ? 'open' : ''}`}>
        <p className="px-7 pb-5 text-[#304035]/65 leading-relaxed text-sm">{a}</p>
      </div>
    </div>
  );
}

interface ChatMsg { role: 'user' | 'bot'; text: string; }

function renderBotText(text: string) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-bold text-[#304035]">{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i} className="italic text-[#304035]/80">{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeFeat, setActiveFeat] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [yearly, setYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([{ role: 'bot', text: CHAT_BOT.default }]);
  const [chatInput, setChatInput] = useState('');
  const [chatTyping, setChatTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useScrollReveal();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveFeat(p => (p + 1) % FEATURES.length), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatTyping(true);
    setTimeout(() => {
      setChatTyping(false);
      setChatMessages(prev => [...prev, { role: 'bot', text: getChatResponse(userMsg) }]);
    }, 900);
  }, [chatInput]);

  const feat = FEATURES[activeFeat];

  // Counters
  const c1 = useCounter(2400);
  const c2 = useCounter(98);
  const c3 = useCounter(3);

  return (
    <>
      {/* ── JSON-LD: SoftwareApp ── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'AVRA', url: 'https://avra.fr', description: "Logiciel de gestion ERP pour professionnels de l'agencement.", applicationCategory: 'BusinessApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '79', priceCurrency: 'EUR' }, aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', reviewCount: '248' } }) }} />
      {/* ── JSON-LD: FAQ ── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ_ITEMS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }) }} />

      <div style={{ fontFamily: B }} className="min-h-screen overflow-x-hidden bg-[#f5eee8] text-[#304035]">

        {/* ══════════════ NAVBAR ══════════════ */}
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/98 backdrop-blur-xl shadow-lg shadow-[#304035]/8' : 'bg-transparent'}`}>
          <div className="mx-auto max-w-7xl px-6 flex items-center justify-between" style={{ height: 72 }}>
            <Link href="/" className="flex items-center gap-2.5 group" aria-label="AVRA — Accueil">
              <Image
                src="/avra-icon.svg"
                alt="AVRA logo hibou"
                width={40}
                height={40}
                priority
                className="h-10 w-10 rounded-xl shadow-md transition-all group-hover:scale-[1.05] group-hover:shadow-lg"
                style={{ filter: scrolled ? 'none' : 'brightness(1.15)' }}
              />
              <span style={{ fontFamily: H }} className={`text-xl font-bold tracking-wider transition-colors ${scrolled ? 'text-[#304035]' : 'text-white'}`}>AVRA</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1" aria-label="Navigation principale">
              {[['#metiers', 'Métiers'], ['#fonctionnalites', 'Fonctionnalités'], ['#comment', 'Comment ça marche'], ['#temoignages', 'Témoignages'], ['#tarifs', 'Tarifs']].map(([href, label]) => (
                <a key={href} href={href} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all hover:bg-white/10 ${scrolled ? 'text-[#304035]/60 hover:text-[#304035] hover:bg-[#304035]/5' : 'text-white/70 hover:text-white'}`}>{label}</a>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className={`px-4 py-2 text-sm font-semibold transition-colors ${scrolled ? 'text-[#304035] hover:text-[#304035]/60' : 'text-white/80 hover:text-white'}`}>Se connecter</Link>
              <Link href="/login" className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-xl active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#a67749,#c08a5a)', boxShadow: '0 4px 16px rgba(166,119,73,0.35)' }}>
                Essai gratuit — 14 jours <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <button className="md:hidden p-2 rounded-lg transition-colors" style={{ color: scrolled ? '#304035' : 'white' }}
              onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {menuOpen && (
            <div className="md:hidden bg-white border-t border-[#304035]/10 px-6 py-5 space-y-1">
              {[['#metiers', 'Métiers'], ['#fonctionnalites', 'Fonctionnalités'], ['#comment', 'Comment ça marche'], ['#temoignages', 'Témoignages'], ['#tarifs', 'Tarifs']].map(([href, label]) => (
                <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block px-4 py-3 text-sm font-medium text-[#304035]/70 hover:text-[#304035] rounded-lg hover:bg-[#304035]/5 transition-all">{label}</a>
              ))}
              <div className="pt-3 border-t border-[#304035]/10">
                <Link href="/login" className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#a67749,#c08a5a)' }}>
                  Essai gratuit 14 jours <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </header>


        {/* ══════════════ HERO ══════════════ */}
        <section className="relative min-h-screen flex items-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#1a2920 0%,#243330 30%,#304035 65%,#3a4f42 100%)' }}
          aria-label="Section principale">
          <div className="absolute top-1/4 -left-40 h-[480px] w-[480px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(166,119,73,0.45) 0%,transparent 65%)', filter: 'blur(70px)' }} />
          <div className="absolute bottom-1/4 -right-40 h-[560px] w-[560px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(166,119,73,0.25) 0%,transparent 65%)', filter: 'blur(90px)' }} />
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.04) 1px,transparent 1px)', backgroundSize: '72px 72px' }} />
          {/* Hibou AVRA — watermark géant en fond */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none select-none hidden lg:block" style={{ opacity: 0.07, width: 560, height: 560 }}>
            <Image src="/images/owl-1.webp" alt="" width={560} height={560} className="w-full h-full object-contain" style={{ filter: 'saturate(0) brightness(3)' }} loading="lazy" />
          </div>

          <div className="relative mx-auto max-w-7xl w-full px-6 pt-28 pb-24">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div data-reveal data-delay="0" className="inline-flex items-center gap-2.5 rounded-full border border-[#a67749]/30 bg-[#a67749]/10 px-4 py-2 mb-7">
                  <div className="h-2 w-2 rounded-full bg-[#a67749] animate-pulse" />
                  <span className="text-sm font-semibold text-[#d4a574]">Le logiciel N°1 des agenceurs</span>
                </div>

                <h1 data-reveal data-delay="100" style={{ fontFamily: H, lineHeight: 1.08 }} className="text-5xl lg:text-6xl xl:text-[68px] font-bold text-white mb-6">
                  Gérez vos projets
                  <em className="block not-italic text-transparent bg-clip-text mt-1"
                    style={{ backgroundImage: 'linear-gradient(90deg,#d4a574 0%,#f0c87a 45%,#c08a5a 100%)' }}>
                    d'agencement
                  </em>
                  sans friction.
                </h1>

                <p data-reveal data-delay="200" className="text-lg text-white/60 leading-relaxed mb-9 max-w-lg">
                  AVRA centralise dossiers, facturation, planning, intervenants et <strong className="text-white/80">IA photo-réalisme</strong> dans une seule app pensée pour les cuisinistes, menuisiers et architectes d'intérieur.
                </p>

                <div data-reveal data-delay="300" className="flex flex-wrap gap-3 mb-14">
                  <Link href="/login" className="flex items-center gap-2.5 rounded-2xl px-7 py-3.5 text-base font-semibold text-white transition-all hover:opacity-90 hover:shadow-2xl active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg,#a67749,#c08a5a)', boxShadow: '0 8px 32px rgba(166,119,73,0.45)' }}>
                    Démarrer gratuitement <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/login" className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/8 px-7 py-3.5 text-base font-semibold text-white hover:bg-white/15 backdrop-blur transition-all">
                    <Play className="h-4 w-4 fill-white" /> Voir la démo
                  </Link>
                </div>

                {/* Animated stats */}
                <div data-reveal data-delay="400" className="flex flex-wrap gap-8 pt-8 border-t border-white/10">
                  {[
                    { ref: c1.ref, val: `+${c1.value.toLocaleString('fr-FR')}`, label: 'professionnels actifs', icon: Users },
                    { ref: c2.ref, val: `${c2.value.toFixed(0)}%`, label: 'satisfaction client', icon: Award },
                    { ref: c3.ref, val: `-${c3.value.toFixed(0)}h`, label: 'admin / semaine', icon: Clock },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                        <s.icon className="h-5 w-5 text-[#d4a574]" />
                      </div>
                      <div>
                        <p ref={s.ref as React.RefObject<HTMLParagraphElement>} style={{ fontFamily: H }} className="text-2xl font-bold text-white leading-none">{s.val}</p>
                        <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* App mockup */}
              <div data-reveal="right" data-delay="200" className="hidden lg:flex items-center justify-center">
                <div className="relative w-full max-w-[420px]">
                  <div className="rounded-3xl border border-white/15 p-6 shadow-2xl backdrop-blur" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">AVRA Pro</p>
                        <p style={{ fontFamily: H }} className="text-lg font-bold text-white">Tableau de bord</p>
                      </div>
                      <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/20 px-3 py-1.5">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-semibold text-emerald-300">En ligne</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 mb-4">
                      {[
                        { label: 'Dossiers actifs', val: '24', color: 'text-white', bg: 'rgba(255,255,255,0.08)' },
                        { label: 'CA ce mois', val: '48 200 €', color: '#d4a574', bg: 'rgba(166,119,73,0.15)' },
                        { label: 'Impayés', val: '3', color: '#fca5a5', bg: 'rgba(239,68,68,0.1)' },
                        { label: 'Taux signature', val: '68%', color: '#6ee7b7', bg: 'rgba(16,185,129,0.1)' },
                      ].map((k, i) => (
                        <div key={i} className="rounded-xl p-3" style={{ background: k.bg }}>
                          <p className="text-[10px] font-medium text-white/45 mb-1">{k.label}</p>
                          <p style={{ fontFamily: H, color: k.color }} className="text-lg font-bold">{k.val}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {[
                        { name: 'Famille Rousseau', tag: 'URGENT', tc: '#fca5a5', bc: 'rgba(239,68,68,0.15)' },
                        { name: 'M. Bertrand', tag: 'EN COURS', tc: '#93c5fd', bc: 'rgba(59,130,246,0.15)' },
                        { name: 'Mme Chen', tag: 'SIGNÉ', tc: '#6ee7b7', bc: 'rgba(16,185,129,0.15)' },
                      ].map((d, i) => (
                        <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                              <span className="text-xs font-bold text-white">{d.name.charAt(0)}</span>
                            </div>
                            <span className="text-sm font-medium text-white/80">{d.name}</span>
                          </div>
                          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ color: d.tc, background: d.bc }}>{d.tag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="absolute -top-8 -right-8 w-44 rounded-2xl p-4 shadow-2xl" style={{ background: 'linear-gradient(135deg,#a67749,#8a5e35)', border: '1px solid rgba(192,138,90,0.4)' }}>
                    <div className="flex items-center gap-2 mb-2"><Sparkles className="h-4 w-4 text-white" /><span className="text-xs font-bold text-white">IA Réalisme</span></div>
                    <p className="text-[11px] text-white/65 mb-3">Cuisine générée pour Mme Chen</p>
                    <div className="h-20 rounded-xl overflow-hidden relative">
                      <Image src="/images/kitchen-1.webp" alt="Rendu IA cuisine" width={80} height={80} loading="lazy" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <CheckCircle className="h-6 w-6 text-white drop-shadow-lg" />
                      </div>
                    </div>
                    <p className="text-[10px] text-white/45 mt-2 flex items-center gap-1"><Zap className="h-3 w-3" /> Généré en 8 secondes</p>
                  </div>
                  <div className="absolute -bottom-6 -left-6 w-56 rounded-2xl bg-white p-3.5 shadow-2xl" style={{ border: '1px solid rgba(48,64,53,0.08)' }}>
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50"><CheckCircle className="h-4 w-4 text-emerald-600" /></div>
                      <div>
                        <p className="text-xs font-bold text-[#304035]">Paiement reçu ✓</p>
                        <p className="text-xs text-[#304035]/55">Famille Martin — 12 400 €</p>
                        <p className="text-[10px] text-[#304035]/35 mt-0.5">Il y a 2 minutes</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">Découvrir</span>
            <div className="h-10 w-6 rounded-full border-2 border-white/20 flex justify-center pt-2">
              <div className="h-2 w-0.5 rounded-full bg-white/40 animate-bounce" />
            </div>
          </div>
        </section>


        {/* ══════════════ SOCIAL PROOF BAND ══════════════ */}
        <section className="bg-white py-5 border-y border-[#304035]/8" aria-label="Ils utilisent AVRA">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-8">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#304035]/40 shrink-0">Ils utilisent AVRA</span>
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
                {['Atelier Renard', 'Studio Lumière', 'Cuisines Mouret', 'Bois & Design', 'Arch\'Intérieur', 'Menuiserie Brun'].map(name => (
                  <span key={name} style={{ fontFamily: H }} className="text-sm font-bold text-[#304035]/30 hover:text-[#304035]/60 transition-colors cursor-default">{name}</span>
                ))}
              </div>
            </div>
          </div>
        </section>


        {/* ══════════════ MODULES BAND ══════════════ */}
        <section className="bg-white py-5 border-b border-[#304035]/8" aria-label="Modules AVRA">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-wrap items-center justify-center gap-5 md:gap-10">
              {([[FolderOpen, 'Dossiers'], [Receipt, 'Facturation'], [Calendar, 'Planning'], [Sparkles, 'IA Réalisme'], [Package, 'Stock'], [Users, 'Équipe'], [Bell, 'Alertes'], [CreditCard, 'E-paiement']] as [React.FC<{className?:string}>, string][]).map(([Icon, label], i) => (
                <div key={i} className="flex items-center gap-2 text-sm font-medium text-[#304035]/50"><Icon className="h-4 w-4 text-[#a67749]" />{label}</div>
              ))}
            </div>
          </div>
        </section>


        {/* ══════════════ VIDEO / DÉMO ══════════════ */}
        <section className="py-24 px-6 bg-[#f5eee8]" aria-label="Démo AVRA">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-10">
              <p data-reveal className="text-sm font-bold uppercase tracking-[0.2em] text-[#a67749] mb-4">Démo interactive</p>
              <h2 data-reveal data-delay="100" style={{ fontFamily: H }} className="text-4xl md:text-5xl font-bold text-[#304035] mb-4 leading-tight">
                Voyez AVRA en action<br /><em className="text-[#a67749]">en 90 secondes</em>
              </h2>
              <p data-reveal data-delay="200" className="text-lg text-[#304035]/55 max-w-xl mx-auto">Pas besoin de vous inscrire pour voir comment AVRA fonctionne au quotidien.</p>
            </div>

            <div data-reveal="scale" data-delay="200" className="relative rounded-3xl overflow-hidden shadow-2xl cursor-pointer group">
              {/* Simulated screen */}
              <div className="relative h-[380px] md:h-[480px]" style={{ background: 'linear-gradient(135deg,#1a2920,#304035)' }}>
                <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

                {/* Simulated UI cards */}
                <div className="absolute inset-6 md:inset-12 grid grid-cols-3 gap-4 opacity-70">
                  {[
                    { label: 'CA mensuel', val: '48 200 €', color: '#d4a574', bg: 'rgba(166,119,73,0.2)' },
                    { label: 'Dossiers actifs', val: '24', color: '#ffffff', bg: 'rgba(255,255,255,0.1)' },
                    { label: 'Taux signature', val: '68%', color: '#6ee7b7', bg: 'rgba(16,185,129,0.15)' },
                  ].map((k, i) => (
                    <div key={i} className="rounded-2xl p-4" style={{ background: k.bg, border: '1px solid rgba(255,255,255,0.1)' }}>
                      <p className="text-[11px] text-white/50 mb-2">{k.label}</p>
                      <p style={{ fontFamily: H, color: k.color }} className="text-2xl md:text-3xl font-bold">{k.val}</p>
                    </div>
                  ))}
                </div>

                {/* Play button overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Link href="/login" className="group/play flex flex-col items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-2xl group-hover/play:scale-110 transition-all"
                      style={{ boxShadow: '0 0 0 16px rgba(255,255,255,0.1), 0 8px 40px rgba(0,0,0,0.3)' }}>
                      <Play className="h-8 w-8 fill-[#304035] text-[#304035] ml-1" />
                    </div>
                    <div className="text-center">
                      <p className="text-white font-semibold text-lg">Accéder à la démo interactive</p>
                      <p className="text-white/50 text-sm">Sans inscription · Données fictives</p>
                    </div>
                  </Link>
                </div>

                {/* Duration badge */}
                <div className="absolute top-4 right-4 rounded-xl bg-black/40 backdrop-blur px-3 py-1.5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs font-semibold text-white">DÉMO LIVE</span>
                </div>
              </div>

              {/* Bottom bar */}
              <div className="bg-white px-8 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-6 text-sm text-[#304035]/60">
                  {['✓ Dossiers en temps réel', '✓ Facturation automatique', '✓ IA Réalisme live'].map(f => (
                    <span key={f} className="font-medium">{f}</span>
                  ))}
                </div>
                <Link href="/login" className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#a67749,#c08a5a)' }}>
                  Essayer gratuitement <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>


        {/* ══════════════ FONCTIONNALITÉS ══════════════ */}
        <section id="fonctionnalites" className="py-28 px-6 bg-white" aria-labelledby="feat-title">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <p data-reveal className="text-sm font-bold uppercase tracking-[0.2em] text-[#a67749] mb-4">Fonctionnalités</p>
              <h2 id="feat-title" data-reveal data-delay="100" style={{ fontFamily: H }} className="text-4xl md:text-6xl font-bold text-[#304035] mb-5 leading-tight">
                Tout ce dont vous avez besoin,<br /><em className="text-[#a67749]">rien de superflu</em>
              </h2>
              <p data-reveal data-delay="200" className="text-lg text-[#304035]/60 max-w-2xl mx-auto">
                Chaque module a été conçu <strong className="text-[#304035]">avec des professionnels de l'agencement</strong> pour coller parfaitement à votre réalité terrain.
              </p>
            </div>

            <div data-reveal data-delay="100" className="flex flex-wrap justify-center gap-2 mb-10" role="tablist">
              {FEATURES.map((f, i) => (
                <button key={i} role="tab" aria-selected={activeFeat === i} onClick={() => setActiveFeat(i)}
                  className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all"
                  style={activeFeat === i ? { background: f.color, color: 'white', boxShadow: `0 4px 20px ${f.color}50` } : { background: '#f5eee8', color: 'rgba(48,64,53,0.55)', border: '1px solid rgba(48,64,53,0.1)' }}>
                  <f.icon className="h-4 w-4" />{f.tag}
                </button>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-10 items-center rounded-3xl bg-[#f9f6f1] border border-[#304035]/8 p-8 md:p-12 shadow-xl min-h-[400px]">
              <div data-reveal="left">
                <div className="inline-flex items-center gap-2 rounded-xl px-4 py-2 mb-5" style={{ background: `${feat.color}12` }}>
                  <feat.icon className="h-5 w-5" style={{ color: feat.color }} />
                  <span className="text-sm font-bold" style={{ color: feat.color }}>{feat.tag}</span>
                </div>
                <h3 style={{ fontFamily: H, whiteSpace: 'pre-line', lineHeight: 1.15 }} className="text-3xl md:text-4xl font-bold text-[#304035] mb-4">{feat.title}</h3>
                <p className="text-[#304035]/60 leading-relaxed mb-6">{feat.desc}</p>
                <ul className="space-y-2.5" role="list">
                  {feat.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-[#304035]/70">
                      <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: feat.color }} />{b}
                    </li>
                  ))}
                </ul>
              </div>
              <div data-reveal="right" className="flex flex-col items-center justify-center gap-5">
                <div className="w-full rounded-2xl p-10 text-center" style={{ background: `linear-gradient(135deg,${feat.color}08,${feat.color}16)`, border: `2px solid ${feat.color}20` }}>
                  <feat.icon className="h-16 w-16 mx-auto mb-5" style={{ color: feat.color, opacity: 0.85 }} />
                  <p style={{ fontFamily: H, color: feat.color }} className="text-6xl font-bold mb-2">{feat.statVal}</p>
                  <p className="text-sm text-[#304035]/50">{feat.statLabel}</p>
                </div>
                <Link href="/login" className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90" style={{ background: feat.color }}>
                  Essayer maintenant <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-6">
              {FEATURES.map((f, i) => (
                <button key={i} data-reveal data-delay={String(i * 80)} onClick={() => setActiveFeat(i)}
                  className="text-left rounded-2xl p-5 border transition-all hover:shadow-md"
                  style={activeFeat === i ? { borderColor: `${f.color}40`, background: `${f.color}06` } : { background: 'white', borderColor: 'rgba(48,64,53,0.08)' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${f.color}15` }}>
                      <f.icon className="h-4 w-4" style={{ color: f.color }} />
                    </div>
                    <span className="font-semibold text-[#304035] text-sm">{f.tag}</span>
                  </div>
                  <p className="text-xs text-[#304035]/50 leading-relaxed line-clamp-2">{f.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </section>


        {/* ══════════════ COMPARAISON AVANT / APRÈS ══════════════ */}
        <section className="py-28 px-6 bg-[#f5eee8]" aria-labelledby="compare-title">
          <div className="mx-auto max-w-5xl">
            <div className="text-center mb-14">
              <p data-reveal className="text-sm font-bold uppercase tracking-[0.2em] text-[#a67749] mb-4">Avant & Après</p>
              <h2 id="compare-title" data-reveal data-delay="100" style={{ fontFamily: H }} className="text-4xl md:text-5xl font-bold text-[#304035] mb-4 leading-tight">
                Fini le chaos,<br /><em className="text-[#a67749]">bienvenue dans la clarté</em>
              </h2>
              <p data-reveal data-delay="200" className="text-lg text-[#304035]/55 max-w-xl mx-auto">Ce que vivent vos confrères avant AVRA — et ce qu'ils vivent après.</p>
            </div>

            {/* Real photo visual */}
            <div data-reveal="scale" data-delay="100" className="mb-10 relative rounded-3xl overflow-hidden shadow-2xl h-64 md:h-80">
              <Image src="/images/kitchen-2.webp" alt="Cuisine sur-mesure réalisée avec AVRA" fill loading="lazy" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(48,64,53,0.7) 0%, rgba(166,119,73,0.4) 100%)' }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <p className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-3">Réalisation client AVRA</p>
                <h3 style={{ fontFamily: H }} className="text-3xl md:text-4xl font-bold text-white mb-3">Cuisine sur-mesure <em className="not-italic text-[#d4a574]">Famille Rousseau</em></h3>
                <div className="flex items-center gap-4">
                  <span className="rounded-full px-4 py-1.5 text-xs font-bold text-white" style={{ background: 'rgba(166,119,73,0.7)', backdropFilter: 'blur(4px)' }}>✓ Dossier géré sur AVRA</span>
                  <span className="rounded-full px-4 py-1.5 text-xs font-bold text-white" style={{ background: 'rgba(48,64,53,0.7)', backdropFilter: 'blur(4px)' }}>42 800 € · Livré en 6 sem.</span>
                </div>
              </div>
              {/* Owl logo watermark */}
              <div className="absolute top-4 right-4 opacity-40">
                <Image src="/avra-icon.svg" alt="AVRA" width={32} height={32} loading="lazy" className="h-8 w-8 rounded-lg" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Sans AVRA */}
              <div data-reveal="left" className="rounded-3xl p-8 border-2" style={{ background: 'rgba(180,60,60,0.04)', borderColor: 'rgba(180,60,60,0.15)' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100"><XCircle className="h-5 w-5 text-red-500" /></div>
                  <div>
                    <p className="font-bold text-[#304035]">Sans AVRA</p>
                    <p className="text-xs text-[#304035]/45">La réalité de beaucoup trop d'artisans</p>
                  </div>
                </div>
                <ul className="space-y-4">
                  {COMPARISON.map((c, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 mt-0.5"><Minus className="h-3.5 w-3.5 text-red-500" /></div>
                      <span className="text-sm text-[#304035]/70 leading-relaxed">{c.before}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 rounded-2xl bg-red-50 border border-red-100 p-4">
                  <div className="flex items-center gap-2 text-red-600 text-sm font-semibold mb-1"><AlertTriangle className="h-4 w-4" /> Résultat</div>
                  <p className="text-xs text-red-600/80">Stress, erreurs, manque à gagner, clients insatisfaits. En moyenne <strong>15 000 € de CA perdu</strong> par an sur des oublis et retards.</p>
                </div>
              </div>

              {/* Avec AVRA */}
              <div data-reveal="right" data-delay="100" className="rounded-3xl p-8 border-2" style={{ background: 'rgba(48,64,53,0.04)', borderColor: 'rgba(48,64,53,0.2)' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100"><CheckSquare className="h-5 w-5 text-emerald-600" /></div>
                  <div>
                    <p className="font-bold text-[#304035]">Avec AVRA</p>
                    <p className="text-xs text-[#304035]/45">Ce que vous vivrez dès le premier jour</p>
                  </div>
                </div>
                <ul className="space-y-4">
                  {COMPARISON.map((c, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
                      <span className="text-sm text-[#304035]/80 leading-relaxed font-medium">{c.after}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 rounded-2xl border p-4" style={{ background: 'rgba(48,64,53,0.06)', borderColor: 'rgba(48,64,53,0.15)' }}>
                  <div className="flex items-center gap-2 text-[#304035] text-sm font-semibold mb-1"><TrendingUp className="h-4 w-4 text-[#a67749]" /> Résultat</div>
                  <p className="text-xs text-[#304035]/70">Sérénité, clarté, plus de temps clients. Nos utilisateurs constatent en moyenne <strong className="text-[#304035]">+35% de CA</strong> après 6 mois.</p>
                </div>
              </div>
            </div>

            <div data-reveal data-delay="200" className="text-center mt-10">
              <Link href="/login" className="inline-flex items-center gap-2.5 rounded-2xl px-8 py-4 text-base font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#304035,#4a5f50)', boxShadow: '0 8px 32px rgba(48,64,53,0.3)' }}>
                Rejoindre les +2 400 professionnels <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>


        {/* ══════════════ MÉTIERS ══════════════ */}
        <section id="metiers" className="py-28 px-6 bg-white" aria-labelledby="metiers-title">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-14">
              <p data-reveal className="text-sm font-bold uppercase tracking-[0.2em] text-[#a67749] mb-4">Pour votre métier</p>
              <h2 id="metiers-title" data-reveal data-delay="100" style={{ fontFamily: H }} className="text-4xl md:text-6xl font-bold text-[#304035] mb-5 leading-tight">
                Un outil taillé pour<br /><em className="text-[#a67749]">chaque corps de métier</em>
              </h2>
              <p data-reveal data-delay="150" className="text-lg text-[#304035]/55 max-w-xl mx-auto">AVRA s'adapte à votre activité avec des modules spécialisés selon votre discipline.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  img: '/images/kitchen-1.webp',
                  title: 'Cuisiniste',
                  desc: 'Gérez vos projets cuisine de la première visite à la pose finale.',
                  tags: ['Suivi technique par pièce', 'Gestion des SAV', 'Planning poseurs'],
                  color: '#a67749',
                },
                {
                  img: '/images/artisan-1.webp',
                  title: 'Menuisier / Ébéniste',
                  desc: 'Du devis de fabrication au suivi de chantier, tout est centralisé.',
                  tags: ['Plans techniques DCE', 'Suivi fabrication', 'Gestion sous-traitants'],
                  color: '#304035',
                },
                {
                  img: '/images/interior-apres-1.webp',
                  title: 'Agenceur',
                  desc: 'Pilotez vos projets d\'aménagement d\'espaces professionnels.',
                  tags: ['Multi-corps d\'état', 'Coordination intervenants', 'Reporting client'],
                  color: '#4a7a5e',
                },
                {
                  img: '/images/interior-apres-2.webp',
                  title: 'Architecte d\'intérieur',
                  desc: 'Centralisez vos dossiers clients, honoraires et documents de projet.',
                  tags: ['Gestion honoraires', 'Dossiers digitaux', 'Signature électronique'],
                  color: '#8a6038',
                },
              ].map((m, i) => (
                <div key={i} data-reveal data-delay={String(i * 100)}
                  className="group rounded-3xl bg-white border border-[#304035]/10 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                  {/* Photo header */}
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={m.img}
                      alt={m.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 40%, ${m.color}cc 100%)` }} />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 style={{ fontFamily: H }} className="text-lg font-bold text-white drop-shadow">{m.title}</h3>
                    </div>
                    {/* Color accent top-left */}
                    <div className="absolute top-3 left-3 h-1 w-8 rounded-full" style={{ background: m.color }} />
                  </div>
                  {/* Content */}
                  <div className="p-5">
                    <p className="text-sm text-[#304035]/55 leading-relaxed mb-4">{m.desc}</p>
                    <div className="space-y-1.5">
                      {m.tags.map(tag => (
                        <div key={tag} className="flex items-center gap-2 text-xs font-semibold text-[#304035]/70">
                          <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: m.color }} />
                          {tag}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ══════════════ COMMENT ÇA MARCHE ══════════════ */}
        <section id="comment" className="py-28 px-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg,#1a2920 0%,#243330 30%,#304035 70%,#2d3d32 100%)' }}
          aria-labelledby="how-title">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#a67749]/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#a67749]/15 to-transparent" />
          <div className="absolute top-16 right-12 h-72 w-72 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle,rgba(166,119,73,0.2),transparent)', filter: 'blur(50px)' }} />

          <div className="relative mx-auto max-w-6xl">
            <div className="text-center mb-20">
              <p data-reveal className="text-sm font-bold uppercase tracking-[0.2em] text-[#d4a574] mb-4">Comment ça marche</p>
              <h2 id="how-title" data-reveal data-delay="100" style={{ fontFamily: H }} className="text-4xl md:text-6xl font-bold text-white mb-5 leading-tight">
                Opérationnel en<br />
                <em className="not-italic text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg,#d4a574,#f0c87a,#c08a5a)' }}>5 minutes chrono</em>
              </h2>
              <p data-reveal data-delay="200" className="text-lg text-white/50 max-w-xl mx-auto">Pas de formation, pas de migration complexe. AVRA s'adapte à votre façon de travailler, pas l'inverse.</p>
            </div>

            <div className="relative">
              {/* Connecting line — animated on scroll */}
              <div className="hidden md:block absolute top-[52px] left-[18%] right-[18%] h-px bg-gradient-to-r from-transparent via-[#a67749]/20 to-transparent">
                <div data-reveal="fade" className="draw-line h-full bg-gradient-to-r from-[#a67749]/50 via-[#a67749] to-[#a67749]/50" />
              </div>

              <div className="grid md:grid-cols-3 gap-6 md:gap-10">
                {STEPS.map((step, i) => (
                  <div key={i} data-reveal data-delay={String(i * 150)} className="group text-center cursor-pointer"
                    onMouseEnter={() => setActiveStep(i)} onClick={() => setActiveStep(i)}>
                    <div className="flex justify-center mb-5">
                      <div className="flex h-[104px] w-[104px] items-center justify-center rounded-full transition-all duration-400 relative"
                        style={activeStep === i ? { background: 'linear-gradient(135deg,#a67749,#c08a5a)', boxShadow: '0 0 0 12px rgba(166,119,73,0.12), 0 8px 32px rgba(166,119,73,0.35)' } : { background: 'rgba(166,119,73,0.1)', border: '2px solid rgba(166,119,73,0.25)' }}>
                        <span style={{ fontFamily: H }} className={`text-3xl font-bold transition-colors ${activeStep === i ? 'text-white' : 'text-[#a67749]'}`}>{step.num}</span>
                      </div>
                    </div>
                    <step.icon className={`h-7 w-7 mx-auto mb-4 transition-colors ${activeStep === i ? 'text-[#d4a574]' : 'text-white/35'}`} />
                    <h3 style={{ fontFamily: H }} className="text-xl font-bold text-white mb-3">{step.title}</h3>
                    <p className="text-white/55 text-sm leading-relaxed">{step.desc}</p>
                    <div className="overflow-hidden transition-all duration-400" style={{ maxHeight: activeStep === i ? 160 : 0, opacity: activeStep === i ? 1 : 0 }}>
                      <div className="mt-4 rounded-2xl p-4 text-left" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <p className="text-sm text-white/65 leading-relaxed">{step.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div data-reveal data-delay="300" className="text-center mt-16">
              <Link href="/login" className="inline-flex items-center gap-2.5 rounded-2xl px-8 py-4 text-base font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#a67749,#c08a5a)', boxShadow: '0 8px 40px rgba(166,119,73,0.35)' }}>
                Commencer maintenant — c'est gratuit <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="mt-3 text-xs text-white/30">Aucune carte bancaire · Annulable à tout moment</p>
            </div>
          </div>
        </section>


        {/* ══════════════ TÉMOIGNAGES ══════════════ */}
        <section id="temoignages" className="py-28 px-6 bg-[#f5eee8]" aria-labelledby="testi-title">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-14">
              <p data-reveal className="text-sm font-bold uppercase tracking-[0.2em] text-[#a67749] mb-4">Témoignages</p>
              <h2 id="testi-title" data-reveal data-delay="100" style={{ fontFamily: H }} className="text-4xl md:text-6xl font-bold text-[#304035] mb-5 leading-tight">
                Ils ont choisi AVRA,<br /><em className="text-[#a67749]">ils ne reviennent pas en arrière</em>
              </h2>
              <p data-reveal data-delay="150" className="text-lg text-[#304035]/55 max-w-xl mx-auto mb-8">+2 400 professionnels font confiance à AVRA au quotidien.</p>
              <div data-reveal data-delay="200" className="inline-flex items-center gap-3 rounded-2xl bg-white px-6 py-3 shadow-sm border border-[#304035]/8">
                <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-5 w-5 fill-[#a67749] text-[#a67749]" />)}</div>
                <p style={{ fontFamily: H }} className="text-2xl font-bold text-[#304035]">4.9</p>
                <p className="text-sm text-[#304035]/50">— 248 avis vérifiés</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <article key={i} data-reveal data-delay={String(i * 120)} className="relative rounded-3xl bg-white border border-[#304035]/8 p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300">
                  <div className="absolute top-3 right-5 select-none pointer-events-none" style={{ fontFamily: 'Georgia, serif', fontSize: 100, lineHeight: 1, color: t.avatarBg, opacity: 0.06 }}>"</div>
                  <div className="flex gap-0.5 mb-4">{Array.from({ length: t.stars }).map((_, j) => <Star key={j} className="h-4 w-4 fill-[#a67749] text-[#a67749]" />)}</div>
                  <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold mb-4" style={{ background: `${t.avatarBg}14`, color: t.avatarBg }}>
                    <TrendingUp className="h-3 w-3" />{t.metric}
                  </div>
                  <blockquote className="text-[#304035]/72 leading-relaxed text-[15px] mb-6 italic">"{t.text}"</blockquote>
                  <div className="flex items-center gap-3 pt-4 border-t border-[#304035]/8">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white" style={{ background: t.avatarBg }}>{t.avatar}</div>
                    <div>
                      <p className="font-bold text-[#304035] text-sm">{t.name}</p>
                      <p className="text-xs text-[#304035]/50">{t.role} · {t.location}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>


        {/* ══════════════ TARIFS ══════════════ */}
        <section id="tarifs" className="py-28 px-6 bg-white" aria-labelledby="pricing-title">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-14">
              <p data-reveal className="text-sm font-bold uppercase tracking-[0.2em] text-[#a67749] mb-4">Tarifs</p>
              <h2 id="pricing-title" data-reveal data-delay="100" style={{ fontFamily: H }} className="text-4xl md:text-6xl font-bold text-[#304035] mb-5 leading-tight">
                Simple, transparent,<br /><em className="text-[#a67749]">sans mauvaise surprise</em>
              </h2>
              <p data-reveal data-delay="150" className="text-lg text-[#304035]/55 mb-8">14 jours d'essai gratuit sur tous les plans. Aucune carte bancaire nécessaire.</p>
              <div data-reveal data-delay="200" className="inline-flex items-center gap-1 rounded-2xl bg-[#f5eee8] p-1.5">
                <button onClick={() => setYearly(false)} className={`rounded-xl px-5 py-2 text-sm font-semibold transition-all ${!yearly ? 'bg-white shadow-sm text-[#304035]' : 'text-[#304035]/50'}`}>Mensuel</button>
                <button onClick={() => setYearly(true)} className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition-all ${yearly ? 'bg-white shadow-sm text-[#304035]' : 'text-[#304035]/50'}`}>
                  Annuel {yearly ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">-20%</span> : <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-600">Économisez 20%</span>}
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 items-start">
              {PLANS.map((plan, i) => (
                <div key={i} data-reveal data-delay={String(i * 100)} className={`relative rounded-3xl p-8 border flex flex-col transition-all ${plan.highlight ? 'shadow-2xl' : 'hover:shadow-lg'}`}
                  style={plan.highlight ? { background: 'linear-gradient(160deg,#243330 0%,#304035 100%)', borderColor: '#a67749', transform: 'scale(1.04)' } : { background: '#f9f6f1', borderColor: 'rgba(48,64,53,0.1)' }}>
                  {plan.badge && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full px-5 py-1.5 text-xs font-bold text-white shadow-lg whitespace-nowrap" style={{ background: 'linear-gradient(135deg,#a67749,#c08a5a)' }}>{plan.badge}</div>
                  )}
                  <div className="mb-7">
                    <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${plan.highlight ? 'text-[#d4a574]' : 'text-[#304035]/45'}`}>{plan.name}</p>
                    <div className="flex items-end gap-1.5 mb-2">
                      {plan.monthlyPrice ? (
                        <><span style={{ fontFamily: H }} className={`text-5xl font-bold ${plan.highlight ? 'text-white' : 'text-[#304035]'}`}>{yearly ? plan.yearlyPrice : plan.monthlyPrice}€</span>
                          <span className={`text-sm pb-1.5 ${plan.highlight ? 'text-white/45' : 'text-[#304035]/40'}`}>HT/mois</span></>
                      ) : (
                        <span style={{ fontFamily: H }} className={`text-4xl font-bold ${plan.highlight ? 'text-white' : 'text-[#304035]'}`}>Sur mesure</span>
                      )}
                    </div>
                    {plan.monthlyPrice && yearly && <p className="text-xs text-emerald-400 font-semibold mb-1">Soit {(plan.yearlyPrice! * 12).toLocaleString('fr-FR')} € / an</p>}
                    <p className={`text-sm ${plan.highlight ? 'text-white/55' : 'text-[#304035]/50'}`}>{plan.desc}</p>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1" role="list">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2.5 text-sm">
                        <CheckCircle className={`h-4 w-4 shrink-0 ${plan.highlight ? 'text-[#d4a574]' : 'text-emerald-500'}`} />
                        <span className={plan.highlight ? 'text-white/85' : 'text-[#304035]/75'}>{f}</span>
                      </li>
                    ))}
                    {plan.excluded?.map((f, j) => (
                      <li key={`ex-${j}`} className="flex items-center gap-2.5 text-sm opacity-35">
                        <X className="h-4 w-4 shrink-0 text-[#304035]" />
                        <span className="text-[#304035]/50 line-through">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/login" className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all active:scale-[0.98]"
                    style={plan.highlight ? { background: 'linear-gradient(135deg,#a67749,#c08a5a)', color: 'white', boxShadow: '0 4px 20px rgba(166,119,73,0.4)' } : { border: '1.5px solid rgba(48,64,53,0.2)', color: '#304035' }}
                    onMouseEnter={e => { if (!plan.highlight) { (e.currentTarget as HTMLElement).style.background = '#304035'; (e.currentTarget as HTMLElement).style.color = 'white'; } }}
                    onMouseLeave={e => { if (!plan.highlight) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#304035'; } }}>
                    {plan.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>

            <div data-reveal data-delay="200" className="mt-14 flex flex-wrap items-center justify-center gap-8 text-sm text-[#304035]/50">
              {([[Shield, 'Données hébergées en France'], [CheckCircle, 'Conforme RGPD'], [Zap, 'Uptime 99.9% garanti'], [Award, 'Support en français']] as [React.FC<{className?:string}>, string][]).map(([Icon, label], i) => (
                <div key={i} className="flex items-center gap-2"><Icon className="h-4 w-4 text-[#a67749]" />{label}</div>
              ))}
            </div>
          </div>
        </section>


        {/* ══════════════ FAQ ══════════════ */}
        <section id="faq" className="py-28 px-6 bg-[#f5eee8]" aria-labelledby="faq-title">
          <div className="mx-auto max-w-3xl">
            <div className="text-center mb-14">
              <p data-reveal className="text-sm font-bold uppercase tracking-[0.2em] text-[#a67749] mb-4">Questions fréquentes</p>
              <h2 id="faq-title" data-reveal data-delay="100" style={{ fontFamily: H }} className="text-4xl md:text-5xl font-bold text-[#304035] mb-5 leading-tight">
                Tout ce que vous<br /><em className="text-[#a67749]">voulez savoir</em>
              </h2>
              <p data-reveal data-delay="200" className="text-lg text-[#304035]/55">Les questions que nos clients posent avant de se lancer.</p>
            </div>

            <div className="space-y-3">
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} data-reveal data-delay={String(i * 70)} className="rounded-2xl border border-[#304035]/10 bg-white overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between px-7 py-5 text-left hover:bg-[#304035]/2 transition-colors">
                    <span className="font-semibold text-[#304035] pr-6 text-[15px]">{item.q}</span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-[#a67749] transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`faq-content ${openFaq === i ? 'open' : ''}`}>
                    <p className="px-7 pb-5 text-[#304035]/65 leading-relaxed text-sm">{item.a}</p>
                  </div>
                </div>
              ))}
            </div>

            <div data-reveal data-delay="200" className="text-center mt-10">
              <p className="text-[#304035]/50 text-sm">Vous avez d'autres questions ?</p>
              <button onClick={() => setChatOpen(true)} className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#a67749] hover:text-[#c08a5a] transition-colors">
                <MessageCircle className="h-4 w-4" /> Poser une question à notre assistant IA
              </button>
            </div>
          </div>
        </section>


        {/* ══════════════ CTA FINAL ══════════════ */}
        <section className="py-28 px-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,#1a2920 0%,#243330 30%,#304035 70%,#3a4f42 100%)' }}>
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 right-0 h-[500px] w-[500px] rounded-full" style={{ background: 'radial-gradient(circle,rgba(166,119,73,0.2),transparent)', filter: 'blur(80px)' }} />
            <div className="absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full" style={{ background: 'radial-gradient(circle,rgba(166,119,73,0.15),transparent)', filter: 'blur(70px)' }} />
            {/* Hibou AVRA centré en fond */}
            <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: 0.06 }}>
              <Image src="/images/owl-1.webp" alt="" width={500} height={500} loading="lazy" className="w-[500px] h-[500px] object-contain" style={{ filter: 'brightness(2)' }} />
            </div>
          </div>
          <div className="relative mx-auto max-w-3xl text-center">
            <div data-reveal className="flex justify-center mb-8">
              {/* Logo hibou AVRA visible */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ width: 100, height: 100, border: '2px solid rgba(166,119,73,0.5)' }}>
                <Image src="/images/owl-1.webp" alt="AVRA" width={100} height={100} loading="lazy" className="w-full h-full object-cover" />
                <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg,#a67749,#c08a5a)' }}><Zap className="h-3.5 w-3.5 text-white" /></div>
              </div>
            </div>
            <h2 data-reveal data-delay="100" style={{ fontFamily: H }} className="text-4xl md:text-6xl font-bold text-white mb-5 leading-tight">
              Prêt à transformer<br />
              <em className="not-italic text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg,#d4a574,#f0c87a,#c08a5a)' }}>votre activité ?</em>
            </h2>
            <p data-reveal data-delay="200" className="text-lg text-white/55 mb-10">Rejoignez +2 400 professionnels qui ont choisi AVRA.<br />Premiers 14 jours offerts, sans carte bancaire.</p>
            <div data-reveal data-delay="300" className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login" className="flex items-center gap-2.5 rounded-2xl px-10 py-4 text-base font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#a67749,#c08a5a)', boxShadow: '0 8px 40px rgba(166,119,73,0.4)' }}>
                Démarrer gratuitement <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/login" className="flex items-center gap-2.5 rounded-2xl border border-white/20 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all">
                <Play className="h-4 w-4 fill-white" /> Voir la démo live
              </Link>
            </div>
            <p data-reveal data-delay="400" className="mt-6 text-xs text-white/30 flex items-center justify-center gap-2">
              <Shield className="h-3.5 w-3.5" /> Données hébergées en France · RGPD · Aucun engagement · Résiliable à tout moment
            </p>
          </div>
        </section>


        {/* ══════════════ FOOTER ══════════════ */}
        <footer className="px-6 pt-16 pb-8" style={{ background: '#141f17', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="mx-auto max-w-7xl">
            {/* 4-column grid */}
            <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:grid-cols-[2fr_1fr_1fr_1fr] pb-12 border-b border-white/8">
              {/* Brand col */}
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-2.5 mb-4">
                  <Image src="/avra-icon.svg" alt="AVRA" width={40} height={40} loading="lazy" className="h-10 w-10 rounded-xl opacity-90" />
                  <span style={{ fontFamily: H }} className="text-lg font-bold tracking-widest text-white">AVRA</span>
                </div>
                <p className="text-sm text-white/40 leading-relaxed max-w-[220px] mb-5">
                  L'assistant virtuel de l'agencement. Conçu pour les professionnels français du bois, de la cuisine et de la décoration intérieure.
                </p>
                <p className="text-xs text-white/20">© 2026 AVRA — Fait avec ♥ en France 🇫🇷</p>
              </div>

              {/* Produit col */}
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/60 mb-4">Produit</p>
                <ul className="space-y-2.5">
                  {[['#fonctionnalites', 'Fonctionnalités'], ['#tarifs', 'Tarifs'], ['#', 'Nouveautés'], ['#', 'Roadmap']].map(([href, label]) => (
                    <li key={label}><a href={href} className="text-sm text-white/40 hover:text-white/80 transition-colors">{label}</a></li>
                  ))}
                </ul>
              </div>

              {/* Métiers col */}
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/60 mb-4">Métiers</p>
                <ul className="space-y-2.5">
                  {[['#metiers', 'Cuisinistes'], ['#metiers', 'Menuisiers'], ['#metiers', 'Agenceurs'], ['#metiers', 'Architectes d\'intérieur']].map(([href, label]) => (
                    <li key={label}><a href={href} className="text-sm text-white/40 hover:text-white/80 transition-colors">{label}</a></li>
                  ))}
                </ul>
              </div>

              {/* Entreprise col */}
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/60 mb-4">Entreprise</p>
                <ul className="space-y-2.5">
                  {[['#', 'À propos'], ['#', 'Contact'], ['#', 'Mentions légales'], ['#', 'CGU / CGV'], ['#', 'RGPD']].map(([href, label]) => (
                    <li key={label}><a href={href} className="text-sm text-white/40 hover:text-white/80 transition-colors">{label}</a></li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bottom row */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-6 text-xs text-white/25">
              <div className="flex flex-wrap items-center gap-5">
                {([[Shield, 'Données hébergées en France'], [CheckCircle, 'Conforme RGPD'], [Zap, 'Uptime 99.9%']] as [React.FC<{className?:string}>, string][]).map(([Icon, label], i) => (
                  <div key={i} className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-[#a67749]/60" />{label}</div>
                ))}
              </div>
              <span>Tous droits réservés · 2026</span>
            </div>
          </div>
        </footer>


        {/* ══════════════ CHATBOT FLOTTANT ══════════════ */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
          {/* Chat window */}
          {chatOpen && (
            <div className="chat-animate w-80 md:w-96 rounded-3xl bg-white shadow-2xl border border-[#304035]/10 overflow-hidden flex flex-col" style={{ maxHeight: 480 }}>
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4" style={{ background: 'linear-gradient(135deg,#304035,#3a4f42)' }}>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#a67749]"><Bot className="h-5 w-5 text-white" /></div>
                <div className="flex-1">
                  <p style={{ fontFamily: H }} className="text-sm font-bold text-white">Assistant AVRA</p>
                  <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /><p className="text-[10px] text-white/50">En ligne · Répond en 1 seconde</p></div>
                </div>
                <button onClick={() => setChatOpen(false)} className="p-1 rounded-lg hover:bg-white/10 transition-colors"><X className="h-4 w-4 text-white/70" /></button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f9f6f1]" style={{ minHeight: 240, maxHeight: 320 }}>
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'bot' && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#304035] mt-0.5"><Bot className="h-4 w-4 text-white" /></div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#304035] text-white rounded-tr-sm' : 'bg-white border border-[#304035]/8 text-[#304035] rounded-tl-sm shadow-sm'}`}>
                      {msg.role === 'bot' ? renderBotText(msg.text) : msg.text}
                    </div>
                  </div>
                ))}
                {chatTyping && (
                  <div className="flex gap-2 justify-start">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#304035]"><Bot className="h-4 w-4 text-white" /></div>
                    <div className="bg-white border border-[#304035]/8 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex gap-1 items-center">
                      {[0, 1, 2].map(i => <div key={i} className="h-2 w-2 rounded-full bg-[#304035]/30 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick suggestions */}
              <div className="px-4 pb-2 bg-[#f9f6f1] flex flex-wrap gap-1.5">
                {["C'est pour qui ?", "Combien ça coûte ?", "Mes données ?"].map(s => (
                  <button key={s} onClick={() => { setChatInput(s); setTimeout(() => { setChatMessages(p => [...p, { role: 'user', text: s }]); setChatTyping(true); setTimeout(() => { setChatTyping(false); setChatMessages(p => [...p, { role: 'bot', text: getChatResponse(s) }]); }, 900); }, 0); }}
                    className="rounded-full border border-[#304035]/15 bg-white px-3 py-1 text-[11px] font-medium text-[#304035]/60 hover:text-[#304035] hover:border-[#304035]/30 transition-colors">
                    {s}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-2 p-3 bg-white border-t border-[#304035]/8">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()}
                  placeholder="Posez votre question…"
                  className="flex-1 rounded-xl bg-[#f5eee8] px-4 py-2.5 text-sm text-[#304035] placeholder-[#304035]/35 outline-none focus:ring-2 focus:ring-[#a67749]/30"
                />
                <button onClick={sendChat} disabled={!chatInput.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition-all disabled:opacity-40 hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#a67749,#c08a5a)' }}>
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Toggle button */}
          <button onClick={() => setChatOpen(!chatOpen)}
            className="flex items-center gap-2.5 rounded-2xl px-5 py-3.5 text-sm font-semibold text-white shadow-2xl transition-all hover:opacity-90 hover:shadow-3xl active:scale-[0.97]"
            style={{ background: chatOpen ? '#304035' : 'linear-gradient(135deg,#304035,#4a5f50)', boxShadow: '0 8px 32px rgba(48,64,53,0.4)' }}
            aria-label={chatOpen ? 'Fermer l\'assistant' : 'Ouvrir l\'assistant IA'}>
            {chatOpen ? <X className="h-5 w-5" /> : <><MessageCircle className="h-5 w-5" /><span>Assistant IA</span><div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /></>}
          </button>
        </div>

      </div>
    </>
  );
}
