import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';
import PageLayout from '../../components/layout/PageLayout';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { newLeadService } from '../../services/newLeadService';
import { courseService } from '../../services/courseService';
import CreateLeadModal from './components/CreateLeadModal';
import ConvertLeadModal from './components/ConvertLeadModal';
import { LEAD_STATUSES, LEAD_SOURCES, prettyEnum, LEAD_STATUS_BADGE } from './leadConstants';

const PAGE_SIZE = 20;

const LeadManagement = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const currentUser = userProfile || user;

  // SuperAdmin context is only present under the super-admin route guard.
  let superAdminContext = null;
  try {
    superAdminContext = useSuperAdmin();
  } catch (e) {
    // Not in super-admin context
  }

  const isSuperAdmin =
    currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'super-admin';

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const [pagination, setPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
    hasMore: false,
    size: PAGE_SIZE
  });

  const [filters, setFilters] = useState({
    status: '',
    source: '',
    searchText: '',
    converted: '' // '', 'true', 'false'
  });

  const [courses, setCourses] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [convertingLead, setConvertingLead] = useState(null);

  // The list scrolls inside this container (not the window), so the infinite-scroll
  // listener is attached here. loadingMoreRef is a synchronous guard against a burst
  // of scroll events firing overlapping fetches.
  const scrollContainerRef = useRef(null);
  const loadingMoreRef = useRef(false);

  // Resolve a course id → name for the table + filter labels.
  const courseMap = useMemo(() => {
    const map = {};
    courses.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [courses]);

  const buildFilterParams = (page) => {
    const params = { page, size: PAGE_SIZE };
    if (filters.status) params.status = filters.status;
    if (filters.source) params.source = filters.source;
    if (filters.searchText.trim()) params.searchText = filters.searchText.trim();
    if (filters.converted === 'true') params.converted = true;
    if (filters.converted === 'false') params.converted = false;
    return params;
  };

  // Fresh load — replaces the list (used on mount, filter change, institute switch, refresh).
  const loadLeads = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      setError(null);

      const { data, pagination: pg, error: loadError } = await newLeadService.getLeads(
        buildFilterParams(0)
      );

      if (loadError) {
        setError(loadError.message || 'Failed to load leads');
        setLeads([]);
        setPagination({ currentPage: 0, totalPages: 0, totalElements: 0, hasMore: false, size: PAGE_SIZE });
        return;
      }

      setLeads(Array.isArray(data) ? data : []);
      setPagination(pg || { currentPage: 0, totalPages: 0, totalElements: 0, hasMore: false, size: PAGE_SIZE });
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    } catch (err) {
      setError('Failed to load leads');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  // Append the next page (infinite scroll).
  const loadMoreLeads = async () => {
    if (!currentUser || loading || loadingMoreRef.current || !pagination.hasMore) return;
    loadingMoreRef.current = true;
    try {
      setLoadingMore(true);
      const { data, pagination: pg } = await newLeadService.getLeads(
        buildFilterParams(pagination.currentPage + 1)
      );
      if (data && Array.isArray(data) && data.length > 0) {
        setLeads((prev) => [...prev, ...data]);
      }
      if (pg) setPagination(pg);
    } catch (err) {
      // Soft-fail on a scroll fetch — keep what we have.
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  };

  const handleScroll = (event) => {
    const el = event.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      loadMoreLeads();
    }
  };

  const loadCourses = async () => {
    try {
      const { data } = await courseService.getCourses({ page: 0, size: 100 });
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      setCourses([]);
    }
  };

  // Reload on mount, when the user resolves, and whenever filters change.
  useEffect(() => {
    if (currentUser) loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, filters]);

  // Reload + refresh courses when a super-admin switches institute.
  useEffect(() => {
    if (currentUser) loadCourses();
    if (superAdminContext?.selectedInstitute?.id && currentUser) loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [superAdminContext?.selectedInstitute?.id, currentUser]);

  const setFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const handleSaved = () => {
    setShowCreateModal(false);
    setEditingLead(null);
    loadLeads();
  };

  const handleConverted = () => {
    setConvertingLead(null);
    loadLeads();
  };

  const handleDelete = async (lead) => {
    if (!window.confirm(`Delete lead "${lead.firstName || ''} ${lead.lastName || ''}"? This cannot be undone.`)) {
      return;
    }
    const previous = leads;
    setLeads((prev) => prev.filter((l) => l.id !== lead.id));
    const { error: delError } = await newLeadService.deleteLead(lead.id);
    if (delError) {
      setLeads(previous);
      setError(delError.message || 'Failed to delete lead');
    }
  };

  const formatDate = (value) => (value ? String(value).slice(0, 10) : '—');

  const formatFee = (value) =>
    value == null || value === ''
      ? '—'
      : `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const inputCls =
    'px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

  return (
    <PageLayout
      title="Lead Management"
      activeRoute="/lead-management"
      showInstituteDropdown={isSuperAdmin && !!superAdminContext}
      institutes={superAdminContext?.allInstitutes || []}
      selectedInstitute={superAdminContext?.selectedInstitute || null}
      onInstituteChange={superAdminContext?.handleInstituteChange || (() => {})}
      institutesLoading={superAdminContext?.institutesLoading || false}
    >
      <div className="h-full flex flex-col">
        {/* Header + filters */}
        <div className="bg-background border-b border-border px-4 lg:px-6 py-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-foreground">Lead Management</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {loading && leads.length === 0
                  ? 'Loading leads...'
                  : `${pagination.totalElements} lead${pagination.totalElements === 1 ? '' : 's'}`}
                {pagination.hasMore && <span className="text-blue-600 ml-1">(scroll for more)</span>}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              iconName="Plus"
              iconPosition="left"
              className="text-sm"
            >
              Add Lead
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <div className="relative flex-1 min-w-0 sm:min-w-[180px]">
              <Icon
                name="Search"
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search leads..."
                value={filters.searchText}
                onChange={(e) => setFilter('searchText', e.target.value)}
                className={`w-full pl-10 ${inputCls}`}
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value)}
              className={inputCls}
            >
              <option value="">All statuses</option>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {prettyEnum(s)}
                </option>
              ))}
            </select>
            <select
              value={filters.source}
              onChange={(e) => setFilter('source', e.target.value)}
              className={inputCls}
            >
              <option value="">All sources</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {prettyEnum(s)}
                </option>
              ))}
            </select>
            <select
              value={filters.converted}
              onChange={(e) => setFilter('converted', e.target.value)}
              className={inputCls}
            >
              <option value="">All leads</option>
              <option value="false">Not converted</option>
              <option value="true">Converted</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 lg:p-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {loading && leads.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">Loading leads...</p>
              </div>
            </div>
          )}

          {!loading && !error && leads.length === 0 && (
            <div className="text-center py-12">
              <Icon name="UserPlus" size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Leads Found</h3>
              <p className="text-muted-foreground mb-4">
                Capture your first lead or adjust the filters.
              </p>
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
                iconName="Plus"
                iconPosition="left"
              >
                Add Lead
              </Button>
            </div>
          )}

          {leads.length > 0 && (
            <>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Contact</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Source</th>
                      <th className="px-4 py-3 font-medium">Interested Course</th>
                      <th className="px-4 py-3 font-medium">Committed Fee</th>
                      <th className="px-4 py-3 font-medium">Next Follow-up</th>
                      <th className="px-4 py-3 font-medium">Created</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {leads.map((lead) => {
                      const converted = !!lead.convertedUserId;
                      return (
                        <tr
                          key={lead.id}
                          onClick={() => navigate(`/lead-profile/${lead.id}`)}
                          className="hover:bg-muted/20 cursor-pointer"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">
                              {`${lead.firstName || ''} ${lead.lastName || ''}`.trim() || '—'}
                            </div>
                            {converted && (
                              <span className="inline-flex items-center gap-1 mt-1 text-xs text-green-700">
                                <Icon name="CheckCircle" size={12} /> Converted
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <div>{lead.email || '—'}</div>
                            <div>{lead.phone || '—'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                LEAD_STATUS_BADGE[lead.status] || 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {prettyEnum(lead.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {prettyEnum(lead.source) || '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {lead.interestedCourseId
                              ? courseMap[lead.interestedCourseId] || `#${lead.interestedCourseId}`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-foreground">
                            {formatFee(lead.courseFeeCommitted)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDate(lead.nextFollowUpDate)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDate(lead.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Edit"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingLead(lead);
                                }}
                                className="w-8 h-8"
                              >
                                <Icon name="Pencil" size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title={converted ? 'Already converted' : 'Convert to student'}
                                disabled={converted}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConvertingLead(lead);
                                }}
                                className="w-8 h-8"
                              >
                                <Icon name="UserCheck" size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(lead);
                                }}
                                className="w-8 h-8 text-destructive"
                              >
                                <Icon name="Trash2" size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {loadingMore && (
                <div className="py-8 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-muted-foreground text-sm">Loading more leads...</p>
                </div>
              )}

              {!pagination.hasMore && !loadingMore && (
                <div className="py-6 text-center">
                  <p className="text-muted-foreground text-sm">
                    You've reached the end · {pagination.totalElements} leads total
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <CreateLeadModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleSaved}
          courses={courses}
          defaultInstituteId={isSuperAdmin ? superAdminContext?.selectedInstitute?.id : null}
        />
      )}

      {/* Edit modal */}
      {editingLead && (
        <CreateLeadModal
          isOpen={!!editingLead}
          onClose={() => setEditingLead(null)}
          onSuccess={handleSaved}
          editMode
          existingLead={editingLead}
          courses={courses}
          defaultInstituteId={isSuperAdmin ? superAdminContext?.selectedInstitute?.id : null}
        />
      )}

      {/* Convert modal */}
      {convertingLead && (
        <ConvertLeadModal
          isOpen={!!convertingLead}
          onClose={() => setConvertingLead(null)}
          onSuccess={handleConverted}
          lead={convertingLead}
          courses={courses}
        />
      )}
    </PageLayout>
  );
};

export default LeadManagement;
