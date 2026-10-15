(() => {
  const authScreen = document.getElementById('auth-screen');
  const appShell = document.getElementById('app-shell');
  const signupForm = document.getElementById('signup-form');
  const loginForm = document.getElementById('login-form');
  const signupTab = document.getElementById('signup-tab');
  const loginTab = document.getElementById('login-tab');
  const authIntro = document.getElementById('auth-intro');
  const signupError = document.getElementById('signup-error');
  const loginError = document.getElementById('login-error');
  const ACCOUNTS_KEY = 'firstAidAssistantAccounts';
  const ACTIVE_ACCOUNT_KEY = 'firstAidAssistantActiveUser';
  const APPOINTMENTS_KEY = 'firstAidAssistantAppointments';
  const DOCUMENTS_KEY = 'firstAidAssistantDocuments';

  function readAccounts() {
    try {
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      if (!raw) return new Map();
      const parsed = JSON.parse(raw);
      return new Map(Object.entries(parsed || {}));
    } catch (error) {
      return new Map();
    }
  }

  function writeAccounts(nextAccounts) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(Object.fromEntries(nextAccounts)));
  }

  function readActiveAccount() {
    try {
      const email = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
      if (!email) return null;
      return readAccounts().get(email) || null;
    } catch (error) {
      return null;
    }
  }

  function writeActiveAccount(account) {
    if (!account) {
      localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
      return;
    }
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, String(account.email));
  }

  function readAppointments() {
    try {
      const raw = localStorage.getItem(APPOINTMENTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeAppointments(nextAppointments) {
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(nextAppointments));
  }

  let accounts = readAccounts();
  let activeAccount = readActiveAccount();

  function setAuthMode(mode) {
    const creating = mode === 'signup';
    signupForm.hidden = !creating;
    loginForm.hidden = creating;
    signupTab.classList.toggle('selected', creating);
    loginTab.classList.toggle('selected', !creating);
    signupTab.setAttribute('aria-selected', String(creating));
    loginTab.setAttribute('aria-selected', String(!creating));
    document.getElementById('auth-title').innerHTML = creating ? 'A little care,<br><em>starting with you.</em>' : 'Welcome<br><em>back.</em>';
    authIntro.textContent = creating ? 'Create your account to get started. Your details help personalize your health profile.' : 'Log in to return to your personal health space.';
    signupError.hidden = true;
    loginError.hidden = true;
  }

  function showGate() {
    appShell.hidden = true;
    authScreen.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function enterApp(account) {
    activeAccount = account;
    writeActiveAccount(account);
    authScreen.hidden = true;
    appShell.hidden = false;
    document.getElementById('page-title').textContent = 'AI health guide';
    document.getElementById('chat-page').hidden = false;
    document.getElementById('appointments-page').hidden = true;
    document.getElementById('availability-page').hidden = true;
    document.getElementById('documents-page').hidden = true;
    document.getElementById('profile-page').hidden = true;
    document.querySelectorAll('.nav-item').forEach((item) => {
      const active = item.dataset.page === 'chat';
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
    document.querySelector('.avatar').textContent = account.name.trim().charAt(0).toUpperCase();
    document.getElementById('personal-greeting').textContent = `Hi ${account.name.split(/\s+/)[0]}, tell me what you’re experiencing. I can share general health information and help you think about a safe next step.`;
    document.getElementById('account-summary').replaceChildren();
    const summary = document.getElementById('account-summary');
    [[account.name, 'Name'], [`${account.age} years`, 'Age'], [account.email, 'Email'], [account.phone, 'Phone']].forEach(([value, label]) => {
      const item = document.createElement('span');
      item.innerHTML = `<strong>${label}:</strong> `;
      item.append(document.createTextNode(value));
      summary.append(item);
    });
    const fieldValues = { height: account.height, weight: account.weight, bp: '', cholesterol: '', sugar: '' };
    Object.entries(fieldValues).forEach(([id, value]) => { document.getElementById(id).value = value; });
    updateBmi();
    try { sessionStorage.removeItem('first-aid-assistant-profile-session'); } catch { /* Browser storage may be disabled. */ }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  signupTab.addEventListener('click', () => setAuthMode('signup'));
  loginTab.addEventListener('click', () => setAuthMode('login'));

  signupForm.addEventListener('submit', (event) => {
    event.preventDefault();
    signupError.hidden = true;
    if (!signupForm.reportValidity()) return;
    const data = new FormData(signupForm);
    const email = String(data.get('email')).trim().toLowerCase();
    const password = String(data.get('password'));
    if (password !== String(data.get('confirmPassword'))) {
      signupError.textContent = 'Those passwords don’t match. Please check and try again.';
      signupError.hidden = false;
      signupForm.elements.confirmPassword.focus();
      return;
    }
    if (accounts.has(email)) {
      signupError.textContent = 'An account for this email already exists. Please log in instead.';
      signupError.hidden = false;
      setAuthMode('login');
      loginForm.elements.email.value = email;
      return;
    }
    const account = {
      name: String(data.get('name')).trim(), age: String(data.get('age')),
      height: String(data.get('height')), weight: String(data.get('weight')),
      email, phone: String(data.get('phone')).trim(), password
    };
    accounts = new Map(accounts);
    accounts.set(email, account);
    writeAccounts(accounts);
    signupForm.reset();
    enterApp(account);
  });

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    loginError.hidden = true;
    if (!loginForm.reportValidity()) return;
    const data = new FormData(loginForm);
    const email = String(data.get('email')).trim().toLowerCase();
    const password = String(data.get('password'));
    const account = accounts.get(email);
    if (!account || account.password !== password) {
      loginError.textContent = 'That email and password don’t match an account on this device. Please try again or create an account.';
      loginError.hidden = false;
      return;
    }
    loginForm.reset();
    enterApp(account);
  });

  function logout() {
    activeAccount = null;
    writeActiveAccount(null);
    document.getElementById('conversation').querySelectorAll('.message:not(:first-child)').forEach((message) => message.remove());
    signupForm.reset();
    loginForm.reset();
    setAuthMode('signup');
    showGate();
  }
  document.getElementById('logout-button').addEventListener('click', logout);
  document.getElementById('mobile-logout')?.addEventListener('click', logout);

  document.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => {
    if (button.dataset.page === 'account') { setAuthMode('signup'); showGate(); return; }
    const showProfile = button.dataset.page === 'profile';
    const showAppointments = button.dataset.page === 'appointments';
    const showAvailability = button.dataset.page === 'availability';
    const showDocuments = button.dataset.page === 'documents';
    document.getElementById('chat-page').hidden = showProfile || showAppointments || showAvailability || showDocuments;
    document.getElementById('appointments-page').hidden = !showAppointments;
    document.getElementById('availability-page').hidden = !showAvailability;
    document.getElementById('documents-page').hidden = !showDocuments;
    document.getElementById('profile-page').hidden = !showProfile;
    document.querySelectorAll('.nav-item').forEach((item) => {
      const active = item.dataset.page === button.dataset.page;
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
    document.getElementById('page-title').textContent = showProfile ? 'My health profile' : showAppointments ? 'Appointments' : showAvailability ? 'Find availability' : showDocuments ? 'Patient documents' : 'AI health guide';
    if (showAppointments) renderAppointments();
    if (showAvailability) renderAvailability();
    if (showDocuments) renderDocuments();
  }));

  function bootstrapAuthState() {
    if (activeAccount) {
      enterApp(activeAccount);
      return;
    }
    showGate();
    setAuthMode('signup');
  }

  const chatForm = document.getElementById('chat-form');
  const prompt = document.getElementById('prompt');
  const conversation = document.getElementById('conversation');
  const charCount = document.getElementById('char-count');
  const appointmentForm = document.getElementById('appointment-form');
  const appointmentList = document.getElementById('appointment-list');
  const appointmentBadge = document.getElementById('booking-badge');
  const bookingResult = document.getElementById('booking-result');
  const appointmentsUpcomingList = document.getElementById('appointments-upcoming-list');
  const appointmentsHistoryList = document.getElementById('appointments-history-list');
  const availabilityList = document.getElementById('availability-list');
  const documentsForm = document.getElementById('documents-form');
  const documentList = document.getElementById('document-list');

  function readDocuments() {
    try {
      const parsed = JSON.parse(localStorage.getItem(DOCUMENTS_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeDocuments(documents) {
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
  }

  function getCurrentAppointments() {
    const email = activeAccount?.email;
    return readAppointments().filter((booking) => !booking.patientEmail || booking.patientEmail === email);
  }

  function isPastAppointment(booking) {
    const today = new Date();
    const appointmentDate = new Date(`${booking.date}T${booking.time || '23:59'}:00`);
    return !Number.isNaN(appointmentDate.getTime()) && appointmentDate < today;
  }

  function formatAppointmentDate(booking) {
    const appointmentDate = new Date(`${booking.date}T00:00:00`);
    if (Number.isNaN(appointmentDate.getTime())) return `${booking.date} · ${booking.time}`;
    return `${appointmentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · ${booking.time}`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[character]));
  }

  function appointmentMarkup(booking) {
    return `
      <li class="appointment-item">
        <div class="appointment-time">${escapeHtml(formatAppointmentDate(booking))}</div>
        <div class="appointment-service">${escapeHtml(booking.service)}</div>
        <div class="appointment-doctor">${escapeHtml(booking.doctor)}</div>
        ${booking.hospital ? `<div class="appointment-hospital">⌖ ${escapeHtml(booking.hospital)}</div>` : ''}
        ${booking.notes ? `<div class="appointment-notes">${escapeHtml(booking.notes)}</div>` : ''}
      </li>
    `;
  }

  function renderAppointmentSection(list, bookings, emptyMessage) {
    if (!list) return;
    list.innerHTML = bookings.length ? bookings.map(appointmentMarkup).join('') : `<li class="appointment-empty">${emptyMessage}</li>`;
  }

  function renderAppointments() {
    const appointments = getCurrentAppointments();
    const upcoming = appointments.filter((booking) => !isPastAppointment(booking));
    const history = appointments.filter(isPastAppointment);
    appointmentBadge.textContent = `${upcoming.length} upcoming`;

    renderAppointmentSection(appointmentList, upcoming, 'No upcoming visits yet.');
    renderAppointmentSection(appointmentsUpcomingList, upcoming, 'No present booked appointments.');
    renderAppointmentSection(appointmentsHistoryList, history, 'No appointment history yet.');
    document.getElementById('appointments-upcoming-count').textContent = upcoming.length;
    document.getElementById('appointments-history-count').textContent = history.length;
    updateReminderStatus(upcoming);
  }

  function getAvailabilitySlots() {
    const service = document.getElementById('availability-service').value;
    const hospital = document.getElementById('availability-hospital').value.trim() || 'City Care Hospital';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return [
      { date: tomorrow.toISOString().slice(0, 10), time: '09:00', doctor: 'Dr. Nisha Rao', service, hospital },
      { date: tomorrow.toISOString().slice(0, 10), time: '14:00', doctor: 'Dr. Daniel Lee', service, hospital },
      { date: new Date(tomorrow.getTime() + 86400000).toISOString().slice(0, 10), time: '10:30', doctor: 'Dr. Priya Shah', service, hospital }
    ];
  }

  function renderAvailability() {
    availabilityList.innerHTML = getAvailabilitySlots().map((slot) => `
      <article class="availability-slot">
        <div><strong>${escapeHtml(formatAppointmentDate(slot))}</strong><span>${escapeHtml(slot.doctor)} · ${escapeHtml(slot.hospital)}</span></div>
        <button class="clear-button select-slot" type="button" data-date="${slot.date}" data-time="${slot.time}" data-service="${escapeHtml(slot.service)}" data-doctor="${escapeHtml(slot.doctor)}" data-hospital="${escapeHtml(slot.hospital)}">Select slot</button>
      </article>
    `).join('');
    availabilityList.querySelectorAll('.select-slot').forEach((button) => button.addEventListener('click', () => {
      document.querySelector('#appointment-form [name="service"]').value = button.dataset.service;
      document.querySelector('#appointment-form [name="doctor"]').value = button.dataset.doctor;
      document.querySelector('#appointment-form [name="date"]').value = button.dataset.date;
      document.querySelector('#appointment-form [name="time"]').value = button.dataset.time;
      document.querySelector('#appointment-form [name="hospital"]').value = button.dataset.hospital;
      document.querySelector('[data-page="chat"]').click();
      document.getElementById('booking-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  }

  function renderDocuments() {
    const documents = readDocuments().filter((document) => document.patientEmail === activeAccount?.email);
    documentList.innerHTML = documents.length ? documents.map((document) => `
      <li class="document-item">
        <div><strong>${escapeHtml(document.name)}</strong><span>${escapeHtml(document.type)} · ${escapeHtml(document.size)}</span></div>
        <a href="${document.dataUrl}" download="${escapeHtml(document.name)}">Download</a>
      </li>
    `).join('') : '<li class="appointment-empty">No patient documents saved yet.</li>';
  }

  function updateReminderStatus(upcoming) {
    const status = document.getElementById('reminder-status');
    const enable = document.getElementById('enable-reminders');
    if (!status || !enable) return;
    if (!('Notification' in window)) {
      status.textContent = 'Browser notifications are not supported here.';
      enable.disabled = true;
      return;
    }
    status.textContent = Notification.permission === 'granted' ? (upcoming.length ? 'Reminders are enabled for your upcoming visits.' : 'Reminders are enabled. Book a visit to receive one.') : 'Get a browser notification before your next visit.';
    enable.textContent = Notification.permission === 'granted' ? 'Reminders enabled' : 'Enable reminders';
    enable.disabled = Notification.permission === 'granted';
  }

  async function enableReminders() {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    updateReminderStatus(getCurrentAppointments().filter((booking) => !isPastAppointment(booking)));
    if (permission === 'granted') checkAppointmentReminders();
  }

  function checkAppointmentReminders() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const now = Date.now();
    const appointments = readAppointments();
    let changed = false;
    appointments.forEach((booking) => {
      if (booking.patientEmail !== activeAccount?.email || booking.reminderSent) return;
      const appointmentTime = new Date(`${booking.date}T${booking.time}:00`).getTime();
      if (appointmentTime > now && appointmentTime - now <= 24 * 60 * 60 * 1000) {
        new Notification('Appointment reminder', { body: `${booking.service} with ${booking.doctor} at ${booking.time} on ${booking.date}.` });
        booking.reminderSent = true;
        changed = true;
      }
    });
    if (changed) writeAppointments(appointments);
  }

  appointmentForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(appointmentForm);
    const service = String(formData.get('service') || '').trim();
    const doctor = String(formData.get('doctor') || '').trim();
    const date = String(formData.get('date') || '').trim();
    const time = String(formData.get('time') || '').trim();
    const hospital = String(formData.get('hospital') || '').trim();
    const notes = String(formData.get('notes') || '').trim();

    if (!service || !doctor || !date || !time) {
      bookingResult.textContent = 'Please complete all appointment details.';
      bookingResult.classList.add('error');
      return;
    }

    const today = new Date();
    const chosenDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(chosenDate.getTime()) || chosenDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      bookingResult.textContent = 'Please choose a date that is today or later.';
      bookingResult.classList.add('error');
      return;
    }

    const booking = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      service,
      doctor,
      date,
      time,
      hospital,
      notes,
      patientName: activeAccount?.name || 'Patient',
      patientEmail: activeAccount?.email || '',
      reminderSent: false
    };

    const otherAppointments = readAppointments().filter((item) => item.patientEmail && item.patientEmail !== booking.patientEmail);
    const nextAppointments = [booking, ...getCurrentAppointments()].slice(0, 5);
    writeAppointments([...otherAppointments, ...nextAppointments]);
    appointmentForm.reset();
    bookingResult.textContent = `Booked ${service} with ${doctor} on ${date} at ${time}.`;
    bookingResult.classList.remove('error');
    renderAppointments();
  });

  document.getElementById('clear-bookings')?.addEventListener('click', () => {
    writeAppointments([]);
    renderAppointments();
    bookingResult.textContent = 'Upcoming visits cleared.';
    bookingResult.classList.remove('error');
  });

  document.getElementById('find-hospitals')?.addEventListener('click', () => {
    const location = String(appointmentForm.elements.hospital.value || '').trim();
    const query = location ? `hospitals near ${location}` : 'hospitals near me';
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
  });

  document.getElementById('enable-reminders')?.addEventListener('click', enableReminders);
  document.getElementById('availability-service')?.addEventListener('change', renderAvailability);
  document.getElementById('availability-hospital')?.addEventListener('input', renderAvailability);

  documentsForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const file = document.getElementById('document-file').files[0];
    const result = document.getElementById('document-result');
    if (!file || file.size > 5 * 1024 * 1024) {
      result.textContent = 'Choose a document smaller than 5 MB.';
      result.classList.add('error');
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const documents = readDocuments().filter((document) => document.patientEmail !== activeAccount?.email);
      documents.unshift({ id: `${Date.now()}`, name: file.name, type: document.getElementById('document-type').value, size: `${Math.ceil(file.size / 1024)} KB`, dataUrl: reader.result, patientEmail: activeAccount?.email || '' });
      writeDocuments(documents.slice(0, 20));
      documentsForm.reset();
      result.textContent = 'Document saved in this browser.';
      result.classList.remove('error');
      renderDocuments();
    });
    reader.readAsDataURL(file);
  });

  bootstrapAuthState();
  renderAppointments();
  renderAvailability();
  renderDocuments();
  window.setInterval(checkAppointmentReminders, 60000);
  checkAppointmentReminders();

  document.querySelectorAll('.prompt-chip').forEach((button) => button.addEventListener('click', () => {
    prompt.value = button.dataset.prompt;
    prompt.focus();
    updateCount();
  }));
  function updateCount() { charCount.textContent = `${prompt.value.length.toLocaleString()} / 1,200`; }
  prompt.addEventListener('input', () => {
    updateCount();
    prompt.style.height = 'auto';
    prompt.style.height = `${Math.min(prompt.scrollHeight, 130)}px`;
  });
  prompt.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      chatForm.requestSubmit();
    }
  });

  function addMessage(text, who) {
    const article = document.createElement('article');
    article.className = `message ${who === 'user' ? 'user-message' : 'assistant-message'}`;
    if (who === 'assistant') {
      const icon = document.createElement('div');
      icon.className = 'assistant-avatar';
      icon.textContent = '✚';
      article.append(icon);
    }
    const content = document.createElement('div');
    content.className = 'message-content';
    const meta = document.createElement('div');
    meta.className = 'message-meta';
    meta.textContent = who === 'user' ? 'YOU • JUST NOW' : 'FIRST AID ASSISTANT • JUST NOW';
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = text;
    content.append(meta, bubble);
    article.append(content);
    conversation.append(article);
    article.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function getSafetyReply(text) {
    const message = text.toLowerCase();
    const urgent = /(chest pain|can't breathe|cannot breathe|trouble breathing|difficulty breathing|not breathing|stroke|face droop|one side.*weak|unconscious|passed out|fainted|severe bleeding|heavy bleeding|suicid|overdose|poison|seizure)/i.test(message);
    if (urgent) return 'This may need urgent, in-person help. Please call your local emergency number now or ask someone nearby to call and stay with you. Do not wait for an online reply. If you can, follow the emergency dispatcher’s instructions.';
    const burn = /(burn|scald)/i.test(message);
    if (burn && /(small|minor|little|kitchen|hot water|steam)/i.test(message)) return 'For a small, recent burn, general first aid is to cool the area under cool running water for 20 minutes if available. Remove nearby jewellery or clothing only if it is not stuck to the skin. Don’t apply ice, butter, or creams, and don’t pop blisters. Seek urgent care for a large or deep burn, burns to the face, hands, genitals or major joints, chemical or electrical burns, or if you feel very unwell. I can’t assess the burn or recommend a medicine here; contact a clinician if you’re unsure.';
    return 'I can help you think through general information, but this demo is not connected to an AI service and cannot assess your symptoms. Please note when this started, how it has changed, and any other symptoms, then contact a qualified healthcare professional for personal advice. Don’t start, stop, or change medicines based on this chat. If symptoms are severe, rapidly worsening, or feel alarming, seek urgent care now.';
  }
  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = prompt.value.trim();
    if (!text) return;
    addMessage(text, 'user');
    prompt.value = '';
    prompt.style.height = 'auto';
    updateCount();
    window.setTimeout(() => addMessage(getSafetyReply(text), 'assistant'), 350);
  });

  const profileFields = ['height', 'weight', 'bp', 'cholesterol', 'sugar'].map((id) => document.getElementById(id));
  const bmiValue = document.getElementById('bmi-value');
  const bmiStatus = document.getElementById('bmi-status');
  const saveStatus = document.getElementById('save-status');
  function updateBmi() {
    const height = Number(document.getElementById('height').value);
    const weight = Number(document.getElementById('weight').value);
    if (!height || !weight || height < 50 || height > 250 || weight < 10 || weight > 400) {
      bmiValue.textContent = '—';
      bmiStatus.textContent = 'Enter height & weight';
      return;
    }
    bmiValue.textContent = (weight / ((height / 100) ** 2)).toFixed(1);
    bmiStatus.textContent = 'A screening measure';
  }
  profileFields.forEach((field) => field.addEventListener('input', updateBmi));
  document.getElementById('clear-profile').addEventListener('click', () => {
    profileFields.forEach((field) => { field.value = ''; });
    updateBmi();
    saveStatus.textContent = 'Details cleared from this tab';
  });
})();
