import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  PlusCircle,
  RefreshCw,
  ExternalLink,
  Trash2,
  Share2,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  List,
  Sparkles,
  Search,
  Eye,
  Copy,
  Check,
  Download,
  ShieldAlert,
  HelpCircle,
  Users,
  Clock,
  Send,
} from 'lucide-react';
import {
  initWorkspaceAuth,
  googleWorkspaceSignIn,
  googleWorkspaceLogout,
  getWorkspaceAccessToken,
  getGoogleUser,
  WORKSPACE_SCOPES,
} from '../services/workspaceAuth';
import {
  GoogleDriveFormFile,
  GoogleFormSchema,
  GoogleFormResponsesData,
  FormTemplateDefinition,
  PRESET_FORM_TEMPLATES,
  fetchGoogleFormsFromDrive,
  fetchGoogleFormById,
  fetchGoogleFormResponses,
  createGoogleForm,
  deleteGoogleFormFile,
} from '../services/googleForms';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useLanguage } from '../context/LanguageContext';
import { WorkspaceUser as User } from '../services/workspaceAuth';

interface GoogleFormsScreenProps {
  onNavigate?: (view: string) => void;
}

export const GoogleFormsScreen: React.FC<GoogleFormsScreenProps> = ({ onNavigate }) => {
  const { isSwahili } = useLanguage();
  // Authentication State
  const [googleUser, setGoogleUser] = useState<User | null>(getGoogleUser());
  const [hasToken, setHasToken] = useState<boolean>(!!getWorkspaceAccessToken());
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Forms Explorer State
  const [driveForms, setDriveForms] = useState<GoogleDriveFormFile[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState<boolean>(false);
  const [formsError, setFormsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Active Form State
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [activeFormSchema, setActiveFormSchema] = useState<GoogleFormSchema | null>(null);
  const [activeFormResponses, setActiveFormResponses] = useState<GoogleFormResponsesData | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Manual Form Lookup input
  const [manualFormInput, setManualFormInput] = useState<string>('');

  // Tab: 'overview' | 'questions' | 'responses' | 'create'
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'responses' | 'create'>('overview');

  // Confirmation Modal State (MANDATORY for mutating/destructive operations)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'warning' | 'primary';
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: '',
    variant: 'primary',
    action: async () => {},
  });
  const [isPerformingAction, setIsPerformingAction] = useState<boolean>(false);
  const [copyNotification, setCopyNotification] = useState<string | null>(null);

  // Initialize workspace auth listener
  useEffect(() => {
    const unsubscribe = initWorkspaceAuth(
      (user, token) => {
        setGoogleUser(user);
        setHasToken(!!token);
        setAuthError(null);
      },
      () => {
        setGoogleUser(null);
        setHasToken(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Handle Google Sign In
  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const result = await googleWorkspaceSignIn();
      if (result) {
        setGoogleUser(result.user);
        setHasToken(true);
        // Automatically load user's Google Forms from Drive
        loadDriveForms();
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setAuthError(err?.message || 'Failed to sign in with Google Workspace credentials.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle Google Sign Out
  const handleSignOut = async () => {
    try {
      await googleWorkspaceLogout();
      setGoogleUser(null);
      setHasToken(false);
      setDriveForms([]);
      setActiveFormSchema(null);
      setActiveFormResponses(null);
      setSelectedFormId(null);
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  // Load Forms from Drive
  const loadDriveForms = useCallback(async () => {
    if (!getWorkspaceAccessToken()) return;
    setIsLoadingForms(true);
    setFormsError(null);
    try {
      const files = await fetchGoogleFormsFromDrive();
      setDriveForms(files);
      // If we don't have an active form selected and forms exist, auto-select first
      if (!selectedFormId && files.length > 0) {
        handleSelectForm(files[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching drive forms:', err);
      setFormsError(err?.message || 'Unable to list Google Forms from Drive.');
    } finally {
      setIsLoadingForms(false);
    }
  }, [selectedFormId]);

  // Load forms when token becomes available
  useEffect(() => {
    if (hasToken) {
      loadDriveForms();
    }
  }, [hasToken, loadDriveForms]);

  // Select a form and load its schema + responses
  const handleSelectForm = async (formId: string) => {
    setSelectedFormId(formId);
    setIsLoadingDetails(true);
    setDetailsError(null);
    try {
      const [schema, responsesData] = await Promise.all([
        fetchGoogleFormById(formId),
        fetchGoogleFormResponses(formId).catch((err) => {
          console.warn('Responses fetch notice (may have 0 responses or restricted):', err);
          return { responses: [] };
        }),
      ]);
      setActiveFormSchema(schema);
      setActiveFormResponses(responsesData);
    } catch (err: any) {
      console.error('Error loading form details:', err);
      setDetailsError(err?.message || 'Failed to fetch form schema and responses.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Manual form ID lookup
  const handleManualLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualFormInput.trim()) return;
    handleSelectForm(manualFormInput.trim());
  };

  // Copy link helper
  const handleCopyLink = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyNotification(label);
    setTimeout(() => setCopyNotification(null), 2500);
  };

  // Request Form Creation with MANDATORY Confirmation Modal
  const requestCreateForm = (template: FormTemplateDefinition) => {
    setConfirmModal({
      isOpen: true,
      title: `Create Google Form in Google Drive?`,
      message: `You are about to create a new Google Form titled "${template.title}" in your connected Google Drive account.\n\nThis will configure ${template.questions.length} initial questions and generate a live responder URL. Do you wish to continue?`,
      confirmLabel: 'Create Form',
      variant: 'primary',
      action: async () => {
        setIsPerformingAction(true);
        try {
          const newForm = await createGoogleForm(template);
          await loadDriveForms();
          await handleSelectForm(newForm.formId);
          setActiveTab('overview');
        } catch (err: any) {
          alert(`Failed to create form: ${err.message}`);
        } finally {
          setIsPerformingAction(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Request Form Deletion with MANDATORY Confirmation Modal
  const requestDeleteForm = (file: GoogleDriveFormFile) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Google Form?`,
      message: `Are you sure you want to delete "${file.name}" from your Google Drive?\n\nThis action cannot be undone. All collected responses and question structures associated with this Google Form file will be moved to trash.`,
      confirmLabel: 'Delete from Drive',
      variant: 'danger',
      action: async () => {
        setIsPerformingAction(true);
        try {
          await deleteGoogleFormFile(file.id);
          if (selectedFormId === file.id) {
            setSelectedFormId(null);
            setActiveFormSchema(null);
            setActiveFormResponses(null);
          }
          await loadDriveForms();
        } catch (err: any) {
          alert(`Failed to delete form: ${err.message}`);
        } finally {
          setIsPerformingAction(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Export responses to CSV
  const handleExportResponsesCsv = () => {
    if (!activeFormSchema || !activeFormResponses?.responses?.length) return;

    const items = activeFormSchema.items || [];
    const questions = items.filter((it) => it.questionItem?.question);

    const headers = [
      'Response ID',
      'Submitted At',
      'Respondent Email',
      ...questions.map((q) => `"${(q.title || 'Untitled').replace(/"/g, '""')}"`),
    ];

    const rows = activeFormResponses.responses.map((resp) => {
      const respTime = new Date(resp.lastSubmittedTime || resp.createTime).toLocaleString();
      const email = resp.respondentEmail || 'Anonymous';

      const questionAnswers = questions.map((q) => {
        const qId = q.questionItem?.question.questionId;
        const answerObj = qId && resp.answers ? resp.answers[qId] : undefined;
        const values = answerObj?.textAnswers?.answers?.map((a) => a.value).join('; ') || '';
        return `"${values.replace(/"/g, '""')}"`;
      });

      return [`"${resp.responseId}"`, `"${respTime}"`, `"${email}"`, ...questionAnswers].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `zamzam_form_${activeFormSchema.formId}_responses_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Drive Forms
  const filteredForms = useMemo(() => {
    if (!searchQuery.trim()) return driveForms;
    const q = searchQuery.toLowerCase();
    return driveForms.filter(
      (f) => f.name.toLowerCase().includes(q) || (f.description && f.description.toLowerCase().includes(q))
    );
  }, [driveForms, searchQuery]);

  // Compute question analytics
  const questionSummaries = useMemo(() => {
    if (!activeFormSchema || !activeFormResponses?.responses) return [];

    const items = activeFormSchema.items || [];
    const questions = items.filter((it) => it.questionItem?.question);
    const totalResponses = activeFormResponses.responses.length;

    return questions.map((item) => {
      const q = item.questionItem!.question;
      const qId = q.questionId;
      const title = item.title;

      const answers: string[] = [];
      activeFormResponses.responses!.forEach((resp) => {
        const ans = resp.answers?.[qId]?.textAnswers?.answers;
        if (ans && ans.length > 0) {
          ans.forEach((a) => {
            if (a.value) answers.push(a.value);
          });
        }
      });

      // Frequency map
      const freq: Record<string, number> = {};
      let numericSum = 0;
      let numericCount = 0;

      answers.forEach((val) => {
        freq[val] = (freq[val] || 0) + 1;
        const num = parseFloat(val);
        if (!isNaN(num)) {
          numericSum += num;
          numericCount += 1;
        }
      });

      const avg = numericCount > 0 ? (numericSum / numericCount).toFixed(1) : null;

      return {
        id: qId,
        title,
        type: q.choiceQuestion ? 'choice' : q.scaleQuestion ? 'scale' : 'text',
        responseCount: answers.length,
        totalResponses,
        frequencies: freq,
        average: avg,
        scaleRange: q.scaleQuestion ? `${q.scaleQuestion.low} - ${q.scaleQuestion.high}` : null,
        recentAnswers: answers.slice(-5),
      };
    });
  }, [activeFormSchema, activeFormResponses]);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header Card */}
      <div className="bg-[#122010] border border-[#243447] rounded-xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-[#006B3C]/30 text-[#00C46A] border border-[#00C46A]/40 rounded-xl shadow-xs">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {isSwahili ? 'Ushirikiano wa Google Forms' : 'Google Forms Integration'}
                </h1>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold tracking-wide rounded-full bg-[#00C46A]/20 text-[#00C46A] border border-[#00C46A]/40">
                  Google Workspace
                </span>
              </div>
              <p className="text-xs text-[#8899AA] mt-0.5">
                {isSwahili
                  ? 'Sambaza tafiti za maoni ya wateja, orodha za ukaguzi wa mashine za maji, na kagua majibu ya moja kwa moja kupitia Google Forms & Drive APIs.'
                  : 'Deploy customer feedback surveys, field dispenser checklists, and inspect live responses via Google Forms & Drive APIs.'}
              </p>
            </div>
          </div>

          {/* Google Auth Status & Trigger */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {hasToken && googleUser ? (
              <div className="flex items-center gap-3 bg-[#0A1A0F] border border-[#243447] px-3.5 py-2 rounded-xl">
                {googleUser.photoURL ? (
                  <img
                    src={googleUser.photoURL}
                    alt={googleUser.displayName || 'Google User'}
                    className="w-7 h-7 rounded-full border border-[#00C46A]/40"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#006B3C] text-white flex items-center justify-center text-xs font-bold">
                    {(googleUser.displayName || googleUser.email || 'G')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col text-left">
                  <span className="text-xs font-medium text-white line-clamp-1">
                    {googleUser.displayName || (isSwahili ? 'Akaunti ya Google' : 'Google Account')}
                  </span>
                  <span className="text-[10px] text-[#00C46A] flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00C46A] animate-pulse" />
                    {isSwahili ? 'Imeunganishwa na Workspace' : 'Connected to Workspace'}
                  </span>
                </div>
                <button
                  id="btn-google-signout"
                  onClick={handleSignOut}
                  title={isSwahili ? 'Tenganisha Akaunti ya Google' : 'Disconnect Google Account'}
                  className="ml-2 text-xs text-[#8899AA] hover:text-red-400 p-1.5 rounded-md hover:bg-[#1A2E1C] transition-colors"
                >
                  {isSwahili ? 'Tenganisha' : 'Disconnect'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-end gap-1">
                <GoogleSignInButton
                  id="btn-google-signin"
                  onClick={handleSignIn}
                  disabled={isAuthenticating}
                  text={isAuthenticating ? (isSwahili ? 'Inaunganisha...' : 'Connecting...') : (isSwahili ? 'Ingia na Google' : 'Sign in with Google')}
                />
              </div>
            )}
          </div>
        </div>

        {authError && (
          <div className="mt-4 p-3 bg-red-950/40 border border-red-800/60 rounded-lg flex items-start gap-2 text-xs text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}
      </div>

      {/* If not authenticated with Google, show onboarding info card */}
      {!hasToken && (
        <div className="bg-[#122010] border border-[#243447] rounded-xl p-8 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#006B3C]/20 border border-[#00C46A]/30 flex items-center justify-center text-[#00C46A]">
            <FileText className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-base font-bold text-white">
              {isSwahili ? 'Unganisha Google Forms na Zamzam Field' : 'Connect Google Forms to Zamzam Field'}
            </h2>
            <p className="text-xs text-[#8899AA] leading-relaxed">
              {isSwahili
                ? 'Ingia na akaunti yako ya Google Workspace kuunda tafiti za kuridhika kwa wateja, kukagua fomu za matengenezo, na kusawazisha majibu moja kwa moja kwenye dashibodi.'
                : 'Sign in with your Google Workspace account to create customer water taste surveys, inspect field equipment maintenance forms, and synchronize responses directly inside the dashboard.'}
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <GoogleSignInButton
              id="btn-google-signin-hero"
              onClick={handleSignIn}
              disabled={isAuthenticating}
              text={isSwahili ? 'Idhinisha Google Forms & Drive' : 'Authorize Google Forms & Drive'}
            />
          </div>

          <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto text-left">
            <div className="p-3 bg-[#0A1A0F] border border-[#243447] rounded-lg space-y-1">
              <span className="text-xs font-semibold text-[#00C46A] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isSwahili ? 'Uundaji wa Fomu' : 'Forms Creation'}
              </span>
              <p className="text-[11px] text-[#8899AA]">
                {isSwahili
                  ? 'Uundaji wa haraka wa fomu za maoni ya ubora wa maji na ukaguzi wa vifaa.'
                  : 'Instant 1-click generation of ISO-grade water satisfaction and equipment checklists.'}
              </p>
            </div>
            <div className="p-3 bg-[#0A1A0F] border border-[#243447] rounded-lg space-y-1">
              <span className="text-xs font-semibold text-[#00C46A] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isSwahili ? 'Majibu ya Papo Hapo' : 'Live Submissions'}
              </span>
              <p className="text-[11px] text-[#8899AA]">
                {isSwahili
                  ? 'Fuatilia ukadiriaji wa wateja, maombi ya kusafisha, na matukio bila kuchelewa.'
                  : 'Monitor customer ratings, sanitization requests, and incident logs with zero delay.'}
              </p>
            </div>
            <div className="p-3 bg-[#0A1A0F] border border-[#243447] rounded-lg space-y-1">
              <span className="text-xs font-semibold text-[#00C46A] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isSwahili ? 'Usawazishaji na Upakuaji' : 'Drive Sync & Export'}
              </span>
              <p className="text-[11px] text-[#8899AA]">
                {isSwahili
                  ? 'Tafuta fomu zote za Drive na pakua lahajedwali za majibu kama ripoti za CSV.'
                  : 'Search all Drive forms and download response spreadsheets as CSV reports.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Authenticated Layout */}
      {hasToken && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Drive Forms Navigator (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Action Bar: Create & Refresh */}
            <div className="bg-[#122010] border border-[#243447] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8899AA]">
                  {isSwahili ? `Fomu za Google Drive (${driveForms.length})` : `Google Drive Forms (${driveForms.length})`}
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    id="btn-refresh-drive-forms"
                    onClick={loadDriveForms}
                    disabled={isLoadingForms}
                    title={isSwahili ? 'Sasisha Fomu kutoka Drive' : 'Refresh Forms from Drive'}
                    className="p-1.5 text-[#8899AA] hover:text-white hover:bg-[#1A2E1C] rounded-lg transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingForms ? 'animate-spin text-[#00C46A]' : ''}`} />
                  </button>
                  <button
                    id="btn-create-form-tab"
                    onClick={() => setActiveTab('create')}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[#006B3C] hover:bg-[#008F50] text-white flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{isSwahili ? 'Fomu Mpya' : 'New Form'}</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8899AA]" />
                <input
                  id="input-search-forms"
                  type="text"
                  placeholder={isSwahili ? 'Chuja fomu...' : 'Filter forms...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0A1A0F] border border-[#243447] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#8899AA] focus:outline-hidden focus:border-[#00C46A]"
                />
              </div>

              {/* Form ID Direct Lookup */}
              <form onSubmit={handleManualLookup} className="flex gap-1.5 pt-1">
                <input
                  id="input-manual-form-id"
                  type="text"
                  placeholder={isSwahili ? 'Weka Kitambulisho au Kiungo...' : 'Paste Form ID or URL...'}
                  value={manualFormInput}
                  onChange={(e) => setManualFormInput(e.target.value)}
                  className="flex-1 bg-[#0A1A0F] border border-[#243447] rounded-lg px-2.5 py-1 text-xs text-white placeholder-[#8899AA] focus:outline-hidden focus:border-[#00C46A]"
                />
                <button
                  type="submit"
                  disabled={!manualFormInput.trim()}
                  className="px-2.5 py-1 bg-[#1A2E1C] hover:bg-[#243447] disabled:opacity-40 text-xs text-white rounded-lg transition-colors"
                >
                  {isSwahili ? 'Fungua' : 'Load'}
                </button>
              </form>
            </div>

            {/* Forms List Container */}
            <div className="bg-[#122010] border border-[#243447] rounded-xl overflow-hidden shadow-sm">
              <div className="p-3 border-b border-[#243447] flex items-center justify-between">
                <span className="text-xs font-medium text-white">{isSwahili ? 'Fomu Kwenye Drive' : 'Forms in Drive'}</span>
                <span className="text-[10px] text-[#8899AA]">{isSwahili ? 'Inasawazishwa kiotomatiki' : 'Auto-synced'}</span>
              </div>

              {isLoadingForms && driveForms.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-[#00C46A] border-t-transparent rounded-full animate-spin mx-auto" />
                  <span className="text-xs text-[#8899AA]">{isSwahili ? 'Inatafuta mafaili kwenye Google Drive...' : 'Searching Google Drive files...'}</span>
                </div>
              ) : formsError ? (
                <div className="p-4 text-xs text-red-300 space-y-1">
                  <p className="font-semibold text-red-400">{isSwahili ? 'Hitilafu ya kupakia fomu:' : 'Failed to load forms:'}</p>
                  <p className="text-[11px] text-red-200">{formsError}</p>
                </div>
              ) : filteredForms.length === 0 ? (
                <div className="p-6 text-center space-y-3">
                  <FileText className="w-8 h-8 text-[#8899AA]/50 mx-auto" />
                  <p className="text-xs text-[#8899AA]">
                    {isSwahili ? 'Hakuna Fomu za Google zilizopatikana kwenye folda hii ya Drive.' : 'No Google Forms found in this Drive folder.'}
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-3 py-1.5 bg-[#006B3C] text-white text-xs font-medium rounded-lg hover:bg-[#008F50] transition-colors"
                  >
                    {isSwahili ? 'Tengeneza Fomu ya Kwanza' : 'Deploy First Form'}
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#243447]/60 max-h-[460px] overflow-y-auto">
                  {filteredForms.map((file) => {
                    const isSelected = selectedFormId === file.id;
                    const dateFormatted = new Date(file.modifiedTime).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });

                    return (
                      <div
                        key={file.id}
                        onClick={() => {
                          handleSelectForm(file.id);
                          if (activeTab === 'create') setActiveTab('overview');
                        }}
                        className={`p-3 cursor-pointer transition-all flex items-start justify-between gap-2 group ${
                          isSelected
                            ? 'bg-[#1A2E1C] border-l-3 border-[#00C46A]'
                            : 'hover:bg-[#162719]'
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <h4
                            className={`text-xs font-medium truncate ${
                              isSelected ? 'text-[#00C46A] font-semibold' : 'text-white'
                            }`}
                          >
                            {file.name}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-[#8899AA]">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {dateFormatted}
                            </span>
                          </div>
                        </div>

                        {/* File Action Icons */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              title={isSwahili ? 'Fungua katika Mhariri wa Google Forms' : 'Open in Google Forms Editor'}
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 rounded-md text-[#8899AA] hover:text-[#00C46A] hover:bg-[#0A1A0F] transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            title={isSwahili ? 'Futa Fomu kutoka Drive' : 'Delete Form from Drive'}
                            onClick={(e) => {
                              e.stopPropagation();
                              requestDeleteForm(file);
                            }}
                            className="p-1 rounded-md text-[#8899AA] hover:text-red-400 hover:bg-[#0A1A0F] transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Helper / Integration Guide */}
            <div className="bg-[#122010]/80 border border-[#243447] rounded-xl p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-[#00C46A] font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>{isSwahili ? 'Kidokezo cha Msafirishaji' : 'Field Dispatcher Tip'}</span>
              </div>
              <p className="text-[11px] text-[#8899AA] leading-relaxed">
                {isSwahili
                  ? 'Madereva wanaweza kusambaza kiungo cha utafiti kwa wateja wakati wa kukabidhi maji. Majibu yanasawazishwa mara moja kwenye dashibodi hii.'
                  : 'Courier drivers can share the live survey link with customers right at delivery checkout. Responses synchronize immediately into this analytics panel.'}
              </p>
            </div>
          </div>

          {/* Right Column: Form Inspector & Response Analytics (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Tab Navigation */}
            <div className="bg-[#122010] border border-[#243447] rounded-xl p-2 flex items-center justify-between overflow-x-auto">
              <div className="flex space-x-1">
                <button
                  id="tab-form-overview"
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'overview'
                      ? 'bg-[#006B3C] text-white shadow-xs'
                      : 'text-[#8899AA] hover:text-white hover:bg-[#1A2E1C]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isSwahili ? 'Muhtasari na KPI' : 'Overview & KPI'}</span>
                </button>
                <button
                  id="tab-form-questions"
                  onClick={() => setActiveTab('questions')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'questions'
                      ? 'bg-[#006B3C] text-white shadow-xs'
                      : 'text-[#8899AA] hover:text-white hover:bg-[#1A2E1C]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>{isSwahili ? `Maswali (${activeFormSchema?.items?.length || 0})` : `Questions (${activeFormSchema?.items?.length || 0})`}</span>
                </button>
                <button
                  id="tab-form-responses"
                  onClick={() => setActiveTab('responses')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'responses'
                      ? 'bg-[#006B3C] text-white shadow-xs'
                      : 'text-[#8899AA] hover:text-white hover:bg-[#1A2E1C]'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>{isSwahili ? `Majibu (${activeFormResponses?.responses?.length || 0})` : `Responses (${activeFormResponses?.responses?.length || 0})`}</span>
                </button>
                <button
                  id="tab-form-create"
                  onClick={() => setActiveTab('create')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'create'
                      ? 'bg-[#00C46A] text-[#0A1A0F] font-semibold shadow-xs'
                      : 'text-[#00C46A] hover:bg-[#1A2E1C]'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{isSwahili ? 'Unda Fomu Mpya' : 'Create New Form'}</span>
                </button>
              </div>

              {activeFormSchema && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSelectForm(activeFormSchema.formId)}
                    disabled={isLoadingDetails}
                    title="Reload Form & Responses"
                    className="p-1.5 text-[#8899AA] hover:text-white hover:bg-[#1A2E1C] rounded-lg transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDetails ? 'animate-spin text-[#00C46A]' : ''}`} />
                  </button>
                </div>
              )}
            </div>

            {/* TAB: CREATE NEW FORM TEMPLATE */}
            {activeTab === 'create' && (
              <div className="space-y-4">
                <div className="bg-[#122010] border border-[#243447] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-white">
                        {isSwahili ? 'Sambaza Fomu ya Uendeshaji ya Zamzam' : 'Deploy Zamzam Operations Form'}
                      </h2>
                      <p className="text-xs text-[#8899AA]">
                        {isSwahili
                          ? 'Chagua mfumo uliotayarishwa ili kuanzisha kiotomatiki Fomu ya Google kwenye Hifadhi yako ya Drive na muundo wa maswali.'
                          : 'Select a pre-engineered operations protocol to automatically initialize a Google Form in your Drive with question schemas.'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 pt-2">
                    {PRESET_FORM_TEMPLATES.map((tmpl) => (
                      <div
                        key={tmpl.id}
                        className="p-4 bg-[#0A1A0F] border border-[#243447] hover:border-[#00C46A]/60 rounded-xl space-y-3 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#006B3C]/40 text-[#00C46A] border border-[#00C46A]/30">
                              {tmpl.badge}
                            </span>
                            <h3 className="text-sm font-semibold text-white">{tmpl.title}</h3>
                          </div>
                          <button
                            id={`btn-deploy-${tmpl.id}`}
                            onClick={() => requestCreateForm(tmpl)}
                            disabled={isPerformingAction}
                            className="px-3.5 py-1.5 bg-[#00C46A] hover:bg-[#008F50] text-[#0A1A0F] text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-xs self-start sm:self-auto"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>{isSwahili ? 'Weka kwenye Drive' : 'Deploy to Drive'}</span>
                          </button>
                        </div>

                        <p className="text-xs text-[#8899AA] leading-relaxed">{tmpl.description}</p>

                        {/* Question Previews */}
                        <div className="pt-2 border-t border-[#243447]/60 space-y-1.5">
                          <span className="text-[11px] font-semibold text-[#D0E8F0]">
                            {isSwahili
                              ? `Muundo wa Fomu (Vipengele ${tmpl.questions.length}):`
                              : `Form Structure (${tmpl.questions.length} Items):`}
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[#8899AA]">
                            {tmpl.questions.slice(0, 4).map((q, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 truncate">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#00C46A]" />
                                <span className="truncate">{q.title}</span>
                                <span className="text-[10px] text-[#8899AA]/70">({q.type})</span>
                              </div>
                            ))}
                            {tmpl.questions.length > 4 && (
                              <div className="text-[10px] text-[#00C46A] italic">
                                {isSwahili
                                  ? `+ maswali ${tmpl.questions.length - 4} ya ziada`
                                  : `+ ${tmpl.questions.length - 4} additional field questions`}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {isLoadingDetails ? (
                  <div className="bg-[#122010] border border-[#243447] rounded-xl p-12 text-center space-y-3">
                    <div className="w-8 h-8 border-3 border-[#00C46A] border-t-transparent rounded-full animate-spin mx-auto" />
                    <span className="text-xs text-[#8899AA]">{isSwahili ? 'Inapakia maelezo ya Google Form...' : 'Loading Google Form specifications...'}</span>
                  </div>
                ) : detailsError ? (
                  <div className="bg-[#122010] border border-red-900/60 rounded-xl p-6 text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
                    <h3 className="text-sm font-semibold text-white">{isSwahili ? 'Hitilafu ya Kupakia Fomu' : 'Error Loading Form'}</h3>
                    <p className="text-xs text-red-200">{detailsError}</p>
                    <button
                      onClick={() => selectedFormId && handleSelectForm(selectedFormId)}
                      className="px-3 py-1.5 bg-[#1A2E1C] text-xs font-medium text-white rounded-lg hover:bg-[#243447]"
                    >
                      {isSwahili ? 'Jaribu Tena' : 'Retry Connection'}
                    </button>
                  </div>
                ) : !activeFormSchema ? (
                  <div className="bg-[#122010] border border-[#243447] rounded-xl p-12 text-center space-y-4">
                    <FileText className="w-12 h-12 text-[#8899AA]/40 mx-auto" />
                    <div className="max-w-sm mx-auto space-y-1">
                      <h3 className="text-sm font-semibold text-white">{isSwahili ? 'Hakuna Fomu Iliyochaguliwa' : 'No Form Selected'}</h3>
                      <p className="text-xs text-[#8899AA]">
                        {isSwahili
                          ? 'Chagua fomu kwenye orodha ya kushoto au tengeneza mpya kuona takwimu zake za moja kwa moja.'
                          : 'Select a form from the left panel or deploy a new operations template to view its live metrics.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Active Form Header Card */}
                    <div className="bg-[#122010] border border-[#243447] rounded-xl p-5 space-y-4">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-white">
                              {activeFormSchema.info.title || (isSwahili ? 'Fomu Isiyo na Kichwa' : 'Untitled Form')}
                            </h2>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-[#1A2E1C] text-[#8899AA] border border-[#243447]">
                              ID: {activeFormSchema.formId.slice(0, 12)}...
                            </span>
                          </div>
                          {activeFormSchema.info.description && (
                            <p className="text-xs text-[#8899AA] mt-1 max-w-2xl leading-relaxed">
                              {activeFormSchema.info.description}
                            </p>
                          )}
                        </div>

                        {/* External Form Links */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            id="btn-open-google-editor"
                            href={`https://docs.google.com/forms/d/${activeFormSchema.formId}/edit`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-[#1A2E1C] hover:bg-[#243447] border border-[#3A5068] text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-[#00C46A]" />
                            <span>{isSwahili ? 'Hariri katika Google Forms' : 'Edit in Google Forms'}</span>
                          </a>

                          {activeFormSchema.responderUri && (
                            <a
                              id="btn-open-responder-uri"
                              href={activeFormSchema.responderUri}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 bg-[#006B3C] hover:bg-[#008F50] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>{isSwahili ? 'Kiungo cha Fomu' : 'Live Form Link'}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Share & Copy Link Strip */}
                      {activeFormSchema.responderUri && (
                        <div className="p-3 bg-[#0A1A0F] border border-[#243447] rounded-lg flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 truncate text-xs text-[#8899AA]">
                            <Share2 className="w-3.5 h-3.5 text-[#00C46A] shrink-0" />
                            <span className="font-mono truncate">{activeFormSchema.responderUri}</span>
                          </div>
                          <button
                            id="btn-copy-form-url"
                            onClick={() =>
                              handleCopyLink(
                                activeFormSchema.responderUri!,
                                isSwahili ? 'Kiungo Kimenakiliwa!' : 'Public Form Link Copied!'
                              )
                            }
                            className="px-2.5 py-1 text-xs bg-[#1A2E1C] hover:bg-[#243447] text-white rounded-md flex items-center gap-1 shrink-0 transition-colors"
                          >
                            {copyNotification ? (
                              <>
                                <Check className="w-3 h-3 text-[#00C46A]" />
                                <span className="text-[#00C46A]">{copyNotification}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>{isSwahili ? 'Nakili Kiungo' : 'Copy Link'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* KPI Quick Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-[#122010] border border-[#243447] rounded-xl p-4 space-y-1">
                        <span className="text-[11px] text-[#8899AA] uppercase tracking-wider font-semibold">
                          {isSwahili ? 'Jumla ya Majibu' : 'Total Submissions'}
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-white">
                            {activeFormResponses?.responses?.length || 0}
                          </span>
                          <span className="text-[11px] text-[#00C46A]">{isSwahili ? 'Imethibitishwa' : 'Sync Verified'}</span>
                        </div>
                      </div>

                      <div className="bg-[#122010] border border-[#243447] rounded-xl p-4 space-y-1">
                        <span className="text-[11px] text-[#8899AA] uppercase tracking-wider font-semibold">
                          {isSwahili ? 'Vipengele vya Maswali' : 'Form Question Items'}
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-white">
                            {activeFormSchema.items?.length || 0}
                          </span>
                          <span className="text-[11px] text-[#8899AA]">{isSwahili ? 'Sehemu zinazotumika' : 'Active fields'}</span>
                        </div>
                      </div>

                      <div className="bg-[#122010] border border-[#243447] rounded-xl p-4 space-y-1">
                        <span className="text-[11px] text-[#8899AA] uppercase tracking-wider font-semibold">
                          {isSwahili ? 'Jibu la Mwisho' : 'Last Response'}
                        </span>
                        <div className="text-sm font-semibold text-white truncate pt-1">
                          {activeFormResponses?.responses?.[0]
                            ? new Date(
                                activeFormResponses.responses[0].lastSubmittedTime ||
                                  activeFormResponses.responses[0].createTime
                              ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
                            : (isSwahili ? 'Bado hakuna majibu' : 'No submissions yet')}
                        </div>
                      </div>
                    </div>

                    {/* Question Breakdown Highlights */}
                    <div className="bg-[#122010] border border-[#243447] rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-white">{isSwahili ? 'Uchambuzi wa Maoni' : 'Live Feedback Breakdown'}</h3>
                          <p className="text-xs text-[#8899AA]">
                            {isSwahili
                              ? 'Ukadiriaji na chaguo zilizokusanywa kutoka kwa wateja.'
                              : 'Aggregated ratings and options collected from respondents.'}
                          </p>
                        </div>
                        {activeFormResponses?.responses && activeFormResponses.responses.length > 0 && (
                          <button
                            id="btn-export-responses"
                            onClick={handleExportResponsesCsv}
                            className="px-3 py-1.5 bg-[#006B3C] hover:bg-[#008F50] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{isSwahili ? 'Pakua CSV' : 'Export CSV'}</span>
                          </button>
                        )}
                      </div>

                      {questionSummaries.length === 0 ? (
                        <p className="text-xs text-[#8899AA] italic">
                          {isSwahili ? 'Hakuna maswali yaliyopatikana katika fomu hii.' : 'No question items found in this form.'}
                        </p>
                      ) : (
                        <div className="space-y-4 pt-1">
                          {questionSummaries.map((summary) => (
                            <div
                              key={summary.id}
                              className="p-3.5 bg-[#0A1A0F] border border-[#243447] rounded-lg space-y-2"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h4 className="text-xs font-semibold text-white">{summary.title}</h4>
                                  <span className="text-[10px] text-[#8899AA]">
                                    {summary.responseCount} {isSwahili ? 'majibu yamerekodiwa' : 'answers recorded'}
                                    {summary.average && ` • ${isSwahili ? 'Kiwango cha Wastani' : 'Average Rating'}: ${summary.average} / 5.0`}
                                  </span>
                                </div>
                                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-sm bg-[#1A2E1C] text-[#00C46A]">
                                  {summary.type}
                                </span>
                              </div>

                              {/* Frequencies Bar Display */}
                              {Object.keys(summary.frequencies).length > 0 ? (
                                <div className="space-y-1.5 pt-1">
                                  {Object.entries(summary.frequencies).map(([opt, count]) => {
                                    const percent = Math.round((count / (summary.responseCount || 1)) * 100);
                                    return (
                                      <div key={opt} className="space-y-1">
                                        <div className="flex justify-between text-[11px]">
                                          <span className="text-[#D0E8F0] truncate max-w-[80%]">{opt}</span>
                                          <span className="text-[#8899AA] font-mono">
                                            {count} ({percent}%)
                                          </span>
                                        </div>
                                        <div className="w-full h-1.5 bg-[#122010] rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-[#00C46A] rounded-full transition-all duration-500"
                                            style={{ width: `${percent}%` }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-[11px] text-[#8899AA] italic">
                                  {isSwahili ? 'Inasubiri jibu la kwanza kutoka kwa msafirishaji au mteja.' : 'Awaiting first response from courier or client.'}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB: QUESTIONS LIST */}
            {activeTab === 'questions' && (
              <div className="bg-[#122010] border border-[#243447] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {isSwahili ? 'Muundo wa Fomu na Maswali' : 'Form Schema & Questions'}
                    </h3>
                    <p className="text-xs text-[#8899AA]">
                      {isSwahili
                        ? 'Ufafanuzi wa kina wa maswali yote, sheria za uthibitishaji, na miundo ya chaguzi.'
                        : 'Detailed breakdown of all input items, validation rules, and choice structures.'}
                    </p>
                  </div>
                  {activeFormSchema && (
                    <a
                      href={`https://docs.google.com/forms/d/${activeFormSchema.formId}/edit`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-[#1A2E1C] hover:bg-[#243447] text-xs text-white rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#00C46A]" />
                      <span>{isSwahili ? 'Hariri Muundo' : 'Edit Schema'}</span>
                    </a>
                  )}
                </div>

                {!activeFormSchema?.items || activeFormSchema.items.length === 0 ? (
                  <p className="text-xs text-[#8899AA] italic">
                    {isSwahili ? 'Hakuna maswali yaliyosanidiwa kwenye fomu hii.' : 'No question items configured in this form.'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activeFormSchema.items.map((item, idx) => {
                      const q = item.questionItem?.question;
                      return (
                        <div
                          key={item.itemId || idx}
                          className="p-4 bg-[#0A1A0F] border border-[#243447] rounded-xl space-y-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-[#1A2E1C] text-[#00C46A] flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <div>
                                <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                                  {item.title}
                                  {q?.required && (
                                    <span className="text-[10px] text-red-400 font-medium">
                                      {isSwahili ? '*Inahitajika' : '*Required'}
                                    </span>
                                  )}
                                </h4>
                                {item.description && (
                                  <p className="text-[11px] text-[#8899AA] mt-0.5">{item.description}</p>
                                )}
                              </div>
                            </div>

                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-[#122010] text-[#8899AA] border border-[#243447]">
                              {q?.choiceQuestion
                                ? q.choiceQuestion.type
                                : q?.scaleQuestion
                                ? 'SCALE'
                                : q?.textQuestion?.paragraph
                                ? 'PARAGRAPH'
                                : 'SHORT TEXT'}
                            </span>
                          </div>

                          {/* Options if choice */}
                          {q?.choiceQuestion?.options && (
                            <div className="pl-7 pt-1 space-y-1">
                              {q.choiceQuestion.options.map((opt, oIdx) => (
                                <div key={oIdx} className="flex items-center gap-2 text-xs text-[#D0E8F0]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#00C46A]" />
                                  <span>{opt.value}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Scale details */}
                          {q?.scaleQuestion && (
                            <div className="pl-7 pt-1 text-xs text-[#8899AA] flex items-center gap-3">
                              <span>Low: {q.scaleQuestion.low} ({q.scaleQuestion.lowLabel || 'Min'})</span>
                              <span>•</span>
                              <span>High: {q.scaleQuestion.high} ({q.scaleQuestion.highLabel || 'Max'})</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB: RESPONSES TABLE */}
            {activeTab === 'responses' && (
              <div className="bg-[#122010] border border-[#243447] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {isSwahili ? 'Kumbukumbu ya Majibu' : 'Individual Submissions Log'}
                    </h3>
                    <p className="text-xs text-[#8899AA]">
                      {isSwahili
                        ? 'Kumbukumbu iliyosawazishwa ya majibu ya wateja na mafundi.'
                        : 'Synchronized record of customer and technician responses.'}
                    </p>
                  </div>
                  {activeFormResponses?.responses && activeFormResponses.responses.length > 0 && (
                    <button
                      onClick={handleExportResponsesCsv}
                      className="px-3 py-1.5 bg-[#006B3C] hover:bg-[#008F50] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isSwahili ? 'Pakua CSV' : 'Download CSV'}</span>
                    </button>
                  )}
                </div>

                {!activeFormResponses?.responses || activeFormResponses.responses.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Users className="w-8 h-8 text-[#8899AA]/40 mx-auto" />
                    <p className="text-xs text-[#8899AA]">
                      {isSwahili ? 'Bado hakuna majibu yaliyotumwa kwa fomu hii.' : 'No responses submitted for this form yet.'}
                    </p>
                    {activeFormSchema?.responderUri && (
                      <a
                        href={activeFormSchema.responderUri}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#00C46A] hover:underline"
                      >
                        <span>{isSwahili ? 'Tuma jibu la majaribio' : 'Submit a test response'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-[#243447]/60 max-h-[500px] overflow-y-auto">
                    {activeFormResponses.responses.map((resp, rIdx) => {
                      const submittedAt = new Date(
                        resp.lastSubmittedTime || resp.createTime
                      ).toLocaleString();

                      return (
                        <div key={resp.responseId || rIdx} className="p-4 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-white flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#00C46A]" />
                              {isSwahili ? 'Mhojiwa' : 'Respondent'}: {resp.respondentEmail || (isSwahili ? 'Bila Kujulikana' : 'Anonymous')}
                            </span>
                            <span className="text-[#8899AA] font-mono text-[11px]">{submittedAt}</span>
                          </div>

                          {/* Answers detail */}
                          <div className="bg-[#0A1A0F] border border-[#243447] rounded-lg p-3 space-y-1.5 text-xs">
                            {activeFormSchema?.items?.map((item) => {
                              const qId = item.questionItem?.question.questionId;
                              if (!qId || !resp.answers?.[qId]) return null;
                              const answerValues =
                                resp.answers[qId].textAnswers?.answers?.map((a) => a.value).join(', ') || '';

                              return (
                                <div key={qId} className="flex flex-col sm:flex-row sm:justify-between gap-1">
                                  <span className="text-[#8899AA] text-[11px]">{item.title}:</span>
                                  <span className="text-white font-medium text-right">{answerValues}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Mutating/Destructive Operations */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        isLoading={isPerformingAction}
        onConfirm={confirmModal.action}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
