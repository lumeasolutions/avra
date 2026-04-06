import React, { useState } from 'react';
import { Plus, FileText, Calendar, Package, BarChart3, ReceiptText, Users, Settings, HelpCircle, History } from 'lucide-react';

export default function AvraDashboardCurved() {
  const [activePage, setActivePage] = useState('dossiers');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // AVRA Color Palette
  const colors = {
    darkGreen: '#2D5016',
    sageGreen: '#4A7C2E',
    gold: '#D4A85F',
    lightBg: '#F5F3F0',
    white: '#FFFFFF',
  };

  const menuItems = [
    { id: 'nouveau', label: 'Nouveau dossier', icon: Plus, isButton: true },
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
    { name: 'Dupont', status: 'A VALIDER', color: 'bg-emerald-100 text-emerald-800' },
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

  const renderContent = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Dossiers en cours */}
          <div
            className="p-6 transition-shadow hover:shadow-lg"
            style={{
              backgroundColor: colors.white,
              borderRadius: '48px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: colors.darkGreen }}>
              Dossiers en cours
            </h3>
            <div className="space-y-3">
              {dossierEnCours.map((dossier, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="font-medium text-sm">{dossier.name}</span>
                  <span
                    className={`text-xs px-4 py-1 font-semibold ${dossier.color}`}
                    style={{ borderRadius: '20px' }}
                  >
                    {dossier.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Dossiers signés */}
          <div
            className="p-6 transition-shadow hover:shadow-lg"
            style={{
              backgroundColor: colors.white,
              borderRadius: '48px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: colors.darkGreen }}>
              Dossiers signés
            </h3>
            <div className="space-y-3">
              {dossierSignes.map((dossier, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="font-medium text-sm">{dossier.name}</span>
                  <span
                    className={`text-xs px-4 py-1 font-semibold ${dossier.color}`}
                    style={{ borderRadius: '20px' }}
                  >
                    {dossier.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Planning */}
        <div
          className="p-8 transition-shadow hover:shadow-lg"
          style={{
            backgroundColor: colors.white,
            borderRadius: '48px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}
        >
          <h3 className="text-lg font-semibold mb-6" style={{ color: colors.darkGreen }}>
            📅 Planning
          </h3>

          {/* Jours de la semaine */}
          <div className="grid grid-cols-8 gap-4 mb-6 text-xs font-bold px-4" style={{ color: colors.darkGreen }}>
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
          <div className="relative px-4">
            <div className="flex gap-6">
              {/* Time column */}
              <div className="text-xs text-gray-500 flex flex-col justify-between py-2 font-semibold" style={{ width: '40px' }}>
                <div>9:00</div>
                <div>10:00</div>
                <div>11:00</div>
                <div>12:00</div>
                <div>13:00</div>
              </div>

              {/* Calendar grid */}
              <div className="flex-1 grid grid-cols-8 gap-4">
                {['', '', '', '', '', '', '', ''].map((_, dayIdx) => (
                  <div key={dayIdx} className="relative h-48">
                    {dayIdx === 0 && (
                      <>
                        <div
                          className="absolute top-2 left-0 text-xs font-bold px-3 py-2 text-white w-20"
                          style={{
                            backgroundColor: colors.gold,
                            borderRadius: '16px',
                          }}
                        >
                          Dupont
                        </div>
                        <div
                          className="absolute top-20 left-0 text-xs font-bold px-3 py-2 text-white w-20"
                          style={{
                            backgroundColor: colors.sageGreen,
                            borderRadius: '16px',
                          }}
                        >
                          Bernard
                        </div>
                      </>
                    )}
                    {dayIdx === 1 && (
                      <div
                        className="absolute top-8 left-0 text-xs font-bold px-3 py-2 text-white w-24"
                        style={{
                          backgroundColor: colors.gold,
                          borderRadius: '16px',
                        }}
                      >
                        Lefevre
                      </div>
                    )}
                    {dayIdx === 2 && (
                      <>
                        <div
                          className="absolute top-8 left-0 text-xs font-bold px-3 py-2 text-white w-28"
                          style={{
                            backgroundColor: colors.gold,
                            borderRadius: '16px',
                          }}
                        >
                          Plan tech Damont
                        </div>
                      </>
                    )}
                    {dayIdx === 4 && (
                      <div
                        className="absolute top-12 left-0 text-xs font-bold px-3 py-2 text-white w-32"
                        style={{
                          backgroundColor: colors.sageGreen,
                          borderRadius: '16px',
                        }}
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
      {/* SIDEBAR - TRÈS ARRONDIE */}
      <div
        className="flex flex-col transition-all duration-300 relative"
        style={{
          width: sidebarOpen ? '280px' : '0px',
          backgroundColor: colors.darkGreen,
          color: colors.white,
          overflow: 'hidden',
          borderRadius: sidebarOpen ? '0 64px 64px 0' : '0',
        }}
      >
        {/* Logo/Header with curves */}
        <div
          className="p-8 flex items-center gap-3 border-b"
          style={{
            borderColor: colors.sageGreen,
          }}
        >
          <div
            className="text-3xl font-bold flex items-center justify-center w-12 h-12"
            style={{
              backgroundColor: colors.gold,
              borderRadius: '50%',
            }}
          >
            🦉
          </div>
          <div>
            <div className="font-bold text-lg" style={{ color: colors.white }}>AVRA</div>
            <div className="text-xs opacity-80">L'assistant intelligent</div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
          {/* Nouveau dossier - Special curved button */}
          <button
            onClick={() => setActivePage('nouveau')}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 font-bold text-sm transition-all hover:shadow-lg"
            style={{
              backgroundColor: colors.gold,
              color: colors.darkGreen,
              borderRadius: '32px',
              marginBottom: '8px',
            }}
          >
            <Plus size={20} />
            <span>Nouveau dossier</span>
          </button>

          {/* Other menu items - very rounded */}
          {menuItems.slice(1).map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-3xl transition-all text-sm font-medium`}
              style={{
                backgroundColor: activePage === item.id ? colors.white : 'transparent',
                color: activePage === item.id ? colors.darkGreen : colors.white,
              }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom section - Assistant AVRA - rounded */}
        <div
          className="p-4 m-4 flex items-center gap-3"
          style={{
            backgroundColor: colors.sageGreen,
            borderRadius: '32px',
          }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
            style={{
              backgroundColor: colors.gold,
            }}
          >
            🦉
          </div>
          <span className="text-sm font-semibold">Assistant AVRA</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navigation bar - very rounded */}
        <div
          className="h-20 border-b flex items-center px-8 gap-4"
          style={{
            backgroundColor: colors.white,
            borderColor: colors.sageGreen,
            borderRadius: '0 0 48px 0',
          }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-2xl font-bold hover:opacity-70 transition-opacity"
            style={{ color: colors.darkGreen }}
          >
            ☰
          </button>
          <h1 className="text-2xl font-bold" style={{ color: colors.darkGreen }}>
            {menuItems.find(m => m.id === activePage)?.label || 'Tableau de bord'}
          </h1>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-auto p-8">
          {activePage === 'assistant' ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-7xl mb-6">🦉</div>
                <h2 className="text-3xl font-bold mb-2" style={{ color: colors.darkGreen }}>
                  Assistant AVRA
                </h2>
                <p className="text-gray-600 text-lg">Prêt à vous aider</p>
              </div>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </div>

      {/* Notification Panel (Right side) - TRÈS ARRONDIE */}
      <div
        className="w-96 border-l p-6 overflow-y-auto flex flex-col"
        style={{
          backgroundColor: colors.white,
          borderColor: colors.sageGreen,
          borderRadius: '64px 0 0 64px',
        }}
      >
        {/* Header with curved background */}
        <div
          className="flex items-center gap-3 mb-6 p-4"
          style={{
            backgroundColor: colors.darkGreen,
            borderRadius: '32px',
            color: colors.white,
          }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
            style={{
              backgroundColor: colors.gold,
            }}
          >
            🦉
          </div>
          <div>
            <h3 className="font-bold text-sm">Assistant AVRA</h3>
            <p className="text-xs opacity-80">Notifications</p>
          </div>
        </div>

        <div className="space-y-4 flex-1">
          {notifications.map((notif, idx) => (
            <div
              key={notif.id}
              className="flex gap-3 p-4"
              style={{
                backgroundColor:
                  notif.type === 'error'
                    ? '#FEE2E2'
                    : notif.type === 'warning'
                    ? '#FEF3C7'
                    : '#DBEAFE',
                borderRadius: '28px',
              }}
            >
              <div className="text-xl flex-shrink-0">
                {notif.type === 'error' ? '❌' : notif.type === 'warning' ? '⚠️' : 'ℹ️'}
              </div>
              <p className="text-sm" style={{ color: colors.darkGreen }}>
                {notif.text}
              </p>
            </div>
          ))}
        </div>

        <div className="text-right text-xs text-gray-500 mt-auto pt-4">
          1/28
        </div>
      </div>
    </div>
  );
}
