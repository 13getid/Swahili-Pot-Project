import { useEffect, useState } from 'react';
import { ScrollText, FileDown, Search, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { getAuditLog, getAuditActions, auditExportUrl } from '../../api/admin';
import { formatEAT } from '../../lib/datetime';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { Table, THead, TH, TBody, TR, TD } from '../../components/ui/Table';

// Friendly labels for known action codes; unknown ones fall back to the raw code.
const ACTION_LABEL = {
  login: 'Signed in',
  logout: 'Signed out',
  user_create: 'Created user',
  user_suspend: 'Suspended user',
  user_reactivate: 'Reactivated user',
  user_password_reset: 'Reset user password',
  user_delete: 'Deleted user',
  profile_update: 'Updated profile',
  department_create: 'Created department',
  department_update: 'Updated department',
  department_delete: 'Deleted department',
  settings_update: 'Updated platform settings',
};

const labelFor = (a) => ACTION_LABEL[a] || a;

export default function AuditLogPage() {
  const [entries, setEntries] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [action, setAction] = useState('');

  useEffect(() => {
    getAuditActions()
      .then((res) => setActions(res.data.actions))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = { page, limit: 25 };
    if (search) params.search = search;
    if (action) params.action = action;
    getAuditLog(params)
      .then((res) => {
        if (!active) return;
        setEntries(res.data.entries);
        setPages(res.data.pages);
        setTotal(res.data.total);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page, search, action]);

  function applySearch(e) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleExport() {
    const params = {};
    if (search) params.search = search;
    if (action) params.action = action;
    // Cookie-authenticated GET — open it so the browser sends credentials.
    window.open(auditExportUrl(params), '_blank');
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <ScrollText size={22} className="text-brand-600" /> Audit Log
          </h2>
          <p className="mt-1 text-sm text-subtle">{total} recorded events</p>
        </div>
        <Button variant="secondary" onClick={handleExport} disabled={total === 0}>
          <FileDown size={16} /> Export CSV
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <form onSubmit={applySearch} className="flex flex-1 items-end gap-2" style={{ minWidth: 220 }}>
            <div className="flex-1">
              <Input
                label="Search"
                placeholder="Actor, action or target…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">
              <Search size={16} />
            </Button>
          </form>
          <div style={{ minWidth: 200 }}>
            <Select
              label="Action"
              value={action}
              onChange={(e) => {
                setPage(1);
                setAction(e.target.value);
              }}
            >
              <option value="">All actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {labelFor(a)}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {loading ? (
        <Spinner />
      ) : entries.length === 0 ? (
        <EmptyState icon={Inbox} title="No events found" description="Try adjusting the filters." />
      ) : (
        <>
          <Table>
            <THead>
              <TH>Time</TH>
              <TH>Actor</TH>
              <TH>Action</TH>
              <TH>Target</TH>
              <TH>IP</TH>
            </THead>
            <TBody>
              {entries.map((e, i) => (
                <TR key={e.id} index={i}>
                  <TD className="whitespace-nowrap text-xs text-subtle">{formatEAT(e.created_at)}</TD>
                  <TD>
                    <span className="font-medium">{e.actor_name || 'System'}</span>
                    {e.actor_role && <span className="ml-1 text-xs text-subtle">({e.actor_role})</span>}
                  </TD>
                  <TD>{labelFor(e.action)}</TD>
                  <TD className="text-subtle">{e.target_description || (e.target_id ? `#${e.target_id}` : '—')}</TD>
                  <TD className="whitespace-nowrap text-xs text-subtle">{e.ip_address || '—'}</TD>
                </TR>
              ))}
            </TBody>
          </Table>

          {pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-subtle">
                Page {page} of {pages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft size={16} /> Prev
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page >= pages}
                >
                  Next <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
