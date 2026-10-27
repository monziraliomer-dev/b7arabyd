(() => {
  const cfg = window.STORE_CONFIG, $ = s => document.querySelector(s);
  const loginPanel = $("#loginPanel"), settingsPanel = $("#settingsPanel"), loginForm = $("#loginForm"), settingsForm = $("#settingsForm");
  const loginMessage = $("#loginMessage"), settingsMessage = $("#settingsMessage");
  let token = "";
  const defaults = cfg.DEFAULTS;
  function message(el, text, ok=false) { el.textContent = text; el.className = `form-message ${ok ? "success" : "error"}`; }
  async function request(path, options={}) {
    const headers = {"Content-Type":"application/json", ...(options.headers||{})};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${cfg.API_BASE}${path}`, {...options, headers});
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.success === false) throw new Error(body.error || `فشل الطلب (${res.status})`);
    return body;
  }
  function fillForm(s) {
    const data = {...defaults, ...(s || {})};
    Object.entries(data).forEach(([k,v]) => { const input = settingsForm.elements.namedItem(k); if (input) input.value = v ?? ""; });
  }
  loginForm.addEventListener("submit", async e => {
    e.preventDefault(); token = $("#adminToken").value.trim();
    message(loginMessage, "جارٍ التحقق...");
    try {
      // يتطلب Worker أن يدعم GET /api/admin/check مع Authorization Bearer.
      await request("/api/admin/check", {method:"GET"});
      const body = await request("/api/admin/settings", {method:"GET"});
      fillForm(body.settings || body.data || body);
      loginPanel.classList.add("hidden"); settingsPanel.classList.remove("hidden");
    } catch(err) { token = ""; message(loginMessage, `تعذر تسجيل الدخول: ${err.message}. تحقق من نشر Worker المرفق وإعداد ADMIN_TOKEN.`); }
  });
  settingsForm.addEventListener("submit", async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(settingsForm).entries());
    message(settingsMessage, "جارٍ الحفظ في قاعدة البيانات...");
    try {
      await request("/api/admin/settings", {method:"PUT", body:JSON.stringify(data)});
      message(settingsMessage, "تم حفظ الإعدادات في قاعدة البيانات بنجاح.", true);
    } catch(err) { message(settingsMessage, `لم يتم الحفظ: ${err.message}. تأكد من نشر Worker الجديد وربط قاعدة D1.`); }
  });
  $("#logoutButton").addEventListener("click", () => { token=""; $("#adminToken").value=""; settingsPanel.classList.add("hidden"); loginPanel.classList.remove("hidden"); });
  const y = $("#year"); if (y) y.textContent = new Date().getFullYear();
})();