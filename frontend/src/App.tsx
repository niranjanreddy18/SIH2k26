import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { CasesPage } from './pages/CasesPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { AuditPage } from './pages/AuditPage';
import { NewCaseModal } from './components/NewCaseModal';

export const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showNewCaseModal, setShowNewCaseModal] = useState<boolean>(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        Initializing SLIDMS Security Session...
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header />

      <div className="flex flex-1">
        <Sidebar activeTab={activeTab} setActiveTab={(tab) => {
          setSelectedCaseId(null);
          setActiveTab(tab);
        }} />

        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
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

          {activeTab === 'audit' && <AuditPage />}
          {activeTab === 'shared' && <CasesPage onSelectCase={handleSelectCase} onOpenNewCase={() => setShowNewCaseModal(true)} />}
        </main>
      </div>

      {showNewCaseModal && (
        <NewCaseModal
          onClose={() => setShowNewCaseModal(false)}
          onSuccess={() => setActiveTab('cases')}
        />
      )}
    </div>
  );
};

export default function App() {
  return <AppContent />;
}

