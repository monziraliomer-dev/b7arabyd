(() => {
  const cfg = window.STORE_CONFIG, d = cfg.DEFAULTS;
  const year = document.querySelector("#year"); if (year) year.textContent = new Date().getFullYear();
  fetch(`${cfg.API_BASE}/api/settings`).then(r => r.json()).then(j => {
    const s = {...d, ...(j.settings || j.data || j)};
    const wa = `https://wa.me/${String(s.whatsapp || d.whatsapp).replace(/\D/g,"")}`;
    const w = document.querySelector("#contactWhatsApp"); if (w) w.href = wa;
    const f = document.querySelector("#contactFacebook"); if (f) f.href = s.facebook || d.facebook;
    document.querySelectorAll(".brand span:nth-child(2)").forEach(el => { el.childNodes[0].textContent = s.storeNameAr || d.storeNameAr; });
  }).catch(() => {});
})();