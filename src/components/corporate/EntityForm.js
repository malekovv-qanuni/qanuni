/**
 * EntityForm Component (v46.52)
 * Corporate Entity management form with improved UX
 * v46.52: Dynamic currency list from Settings
 * - NEW: Overview tab with summary cards
 * - Split: Filings and Meetings as separate tabs
 * - NEW: Company 360° Report feature
 * - NEW: Share Transfer Ledger (v46.27)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Pencil, Trash2, Plus, X, Building2, Users, UserCheck, FileText, Calendar, Printer, Download, ChevronRight, AlertTriangle, DollarSign } from 'lucide-react';
import { useUI } from '../../contexts';

const EntityForm = React.memo(({ showToast, refreshCorporateEntities, entityTypes }) => {
  const { forms, closeForm } = useUI();
  const { editing: editingEntity, tab: activeTab, setTab: setActiveTab } = forms.entity;
  const [companyClients, setCompanyClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    registration_number: '',
    registration_date: '',
    registered_address: '',
    share_capital: '',
    share_capital_currency: 'USD',
    total_shares: '',
    fiscal_year_end: '',
    tax_id: '',
    commercial_register: '',
    status: 'active',
    notes: ''
  });

  // Shareholders state
  const [shareholders, setShareholders] = useState([]);
  const [loadingShareholders, setLoadingShareholders] = useState(false);
  const [showShareholderForm, setShowShareholderForm] = useState(false);
  const [editingShareholder, setEditingShareholder] = useState(null);
  const [shareholderForm, setShareholderForm] = useState({
    name: '', id_number: '', nationality: '', shares_owned: '', share_class: 'Ordinary', date_acquired: ''
  });

  // Directors state
  const [directors, setDirectors] = useState([]);
  const [loadingDirectors, setLoadingDirectors] = useState(false);
  const [showDirectorForm, setShowDirectorForm] = useState(false);
  const [editingDirector, setEditingDirector] = useState(null);
  const [directorForm, setDirectorForm] = useState({
    name: '', id_number: '', nationality: '', position: 'Director', date_appointed: '', date_resigned: '', is_signatory: false, notes: ''
  });

  // Filings state
  const [filings, setFilings] = useState([]);
  const [loadingFilings, setLoadingFilings] = useState(false);
  const [showFilingForm, setShowFilingForm] = useState(false);
  const [editingFiling, setEditingFiling] = useState(null);
  const [filingForm, setFilingForm] = useState({
    filing_type: 'renewal', filing_description: '', filing_date: '', filing_reference: '',
    next_due_date: '', reminder_days: 30, notes: '', status: 'completed'
  });

  // Meetings state
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [meetingForm, setMeetingForm] = useState({
    meeting_type: 'board', meeting_description: '', meeting_date: '', meeting_notes: '',
    attendees: '', next_meeting_date: '', next_meeting_agenda: '', reminder_days: 14, status: 'held'
  });

  // Share Transfers state (v46.27)
  const [shareTransfers, setShareTransfers] = useState([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [transferForm, setTransferForm] = useState({
    transfer_type: 'transfer', transfer_date: '', from_shareholder_id: '', to_shareholder_id: '',
    shares_transferred: '', price_per_share: '', share_class: 'Ordinary', board_resolution: '', notes: ''
  });

  // Dynamic currencies from Settings (v46.52)
  const [availableCurrencies, setAvailableCurrencies] = useState([]);

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        if (window.electronAPI.getCurrencies) {
          const data = await window.electronAPI.getCurrencies();
          setAvailableCurrencies(data || []);
        }
      } catch (error) {
        console.error('Error loading currencies:', error);
      }
    };
    loadCurrencies();
  }, []);

  // Filing types
  const filingTypes = [
    { code: 'renewal', en: 'Annual Renewal', ar: 'التجديد السنوي' },
    { code: 'amendment', en: 'Amendment', ar: 'تعديل' },
    { code: 'capital_change', en: 'Capital Change', ar: 'تعديل رأس المال' },
    { code: 'director_change', en: 'Director Change', ar: 'تغيير المدراء' },
    { code: 'shareholder_change', en: 'Shareholder Change', ar: 'تغيير الشركاء' },
    { code: 'address_change', en: 'Address Change', ar: 'تغيير العنوان' },
    { code: 'name_change', en: 'Name Change', ar: 'تغيير الاسم' },
    { code: 'other', en: 'Other', ar: 'أخرى' }
  ];

  // Meeting types by entity type
  const getMeetingTypes = () => {
    const entityType = editingEntity?.entity_type || '';
    const allTypes = [
      { code: 'board', en: 'Board Meeting', ar: 'اجتماع مجلس الإدارة' },
      { code: 'ordinary_ga', en: 'Ordinary General Assembly', ar: 'الجمعية العمومية العادية' },
      { code: 'extraordinary_ga', en: 'Extraordinary General Assembly', ar: 'الجمعية العمومية غير العادية' },
      { code: 'partners', en: 'Partners Meeting', ar: 'اجتماع الشركاء' },
      { code: 'directors', en: 'Directors Meeting', ar: 'اجتماع المدراء' },
      { code: 'written_resolution', en: 'Written Resolution', ar: 'قرار خطي' },
      { code: 'owner_decision', en: 'Owner Decision', ar: 'قرار المالك' },
      { code: 'parent_directive', en: 'Parent Company Directive', ar: 'توجيه الشركة الأم' },
      { code: 'other', en: 'Other', ar: 'أخرى' }
    ];
    
    // Filter based on entity type
    const fullCorporate = ['SAL', 'HOLDING', 'OFFSHORE', 'LPS'];
    const directorsOnly = ['SARL', 'CIVIL'];
    const singleOwner = ['SINGLE_SARL', 'SINGLE_OFFSHORE', 'SOLE_PROP'];
    const partnership = ['PARTNERSHIP', 'LP', 'JV'];
    const foreign = ['BRANCH', 'REP_OFFICE'];
    
    if (fullCorporate.includes(entityType)) {
      return allTypes.filter(t => ['board', 'ordinary_ga', 'extraordinary_ga', 'other'].includes(t.code));
    } else if (directorsOnly.includes(entityType)) {
      return allTypes.filter(t => ['partners', 'directors', 'other'].includes(t.code));
    } else if (singleOwner.includes(entityType)) {
      return allTypes.filter(t => ['written_resolution', 'owner_decision', 'other'].includes(t.code));
    } else if (partnership.includes(entityType)) {
      return allTypes.filter(t => ['partners', 'other'].includes(t.code));
    } else if (foreign.includes(entityType)) {
      return allTypes.filter(t => ['parent_directive', 'other'].includes(t.code));
    } else if (entityType === 'NGO') {
      return allTypes.filter(t => ['board', 'ordinary_ga', 'extraordinary_ga', 'other'].includes(t.code));
    }
    return allTypes;
  };

  useEffect(() => {
    loadCompanyClients();
    if (editingEntity) {
      setFormData({
        client_id: editingEntity.client_id,
        registration_number: editingEntity.registration_number || '',
        registration_date: editingEntity.registration_date || '',
        registered_address: editingEntity.registered_address || '',
        share_capital: editingEntity.share_capital || '',
        share_capital_currency: editingEntity.share_capital_currency || 'USD',
        total_shares: editingEntity.total_shares || '',
        fiscal_year_end: editingEntity.fiscal_year_end || '',
        tax_id: editingEntity.tax_id || '',
        commercial_register: editingEntity.commercial_register || '',
        status: editingEntity.status || 'active',
        notes: editingEntity.notes || ''
      });
      loadShareholders(editingEntity.client_id);
      loadDirectors(editingEntity.client_id);
      loadFilings(editingEntity.client_id);
      loadMeetings(editingEntity.client_id);
      loadTransfers(editingEntity.client_id);
      // Set to overview tab when editing existing entity with details
      if (editingEntity.has_corporate_details && !editingEntity.isNewForClient) {
        setActiveTab('overview');
      }
    }
  }, [editingEntity]);

  const loadCompanyClients = async () => {
    try {
      const clients = await window.electronAPI.getCompanyClientsWithoutEntity();
      setCompanyClients(clients || []);
    } catch (error) {
      console.error('Error loading company clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadShareholders = async (clientId) => {
    if (!clientId) return;
    setLoadingShareholders(true);
    try {
      const data = await window.electronAPI.getShareholders(clientId);
      setShareholders(data || []);
    } catch (error) {
      console.error('Error loading shareholders:', error);
    } finally {
      setLoadingShareholders(false);
    }
  };

  const getTotalShares = () => {
    return parseInt(formData.total_shares) || 0;
  };

  const getSharePercentage = (shares) => {
    const total = getTotalShares();
    if (total === 0) return '0.00';
    return ((shares / total) * 100).toFixed(2);
  };

  const handleShareholderSubmit = async () => {
    if (!shareholderForm.name) {
      showToast('Please enter shareholder name', 'error');
      return;
    }

    try {
      const clientId = editingEntity?.client_id || formData.client_id;
      if (editingShareholder) {
        await window.electronAPI.updateShareholder({
          ...shareholderForm,
          id: editingShareholder.id,
          shares_owned: parseInt(shareholderForm.shares_owned) || 0
        });
        showToast('Shareholder updated', 'success');
      } else {
        await window.electronAPI.addShareholder({
          ...shareholderForm,
          client_id: clientId,
          shares_owned: parseInt(shareholderForm.shares_owned) || 0
        });
        showToast('Shareholder added', 'success');
      }
      loadShareholders(clientId);
      setShowShareholderForm(false);
      setEditingShareholder(null);
      setShareholderForm({ name: '', id_number: '', nationality: '', shares_owned: '', share_class: 'Ordinary', date_acquired: '' });
    } catch (error) {
      showToast('Error saving: ' + error.message, 'error');
    }
  };

  const handleDeleteShareholder = async (id) => {
    if (!confirm('Are you sure you want to delete this shareholder?')) return;
    try {
      await window.electronAPI.deleteShareholder(id);
      showToast('Shareholder deleted', 'success');
      loadShareholders(editingEntity?.client_id || formData.client_id);
    } catch (error) {
      showToast('Error deleting', 'error');
    }
  };

  const handleEditShareholder = (shareholder) => {
    setEditingShareholder(shareholder);
    setShareholderForm({
      name: shareholder.name || '',
      id_number: shareholder.id_number || '',
      nationality: shareholder.nationality || '',
      shares_owned: shareholder.shares_owned || '',
      share_class: shareholder.share_class || 'Ordinary',
      date_acquired: shareholder.date_acquired || ''
    });
    setShowShareholderForm(true);
  };

  // Directors functions
  const loadDirectors = async (clientId) => {
    if (!clientId) return;
    setLoadingDirectors(true);
    try {
      const data = await window.electronAPI.getDirectors(clientId);
      setDirectors(data || []);
    } catch (error) {
      console.error('Error loading directors:', error);
    } finally {
      setLoadingDirectors(false);
    }
  };

  const handleDirectorSubmit = async () => {
    if (!directorForm.name) {
      showToast('Please enter director name', 'error');
      return;
    }

    const clientId = editingEntity?.client_id || formData.client_id;

    try {
      if (editingDirector) {
        await window.electronAPI.updateDirector({
          ...directorForm,
          id: editingDirector.id
        });
        showToast('Director updated', 'success');
      } else {
        await window.electronAPI.addDirector({
          ...directorForm,
          client_id: clientId
        });
        showToast('Director added', 'success');
      }
      loadDirectors(clientId);
      setShowDirectorForm(false);
      setEditingDirector(null);
      setDirectorForm({ name: '', id_number: '', nationality: '', position: 'Director', date_appointed: '', date_resigned: '', is_signatory: false, notes: '' });
    } catch (error) {
      showToast('Error saving', 'error');
    }
  };

  const handleDeleteDirector = async (id) => {
    if (!confirm('Are you sure you want to delete this director?')) return;
    try {
      await window.electronAPI.deleteDirector(id);
      showToast('Director deleted', 'success');
      loadDirectors(editingEntity?.client_id || formData.client_id);
    } catch (error) {
      showToast('Error deleting', 'error');
    }
  };

  const handleEditDirector = (director) => {
    setEditingDirector(director);
    setDirectorForm({
      name: director.name || '',
      id_number: director.id_number || '',
      nationality: director.nationality || '',
      position: director.position || 'Director',
      date_appointed: director.date_appointed || '',
      date_resigned: director.date_resigned || '',
      is_signatory: !!director.is_signatory,
      notes: director.notes || ''
    });
    setShowDirectorForm(true);
  };

  const getActiveDirectors = () => directors.filter(d => !d.date_resigned);
  const getResignedDirectors = () => directors.filter(d => d.date_resigned);

  // Filings functions
  const loadFilings = async (clientId) => {
    if (!clientId) return;
    setLoadingFilings(true);
    try {
      const data = await window.electronAPI.getFilings(clientId);
      setFilings(data || []);
    } catch (error) {
      console.error('Error loading filings:', error);
    } finally {
      setLoadingFilings(false);
    }
  };

  const handleSaveFiling = async (e) => {
    e.preventDefault();
    const clientId = editingEntity?.client_id || formData.client_id;
    if (!clientId) return;
    
    if (filingForm.filing_type === 'other' && !filingForm.filing_description) {
      showToast('Description required for "Other" type', 'error');
      return;
    }

    try {
      if (editingFiling) {
        await window.electronAPI.updateFiling({ ...filingForm, id: editingFiling.id });
        showToast('Filing updated', 'success');
      } else {
        await window.electronAPI.addFiling({ ...filingForm, client_id: clientId });
        showToast('Filing added', 'success');
      }
      loadFilings(clientId);
      setShowFilingForm(false);
      setEditingFiling(null);
      setFilingForm({ filing_type: 'renewal', filing_description: '', filing_date: '', filing_reference: '', next_due_date: '', reminder_days: 30, notes: '', status: 'completed' });
    } catch (error) {
      showToast('Error saving', 'error');
    }
  };

  const handleDeleteFiling = async (id) => {
    if (!confirm('Are you sure you want to delete this filing?')) return;
    try {
      await window.electronAPI.deleteFiling(id);
      showToast('Filing deleted', 'success');
      loadFilings(editingEntity?.client_id || formData.client_id);
    } catch (error) {
      showToast('Error deleting', 'error');
    }
  };

  const handleEditFiling = (filing) => {
    setEditingFiling(filing);
    setFilingForm({
      filing_type: filing.filing_type || 'renewal',
      filing_description: filing.filing_description || '',
      filing_date: filing.filing_date || '',
      filing_reference: filing.filing_reference || '',
      next_due_date: filing.next_due_date || '',
      reminder_days: filing.reminder_days || 30,
      notes: filing.notes || '',
      status: filing.status || 'completed'
    });
    setShowFilingForm(true);
  };

  // Meetings functions
  const loadMeetings = async (clientId) => {
    if (!clientId) return;
    setLoadingMeetings(true);
    try {
      const data = await window.electronAPI.getMeetings(clientId);
      setMeetings(data || []);
    } catch (error) {
      console.error('Error loading meetings:', error);
    } finally {
      setLoadingMeetings(false);
    }
  };

  const handleSaveMeeting = async (e) => {
    e.preventDefault();
    const clientId = editingEntity?.client_id || formData.client_id;
    if (!clientId) return;
    
    if (meetingForm.meeting_type === 'other' && !meetingForm.meeting_description) {
      showToast('Description required for "Other" type', 'error');
      return;
    }

    try {
      if (editingMeeting) {
        await window.electronAPI.updateMeeting({ ...meetingForm, id: editingMeeting.id });
        showToast('Meeting updated', 'success');
      } else {
        await window.electronAPI.addMeeting({ ...meetingForm, client_id: clientId });
        showToast('Meeting added', 'success');
      }
      loadMeetings(clientId);
      setShowMeetingForm(false);
      setEditingMeeting(null);
      setMeetingForm({ meeting_type: 'board', meeting_description: '', meeting_date: '', meeting_notes: '', attendees: '', next_meeting_date: '', next_meeting_agenda: '', reminder_days: 14, status: 'held' });
    } catch (error) {
      showToast('Error saving', 'error');
    }
  };

  const handleDeleteMeeting = async (id) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return;
    try {
      await window.electronAPI.deleteMeeting(id);
      showToast('Meeting deleted', 'success');
      loadMeetings(editingEntity?.client_id || formData.client_id);
    } catch (error) {
      showToast('Error deleting', 'error');
    }
  };

  const handleEditMeeting = (meeting) => {
    setEditingMeeting(meeting);
    setMeetingForm({
      meeting_type: meeting.meeting_type || 'board',
      meeting_description: meeting.meeting_description || '',
      meeting_date: meeting.meeting_date || '',
      meeting_notes: meeting.meeting_notes || '',
      attendees: meeting.attendees || '',
      next_meeting_date: meeting.next_meeting_date || '',
      next_meeting_agenda: meeting.next_meeting_agenda || '',
      reminder_days: meeting.reminder_days || 14,
      status: meeting.status || 'held'
    });
    setShowMeetingForm(true);
  };

  // v46.27: Share Transfer Ledger functions
  const loadTransfers = async (clientId) => {
    if (!clientId) return;
    setLoadingTransfers(true);
    try {
      const data = await window.electronAPI.getShareTransfers(clientId);
      setShareTransfers(data || []);
    } catch (error) {
      console.error('Error loading transfers:', error);
    } finally {
      setLoadingTransfers(false);
    }
  };

  const handleSaveTransfer = async (e) => {
    e.preventDefault();
    const clientId = editingEntity?.client_id || formData.client_id;
    if (!clientId) return;
    
    // Validation
    if (!transferForm.transfer_date) {
      showToast('Please enter transfer date', 'error');
      return;
    }
    if (!transferForm.shares_transferred || parseInt(transferForm.shares_transferred) <= 0) {
      showToast('Please enter number of shares', 'error');
      return;
    }

    const shares = parseInt(transferForm.shares_transferred);

    // Type-specific validation (skip balance check for edit since backend handles reversal)
    if (transferForm.transfer_type === 'transfer') {
      if (!transferForm.from_shareholder_id || !transferForm.to_shareholder_id) {
        showToast('Please select both From and To shareholders', 'error');
        return;
      }
      if (transferForm.from_shareholder_id === transferForm.to_shareholder_id) {
        showToast('Cannot transfer to same shareholder', 'error');
        return;
      }
      // Only validate balance for new transfers, not edits
      if (!editingTransfer) {
        const fromShareholder = shareholders.find(s => s.id === parseInt(transferForm.from_shareholder_id));
        if (fromShareholder && shares > (fromShareholder.shares_owned || 0)) {
          showToast('Transfer amount exceeds available shares', 'error');
          return;
        }
      }
    } else if (transferForm.transfer_type === 'issuance') {
      if (!transferForm.to_shareholder_id) {
        showToast('Please select recipient shareholder', 'error');
        return;
      }
    } else if (transferForm.transfer_type === 'buyback') {
      if (!transferForm.from_shareholder_id) {
        showToast('Please select shareholder', 'error');
        return;
      }
      // Only validate balance for new transfers, not edits
      if (!editingTransfer) {
        const fromShareholder = shareholders.find(s => s.id === parseInt(transferForm.from_shareholder_id));
        if (fromShareholder && shares > (fromShareholder.shares_owned || 0)) {
          showToast('Buyback amount exceeds available shares', 'error');
          return;
        }
      }
    }

    try {
      const fromShareholder = shareholders.find(s => s.id === parseInt(transferForm.from_shareholder_id));
      const toShareholder = shareholders.find(s => s.id === parseInt(transferForm.to_shareholder_id));
      
      const pricePerShare = parseFloat(transferForm.price_per_share) || null;
      const totalConsideration = pricePerShare ? pricePerShare * shares : null;

      const transferData = {
        client_id: clientId,
        transfer_type: transferForm.transfer_type,
        transfer_date: transferForm.transfer_date,
        from_shareholder_id: transferForm.from_shareholder_id ? parseInt(transferForm.from_shareholder_id) : null,
        to_shareholder_id: transferForm.to_shareholder_id ? parseInt(transferForm.to_shareholder_id) : null,
        from_shareholder_name: fromShareholder?.name || null,
        to_shareholder_name: toShareholder?.name || null,
        shares_transferred: shares,
        price_per_share: pricePerShare,
        total_consideration: totalConsideration,
        share_class: transferForm.share_class,
        board_resolution: transferForm.board_resolution,
        notes: transferForm.notes
      };

      if (editingTransfer) {
        await window.electronAPI.updateShareTransfer({ ...transferData, id: editingTransfer.id });
        showToast('Transfer updated', 'success');
      } else {
        await window.electronAPI.addShareTransfer(transferData);
        showToast('Transfer recorded', 'success');
      }
      
      // Reload both transfers and shareholders (balances updated)
      loadTransfers(clientId);
      loadShareholders(clientId);
      
      setShowTransferForm(false);
      setEditingTransfer(null);
      setTransferForm({
        transfer_type: 'transfer', transfer_date: '', from_shareholder_id: '', to_shareholder_id: '',
        shares_transferred: '', price_per_share: '', share_class: 'Ordinary', board_resolution: '', notes: ''
      });
    } catch (error) {
      console.error('Error saving transfer:', error);
      showToast('Error saving', 'error');
    }
  };

  const handleDeleteTransfer = async (id) => {
    if (!confirm('Are you sure you want to delete this record? Note: Balance changes will NOT be reversed automatically')) return;
    try {
      await window.electronAPI.deleteShareTransfer(id);
      showToast('Record deleted', 'success');
      loadTransfers(editingEntity?.client_id || formData.client_id);
    } catch (error) {
      showToast('Error deleting', 'error');
    }
  };

  const handleEditTransfer = (transfer) => {
    setEditingTransfer(transfer);
    setTransferForm({
      transfer_type: transfer.transfer_type || 'transfer',
      transfer_date: transfer.transfer_date || '',
      from_shareholder_id: transfer.from_shareholder_id ? String(transfer.from_shareholder_id) : '',
      to_shareholder_id: transfer.to_shareholder_id ? String(transfer.to_shareholder_id) : '',
      shares_transferred: transfer.shares_transferred ? String(transfer.shares_transferred) : '',
      price_per_share: transfer.price_per_share ? String(transfer.price_per_share) : '',
      share_class: transfer.share_class || 'Ordinary',
      board_resolution: transfer.board_resolution || '',
      notes: transfer.notes || ''
    });
    setShowTransferForm(true);
  };

  const getTransferTypeName = (type) => {
    const types = {
      transfer: { en: 'Transfer', ar: 'تحويل' },
      issuance: { en: 'Issuance', ar: 'إصدار' },
      buyback: { en: 'Buyback', ar: 'استرداد' }
    };
    return types[type] ? (types[type].en) : type;
  };

  const getTransferTypeColor = (type) => {
    const colors = {
      transfer: 'bg-blue-100 text-blue-800',
      issuance: 'bg-green-100 text-green-800',
      buyback: 'bg-amber-100 text-amber-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getFilingTypeName = (code) => {
    const type = filingTypes.find(t => t.code === code);
    return type ? (type.en) : code;
  };

  const getMeetingTypeName = (code) => {
    const allTypes = [
      { code: 'board', en: 'Board Meeting', ar: 'اجتماع مجلس الإدارة' },
      { code: 'ordinary_ga', en: 'Ordinary GA', ar: 'ج.ع. عادية' },
      { code: 'extraordinary_ga', en: 'Extraordinary GA', ar: 'ج.ع. غير عادية' },
      { code: 'partners', en: 'Partners Meeting', ar: 'اجتماع الشركاء' },
      { code: 'directors', en: 'Directors Meeting', ar: 'اجتماع المدراء' },
      { code: 'written_resolution', en: 'Written Resolution', ar: 'قرار خطي' },
      { code: 'owner_decision', en: 'Owner Decision', ar: 'قرار المالك' },
      { code: 'parent_directive', en: 'Parent Directive', ar: 'توجيه الشركة الأم' },
      { code: 'other', en: 'Other', ar: 'أخرى' }
    ];
    const type = allTypes.find(t => t.code === code);
    return type ? (type.en) : code;
  };

  // Get upcoming items for overview
  const getUpcomingFilings = () => {
    const today = new Date().toISOString().split('T')[0];
    return filings.filter(f => f.next_due_date && f.next_due_date >= today)
      .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date));
  };

  const getUpcomingMeetings = () => {
    const today = new Date().toISOString().split('T')[0];
    return meetings.filter(m => m.next_meeting_date && m.next_meeting_date >= today)
      .sort((a, b) => a.next_meeting_date.localeCompare(b.next_meeting_date));
  };

  const getUpcomingItems = () => {
    const today = new Date().toISOString().split('T')[0];
    const upcoming = [];
    
    filings.forEach(f => {
      if (f.next_due_date && f.next_due_date >= today) {
        upcoming.push({ ...f, item_type: 'filing', due_date: f.next_due_date });
      }
    });
    
    meetings.forEach(m => {
      if (m.next_meeting_date && m.next_meeting_date >= today) {
        upcoming.push({ ...m, item_type: 'meeting', due_date: m.next_meeting_date });
      }
    });
    
    return upcoming.sort((a, b) => a.due_date.localeCompare(b.due_date));
  };

  // Days until deadline helper
  const getDaysUntil = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_id) {
      showToast('Please select a client', 'error');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        ...formData,
        share_capital: formData.share_capital ? parseFloat(formData.share_capital) : null,
        total_shares: formData.total_shares ? parseInt(formData.total_shares) : null
      };

      const hasExistingRecord = editingEntity?.entity_id;

      if (hasExistingRecord) {
        await window.electronAPI.updateCorporateEntity(dataToSave);
        showToast('Corporate details updated', 'success');
      } else {
        await window.electronAPI.addCorporateEntity(dataToSave);
        showToast('Corporate details added', 'success');
      }
      refreshCorporateEntities();
      closeForm('entity');
    } catch (error) {
      showToast('Error saving: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Dynamic currencies with fallback (v46.52)
  const currencies = availableCurrencies.length > 0
    ? availableCurrencies.map(c => c.code)
    : ['USD', 'LBP', 'EUR', 'GBP', 'AED', 'SAR'];

  const tabClass = (tab) => `px-4 py-2 font-medium text-sm cursor-pointer border-b-2 transition-colors ${
    activeTab === tab
      ? 'border-blue-600 text-blue-600'
      : 'border-transparent text-gray-500 hover:text-gray-700'
  }`;

  // Get company name for modal title
  const companyName = editingEntity
    ? editingEntity.client_name
    : '';

  // Get entity type display name
  const getEntityTypeName = () => {
    if (!editingEntity?.entity_type) return null;
    const entityType = entityTypes.find(et => et.code === editingEntity.entity_type);
    if (!entityType) return editingEntity.entity_type;
    return entityType.name;
  };

  // Company Context Banner for data tabs
  const CompanyContextBanner = () => {
    if (!editingEntity) return null;
    const entityTypeName = getEntityTypeName();
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center gap-3">
        <Building2 className="text-blue-600" size={20} />
        <span className="font-semibold">{companyName}</span>
        {entityTypeName && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">{entityTypeName}</span>}
      </div>
    );
  };

  // Format currency helper
  const formatCurrency = (amount, currency) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  // Check if this is an existing entity (not new)
  const isExistingEntity = editingEntity && editingEntity.has_corporate_details && !editingEntity.isNewForClient;

  // ============================================================
  // COMPANY 360° REPORT MODAL
  // ============================================================
  const Company360Report = () => {
    if (!showReport) return null;

    const handlePrint = () => {
      window.print();
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Report Header */}
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Building2 className="text-blue-600" size={24} />
              {'Company 360° Report'}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Printer size={16} />
                {'Print'}
              </button>
              <button
                onClick={() => setShowReport(false)}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Report Content */}
          <div className="p-6 space-y-8 print:p-0" id="company-360-report">
            {/* Company Header */}
            <div className="text-center border-b pb-6">
              <h1 className="text-2xl font-bold text-gray-800">{companyName}</h1>
              <p className="text-gray-600 mt-1">{getEntityTypeName()}</p>
              {formData.registration_number && (
                <p className="text-sm text-gray-500 mt-2">
                  {'Reg. No: '}{formData.registration_number}
                </p>
              )}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <DollarSign className="mx-auto text-blue-600 mb-2" size={24} />
                <div className="text-sm text-gray-600">{'Share Capital'}</div>
                <div className="font-bold text-lg">{formatCurrency(formData.share_capital, formData.share_capital_currency)}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <Users className="mx-auto text-green-600 mb-2" size={24} />
                <div className="text-sm text-gray-600">{'Shareholders'}</div>
                <div className="font-bold text-lg">{shareholders.length}</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <UserCheck className="mx-auto text-purple-600 mb-2" size={24} />
                <div className="text-sm text-gray-600">{'Directors'}</div>
                <div className="font-bold text-lg">{getActiveDirectors().length}</div>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg text-center">
                <Calendar className="mx-auto text-amber-600 mb-2" size={24} />
                <div className="text-sm text-gray-600">{'Upcoming'}</div>
                <div className="font-bold text-lg">{getUpcomingItems().length}</div>
              </div>
            </div>

            {/* Company Details Section */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Building2 size={20} className="text-gray-600" />
                {'Company Details'}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">{'Registration Date:'}</span> <strong>{formData.registration_date || '-'}</strong></div>
                <div><span className="text-gray-500">{'Fiscal Year End:'}</span> <strong>{formData.fiscal_year_end || '-'}</strong></div>
                <div><span className="text-gray-500">{'Tax ID:'}</span> <strong>{formData.tax_id || '-'}</strong></div>
                <div><span className="text-gray-500">{'Commercial Register:'}</span> <strong>{formData.commercial_register || '-'}</strong></div>
                <div className="col-span-2"><span className="text-gray-500">{'Registered Address:'}</span> <strong>{formData.registered_address || '-'}</strong></div>
              </div>
            </div>

            {/* Shareholders Section */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Users size={20} className="text-gray-600" />
                {'Shareholders'} ({shareholders.length})
              </h3>
              {shareholders.length === 0 ? (
                <p className="text-gray-500 text-sm">{'No shareholders registered'}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">{'Name'}</th>
                      <th className="px-3 py-2 text-left">{'Nationality'}</th>
                      <th className="px-3 py-2 text-center">{'Shares'}</th>
                      <th className="px-3 py-2 text-center">{'%'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {shareholders.map(s => (
                      <tr key={s.id}>
                        <td className="px-3 py-2 font-medium">{s.name}</td>
                        <td className="px-3 py-2">{s.nationality || '-'}</td>
                        <td className="px-3 py-2 text-center">{s.shares_owned?.toLocaleString() || '-'}</td>
                        <td className="px-3 py-2 text-center font-medium">{getSharePercentage(s.shares_owned)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Directors Section */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <UserCheck size={20} className="text-gray-600" />
                {'Board of Directors'} ({getActiveDirectors().length} {'active'})
              </h3>
              {directors.length === 0 ? (
                <p className="text-gray-500 text-sm">{'No directors registered'}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">{'Name'}</th>
                      <th className="px-3 py-2 text-left">{'Position'}</th>
                      <th className="px-3 py-2 text-left">{'Appointed'}</th>
                      <th className="px-3 py-2 text-center">{'Signatory'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {getActiveDirectors().map(d => (
                      <tr key={d.id}>
                        <td className="px-3 py-2 font-medium">{d.name}</td>
                        <td className="px-3 py-2">{d.position}</td>
                        <td className="px-3 py-2">{d.date_appointed || '-'}</td>
                        <td className="px-3 py-2 text-center">{d.is_signatory ? '✓' : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Upcoming Deadlines Section */}
            {getUpcomingItems().length > 0 && (
              <div className="border border-amber-200 rounded-lg p-4 bg-amber-50">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-amber-800">
                  <AlertTriangle size={20} />
                  {'Upcoming Deadlines'}
                </h3>
                <div className="space-y-2">
                  {getUpcomingItems().map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded">
                      <span className="font-medium">
                        {item.item_type === 'filing' ? '📋 ' : '📅 '}
                        {item.item_type === 'filing' ? getFilingTypeName(item.filing_type) : getMeetingTypeName(item.meeting_type)}
                      </span>
                      <span className="text-amber-700 font-medium">{item.due_date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-sm text-gray-500 border-t pt-4">
              {'Report generated by Qanuni'} - {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Modal Header with company name */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          {companyName || (editingEntity && !editingEntity.isNewForClient ? 'Edit' : ('Add Company'))}
        </h2>
        <button
          onClick={() => closeForm('entity')}
          className="text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>
      </div>

      {/* Tabs - v46.24: Overview + Split Filings/Meetings */}
      <div className="flex border-b mb-4 overflow-x-auto">
        {/* Overview tab - only for existing entities */}
        {isExistingEntity && (
          <button className={tabClass('overview')} onClick={() => setActiveTab('overview')}>
            {'Overview'}
          </button>
        )}
        <button className={tabClass('details')} onClick={() => setActiveTab('details')}>
          {'Details'}
        </button>
        <button
          className={tabClass('shareholders')}
          onClick={() => setActiveTab('shareholders')}
          disabled={!editingEntity?.client_id && !formData.client_id}
        >
          {'Shareholders'}
        </button>
        <button
          className={tabClass('directors')}
          onClick={() => setActiveTab('directors')}
          disabled={!editingEntity?.client_id && !formData.client_id}
        >
          {'Directors'}
        </button>
        <button
          className={tabClass('filings')}
          onClick={() => setActiveTab('filings')}
          disabled={!editingEntity?.client_id && !formData.client_id}
        >
          {'Filings'}
        </button>
        <button
          className={tabClass('meetings')}
          onClick={() => setActiveTab('meetings')}
          disabled={!editingEntity?.client_id && !formData.client_id}
        >
          {'Meetings'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* ============================================================ */}
        {/* OVERVIEW TAB (NEW v46.24) */}
        {/* ============================================================ */}
        {activeTab === 'overview' && isExistingEntity && (
          <div className="space-y-6">
            {/* Company Header Card */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6">
              <div className="flex items-center gap-3">
                <Building2 size={32} />
                <div>
                  <h2 className="text-2xl font-bold">{companyName}</h2>
                  <p className="opacity-90">{getEntityTypeName()}</p>
                </div>
              </div>
              {formData.registration_number && (
                <p className="mt-2 opacity-80 text-sm">
                  {'Reg #: '}{formData.registration_number}
                </p>
              )}
            </div>

            {/* Summary Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Share Capital Card */}
              <div 
                className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setActiveTab('details')}
              >
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <DollarSign size={18} className="text-blue-500" />
                  <span className="text-sm">{'Share Capital'}</span>
                </div>
                <div className="text-xl font-bold text-gray-800">
                  {formatCurrency(formData.share_capital, formData.share_capital_currency)}
                </div>
                {formData.total_shares && (
                  <div className="text-sm text-gray-500 mt-1">
                    {formData.total_shares.toLocaleString()} {'shares'}
                  </div>
                )}
              </div>

              {/* Shareholders Card */}
              <div 
                className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setActiveTab('shareholders')}
              >
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <Users size={18} className="text-green-500" />
                  <span className="text-sm">{'Shareholders'}</span>
                </div>
                <div className="text-xl font-bold text-gray-800">{shareholders.length}</div>
                {shareholders.length > 0 && (
                  <div className="text-sm text-gray-500 mt-1">
                    {shareholders[0]?.name} {shareholders.length > 1 ? `+${shareholders.length - 1}` : ''}
                  </div>
                )}
              </div>

              {/* Directors Card */}
              <div 
                className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setActiveTab('directors')}
              >
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <UserCheck size={18} className="text-purple-500" />
                  <span className="text-sm">{'Directors'}</span>
                </div>
                <div className="text-xl font-bold text-gray-800">{getActiveDirectors().length}</div>
                {getActiveDirectors().length > 0 && (
                  <div className="text-sm text-gray-500 mt-1">
                    {getActiveDirectors().find(d => d.position === 'Chairman')?.name || getActiveDirectors()[0]?.name}
                  </div>
                )}
              </div>

              {/* Filings Card */}
              <div 
                className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setActiveTab('filings')}
              >
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <FileText size={18} className="text-orange-500" />
                  <span className="text-sm">{'Filings'}</span>
                </div>
                <div className="text-xl font-bold text-gray-800">{filings.length}</div>
                {getUpcomingFilings().length > 0 && (
                  <div className="text-sm text-amber-600 mt-1">
                    {getUpcomingFilings().length} {'upcoming'}
                  </div>
                )}
              </div>

              {/* Meetings Card */}
              <div 
                className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setActiveTab('meetings')}
              >
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <Calendar size={18} className="text-teal-500" />
                  <span className="text-sm">{'Meetings'}</span>
                </div>
                <div className="text-xl font-bold text-gray-800">{meetings.length}</div>
                {getUpcomingMeetings().length > 0 && (
                  <div className="text-sm text-amber-600 mt-1">
                    {getUpcomingMeetings().length} {'scheduled'}
                  </div>
                )}
              </div>

              {/* Fiscal Year Card */}
              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <Calendar size={18} className="text-gray-500" />
                  <span className="text-sm">{'Fiscal Year'}</span>
                </div>
                <div className="text-xl font-bold text-gray-800">
                  {formData.fiscal_year_end || '-'}
                </div>
              </div>
            </div>

            {/* Upcoming Deadlines Section */}
            {getUpcomingItems().length > 0 && (
              <div className="border border-amber-200 rounded-lg bg-amber-50 p-4">
                <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <AlertTriangle size={18} />
                  {'Upcoming Deadlines'}
                </h3>
                <div className="space-y-2">
                  {getUpcomingItems().slice(0, 5).map((item, idx) => {
                    const daysUntil = getDaysUntil(item.due_date);
                    return (
                      <div 
                        key={idx} 
                        className="flex justify-between items-center bg-white p-3 rounded-lg cursor-pointer hover:bg-gray-50"
                        onClick={() => setActiveTab(item.item_type === 'filing' ? 'filings' : 'meetings')}
                      >
                        <div className="flex items-center gap-2">
                          {item.item_type === 'filing' ? <FileText size={16} className="text-orange-500" /> : <Calendar size={16} className="text-teal-500" />}
                          <span className="font-medium">
                            {item.item_type === 'filing' ? getFilingTypeName(item.filing_type) : getMeetingTypeName(item.meeting_type)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm px-2 py-1 rounded ${
                            daysUntil <= 7 ? 'bg-red-100 text-red-700' :
                            daysUntil <= 30 ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {daysUntil === 0 ? ('Today') :
                             daysUntil === 1 ? ('Tomorrow') :
                             `${daysUntil} ${'days'}`}
                          </span>
                          <span className="text-gray-600">{item.due_date}</span>
                          <ChevronRight size={16} className="text-gray-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => setShowReport(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <FileText size={16} />
                {'View Full Report'}
              </button>
              <button
                onClick={() => setActiveTab('details')}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                <Pencil size={16} />
                {'Edit Details'}
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* DETAILS TAB */}
        {/* ============================================================ */}
        {activeTab === 'details' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Selection - only for brand new (no editingEntity at all) */}
            {!editingEntity && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  {'Client'} *
                </label>
                {loading ? (
                  <div className="text-gray-500">{'Loading...'}...</div>
                ) : companyClients.length === 0 ? (
                  <div className="text-amber-600 bg-amber-50 p-3 rounded">
                    {'No company clients without corporate records. Add a company client first.'}
                  </div>
                ) : (
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  >
                    <option value="">{'Select Client'}...</option>
                    {companyClients.map(client => (
                      <option key={client.client_id} value={client.client_id}>
                        {client.client_name}
                        {client.entity_type_name && ` (${client.entity_type_name})`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Show client info when editing or adding details for specific client */}
            {editingEntity && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="font-medium">
                  {editingEntity.client_name}
                </div>
                {editingEntity.entity_type_name && (
                  <div className="text-sm text-gray-500">
                    {editingEntity.entity_type_name}
                  </div>
                )}
                {editingEntity.isNewForClient && (
                  <div className="text-sm text-blue-600 mt-1">
                    {'Adding corporate details for this client'}
                  </div>
                )}
              </div>
            )}

            {/* Registration Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {'Registration Number'}
                </label>
                <input
                  type="text"
                  value={formData.registration_number}
                  onChange={(e) => setFormData({...formData, registration_number: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {'Registration Date'}
                </label>
                <input
                  type="date"
                  value={formData.registration_date}
                  onChange={(e) => setFormData({...formData, registration_date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {'Registered Address'}
              </label>
              <textarea
                value={formData.registered_address}
                onChange={(e) => setFormData({...formData, registered_address: e.target.value})}
                rows={2}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            {/* Capital Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {'Share Capital'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.share_capital}
                  onChange={(e) => setFormData({...formData, share_capital: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {'Capital Currency'}
                </label>
                <select
                  value={formData.share_capital_currency}
                  onChange={(e) => setFormData({...formData, share_capital_currency: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {'Number of Shares'}
                </label>
                <input
                  type="number"
                  value={formData.total_shares}
                  onChange={(e) => setFormData({...formData, total_shares: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>

            {/* Tax & Commercial Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {'Tax ID'}
                </label>
                <input
                  type="text"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {'Commercial Register'}
                </label>
                <input
                  type="text"
                  value={formData.commercial_register}
                  onChange={(e) => setFormData({...formData, commercial_register: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {'Fiscal Year End'}
                </label>
                <input
                  type="text"
                  placeholder="MM-DD"
                  value={formData.fiscal_year_end}
                  onChange={(e) => setFormData({...formData, fiscal_year_end: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {'Status'}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="active">{'Active'}</option>
                <option value="dormant">{'Dormant'}</option>
                <option value="liquidating">{'Liquidating'}</option>
                <option value="struck_off">{'Struck Off'}</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {'Notes'}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving || (!editingEntity && companyClients.length === 0)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {saving ? ('Saving...') : ('Save')}
              </button>
              <button
                type="button"
                onClick={() => closeForm('entity')}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {'Cancel'}
              </button>
            </div>
          </form>
        )}

        {/* ============================================================ */}
        {/* SHAREHOLDERS TAB */}
        {/* ============================================================ */}
        {activeTab === 'shareholders' && (
          <div className="space-y-4">
            <CompanyContextBanner />
            
            {/* Add Shareholder Button */}
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-700">
                {'Shareholders'} ({shareholders.length})
              </h3>
              <button
                type="button"
                onClick={() => { setShowShareholderForm(true); setEditingShareholder(null); setShareholderForm({ name: '', id_number: '', nationality: '', shares_owned: '', share_class: 'Ordinary', date_acquired: '' }); }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                <Plus size={16} />
                {'Add Shareholder'}
              </button>
            </div>

            {/* Shareholder Form */}
            {showShareholderForm && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <h4 className="font-medium">
                  {editingShareholder ? ('Edit Shareholder') : ('Add New Shareholder')}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {'Name'} *
                    </label>
                    <input
                      type="text"
                      value={shareholderForm.name}
                      onChange={(e) => setShareholderForm({ ...shareholderForm, name: e.target.value })}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {'ID Number'}
                    </label>
                    <input
                      type="text"
                      value={shareholderForm.id_number}
                      onChange={(e) => setShareholderForm({ ...shareholderForm, id_number: e.target.value })}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {'Nationality'}
                    </label>
                    <input
                      type="text"
                      value={shareholderForm.nationality}
                      onChange={(e) => setShareholderForm({ ...shareholderForm, nationality: e.target.value })}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {'Shares Owned'}
                    </label>
                    <input
                      type="number"
                      value={shareholderForm.shares_owned}
                      onChange={(e) => setShareholderForm({ ...shareholderForm, shares_owned: e.target.value })}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {'Share Class'}
                    </label>
                    <select
                      value={shareholderForm.share_class}
                      onChange={(e) => setShareholderForm({ ...shareholderForm, share_class: e.target.value })}
                      className="w-full p-2 border rounded"
                    >
                      <option value="Ordinary">{'Ordinary'}</option>
                      <option value="Preferred">{'Preferred'}</option>
                      <option value="Class A">{'Class A'}</option>
                      <option value="Class B">{'Class B'}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {'Date Acquired'}
                  </label>
                  <input
                    type="date"
                    value={shareholderForm.date_acquired}
                    onChange={(e) => setShareholderForm({ ...shareholderForm, date_acquired: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleShareholderSubmit}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    {editingShareholder ? ('Update') : ('Save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowShareholderForm(false); setEditingShareholder(null); }}
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  >
                    {'Cancel'}
                  </button>
                </div>
              </div>
            )}

            {/* Shareholders List */}
            {loadingShareholders ? (
              <div className="text-center py-8 text-gray-500">{'Loading...'}...</div>
            ) : shareholders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {'No shareholders registered'}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 font-medium text-left">
                          {'Name'}
                        </th>
                        <th className="px-4 py-3 font-medium text-left">
                          {'ID Number'}
                        </th>
                        <th className="px-4 py-3 font-medium text-left">
                          {'Nationality'}
                        </th>
                        <th className="px-4 py-3 font-medium text-center">
                          {'Shares'}
                        </th>
                        <th className="px-4 py-3 font-medium text-center">
                          {'%'}
                        </th>
                        <th className="px-4 py-3 font-medium text-center">
                          {'Actions'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {shareholders.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{s.name}</td>
                          <td className="px-4 py-3">{s.id_number || '-'}</td>
                          <td className="px-4 py-3">{s.nationality || '-'}</td>
                          <td className="px-4 py-3 text-center">{s.shares_owned?.toLocaleString() || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 font-medium">
                              {getSharePercentage(s.shares_owned)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleEditShareholder(s)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title={'Edit'}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteShareholder(s.id)}
                              className="text-red-600 hover:text-red-800 p-1 ml-2"
                              title={'Delete'}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total Summary */}
                <div className="bg-gray-100 p-3 rounded-lg flex justify-between items-center">
                  <span className="font-medium">
                    {'Total Registered Shares:'}
                  </span>
                  <span className="font-bold">
                    {shareholders.reduce((sum, s) => sum + (s.shares_owned || 0), 0).toLocaleString()}
                    {getTotalShares() > 0 && (
                      <span className="text-gray-500 font-normal ml-2">
                        / {getTotalShares().toLocaleString()} ({'authorized'})
                      </span>
                    )}
                  </span>
                </div>
              </>
            )}

            {/* ============================================================ */}
            {/* SHARE TRANSFER LEDGER (v46.27) */}
            {/* ============================================================ */}
            <div className="border-t pt-6 mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-700 flex items-center gap-2">
                  <FileText size={18} className="text-gray-500" />
                  {'Share Transfer Ledger'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferForm(true);
                    setEditingTransfer(null);
                    setTransferForm({
                      transfer_type: 'transfer', transfer_date: new Date().toISOString().split('T')[0],
                      from_shareholder_id: '', to_shareholder_id: '', shares_transferred: '',
                      price_per_share: '', share_class: 'Ordinary', board_resolution: '', notes: ''
                    });
                  }}
                  disabled={shareholders.length < 1}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                  {'Record Transfer'}
                </button>
              </div>

              {/* Transfer Form */}
              {showTransferForm && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg space-y-4 mb-4">
                  <h4 className="font-medium text-green-800">
                    {editingTransfer 
                      ? ('Edit Share Transfer')
                      : ('Record Share Transfer')}
                  </h4>
                  
                  {/* Transfer Type Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {'Transaction Type'} *
                    </label>
                    <div className="flex gap-4">
                      {[
                        { value: 'transfer', labelEn: 'Transfer', labelAr: 'تحويل', desc: 'Between shareholders' },
                        { value: 'issuance', labelEn: 'New Issuance', labelAr: 'إصدار جديد', desc: 'From authorized capital' },
                        { value: 'buyback', labelEn: 'Buyback', labelAr: 'استرداد', desc: 'Company repurchase' }
                      ].map(opt => (
                        <label key={opt.value} className={`flex-1 border rounded-lg p-3 cursor-pointer transition-colors ${
                          transferForm.transfer_type === opt.value 
                            ? 'border-green-500 bg-green-100' 
                            : 'border-gray-200 hover:border-green-300'
                        }`}>
                          <input
                            type="radio"
                            name="transfer_type"
                            value={opt.value}
                            checked={transferForm.transfer_type === opt.value}
                            onChange={(e) => setTransferForm({ ...transferForm, transfer_type: e.target.value, from_shareholder_id: '', to_shareholder_id: '' })}
                            className="sr-only"
                          />
                          <div className="font-medium">
                            {opt.labelEn}
                          </div>
                          <div className="text-xs text-gray-500">{opt.desc}</div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Fields based on Transfer Type */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Date */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {'Date'} *
                      </label>
                      <input
                        type="date"
                        value={transferForm.transfer_date}
                        onChange={(e) => setTransferForm({ ...transferForm, transfer_date: e.target.value })}
                        className="w-full p-2 border rounded"
                      />
                    </div>

                    {/* Shares */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {'Number of Shares'} *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={transferForm.shares_transferred}
                        onChange={(e) => setTransferForm({ ...transferForm, shares_transferred: e.target.value })}
                        className="w-full p-2 border rounded"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* From/To Shareholders */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* From Shareholder - for transfer and buyback */}
                    {(transferForm.transfer_type === 'transfer' || transferForm.transfer_type === 'buyback') && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {'From Shareholder'} *
                        </label>
                        <select
                          value={transferForm.from_shareholder_id}
                          onChange={(e) => setTransferForm({ ...transferForm, from_shareholder_id: e.target.value })}
                          className="w-full p-2 border rounded"
                        >
                          <option value="">{'-- Select --'}</option>
                          {shareholders.filter(s => s.shares_owned > 0).map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.shares_owned?.toLocaleString()} {'shares'})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* To Shareholder - for transfer and issuance */}
                    {(transferForm.transfer_type === 'transfer' || transferForm.transfer_type === 'issuance') && (
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {transferForm.transfer_type === 'issuance' 
                            ? ('Recipient')
                            : ('To Shareholder')} *
                        </label>
                        <select
                          value={transferForm.to_shareholder_id}
                          onChange={(e) => setTransferForm({ ...transferForm, to_shareholder_id: e.target.value })}
                          className="w-full p-2 border rounded"
                        >
                          <option value="">{'-- Select --'}</option>
                          {shareholders
                            .filter(s => transferForm.transfer_type !== 'transfer' || s.id !== parseInt(transferForm.from_shareholder_id))
                            .map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.shares_owned?.toLocaleString()} {'shares'})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                    {/* Placeholder for buyback - company receives */}
                    {transferForm.transfer_type === 'buyback' && (
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-400">
                          {'To'}
                        </label>
                        <div className="w-full p-2 border rounded bg-gray-100 text-gray-500">
                          {'Company (Treasury)'}
                        </div>
                      </div>
                    )}

                    {/* Placeholder for issuance - from company */}
                    {transferForm.transfer_type === 'issuance' && (
                      <div className="order-first">
                        <label className="block text-sm font-medium mb-1 text-gray-400">
                          {'From'}
                        </label>
                        <div className="w-full p-2 border rounded bg-gray-100 text-gray-500">
                          {'Authorized Capital'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Additional Fields */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {'Share Class'}
                      </label>
                      <select
                        value={transferForm.share_class}
                        onChange={(e) => setTransferForm({ ...transferForm, share_class: e.target.value })}
                        className="w-full p-2 border rounded"
                      >
                        <option value="Ordinary">{'Ordinary'}</option>
                        <option value="Preferred">{'Preferred'}</option>
                        <option value="Class A">{'Class A'}</option>
                        <option value="Class B">{'Class B'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {'Price per Share'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={transferForm.price_per_share}
                        onChange={(e) => setTransferForm({ ...transferForm, price_per_share: e.target.value })}
                        className="w-full p-2 border rounded"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {'Board Resolution #'}
                      </label>
                      <input
                        type="text"
                        value={transferForm.board_resolution}
                        onChange={(e) => setTransferForm({ ...transferForm, board_resolution: e.target.value })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {'Notes'}
                    </label>
                    <textarea
                      value={transferForm.notes}
                      onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                      rows={2}
                      className="w-full p-2 border rounded"
                    />
                  </div>

                  {/* Consideration Preview */}
                  {transferForm.price_per_share && transferForm.shares_transferred && (
                    <div className="bg-white p-3 rounded border">
                      <span className="text-sm text-gray-600">
                        {'Total Consideration:'}{' '}
                      </span>
                      <span className="font-bold text-green-700">
                        {(parseFloat(transferForm.price_per_share) * parseInt(transferForm.shares_transferred || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  {/* Form Buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveTransfer}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      {editingTransfer 
                        ? ('Update')
                        : ('Save Transfer')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowTransferForm(false); setEditingTransfer(null); }}
                      className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                    >
                      {'Cancel'}
                    </button>
                  </div>
                </div>
              )}

              {/* Transfers List */}
              {loadingTransfers ? (
                <div className="text-center py-4 text-gray-500">{'Loading...'}...</div>
              ) : shareTransfers.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm border rounded-lg bg-gray-50">
                  {'No transfers recorded'}
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 font-medium text-left">
                          {'Date'}
                        </th>
                        <th className="px-3 py-2 font-medium text-left">
                          {'Type'}
                        </th>
                        <th className="px-3 py-2 font-medium text-left">
                          {'From'}
                        </th>
                        <th className="px-3 py-2 font-medium text-left">
                          {'To'}
                        </th>
                        <th className="px-3 py-2 font-medium text-center">
                          {'Shares'}
                        </th>
                        <th className="px-3 py-2 font-medium text-center">
                          {'Actions'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {shareTransfers.map(tr => (
                        <tr key={tr.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{tr.transfer_date}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTransferTypeColor(tr.transfer_type)}`}>
                              {getTransferTypeName(tr.transfer_type)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {tr.transfer_type === 'issuance' 
                              ? ('Capital')
                              : (tr.from_shareholder_name || '-')}
                          </td>
                          <td className="px-3 py-2">
                            {tr.transfer_type === 'buyback' 
                              ? ('Company')
                              : (tr.to_shareholder_name || '-')}
                          </td>
                          <td className="px-3 py-2 text-center font-medium">
                            {tr.shares_transferred?.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => handleEditTransfer(tr)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title={'Edit'}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteTransfer(tr.id)}
                              className="text-red-600 hover:text-red-800 p-1 ml-1"
                              title={'Delete'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* DIRECTORS TAB */}
        {/* ============================================================ */}
        {activeTab === 'directors' && (
          <div className="space-y-4">
            <CompanyContextBanner />
            
            {/* Add Director Button */}
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-700">
                {'Board of Directors'} ({directors.length})
              </h3>
              <button
                type="button"
                onClick={() => { setShowDirectorForm(true); setEditingDirector(null); setDirectorForm({ name: '', id_number: '', nationality: '', position: 'Director', date_appointed: '', date_resigned: '', is_signatory: false, notes: '' }); }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                <Plus size={16} />
                {'Add Director'}
              </button>
            </div>

            {/* Director Form */}
            {showDirectorForm && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <h4 className="font-medium">
                  {editingDirector ? ('Edit Director') : ('Add New Director')}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {'Name'} *
                    </label>
                    <input
                      type="text"
                      value={directorForm.name}
                      onChange={(e) => setDirectorForm({ ...directorForm, name: e.target.value })}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {'Position'}
                    </label>
                    <select
                      value={directorForm.position}
                      onChange={(e) => setDirectorForm({ ...directorForm, position: e.target.value })}
                      className="w-full p-2 border rounded"
                    >
                      <option value="Director">{'Director'}</option>
                      <option value="Chairman">{'Chairman'}</option>
                      <option value="Vice Chairman">{'Vice Chairman'}</option>
                      <option value="Managing Director">{'Managing Director'}</option>
                      <option value="Secretary">{'Secretary'}</option>
                      <option value="Treasurer">{'Treasurer'}</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {'ID Number'}
                    </label>
                    <input
                      type="text"
                      value={directorForm.id_number}
                      onChange={(e) => setDirectorForm({ ...directorForm, id_number: e.target.value })}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {'Nationality'}
                    </label>
                    <input
                      type="text"
                      value={directorForm.nationality}
                      onChange={(e) => setDirectorForm({ ...directorForm, nationality: e.target.value })}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {'Date Appointed'}
                    </label>
                    <input
                      type="date"
                      value={directorForm.date_appointed}
                      onChange={(e) => setDirectorForm({ ...directorForm, date_appointed: e.target.value })}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {'Date Resigned'}
                    </label>
                    <input
                      type="date"
                      value={directorForm.date_resigned}
                      onChange={(e) => setDirectorForm({ ...directorForm, date_resigned: e.target.value })}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={directorForm.is_signatory}
                        onChange={(e) => setDirectorForm({ ...directorForm, is_signatory: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">
                        {'Authorized Signatory'}
                      </span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {'Notes'}
                  </label>
                  <textarea
                    value={directorForm.notes}
                    onChange={(e) => setDirectorForm({ ...directorForm, notes: e.target.value })}
                    className="w-full p-2 border rounded"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDirectorSubmit}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    {editingDirector ? ('Update') : ('Save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowDirectorForm(false); setEditingDirector(null); }}
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  >
                    {'Cancel'}
                  </button>
                </div>
              </div>
            )}

            {/* Directors Table */}
            {loadingDirectors ? (
              <div className="text-center py-8 text-gray-500">{'Loading...'}...</div>
            ) : directors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {'No directors registered'}
              </div>
            ) : (
              <>
                {/* Active Directors */}
                {getActiveDirectors().length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 mb-2">
                      {'Active Directors'} ({getActiveDirectors().length})
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 font-medium text-left">
                              {'Name'}
                            </th>
                            <th className="px-4 py-3 font-medium text-left">
                              {'Position'}
                            </th>
                            <th className="px-4 py-3 font-medium text-left">
                              {'Nationality'}
                            </th>
                            <th className="px-4 py-3 font-medium text-left">
                              {'Appointed'}
                            </th>
                            <th className="px-4 py-3 font-medium text-left">
                              {'Signatory'}
                            </th>
                            <th className="px-4 py-3 font-medium text-center">
                              {'Actions'}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {getActiveDirectors().map(d => (
                            <tr key={d.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium">{d.name}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                  {d.position === 'Chairman' ? ('Chairman') :
                                   d.position === 'Vice Chairman' ? ('Vice Chairman') :
                                   d.position === 'Managing Director' ? ('Managing Director') :
                                   d.position === 'Secretary' ? ('Secretary') :
                                   d.position === 'Treasurer' ? ('Treasurer') :
                                   ('Director')}
                                </span>
                              </td>
                              <td className="px-4 py-3">{d.nationality || '-'}</td>
                              <td className="px-4 py-3">{d.date_appointed || '-'}</td>
                              <td className="px-4 py-3">
                                {d.is_signatory ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                    ✓ {'Yes'}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleEditDirector(d)}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                  title={'Edit'}
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteDirector(d.id)}
                                  className="text-red-600 hover:text-red-800 p-1 ml-2"
                                  title={'Delete'}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Resigned Directors */}
                {getResignedDirectors().length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">
                      {'Former Directors'} ({getResignedDirectors().length})
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm opacity-75">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 font-medium text-left">
                              {'Name'}
                            </th>
                            <th className="px-4 py-3 font-medium text-left">
                              {'Position'}
                            </th>
                            <th className="px-4 py-3 font-medium text-left">
                              {'Appointed'}
                            </th>
                            <th className="px-4 py-3 font-medium text-left">
                              {'Resigned'}
                            </th>
                            <th className="px-4 py-3 font-medium text-center">
                              {'Actions'}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {getResignedDirectors().map(d => (
                            <tr key={d.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">{d.name}</td>
                              <td className="px-4 py-3">{d.position}</td>
                              <td className="px-4 py-3">{d.date_appointed || '-'}</td>
                              <td className="px-4 py-3">{d.date_resigned || '-'}</td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleEditDirector(d)}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                  title={'Edit'}
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteDirector(d.id)}
                                  className="text-red-600 hover:text-red-800 p-1 ml-2"
                                  title={'Delete'}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="bg-gray-100 p-3 rounded-lg flex justify-between items-center">
                  <span className="font-medium">
                    {'Total Directors:'}
                  </span>
                  <span className="font-bold">
                    {getActiveDirectors().length} {'active'}
                    {getResignedDirectors().length > 0 && (
                      <span className="text-gray-500 font-normal ml-2">
                        ({getResignedDirectors().length} {'former'})
                      </span>
                    )}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* FILINGS TAB (v46.24 - Split from Compliance) */}
        {/* ============================================================ */}
        {activeTab === 'filings' && (
          <div className="space-y-4">
            <CompanyContextBanner />

            {/* Upcoming Filings Alert */}
            {getUpcomingFilings().length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                  <AlertTriangle size={18} />
                  {'Upcoming Filings'}
                </h4>
                <div className="space-y-2">
                  {getUpcomingFilings().slice(0, 3).map((f, idx) => {
                    const daysUntil = getDaysUntil(f.next_due_date);
                    return (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span>{getFilingTypeName(f.filing_type)}{f.filing_description ? ` - ${f.filing_description}` : ''}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          daysUntil <= 7 ? 'bg-red-100 text-red-700' :
                          daysUntil <= 30 ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {f.next_due_date} ({daysUntil} {'days'})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add Filing Button */}
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-700">
                {'Commercial Register Filings'} ({filings.length})
              </h3>
              <button
                type="button"
                onClick={() => { setShowFilingForm(true); setEditingFiling(null); setFilingForm({ filing_type: 'renewal', filing_description: '', filing_date: '', filing_reference: '', next_due_date: '', reminder_days: 30, notes: '', status: 'completed' }); }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                <Plus size={16} />
                {'Add Filing'}
              </button>
            </div>

            {/* Filing Form */}
            {showFilingForm && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <form onSubmit={handleSaveFiling} className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {'Filing Type'} *
                      </label>
                      <select
                        value={filingForm.filing_type}
                        onChange={(e) => setFilingForm({ ...filingForm, filing_type: e.target.value })}
                        className="w-full p-2 border rounded"
                      >
                        {filingTypes.map(ft => (
                          <option key={ft.code} value={ft.code}>{ft.en}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {'Description'} {filingForm.filing_type === 'other' ? '*' : ''}
                      </label>
                      <input
                        type="text"
                        value={filingForm.filing_description}
                        onChange={(e) => setFilingForm({ ...filingForm, filing_description: e.target.value })}
                        className="w-full p-2 border rounded"
                        placeholder={'Filing description...'}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {'Filing Date'}
                      </label>
                      <input
                        type="date"
                        value={filingForm.filing_date}
                        onChange={(e) => setFilingForm({ ...filingForm, filing_date: e.target.value })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {'Reference Number'}
                      </label>
                      <input
                        type="text"
                        value={filingForm.filing_reference}
                        onChange={(e) => setFilingForm({ ...filingForm, filing_reference: e.target.value })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {'Status'}
                      </label>
                      <select
                        value={filingForm.status}
                        onChange={(e) => setFilingForm({ ...filingForm, status: e.target.value })}
                        className="w-full p-2 border rounded"
                      >
                        <option value="completed">{'Completed'}</option>
                        <option value="pending">{'Pending'}</option>
                        <option value="overdue">{'Overdue'}</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {'Next Due Date'}
                      </label>
                      <input
                        type="date"
                        value={filingForm.next_due_date}
                        onChange={(e) => setFilingForm({ ...filingForm, next_due_date: e.target.value })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {'Reminder (days before)'}
                      </label>
                      <input
                        type="number"
                        value={filingForm.reminder_days}
                        onChange={(e) => setFilingForm({ ...filingForm, reminder_days: parseInt(e.target.value) || 30 })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {'Notes'}
                    </label>
                    <textarea
                      value={filingForm.notes}
                      onChange={(e) => setFilingForm({ ...filingForm, notes: e.target.value })}
                      className="w-full p-2 border rounded"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                      {editingFiling ? ('Update') : ('Save')}
                    </button>
                    <button type="button" onClick={() => { setShowFilingForm(false); setEditingFiling(null); }} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
                      {'Cancel'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Filings List */}
            {loadingFilings ? (
              <div className="text-center py-4 text-gray-500">{'Loading...'}</div>
            ) : filings.length === 0 ? (
              <div className="text-center py-4 text-gray-500">{'No filings recorded'}</div>
            ) : (
              <div className="space-y-2">
                {filings.map(f => (
                  <div key={f.id} className="flex justify-between items-center p-3 bg-white border rounded hover:bg-gray-50">
                    <div>
                      <div className="font-medium">
                        {getFilingTypeName(f.filing_type)}
                        {f.filing_description && <span className="text-gray-600 ml-2">- {f.filing_description}</span>}
                      </div>
                      <div className="text-sm text-gray-500">
                        {f.filing_date && <span>{'Date: '}{f.filing_date}</span>}
                        {f.filing_reference && <span className="ml-3">{'Ref: '}{f.filing_reference}</span>}
                      </div>
                      {f.next_due_date && (
                        <div className="text-sm text-amber-600 mt-1">
                          {'Next due: '}{f.next_due_date}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        f.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        f.status === 'pending' ? 'bg-amber-100 text-amber-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {f.status === 'completed' ? ('Completed') : 
                         f.status === 'pending' ? ('Pending') : 
                         ('Overdue')}
                      </span>
                      <button onClick={() => handleEditFiling(f)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={16} /></button>
                      <button onClick={() => handleDeleteFiling(f.id)} className="text-red-600 hover:text-red-800 p-1"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* MEETINGS TAB (v46.24 - Split from Compliance) */}
        {/* ============================================================ */}
        {activeTab === 'meetings' && (
          <div className="space-y-4">
            <CompanyContextBanner />

            {/* Upcoming Meetings Alert */}
            {getUpcomingMeetings().length > 0 && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                <h4 className="font-medium text-teal-800 mb-2 flex items-center gap-2">
                  <Calendar size={18} />
                  {'Scheduled Meetings'}
                </h4>
                <div className="space-y-2">
                  {getUpcomingMeetings().slice(0, 3).map((m, idx) => {
                    const daysUntil = getDaysUntil(m.next_meeting_date);
                    return (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span>{getMeetingTypeName(m.meeting_type)}{m.next_meeting_agenda ? ` - ${m.next_meeting_agenda.substring(0, 50)}...` : ''}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          daysUntil <= 7 ? 'bg-red-100 text-red-700' :
                          daysUntil <= 30 ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {m.next_meeting_date} ({daysUntil} {'days'})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add Meeting Button */}
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-gray-700">
                {'Company Meetings'} ({meetings.length})
              </h3>
              <button
                type="button"
                onClick={() => { setShowMeetingForm(true); setEditingMeeting(null); setMeetingForm({ meeting_type: 'board', meeting_description: '', meeting_date: '', meeting_notes: '', attendees: '', next_meeting_date: '', next_meeting_agenda: '', reminder_days: 14, status: 'held' }); }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                <Plus size={16} />
                {'Add Meeting'}
              </button>
            </div>

            {/* Meeting Form */}
            {showMeetingForm && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <form onSubmit={handleSaveMeeting} className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {'Meeting Type'} *
                      </label>
                      <select
                        value={meetingForm.meeting_type}
                        onChange={(e) => setMeetingForm({ ...meetingForm, meeting_type: e.target.value })}
                        className="w-full p-2 border rounded"
                      >
                        {getMeetingTypes().map(mt => (
                          <option key={mt.code} value={mt.code}>{mt.en}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {'Description'} {meetingForm.meeting_type === 'other' ? '*' : ''}
                      </label>
                      <input
                        type="text"
                        value={meetingForm.meeting_description}
                        onChange={(e) => setMeetingForm({ ...meetingForm, meeting_description: e.target.value })}
                        className="w-full p-2 border rounded"
                        placeholder={'Meeting description...'}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {'Meeting Date'}
                      </label>
                      <input
                        type="date"
                        value={meetingForm.meeting_date}
                        onChange={(e) => setMeetingForm({ ...meetingForm, meeting_date: e.target.value })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {'Attendees'}
                      </label>
                      <input
                        type="text"
                        value={meetingForm.attendees}
                        onChange={(e) => setMeetingForm({ ...meetingForm, attendees: e.target.value })}
                        className="w-full p-2 border rounded"
                        placeholder={'Names of attendees...'}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {'Notes / Decisions'}
                    </label>
                    <textarea
                      value={meetingForm.meeting_notes}
                      onChange={(e) => setMeetingForm({ ...meetingForm, meeting_notes: e.target.value })}
                      className="w-full p-2 border rounded"
                      rows={2}
                      placeholder={'What was discussed or decided...'}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {'Next Meeting Date'}
                      </label>
                      <input
                        type="date"
                        value={meetingForm.next_meeting_date}
                        onChange={(e) => setMeetingForm({ ...meetingForm, next_meeting_date: e.target.value })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {'Reminder (days)'}
                      </label>
                      <input
                        type="number"
                        value={meetingForm.reminder_days}
                        onChange={(e) => setMeetingForm({ ...meetingForm, reminder_days: parseInt(e.target.value) || 14 })}
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        {'Status'}
                      </label>
                      <select
                        value={meetingForm.status}
                        onChange={(e) => setMeetingForm({ ...meetingForm, status: e.target.value })}
                        className="w-full p-2 border rounded"
                      >
                        <option value="held">{'Held'}</option>
                        <option value="scheduled">{'Scheduled'}</option>
                        <option value="cancelled">{'Cancelled'}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {'Next Meeting Agenda'}
                    </label>
                    <textarea
                      value={meetingForm.next_meeting_agenda}
                      onChange={(e) => setMeetingForm({ ...meetingForm, next_meeting_agenda: e.target.value })}
                      className="w-full p-2 border rounded"
                      rows={2}
                      placeholder={'Topics to be discussed...'}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                      {editingMeeting ? ('Update') : ('Save')}
                    </button>
                    <button type="button" onClick={() => { setShowMeetingForm(false); setEditingMeeting(null); }} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
                      {'Cancel'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Meetings List */}
            {loadingMeetings ? (
              <div className="text-center py-4 text-gray-500">{'Loading...'}</div>
            ) : meetings.length === 0 ? (
              <div className="text-center py-4 text-gray-500">{'No meetings recorded'}</div>
            ) : (
              <div className="space-y-2">
                {meetings.map(m => (
                  <div key={m.id} className="flex justify-between items-center p-3 bg-white border rounded hover:bg-gray-50">
                    <div>
                      <div className="font-medium">
                        {getMeetingTypeName(m.meeting_type)}
                        {m.meeting_description && <span className="text-gray-600 ml-2">- {m.meeting_description}</span>}
                      </div>
                      <div className="text-sm text-gray-500">
                        {m.meeting_date && <span>{'Date: '}{m.meeting_date}</span>}
                        {m.attendees && <span className="ml-3">{'Attendees: '}{m.attendees}</span>}
                      </div>
                      {m.meeting_notes && <div className="text-sm text-gray-600 mt-1">{m.meeting_notes.substring(0, 100)}{m.meeting_notes.length > 100 ? '...' : ''}</div>}
                      {m.next_meeting_date && (
                        <div className="text-sm text-amber-600 mt-1">
                          {'Next: '}{m.next_meeting_date}
                          {m.next_meeting_agenda && <span className="text-gray-500"> - {m.next_meeting_agenda.substring(0, 50)}{m.next_meeting_agenda.length > 50 ? '...' : ''}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        m.status === 'held' ? 'bg-green-100 text-green-800' : 
                        m.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {m.status === 'held' ? ('Held') : 
                         m.status === 'scheduled' ? ('Scheduled') : 
                         ('Cancelled')}
                      </span>
                      <button onClick={() => handleEditMeeting(m)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil size={16} /></button>
                      <button onClick={() => handleDeleteMeeting(m.id)} className="text-red-600 hover:text-red-800 p-1"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Company 360° Report Modal */}
      <Company360Report />
    </div>
  );
});

export default EntityForm;
