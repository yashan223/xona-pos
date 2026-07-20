import { getConfig } from '@/lib/configStore';
import { useEffect, useState } from 'react';
import { RefreshCw, FileText } from 'lucide-react';
import { reportApi, BASE_HOST } from '@/lib/api';
import type { User, SavedReportRecord } from '@/lib/api';
import { useNotification } from '@/context/NotificationContext';
import { useTranslation } from '@/lib/translations';

interface ReportsPageProps {
  currentUser: User | null;
}
export default function ReportsPage({ currentUser }: ReportsPageProps) {
  const { t } = useTranslation();
  const { confirm, toast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<'summary' | 'category' | 'daily'>('summary');
  const [savedReports, setSavedReports] = useState<SavedReportRecord[]>([]);
  useEffect(() => {
    loadReports();
    const handleUpdate = () => loadReports();
    window.addEventListener('transactions_updated', handleUpdate);
    return () => {
      window.removeEventListener('transactions_updated', handleUpdate);
    };
  }, [currentUser]);
  async function loadReports() {
    setLoading(true);
    try {
      const isAuth = currentUser?.role === 'admin' || currentUser?.role === 'owner';
      if (isAuth) {
        const savedList = await reportApi.listSavedReports();
        setSavedReports(savedList);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }
  async function generatePdfReport() {
    setExporting(true);
    try {
      const saved = getConfig('currentUser');
      const headers: Record<string, string> = {};
      let role = currentUser?.role || 'cashier';
      const apiKey = import.meta.env.VITE_DEVICE_API_KEY;
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }
      if (saved) {
        const user = JSON.parse(saved);
        if (user?.id) headers['x-user-id'] = user.id;
        if (user?.role) {
          headers['x-user-role'] = user.role;
          role = user.role;
        }
      }
      const customPath = getConfig('customReportPath') || '';
      let url = `${BASE_HOST}/api/reports/pdf?type=${selectedReportType}&role=${role}`;
      if (customPath) {
        url += `&savePath=${encodeURIComponent(customPath)}`;
      }
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error('Failed to generate sales report PDF');
      }
      toast.success('Sales report PDF generated and saved to HDD successfully!');
      loadReports();
    } catch (err: any) {
      console.error('Failed to generate report silently:', err);
      toast.error('Failed to generate PDF sales report.');
    } finally {
      setExporting(false);
    }
  }
  const handleDeleteSavedReport = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Saved Report',
      message: 'Are you sure you want to delete this archived report PDF? This file will be permanently deleted from the disk.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!isConfirmed) return;
    try {
      await reportApi.deleteSavedReport(id);
      toast.success('Saved report deleted successfully');
      loadReports();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete saved report');
    }
  };
  const isAdminOrOwner = currentUser?.role === 'admin' || currentUser?.role === 'owner';
  if (!isAdminOrOwner) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-8">
        Only Administrators can view and generate PDF reports.
      </div>
    );
  }
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('salesReports')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Archived PDF sales reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <>
            <select
              value={selectedReportType}
              onChange={(e) => setSelectedReportType(e.target.value as any)}
              className="bg-[#0d0e12] border border-border/50 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary text-foreground cursor-pointer"
            >
              <option value="summary">Overview Summary Report</option>
              <option value="category">Category-wise Sales Report</option>
              <option value="daily">Daily Sales Timeline Report</option>
            </select>
            <button
              onClick={generatePdfReport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer text-xs shadow-md shadow-primary/20"
            >
              <FileText className="w-3.5 h-3.5" />
              {exporting ? 'Exporting...' : 'Export PDF Report'}
            </button>
          </>
          <button
            onClick={loadReports}
            className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="animate-fade-in">
          <SavedReportsTab reports={savedReports} onDelete={handleDeleteSavedReport} />
        </div>
      )}
    </div>
  );
}
function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-border/20 rounded-xl bg-card/10">
      <Icon className="w-12 h-12 mb-4 opacity-30" />
      <p className="text-sm font-semibold">{message}</p>
    </div>
  );
}
function SavedReportsTab({
  reports,
  onDelete
}: {
  reports: SavedReportRecord[];
  onDelete: (id: string) => void;
}) {
  const formatReportType = (type: string) => {
    if (type === 'summary') return 'Overview Summary';
    if (type === 'category') return 'Category-wise Sales';
    if (type === 'daily') return 'Daily Sales Timeline';
    return type;
  };
  if (reports.length === 0) {
    return <EmptyState icon={FileText} message="No saved reports archived in database yet. Try exporting one!" />;
  }
  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <div key={report._id} className="glass-card p-4 border border-border/30 rounded-2xl bg-card/10 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex-shrink-0 ${
              report.reportType === 'category'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : report.reportType === 'daily'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
            }`}>
              {formatReportType(report.reportType)}
            </span>
            <span className="text-[10px] text-muted-foreground">{new Date(report.createdAt).toLocaleString()}</span>
          </div>
          <div>
            <p className="text-xs font-mono font-semibold text-foreground truncate">{report.filename}</p>
            <p className="text-[9px] text-muted-foreground font-mono mt-0.5 truncate bg-secondary/30 px-2 py-1 rounded border border-border/20">
              {report.localPath}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border/20 pt-2">
            <p className="text-[11px] text-muted-foreground uppercase">
              By: <span className="font-semibold text-foreground">{report.generatedBy}</span>
            </p>
            <div className="flex items-center gap-2">
              <a
                href={`${BASE_HOST}/reports/${report.filename}`}
                download
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg border border-primary/20 transition-all text-[11px] font-semibold cursor-pointer"
              >
                Download
              </a>
              <button
                onClick={() => onDelete(report._id)}
                className="px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg border border-destructive/20 transition-all text-[11px] font-semibold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
