(() => {
  const cfg = window.STORE_CONFIG,
    $ = s => document.querySelector(s);
    
function convertDriveImageUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (
      host === "drive.google.com" ||
      host === "www.drive.google.com"
    ) {
      let id = parsed.searchParams.get("id") || "";

      if (!id) {
        const match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
        if (match) id = match[1];
      }

      if (id) {
        return "https://drive.google.com/thumbnail?id="
          + encodeURIComponent(id)
          + "&sz=w1000";
      }
    }
  } catch (_) {
    return url;
  }

  return url;
}

  const loginPanel = $("#loginPanel"),
    settingsPanel = $("#settingsPanel");
  const loginForm = $("#loginForm"),
    settingsForm = $("#settingsForm");
  const loginMessage = $("#loginMessage"),
    settingsMessage = $("#settingsMessage");
  let token = "";
  const defaults = cfg.DEFAULTS || {};
  
  function message(el, text, ok = false) {
    if (!el) return;
    el.textContent = text;
    el.className = `form-message ${ok ? "success" : "error"}`;
  }
  async function request(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    let res;
    try {
      res = await fetch(`${cfg.API_BASE}${path}`, { ...options, headers });
    } catch (_) {
      throw new Error("تعذر الاتصال بالخادم. تحقق من API_BASE واتصال الإنترنت.");
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.success === false) throw new Error(body.error || `فشل الطلب (${res.status})`);
    return body;
  }
  
  function unwrap(body, key) {
    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.[key])) return body[key];
    if (Array.isArray(body?.data)) return body.data;
    if (Array.isArray(body?.items)) return body.items;
    return [];
  }
  
  function fillForm(s) {
    const data = { ...defaults, ...(s || {}) };
    Object.entries(data).forEach(([k, v]) => {
      const input = settingsForm?.elements.namedItem(k);
      if (input) input.value = v ?? "";
    });
  }
  
  // Add product-management interface without requiring edits to admin.html.
  function addProductStyles() {
    if ($("#productManagerStyles")) return;
    const style = document.createElement("style");
    style.id = "productManagerStyles";
    style.textContent = `
      #productManager{margin-top:24px;padding:18px;border:1px solid #b99a4b;border-radius:12px}
      #productManager h2,#productManager h3{margin:8px 0 14px}
      #productManager .pm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}
      #productManager input,#productManager textarea,#productManager select{box-sizing:border-box;width:100%;padding:10px;margin:5px 0 12px;border:1px solid #aaa;border-radius:7px;font:inherit}
      #productManager button{padding:9px 13px;margin:4px;border:0;border-radius:7px;cursor:pointer;font:inherit}
      #productManager .pm-primary{background:#b99a4b;color:#111}
      #productManager .pm-secondary{background:#333;color:#fff}
      #productManager .pm-danger{background:#a52828;color:#fff}
      #productManager .pm-table-wrap{overflow-x:auto}
      #productManager table{width:100%;border-collapse:collapse;min-width:560px}
      #productManager th,#productManager td{padding:9px;border-bottom:1px solid #ddd;text-align:right;vertical-align:top}
      #productManager .pm-note{font-size:.92em;opacity:.85}
      #productManager .pm-status{margin:8px 0}
    `;
    document.head.appendChild(style);
  }
  
  function createProductManager() {
    if ($("#productManager")) return;
    addProductStyles();
    const panel = document.createElement("section");
    panel.id = "productManager";
    panel.dir = "rtl";
    panel.innerHTML = `
      <h2>إدارة المنتجات</h2>
      <p class="pm-note">تُحفظ التغييرات في قاعدة البيانات عبر Worker.</p>
      <div id="pmStatus" class="pm-status form-message" role="status"></div>
      <form id="pmProductForm">
        <input type="hidden" name="id">
        <div class="pm-grid">
          <label>اسم المنتج<input name="name" required maxlength="160"></label>
          <label>التصنيف<select name="category_id" required><option value="">جارٍ تحميل التصنيفات...</option></select></label>
          <label>السعر (رقم صحيح)<input name="price" type="number" min="0" step="1" required></label>
          <label>المخزون<input name="stock" type="number" min="0" step="1" value="0" required></label>
          <label>الحالة<select name="condition_type"><option value="new">جديد</option><option value="used">مستعمل</option></select></label>
          <label>رابط الصورة<input name="image_url" type="url" placeholder="https://..."></label>
        </div>
        <label>الوصف<textarea name="description" rows="3"></textarea></label>
        <label><input name="is_active" type="checkbox" checked style="width:auto;margin-left:6px"> المنتج نشط ويظهر في المتجر</label>
        <div><button class="pm-primary" type="submit">حفظ المنتج</button><button class="pm-secondary" type="button" id="pmReset">منتج جديد / إلغاء التعديل</button></div>
      </form>
      <hr>
      <h3>إضافة تصنيف</h3>
      <form id="pmCategoryForm" class="pm-grid">
        <label>اسم التصنيف<input name="name" required maxlength="80" placeholder="مثال: سيارات"></label>
        <button class="pm-primary" type="submit">إضافة التصنيف</button>
      </form>
      <hr>
      <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap">
        <h3>المنتجات الحالية</h3><button class="pm-secondary" type="button" id="pmRefresh">تحديث القائمة</button>
      </div>
      <div class="pm-table-wrap"><table><thead><tr><th>المنتج</th><th>التصنيف</th><th>السعر</th><th>المخزون</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody id="pmProductsBody"><tr><td colspan="6">جارٍ التحميل...</td></tr></tbody></table></div>
    `;
    (settingsPanel || loginPanel)?.parentNode?.insertBefore(panel, (settingsPanel || loginPanel).nextSibling);
    $("#pmProductForm").addEventListener("submit", saveProduct);
    $("#pmCategoryForm").addEventListener("submit", saveCategory);
    $("#pmReset").addEventListener("click", resetProductForm);
    $("#pmRefresh").addEventListener("click", loadProducts);
    $("#pmProductsBody").addEventListener("click", productTableAction);
  }
  
  let categories = [],
    products = [];
  
  function setProductStatus(text, ok = false) { message($("#pmStatus"), text, ok); }
  async function loadCategories() {
    const body = await request("/api/categories", { method: "GET" });
    categories = unwrap(body, "categories");
    const select = $("#pmProductForm select[name='category_id']");
    select.innerHTML = '<option value="">اختر التصنيف</option>';
    categories.forEach(c => {
      const option = document.createElement("option");
      option.value = c.id;
      option.textContent = c.name;
      select.appendChild(option);
    });
  }
  async function loadProducts() {
    const tbody = $("#pmProductsBody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6">جارٍ تحميل المنتجات...</td></tr>';
    try {
      const body = await request("/api/products", { method: "GET" });
      products = unwrap(body, "products");
      if (!products.length) {
        tbody.innerHTML = '<tr><td colspan="6">لا توجد منتجات حتى الآن.</td></tr>';
        return;
      }
      tbody.innerHTML = "";
      products.forEach(p => {
        const tr = document.createElement("tr");
        const cat = categories.find(c => String(c.id) === String(p.category_id));
        const values = [
          p.name || "",
          cat?.name || p.category_name || p.category || "—",
          p.price ?? "—",
          p.stock ?? 0,
          (Number(p.is_active) === 1 || p.is_active === true) ? "نشط" : "غير نشط"
        ];
        values.forEach(v => { const td = document.createElement("td");
          td.textContent = String(v);
          tr.appendChild(td); });
        const actions = document.createElement("td");
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "pm-secondary";
        edit.dataset.action = "edit";
        edit.dataset.id = p.id;
        edit.textContent = "تعديل";
        const del = document.createElement("button");
        del.type = "button";
        del.className = "pm-danger";
        del.dataset.action = "delete";
        del.dataset.id = p.id;
        del.textContent = "حذف";
        actions.append(edit, del);
        tr.appendChild(actions);
        tbody.appendChild(tr);
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6"></td></tr>`;
      tbody.querySelector("td").textContent = `تعذر تحميل المنتجات: ${err.message}`;
    }
  }
  async function saveProduct(e) {
    e.preventDefault();
    const form = e.currentTarget,
      fd = new FormData(form);
    const id = String(fd.get("id") || "").trim();
    const data = {
      name: String(fd.get("name") || "").trim(),
      category_id: Number(fd.get("category_id")),
      price: Number(fd.get("price")),
      stock: Number(fd.get("stock") || 0),
      condition_type: String(fd.get("condition_type") || "new"),
      image_url: convertDriveImageUrl(fd.get("image_url")),
      description: String(fd.get("description") || "").trim(),
      is_active: form.elements.namedItem("is_active").checked ? 1 : 0
    };
    if (!data.name || !Number.isInteger(data.category_id) || data.category_id < 1) {
      setProductStatus("أدخل اسم المنتج واختر تصنيفًا صحيحًا.");
      return;
    }
    if (!Number.isFinite(data.price) || data.price < 0 || !Number.isInteger(data.price) ||
      !Number.isFinite(data.stock) || data.stock < 0 || !Number.isInteger(data.stock)) {
      setProductStatus("السعر والمخزون يجب أن يكونا رقمين صحيحين غير سالبين.");
      return;
    }
    setProductStatus("جارٍ حفظ المنتج...");
    try {
      await request(id ? `/api/admin/products/${encodeURIComponent(id)}` : "/api/admin/products", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(data)
      });
      setProductStatus(id ? "تم تحديث المنتج بنجاح." : "تمت إضافة المنتج بنجاح.", true);
      resetProductForm();
      await loadProducts();
    } catch (err) {
      setProductStatus(`لم يتم حفظ المنتج: ${err.message}`);
    }
  }
  async function saveCategory(e) {
    e.preventDefault();
    const form = e.currentTarget,
      name = String(new FormData(form).get("name") || "").trim();
    if (!name) return;
    setProductStatus("جارٍ إضافة التصنيف...");
    try {
      await request("/api/admin/categories", { method: "POST", body: JSON.stringify({ name }) });
      form.reset();
      await loadCategories();
      setProductStatus("تمت إضافة التصنيف بنجاح.", true);
    } catch (err) { setProductStatus(`لم تتم إضافة التصنيف: ${err.message}`); }
  }
  
  function resetProductForm() {
    const form = $("#pmProductForm");
    if (!form) return;
    form.reset();
    form.elements.namedItem("id").value = "";
    form.elements.namedItem("stock").value = "0";
    form.elements.namedItem("condition_type").value = "new";
    form.elements.namedItem("is_active").checked = true;
  }
  
  function productTableAction(e) {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const product = products.find(p => String(p.id) === String(btn.dataset.id));
    if (!product) return;
    if (btn.dataset.action === "edit") {
      const form = $("#pmProductForm");
      form.elements.namedItem("id").value = product.id ?? "";
      form.elements.namedItem("name").value = product.name ?? "";
      form.elements.namedItem("category_id").value = product.category_id ?? "";
      form.elements.namedItem("price").value = product.price ?? "";
      form.elements.namedItem("stock").value = product.stock ?? 0;
      form.elements.namedItem("condition_type").value = product.condition_type ?? "new";
      form.elements.namedItem("image_url").value = product.image_url ?? "";
      form.elements.namedItem("description").value = product.description ?? "";
      form.elements.namedItem("is_active").checked = Number(product.is_active) === 1 || product.is_active === true;
      $("#pmProductForm").scrollIntoView({ behavior: "smooth", block: "start" });
      setProductStatus(`تعديل المنتج: ${product.name || ""}`);
    } else if (btn.dataset.action === "delete") {
      if (!window.confirm(`هل تريد حذف المنتج «${product.name || ""}»؟`)) return;
      request(`/api/admin/products/${encodeURIComponent(product.id)}`, { method: "DELETE" })
        .then(async () => { setProductStatus("تم حذف المنتج.", true);
          await loadProducts(); })
        .catch(err => setProductStatus(`لم يتم حذف المنتج: ${err.message}`));
    }
  }
  
  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    token = $("#adminToken").value.trim();
    message(loginMessage, "جارٍ التحقق...");
    try {
      await request("/api/admin/check", { method: "GET" });
      const body = await request("/api/admin/settings", { method: "GET" });
      fillForm(body.settings || body.data || body);
      loginPanel.classList.add("hidden");
      settingsPanel.classList.remove("hidden");
      createProductManager();
      $("#productManager").classList.remove("hidden");
      try {
        await loadCategories();
        await loadProducts();
      } catch (err) {
        setProductStatus(`تعذر تحميل التصنيفات أو المنتجات: ${err.message}`);
      }
    } catch (err) {
      token = "";
      message(loginMessage, `تعذر تسجيل الدخول: ${err.message}. تحقق من نشر Worker وإعداد ADMIN_TOKEN.`);
    }
  });
  settingsForm.addEventListener("submit", async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(settingsForm).entries());
    message(settingsMessage, "جارٍ الحفظ في قاعدة البيانات...");
    try {
      await request("/api/admin/settings", { method: "PUT", body: JSON.stringify(data) });
      message(settingsMessage, "تم حفظ الإعدادات في قاعدة البيانات بنجاح.", true);
    } catch (err) {
      message(settingsMessage, `لم يتم الحفظ: ${err.message}. تأكد من نشر Worker وربط قاعدة D1.`);
    }
  });
  $("#logoutButton").addEventListener("click", () => {
    token = "";
    $("#adminToken").value = "";
    settingsPanel.classList.add("hidden");
    $("#productManager")?.classList.add("hidden");
    loginPanel.classList.remove("hidden");
  });
  const y = $("#year");
  if (y) y.textContent = new Date().getFullYear();
})();