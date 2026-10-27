(() => {
  const cfg = window.STORE_CONFIG;
  const $ = (s) => document.querySelector(s);
  let products = [], activeCategory = "all";
  const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money = (v) => `${Number(v || 0).toLocaleString("ar")} ${escapeHtml(window.storeSettings?.currency || cfg.DEFAULTS.currency)}`;
  async function getSettings() {
    try { const r = await fetch(`${cfg.API_BASE}/api/settings`); const j = await r.json(); if (r.ok && j.success !== false) window.storeSettings = {...cfg.DEFAULTS, ...(j.settings || j.data || j)}; else throw Error(); }
    catch { window.storeSettings = {...cfg.DEFAULTS}; }
    const w = `https://wa.me/${String(window.storeSettings.whatsapp).replace(/\D/g,"")}`;
    const cta = $("#ctaWhatsApp"); if (cta) cta.href = w;
    document.title = `${window.storeSettings.storeNameAr} | المتجر`;
  }
  async function getProducts() {
    try {
      const r = await fetch(`${cfg.API_BASE}/api/products`);
      const j = await r.json();
      if (!r.ok || j.success === false) throw Error(j.error || "تعذر تحميل المنتجات");
      products = Array.isArray(j.products) ? j.products : (Array.isArray(j.data) ? j.data : []);
    } catch (e) {
      products = [];
      if ($("#productsMessage")) $("#productsMessage").textContent = "تعذر الاتصال بقاعدة البيانات. تحقق من عنوان Worker وإعدادات CORS.";
    }
    render();
  }
  function render() {
    const grid = $("#productsGrid"); if (!grid) return;
    const query = ($("#searchInput")?.value || "").trim().toLowerCase();
    const filtered = products.filter(p => {
      const category = p.category_name || p.category || "";
      const matchCategory = activeCategory === "all" || category === activeCategory || (activeCategory === "مواتر" && /موتر|دراج/.test(category));
      return matchCategory && `${p.name||""} ${p.description||""} ${category}`.toLowerCase().includes(query) && (p.is_active === undefined || Number(p.is_active) === 1);
    });
    if (!filtered.length) { grid.innerHTML = `<p class="muted">${products.length ? "لا توجد منتجات تطابق بحثك." : "لا توجد منتجات معروضة حاليًا."}</p>`; return; }
    grid.innerHTML = filtered.map(p => {
      const img = p.image_url ? `<img loading="lazy" src="${escapeHtml(p.image_url)}" alt="${escapeHtml(p.name)}" onerror="this.style.display='none'">` : `<span class="product-placeholder">◇</span>`;
      const cat = p.category_name || p.category || "منتجات";
      const desc = p.description || "تواصل معنا لمعرفة تفاصيل المنتج.";
      const msg = encodeURIComponent(`السلام عليكم، أريد الاستفسار عن: ${p.name}`);
      return `<article class="product-card"><div class="product-image">${img}</div><div class="product-info"><span class="product-category">${escapeHtml(cat)}</span><h3>${escapeHtml(p.name)}</h3><p class="product-description">${escapeHtml(desc)}</p><div class="product-price">${money(p.price)}</div><div class="product-actions"><a class="btn btn-gold" href="https://wa.me/${String(window.storeSettings?.whatsapp || cfg.DEFAULTS.whatsapp).replace(/\D/g,"")}?text=${msg}" target="_blank" rel="noopener">اطلب عبر واتساب</a></div></div></article>`;
    }).join("");
  }
  $("#categoryFilters")?.addEventListener("click", e => {
    const b = e.target.closest("[data-category]"); if (!b) return;
    activeCategory = b.dataset.category;
    document.querySelectorAll(".filter").forEach(x => x.classList.toggle("active", x === b)); render();
  });
  $("#searchInput")?.addEventListener("input", render);
  const y = $("#year"); if (y) y.textContent = new Date().getFullYear();
  getSettings().then(getProducts);
})();