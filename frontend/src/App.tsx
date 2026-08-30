import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { CasesPage } from './pages/CasesPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { SharedPage } from './pages/SharedPage';
import { AdminPage } from './pages/AdminPage';
import { NewCaseModal } from './components/NewCaseModal';

export const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showNewCaseModal, setShowNewCaseModal] = useState<boolean>(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
            Initializing SLIDMS Cryptographic Security Session...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setActiveTab('case-detail');
  };

  const handleBackToCases = () => {
    setSelectedCaseId(null);
    setActiveTab('cases');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <Header
        onSelectCase={handleSelectCase}
        activeTab={activeTab}
        setActiveTab={(tab: string) => {
          setSelectedCaseId(null);
          setActiveTab(tab);
        }}
      />

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <DashboardPage
              onSelectCase={handleSelectCase}
              onOpenNewCase={() => setShowNewCaseModal(true)}
            />
          )}

          {activeTab === 'cases' && (
            <CasesPage
              onSelectCase={handleSelectCase}
              onOpenNewCase={() => setShowNewCaseModal(true)}
            />
          )}

          {activeTab === 'case-detail' && selectedCaseId && (
            <CaseDetailPage
              caseId={selectedCaseId}
              onBack={handleBackToCases}
            />
          )}

          {activeTab === 'shared' && (
            <SharedPage onSelectCase={handleSelectCase} />
          )}

          {activeTab === 'admin' && <AdminPage />}
        </div>
      </main>

      {showNewCaseModal && (
        <NewCaseModal
          onClose={() => setShowNewCaseModal(false)}
          onSuccess={() => { setShowNewCaseModal(false); setActiveTab('cases'); }}
        />
      )}
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
