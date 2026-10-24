// common.js
// Shared helpers - loaded on every page before the page-specific script.

async function apiRequest(url, method, body) {
  const options = { method: method || 'GET', headers: {}, credentials: 'same-origin' };
  if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  try {
    const res = await fetch(url, options);
    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      /* response had no JSON body */
    }
    // Admin session expired while on an admin page -> go back to the login page
    if (res.status === 401 && location.pathname.startsWith('/admin')) {
      location.href = '/admin-login';
    }
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: 'Network error. Please check your connection and try again.' } };
  }
}

function setMessage(el, text, isSuccess) {
  if (!el) return;
  el.textContent = text;
  el.style.display = text ? 'block' : 'none';
  el.style.color = isSuccess ? '#2e7d32' : '#c0392b';
}

function setBusy(button, busy) {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = 'Please wait...';
  } else if (button.dataset.label) {
    button.textContent = button.dataset.label;
  }
  button.disabled = busy;
}

function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

// Only follow ?next=/some/path (never an external address)
function safeNext() {
  const next = new URLSearchParams(location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

// Ask several questions with prompt(). Returns an object, or null if the admin pressed Cancel.
function askFields(fields) {
  const out = {};
  for (const f of fields) {
    const answer = window.prompt(f.label, f.default === undefined || f.default === null ? '' : f.default);
    if (answer === null) return null;
    out[f.key] = answer.trim();
    if (f.required && !out[f.key]) {
      alert(f.label.replace(/\s*[:(].*$/, '') + ' is required.');
      return null;
    }
  }
  return out;
}
