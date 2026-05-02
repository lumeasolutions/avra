import React, { useState } from 'react';
import { ChevronDown, Plus, FileText, Calendar, BarChart3, Package, ReceiptText, Users, Settings, HelpCircle, History } from 'lucide-react';

export default function AvraLayout() {
  const [activePage, setActivePage] = useState('dossiers');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // AVRA Color Palette (from mockup)
  const colors = {
    darkGreen: '#2D5016',      // Vert foncé principal
    sageGreen: '#4A7C2E',      // Vert plus clair
    gold: '#D4A85F',           // Or/tan
    lightBg: '#F5F3F0',        // Beige clair
    white: '#FFFFFF',
  };

  const menuItems = [
    { id: 'nouveau', label: 'Nouveau dossier', icon: Plus, color: colors.gold },
    { id: 'dossiers', label: 'Dossiers en cours', icon: FileText },
    { id: 'signes', label: 'Dossiers signés', icon: FileText },
    { id: 'planning', label: 'Planning', icon: Calendar },
    { id: 'gestion', label: 'Planning gestion', icon: Calendar },
    { id: 'stock', label: 'Stock', icon: Package },
    { id: 'photo', label: 'IA photo réalisme', icon: BarChart3 },
    { id: 'stats', label: 'Statistiques', icon: BarChart3 },
    { id: 'facture', label: 'Facturation', icon: ReceiptText },
    { id: 'interventions', label: 'Interventions', icon: Users },
    { id: 'historique', label: 'Historique', icon: History },
    { id: 'parametres', label: 'Paramètres', icon: Settings },
    { id: 'assistant', label: 'Assistant AVRA', icon: HelpCircle },
  ];

  const dossierEnCours = [
    { name: 'Turpin', status: 'URGENT', color: 'bg-red-100 text-red-800' },
    { name: 'Lefevre', status: 'EN COURS', color: 'bg-orange-100 text-orange-800' },
    { name: 'Bernard', status: 'EN COURS', color: 'bg-orange-100 text-orange-800' },
    { name: 'Dupont', status: 'A VALIDER', color: 'bg-green-100 text-green-800' },
  ];

  const dossierSignes = [
    { name: 'Damont', status: 'URGENT', color: 'bg-red-100 text-red-800' },
    { name: 'Debuchy', status: 'EN COURS', color: 'bg-orange-100 text-orange-800' },
    { name: 'Santini', status: 'EN COURS', color: 'bg-orange-100 text-orange-800' },
    { name: 'Persu', status: 'VALIDÉ', color: 'bg-teal-100 text-teal-800' },
  ];

  const notifications = [
    { id: 1, type: 'warning', text: 'Commande attente client Lefevre' },
    { id: 2, type: 'warning', text: 'Plan technique manquant Dupont' },
    { id: 3, type: 'error', text: 'Erreur détectée relève Santini' },
    { id: 4, type: 'info', text: 'Attente devis retour client Turpin' },
  ];

  // Page content based on selection
  const renderContent = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Dossiers en cours */}
          <div className={`p-6 rounded-2xl`} style={{ backgroundColor: colors.white, border: `1px solid ${colors.sageGreen}20` }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: colors.darkGreen }}>
              Dossiers en cours
            </h3>
            <div className="space-y-3">
              {dossierEnCours.map((dossier, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="font-medium">{dossier.name}</span>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${dossier.color}`}>
                    {dossier.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Dossiers signés */}
          <div className={`p-6 rounded-2xl`} style={{ backgroundColor: colors.white, border: `1px solid ${colors.sageGreen}20` }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: colors.darkGreen }}>
              Dossiers signés
            </h3>
            <div className="space-y-3">
              {dossierSignes.map((dossier, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="font-medium">{dossier.name}</span>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${dossier.color}`}>
                    {dossier.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Planning */}
        <div className={`p-6 rounded-2xl`} style={{ backgroundColor: colors.white, border: `1px solid ${colors.sageGreen}20` }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: colors.darkGreen }}>
            📅 Planning
          </h3>

          {/* Jours de la semaine */}
          <div className="grid grid-cols-8 gap-2 mb-6 text-xs font-bold" style={{ color: colors.darkGreen }}>
            <div>LUN</div>
            <div>MAR</div>
            <div>MERC</div>
            <div>JEU</div>
            <div>VEN</div>
            <div>SAM</div>
            <div>SAM</div>
            <div>DIM</div>
          </div>

          {/* Timeline */}
          <div className="relative">
            <div className="flex gap-4">
              {/* Time column */}
              <div className="text-xs text-gray-500 flex flex-col justify-between py-2" style={{ width: '40px' }}>
                <div>9:00</div>
                <div>10:00</div>
                <div>11:00</div>
                <div>12:00</div>
                <div>13:00</div>
              </div>

              {/* Calendar grid */}
              <div className="flex-1 grid grid-cols-8 gap-2">
                {['', '', '', '', '', '', '', ''].map((_, dayIdx) => (
                  <div key={dayIdx} className="border-l-2 border-gray-200 relative h-40">
                    {dayIdx === 0 && (
                      <>
                        <div
                          className="absolute top-2 left-1 text-xs font-semibold px-2 py-1 rounded"
                          style={{ backgroundColor: colors.gold, color: colors.white, width: '80px' }}
                        >
                          Dupont
                        </div>
                        <div
                          className="absolute top-16 left-1 text-xs font-semibold px-2 py-1 rounded"
                          style={{ backgroundColor: colors.sageGreen, color: colors.white, width: '90px' }}
                        >
                          Bernard
                        </div>
                      </>
                    )}
                    {dayIdx === 1 && (
                      <div
                        className="absolute top-6 left-1 text-xs font-semibold px-2 py-1 rounded"
                        style={{ backgroundColor: colors.gold, color: colors.white, width: '95px' }}
                      >
                        Lefevre
                      </div>
                    )}
                    {dayIdx === 2 && (
                      <>
                        <div
                          className="absolute top-6 left-1 text-xs font-semibold px-2 py-1 rounded"
                          style={{ backgroundColor: colors.gold, color: colors.white, width: '85px' }}
                        >
                          Plan tech Damont
                        </div>
                      </>
                    )}
                    {dayIdx === 4 && (
                      <div
                        className="absolute top-12 left-1 text-xs font-semibold px-2 py-1 rounded"
                        style={{ backgroundColor: colors.sageGreen, color: colors.white, width: '110px' }}
                      >
                        Commande Persu
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen" style={{ backgroundColor: colors.lightBg }}>
      {/* SIDEBAR */}
      <div
        className="flex flex-col transition-all duration-300"
        style={{
          width: sidebarOpen ? '250px' : '0px',
          backgroundColor: colors.darkGreen,
          color: colors.white,
          overflow: 'hidden',
        }}
      >
        {/* Logo/Header */}
        <div className="p-6 flex items-center gap-3 border-b" style={{ borderColor: colors.sageGreen }}>
          <div className="text-2xl font-bold">🦉 AVRA</div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
          {/* Nouveau dossier - Special button style */}
          <button
            onClick={() => setActivePage('nouveau')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-semibold text-sm mb-4"
            style={{
              backgroundColor: colors.gold,
              color: colors.darkGreen,
            }}
          >
            <Plus size={18} />
            Nouveau dossier
          </button>

          {/* Other menu items */}
          {menuItems.slice(1).map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm ${
                activePage === item.id
                  ? 'bg-white text-darkGreen'
                  : 'text-white hover:bg-opacity-20'
              }`}
              style={{
                backgroundColor: activePage === item.id ? colors.white : 'transparent',
                color: activePage === item.id ? colors.darkGreen : colors.white,
              }}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom section - Assistant AVRA */}
        <div
          className="p-4 border-t flex items-center gap-2"
          style={{ borderColor: colors.sageGreen }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: colors.gold }}
          >
            🦉
          </div>
          <span className="text-xs font-semibold">Assistant AVRA</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-auto">
        {/* Top navigation bar */}
        <div
          className="h-16 border-b flex items-center px-8"
          style={{
            backgroundColor: colors.white,
            borderColor: colors.sageGreen,
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-lg font-bold hover:opacity-70"
            style={{ color: colors.darkGreen }}
          >
            ☰
          </button>
          <h1 className="ml-4 text-xl font-bold" style={{ color: colors.darkGreen }}>
            {menuItems.find(m => m.id === activePage)?.label || 'Tableau de bord'}
          </h1>
        </div>

        {/* Page content */}
        <div className="p-8">
          {activePage === 'assistant' ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="text-6xl mb-4">🦉</div>
                <h2 className="text-2xl font-bold" style={{ color: colors.darkGreen }}>
                  Assistant AVRA
                </h2>
                <p className="text-gray-600 mt-2">Prêt à vous aider</p>
              </div>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </div>

      {/* Notification Panel (Right side) */}
      <div
        className="w-80 border-l p-6 overflow-y-auto"
        style={{
          backgroundColor: colors.white,
          borderColor: colors.sageGreen,
        }}
      >
        <div className="flex items-center gap-2 mb-6">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: colors.gold }}
          >
            🦉
          </div>
          <h3 className="font-bold" style={{ color: colors.darkGreen }}>
            Assistant AVRA
          </h3>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          Notifications et alertes
        </div>

        <div className="space-y-3">
          {notifications.map((notif, idx) => (
            <div
              key={notif.id}
              className="flex gap-3 p-3 rounded-lg"
              style={{
                backgroundColor:
                  notif.type === 'error'
                    ? '#FEE2E2'
                    : notif.type === 'warning'
                    ? '#FEF3C7'
                    : '#DBEAFE',
              }}
            >
              <div className="text-lg">
                {notif.type === 'error' ? '❌' : notif.type === 'warning' ? '⚠️' : 'ℹ️'}
              </div>
              <p className="text-xs" style={{ color: colors.darkGreen }}>
                {notif.text}
              </p>
            </div>
          ))}
        </div>

        <div className="text-right text-xs text-gray-500 mt-4">
          1/28
        </div>
      </div>
    </div>
  );
}
