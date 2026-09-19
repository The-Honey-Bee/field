import { getWorkspaceAccessToken } from './workspaceAuth';

export interface GoogleDriveFormFile {
  id: string;
  name: string;
  description?: string;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  iconLink?: string;
}

export interface GoogleFormQuestionOption {
  value: string;
}

export interface GoogleFormQuestion {
  questionId: string;
  required?: boolean;
  textQuestion?: {
    paragraph?: boolean;
  };
  choiceQuestion?: {
    type: 'RADIO' | 'CHECKBOX' | 'DROP_DOWN';
    options: GoogleFormQuestionOption[];
    shuffle?: boolean;
  };
  scaleQuestion?: {
    low: number;
    high: number;
    lowLabel?: string;
    highLabel?: string;
  };
  dateQuestion?: {
    includeYear?: boolean;
    includeTime?: boolean;
  };
  timeQuestion?: {
    duration?: boolean;
  };
}

export interface GoogleFormItem {
  itemId: string;
  title: string;
  description?: string;
  questionItem?: {
    question: GoogleFormQuestion;
  };
  pageBreakItem?: Record<string, unknown>;
  textItem?: Record<string, unknown>;
}

export interface GoogleFormSchema {
  formId: string;
  info: {
    title: string;
    documentTitle?: string;
    description?: string;
  };
  settings?: {
    quizSettings?: {
      isQuiz?: boolean;
    };
  };
  items?: GoogleFormItem[];
  revisionId?: string;
  responderUri?: string;
}

export interface GoogleFormAnswer {
  questionId: string;
  textAnswers?: {
    answers: Array<{
      value: string;
    }>;
  };
}

export interface GoogleFormResponseItem {
  responseId: string;
  createTime: string;
  lastSubmittedTime: string;
  respondentEmail?: string;
  answers?: Record<string, GoogleFormAnswer>;
}

export interface GoogleFormResponsesData {
  responses?: GoogleFormResponseItem[];
  nextPageToken?: string;
}

export interface FormTemplateDefinition {
  id: string;
  title: string;
  documentTitle: string;
  description: string;
  category: 'feedback' | 'maintenance' | 'incident' | 'order';
  badge: string;
  questions: Array<{
    title: string;
    description?: string;
    required: boolean;
    type: 'text' | 'paragraph' | 'radio' | 'checkbox' | 'scale';
    options?: string[];
    scale?: { low: number; high: number; lowLabel: string; highLabel: string };
  }>;
}

export const PRESET_FORM_TEMPLATES: FormTemplateDefinition[] = [
  {
    id: 'customer_water_satisfaction',
    title: 'Zamzam Customer Water Satisfaction & Dispenser Feedback',
    documentTitle: 'Zamzam Customer Satisfaction Survey',
    description:
      'Official field feedback survey to assess water purity satisfaction, dispenser maintenance needs, and delivery driver punctuality.',
    category: 'feedback',
    badge: 'Customer Quality',
    questions: [
      {
        title: 'Customer or Business Name',
        description: 'Name of the account holder or facility manager receiving the delivery.',
        required: true,
        type: 'text',
      },
      {
        title: 'Water Taste & Purity Rating',
        description: 'How would you rate the freshness and taste of your Zamzam water delivery?',
        required: true,
        type: 'scale',
        scale: {
          low: 1,
          high: 5,
          lowLabel: 'Poor (1)',
          highLabel: 'Exceptional (5)',
        },
      },
      {
        title: 'Delivery Driver Punctuality & Professionalism',
        description: 'Rate the timeliness and helpfulness of the Zamzam courier.',
        required: true,
        type: 'scale',
        scale: {
          low: 1,
          high: 5,
          lowLabel: 'Delayed / Issues (1)',
          highLabel: 'On Time & Courteous (5)',
        },
      },
      {
        title: 'Bottle Seal & Condition Inspection',
        description: 'Condition of the safety tamper seal and 20L bottles upon handover.',
        required: true,
        type: 'radio',
        options: [
          'Pristine - Clean bottles & intact security seal',
          'Acceptable - Intact seal with minor outer dust',
          'Damaged Seal - Replaced on site by driver',
        ],
      },
      {
        title: 'Water Dispenser Cleaning / Sanitization Needed?',
        description: 'Would you like to schedule a free bi-monthly dispenser sanitization visit?',
        required: true,
        type: 'radio',
        options: [
          'No, dispenser is in great condition',
          'Yes, please schedule sanitization technician visit',
          'We use manual hand pump (N/A)',
        ],
      },
      {
        title: 'Additional Feedback & Special Requests',
        description: 'Share any notes on schedule preferences or extra volume requirements.',
        required: false,
        type: 'paragraph',
      },
    ],
  },
  {
    id: 'dispenser_maintenance_checklist',
    title: 'Zamzam Field Dispenser Maintenance & Safety Audit',
    documentTitle: 'Zamzam Dispenser Maintenance Audit',
    description:
      'Field inspection protocol to ensure cold/hot water dispensers adhere to food-grade hygienic standards and electrical safety.',
    category: 'maintenance',
    badge: 'Field Operations',
    questions: [
      {
        title: 'Client Facility & Location Address',
        description: 'Full name of the company or residential compound.',
        required: true,
        type: 'text',
      },
      {
        title: 'Dispenser Serial Number / Asset QR Code',
        description: 'Locate barcode on back or side panel (e.g., ZM-DSP-8842).',
        required: true,
        type: 'text',
      },
      {
        title: 'Dispenser Model Classification',
        required: true,
        type: 'radio',
        options: [
          'Dual Temperature Free-Standing (Hot & Cold)',
          'Countertop Executive Unit',
          'Bottom-Loading Silent Pump Unit',
          'Heavy-Duty Workshop Manual Pump',
        ],
      },
      {
        title: 'Hot Water Child Safety Lock Status',
        required: true,
        type: 'radio',
        options: [
          'Verified Operable & Secure',
          'Lock Mechanism Stiff / Repaired',
          'Defective - Unit Marked for Workshop Replacement',
          'Cold-Only Model (No Heater)',
        ],
      },
      {
        title: 'Food-Grade Hydrogen Peroxide Flush & Wipe Performed?',
        description: 'Internal reservoir sanitized according to ISO 22000 water safety protocol.',
        required: true,
        type: 'radio',
        options: [
          'Yes - 15 minute chemical contact flush completed',
          'Routine external wipe-down only',
          'Postponed - Client requested alternate time',
        ],
      },
      {
        title: 'Leak & Drip Tray Verification',
        required: true,
        type: 'checkbox',
        options: [
          'No internal condensation leaks',
          'Drip tray cleaned and disinfected',
          'Rubber gasket intact without micro-tears',
          'Power cord grounded with intact insulation',
        ],
      },
      {
        title: 'Service Technician Signature & Field Notes',
        required: false,
        type: 'paragraph',
      },
    ],
  },
  {
    id: 'bottle_damage_incident_report',
    title: 'Zamzam Damaged Bottle & Delivery Incident Report',
    documentTitle: 'Zamzam Delivery Incident Report',
    description:
      'Rapid field logging for cracked bottles, transport leakage, vehicle delays, or client unavailability.',
    category: 'incident',
    badge: 'Incident Log',
    questions: [
      {
        title: 'Assigned Driver Employee ID & Name',
        required: true,
        type: 'text',
      },
      {
        title: 'Delivery Zone / Route Sector',
        required: true,
        type: 'radio',
        options: [
          'Sector A - Commercial Business District',
          'Sector B - Residential North Estates',
          'Sector C - Harbor & Hospitality Corridor',
          'Sector D - Industrial Free Zone',
        ],
      },
      {
        title: 'Primary Incident Classification',
        required: true,
        type: 'radio',
        options: [
          'Bottle Neck Crack / Transport Leakage',
          'Puncture or Severe Scuff on 20L Carboy',
          'Broken Valve or Cap Dispenser Mechanism',
          'Customer Gate Closed / Unreachable',
          'Traffic Collision or Vehicle Breakdown',
        ],
      },
      {
        title: 'Quantity of Affected Bottles (if applicable)',
        required: true,
        type: 'text',
      },
      {
        title: 'Field Resolution Action Taken',
        required: true,
        type: 'radio',
        options: [
          'Replaced immediately from truck buffer reserve',
          'Partial delivery made, balance re-dispatched',
          'Order postponed to afternoon run',
          'Credit memo registered in POS',
        ],
      },
      {
        title: 'Detailed Notes & Cause Analysis',
        required: true,
        type: 'paragraph',
      },
    ],
  },
];

// Google Drive API: Search for Forms
export const fetchGoogleFormsFromDrive = async (): Promise<GoogleDriveFormFile[]> => {
  const token = getWorkspaceAccessToken();
  if (!token) {
    throw new Error('Authentication required: Please sign in with Google to access Google Forms.');
  }

  const query = encodeURIComponent("mimeType='application/vnd.google-apps.form' and trashed=false");
  const fields = encodeURIComponent('files(id,name,description,createdTime,modifiedTime,webViewLink,iconLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=40&orderBy=modifiedTime desc`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.files || [];
};

// Google Forms API: Get Form Details
export const fetchGoogleFormById = async (formId: string): Promise<GoogleFormSchema> => {
  const token = getWorkspaceAccessToken();
  if (!token) {
    throw new Error('Authentication required: Please sign in with Google.');
  }

  const cleanId = formId.trim().replace(/^https:\/\/.*forms\/d\/(?:e\/)?([a-zA-Z0-9_-]+).*/, '$1');
  const url = `https://forms.googleapis.com/v1/forms/${cleanId}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Forms API error (${res.status}): ${errText}`);
  }

  return res.json();
};

// Google Forms API: Get Form Submissions / Responses
export const fetchGoogleFormResponses = async (
  formId: string
): Promise<GoogleFormResponsesData> => {
  const token = getWorkspaceAccessToken();
  if (!token) {
    throw new Error('Authentication required: Please sign in with Google.');
  }

  const cleanId = formId.trim().replace(/^https:\/\/.*forms\/d\/(?:e\/)?([a-zA-Z0-9_-]+).*/, '$1');
  const url = `https://forms.googleapis.com/v1/forms/${cleanId}/responses?pageSize=100`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Forms Responses API error (${res.status}): ${errText}`);
  }

  return res.json();
};

// Google Forms API: Create a new Form from template or title
export const createGoogleForm = async (
  template: FormTemplateDefinition
): Promise<GoogleFormSchema> => {
  const token = getWorkspaceAccessToken();
  if (!token) {
    throw new Error('Authentication required: Please sign in with Google.');
  }

  // 1. Create the base form resource
  const createRes = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      info: {
        title: template.title,
        documentTitle: template.documentTitle,
      },
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Form (${createRes.status}): ${errText}`);
  }

  const createdForm: GoogleFormSchema = await createRes.json();
  const formId = createdForm.formId;

  // 2. Batch update requests to set description and append items
  const requests: any[] = [];

  // Description update
  if (template.description) {
    requests.push({
      updateFormInfo: {
        info: {
          description: template.description,
        },
        updateMask: 'description',
      },
    });
  }

  // Question items
  template.questions.forEach((q, index) => {
    let questionItemPayload: any = null;

    if (q.type === 'scale' && q.scale) {
      questionItemPayload = {
        question: {
          required: q.required,
          scaleQuestion: {
            low: q.scale.low,
            high: q.scale.high,
            lowLabel: q.scale.lowLabel,
            highLabel: q.scale.highLabel,
          },
        },
      };
    } else if (q.type === 'radio' && q.options) {
      questionItemPayload = {
        question: {
          required: q.required,
          choiceQuestion: {
            type: 'RADIO',
            options: q.options.map((opt) => ({ value: opt })),
          },
        },
      };
    } else if (q.type === 'checkbox' && q.options) {
      questionItemPayload = {
        question: {
          required: q.required,
          choiceQuestion: {
            type: 'CHECKBOX',
            options: q.options.map((opt) => ({ value: opt })),
          },
        },
      };
    } else if (q.type === 'paragraph') {
      questionItemPayload = {
        question: {
          required: q.required,
          textQuestion: {
            paragraph: true,
          },
        },
      };
    } else {
      // Default text
      questionItemPayload = {
        question: {
          required: q.required,
          textQuestion: {
            paragraph: false,
          },
        },
      };
    }

    requests.push({
      createItem: {
        item: {
          title: q.title,
          description: q.description || undefined,
          questionItem: questionItemPayload,
        },
        location: {
          index: index,
        },
      },
    });
  });

  if (requests.length > 0) {
    const batchRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests,
      }),
    });

    if (!batchRes.ok) {
      console.warn('Batch update notice for form questions:', await batchRes.text());
    }
  }

  // Refetch full created form schema with questions
  return fetchGoogleFormById(formId);
};

// Google Drive API: Delete a form from Drive (destructive operation)
export const deleteGoogleFormFile = async (fileId: string): Promise<void> => {
  const token = getWorkspaceAccessToken();
  if (!token) {
    throw new Error('Authentication required: Please sign in with Google.');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok && res.status !== 204) {
    const errText = await res.text();
    throw new Error(`Google Drive delete error (${res.status}): ${errText}`);
  }
};
