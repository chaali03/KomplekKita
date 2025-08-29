type WargaMember = { nama: string; nik: string; relasi: string };
type DocumentMeta = { name: string; type: string; size: number; time: number };
type HistoryAction =
  | "verify"
  | "unverify"
  | "update-main"
  | "add-member"
  | "edit-member"
  | "delete-member"
  | "add-doc"
  | "delete-doc"
  | "delete-row";
type HistoryEntry = { time: number; action: HistoryAction; by?: string; detail?: string };
interface WargaRow {
  id: string;
  nama: string;
  nik: string;
  kk: string;
  alamat: string;
  rt: string;
  rw: string;
  no_rumah?: string;
  telepon?: string;
  email?: string;
  status: string;
  tanggal_masuk?: string;
  tanggal_keluar?: string;
  verified?: boolean;
  updated_at?: number;
  anggota_keluarga: WargaMember[];
  documents: DocumentMeta[];
  history: HistoryEntry[];
}

// Storage & State
const STORAGE_KEY = "warga_data_v1";
const url = new URL(location.href);
const id = url.searchParams.get("id") ?? "";

let warga: WargaRow[] = [];
let row: WargaRow | null = null;
let draft: Partial<WargaRow> | null = null;
let dirty = false;

// -------------------- Utils --------------------
function $<T extends Element = HTMLElement>(
  sel: string,
  ctx: Document | HTMLElement = document
): T {
  return ctx.querySelector(sel) as T;
}
function $$<T extends Element = HTMLElement>(
  sel: string,
  ctx: Document | HTMLElement = document
): T[] {
  return Array.from(ctx.querySelectorAll(sel)) as T[];
}
function on<E extends Event>(
  el: HTMLElement | Document | Window,
  evt: string,
  handler: (ev: E) => void
): void {
  el.addEventListener(evt, handler as EventListener);
}
function onDelegated<E extends Event>(
  el: HTMLElement | Document,
  evt: string,
  selector: string,
  handler: (ev: E) => void
): void {
  el.addEventListener(evt, (e) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest(selector)) handler(e as E);
  });
}
const fmtDateTime = (ts?: number | null): string => {
  if (!ts) return "-";
  const d = new Date(ts);
  return d.toLocaleString();
};
const deepClone = <T>(obj: T): T => {
  if (typeof (window as any).structuredClone === "function") {
    return (window as any).structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj)) as T;
};
const onlyDigits = (v?: string | null): string => (v ?? "").replace(/\D+/g, "");
const iconForFile = (type?: string | null): string => {
  const t = (type ?? "").toLowerCase();
  if (t.includes("pdf")) return "fa-file-pdf";
  if (t.includes("image")) return "fa-file-image";
  if (t.includes("word") || t.includes("doc")) return "fa-file-word";
  if (t.includes("sheet") || t.includes("excel") || t.includes("xls")) return "fa-file-excel";
  return "fa-file";
};

// Safe notification hook shared with admin topbar
type NotifType = 'info' | 'success' | 'warning';
function addAdminNotif(type: NotifType, title: string, message: string): void {
  try {
    const api = (window as any).KKNotif;
    if (api && typeof api.add === 'function') api.add(type, title, message);
  } catch {}
}

// -------------------- Storage --------------------
function load(): void {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    warga = Array.isArray(parsed) ? (parsed as WargaRow[]) : [];
  } catch {
    warga = [];
  }
}
function saveAll(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(warga));
}
function persistRow(): void {
  if (!row) return;
  const idx = warga.findIndex((x) => x.id === row!.id);
  if (idx > -1) {
    warga[idx] = row!;
    saveAll();
  }
}

// -------------------- Rendering --------------------
function renderHeader(): void {
  const titleEl = $("#title") as HTMLElement;
  const btnSave = $("#btn-save") as HTMLButtonElement;
  const verifiedChip = $("#verified-chip") as HTMLElement;
  const dirtyChip = $("#dirty-chip") as HTMLElement;
  const lastUpdated = $("#last-updated") as HTMLElement;
  const verifyTxt = $("#verify-txt") as HTMLElement;

  if (!row) {
    titleEl.textContent = "Warga tidak ditemukan";
    verifyTxt.textContent = "Tandai Terverifikasi";
    btnSave.disabled = true;
    verifiedChip.className = "chip chip-warn";
    verifiedChip.innerHTML = '<i class="fas fa-shield"></i> Belum Verifikasi';
    dirtyChip.classList.add("hidden");
    return;
  }

  titleEl.textContent = `Kelola: ${row.nama || "-"}`;

  if (row.verified) {
    verifiedChip.className = "chip chip-ok";
    verifiedChip.innerHTML = '<i class="fas fa-shield-alt"></i> Terverifikasi';
    verifyTxt.textContent = "Batalkan Verifikasi";
  } else {
    verifiedChip.className = "chip chip-warn";
    verifiedChip.innerHTML = '<i class="fas fa-shield"></i> Belum Verifikasi';
    verifyTxt.textContent = "Tandai Terverifikasi";
  }

  const status = (draft?.status ?? row.status ?? "-") as string;
  const statusChip = $("#status-chip") as HTMLElement;
  statusChip.className = "chip chip-neutral";
  const stLabel = status ? status[0].toUpperCase() + status.slice(1) : "-";
  statusChip.textContent = `Status: ${stLabel}`;

  dirtyChip.classList.toggle("hidden", !dirty);
  lastUpdated.textContent = row.updated_at ? fmtDateTime(row.updated_at) : "-";

  btnSave.disabled = !dirty || !validateForm(false);
}

function renderForm(): void {
  const form = $("#form-main") as HTMLFormElement;
  const src = (draft ?? row ?? {}) as Partial<WargaRow>;

  const fields: (keyof WargaRow)[] = [
    "nama",
    "nik",
    "kk",
    "alamat",
    "rt",
    "rw",
    "no_rumah",
    "telepon",
    "email",
    "status",
    "tanggal_masuk",
    "tanggal_keluar",
  ];

  // Ensure defaults
  for (const k of fields) {
    if (!(k in src)) (src as any)[k] = "";
  }

  const setVal = (name: string, val: string): void => {
    const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
    if (el) el.value = val ?? "";
  };

  setVal("nama", (src.nama as string) || "");
  setVal("nik", (src.nik as string) || "");
  setVal("kk", (src.kk as string) || "");
  setVal("alamat", (src.alamat as string) || "");
  setVal("rt", (src.rt as string) || "");
  setVal("rw", (src.rw as string) || "");
  setVal("no_rumah", (src.no_rumah as string) || "");
  setVal("telepon", (src.telepon as string) || "");
  setVal("email", (src.email as string) || "");
  setVal("status", (src.status as string) || "aktif");
  setVal("tanggal_masuk", (src.tanggal_masuk as string) || "");
  setVal("tanggal_keluar", (src.tanggal_keluar as string) || "");

  const statusChip = $("#status-chip") as HTMLElement;
  const st = (src.status as string) || "-";
  statusChip.textContent = `Status: ${st[0]?.toUpperCase() + st.slice(1)}`;
}

function renderHistory(): void {
  if (!row) return;
  const ul = $("#history") as HTMLUListElement;
  ul.innerHTML = "";

  const actionMap: Record<HistoryAction, string> = {
    verify: "Verifikasi",
    unverify: "Batalkan verifikasi",
    "update-main": "Perbarui data utama",
    "add-member": "Tambah anggota",
    "edit-member": "Ubah anggota",
    "delete-member": "Hapus anggota",
    "add-doc": "Tambah dokumen",
    "delete-doc": "Hapus dokumen",
    "delete-row": "Hapus data warga",
  };

  (row.history ?? [])
    .slice()
    .reverse()
    .forEach((h: HistoryEntry) => {
      const li = document.createElement("li");
      const who = h.by || "admin";
      const detail = h.detail ? ` (${h.detail})` : "";
      li.textContent = `${fmtDateTime(h.time)} • ${actionMap[h.action]}${detail} • ${who}`;
      ul.appendChild(li);
    });
}

function renderMembers(): void {
  if (!row) return;
  const tbody = document.querySelector<HTMLTableSectionElement>("#tbl-members tbody");
  const empty = document.getElementById("members-empty") as HTMLElement | null;
  // If members UI is removed from the page, safely no-op
  if (!tbody || !empty) return;
  tbody.innerHTML = "";

  const members = (row.anggota_keluarga ?? []) as WargaMember[];
  empty.classList.toggle("hidden", members.length > 0);

  members.forEach((m: WargaMember, idx: number) => {
    const tr = document.createElement("tr");

    const tdNama = document.createElement("td");
    tdNama.dataset.label = "Nama";
    tdNama.textContent = m.nama || "-";

    const tdNik = document.createElement("td");
    tdNik.dataset.label = "NIK";
    tdNik.textContent = m.nik || "-";

    const tdRel = document.createElement("td");
    tdRel.dataset.label = "Relasi";
    tdRel.textContent = m.relasi || "-";

    const tdAct = document.createElement("td");
    tdAct.className = "actions text-right";
    tdAct.innerHTML = `
      <div class="btn-group">
        <button class="btn btn-sm btn-soft" data-edit="${idx}">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button class="btn btn-sm btn-danger" data-del="${idx}">
          <i class="fas fa-trash"></i> Hapus
        </button>
      </div>
    `;

    tr.appendChild(tdNama);
    tr.appendChild(tdNik);
    tr.appendChild(tdRel);
    tr.appendChild(tdAct);
    tbody.appendChild(tr);
  });
}

function renderDocs(): void {
  if (!row) return;
  const ul = $("#docs") as HTMLUListElement;
  ul.innerHTML = "";

  const docs = (row.documents ?? []) as DocumentMeta[];
  const empty = $("#docs-empty") as HTMLElement;
  empty.classList.toggle("hidden", docs.length > 0);

  docs.forEach((d: DocumentMeta, i: number) => {
    const li = document.createElement("li");
    li.className = "doc-item";
    li.innerHTML = `
      <div class="doc-icon"><i class="fas ${iconForFile(d.type)}"></i></div>
      <div class="doc-meta">
        <div class="doc-name">${d.name || "Dokumen"}</div>
        <div class="doc-sub">${d.type || "file"} • ${d.size ? Math.round(d.size / 1024) + " KB" : ""} ${
      d.time ? "• " + new Date(d.time).toLocaleDateString() : ""
    }</div>
      </div>
      <div>
        <button class="btn btn-sm btn-danger" data-doc-del="${i}">
          <i class="fas fa-times"></i> Hapus
        </button>
      </div>
    `;
    ul.appendChild(li);
  });
}

function renderAll(): void {
  renderHeader();
  renderForm();
  renderHistory();
  renderMembers();
  renderDocs();
}

// -------------------- Validation --------------------
function setError(name: string, msg: string): void {
  const errEl = document.querySelector<HTMLElement>(`[data-err-for="${name}"]`);
  const inputEl = document.getElementById(name);
  const wrapper = inputEl ? (inputEl.closest(".form-field") as HTMLElement | null) : null;
  if (!errEl || !wrapper) return;
  errEl.textContent = msg || "";
  if (msg) wrapper.classList.add("invalid");
  else wrapper.classList.remove("invalid");
}

function validateForm(showErrors = true): boolean {
  const d = (draft ?? {}) as Partial<WargaRow>;
  let valid = true;

  const req: (keyof WargaRow)[] = ["nama", "nik", "kk", "alamat", "rt", "rw"];
  req.forEach((k) => {
    const v = (d[k] ?? "").toString().trim();
    if (!v) {
      valid = false;
      if (showErrors) setError(k as string, "Wajib diisi");
    } else if (showErrors) setError(k as string, "");
  });

  if (d.nik && !/^\d{8,20}$/.test(d.nik)) {
    valid = false;
    if (showErrors) setError("nik", "NIK harus 8-20 digit angka");
  } else if (showErrors) setError("nik", "");

  if (d.kk && !/^\d{8,20}$/.test(d.kk)) {
    valid = false;
    if (showErrors) setError("kk", "No. KK harus 8-20 digit angka");
  } else if (showErrors) setError("kk", "");

  if (d.rt && !/^\d{1,3}$/.test(d.rt)) {
    valid = false;
    if (showErrors) setError("rt", "RT hanya angka (1-3 digit)");
  } else if (showErrors) setError("rt", "");

  if (d.rw && !/^\d{1,3}$/.test(d.rw)) {
    valid = false;
    if (showErrors) setError("rw", "RW hanya angka (1-3 digit)");
  } else if (showErrors) setError("rw", "");

  if (d.telepon && !/^\d{6,20}$/.test(d.telepon)) {
    valid = false;
    if (showErrors) setError("telepon", "Telepon hanya angka (6-20 digit)");
  } else if (showErrors) setError("telepon", "");

  if (d.email) {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email);
    if (!ok) {
      valid = false;
      if (showErrors) setError("email", "Email tidak valid");
    } else if (showErrors) setError("email", "");
  } else if (showErrors) setError("email", "");

  if (d.tanggal_masuk && d.tanggal_keluar) {
    const masuk = new Date(d.tanggal_masuk);
    const keluar = new Date(d.tanggal_keluar);
    if (keluar < masuk) {
      valid = false;
      if (showErrors) setError("tanggal_keluar", "Tanggal keluar harus setelah tanggal masuk");
    } else if (showErrors) setError("tanggal_keluar", "");
  } else if (showErrors) setError("tanggal_keluar", "");

  return valid;
}

// -------------------- Members Modal --------------------
let memberEditIndex: number | null = null;

function openMemberModal(
  data: WargaMember = { nama: "", nik: "", relasi: "" },
  index: number | null = null
): void {
  memberEditIndex = index;
  const nm = document.getElementById("m-nama") as HTMLInputElement | null;
  const nk = document.getElementById("m-nik") as HTMLInputElement | null;
  const rl = document.getElementById("m-relasi") as HTMLSelectElement | null;

  if (nm) nm.value = data.nama || "";
  if (nk) nk.value = data.nik || "";
  if (rl) rl.value = data.relasi || "";

  setError("m-nama", "");
  setError("m-nik", "");
  setError("m-relasi", "");

  showModal("#modal-member", true);
  if (nm) nm.focus();
}

function validateMemberForm(showErrors = true): boolean {
  const namaEl = document.getElementById("m-nama") as HTMLInputElement | null;
  const nikEl = document.getElementById("m-nik") as HTMLInputElement | null;
  const relasiEl = document.getElementById("m-relasi") as HTMLSelectElement | null;
  if (!namaEl || !nikEl || !relasiEl) return false;

  const nama = namaEl.value.trim();
  const nik = nikEl.value.trim();
  const relasi = relasiEl.value;

  let ok = true;
  if (!nama) {
    ok = false;
    if (showErrors) setError("m-nama", "Wajib diisi");
  } else if (showErrors) setError("m-nama", "");

  if (!/^\d{8,20}$/.test(nik)) {
    ok = false;
    if (showErrors) setError("m-nik", "NIK harus 8-20 digit angka");
  } else if (showErrors) setError("m-nik", "");

  if (!relasi) {
    ok = false;
    if (showErrors) setError("m-relasi", "Pilih relasi");
  } else if (showErrors) setError("m-relasi", "");

  return ok;
}

// -------------------- Modals --------------------
const showModal = (sel: string, show = true): void => {
  const m = document.querySelector<HTMLElement>(sel);
  if (!m) return;
  m.setAttribute("aria-hidden", show ? "false" : "true");
};

// -------------------- Toasts --------------------
type ToastType = "success" | "info" | "warn" | "danger";
const toast = (message: string, type: ToastType = "info", timeout = 2200): void => {
  let c = document.querySelector<HTMLElement>(".toasts");
  if (!c) {
    const d = document.createElement("div");
    d.className = "toasts";
    document.body.appendChild(d);
    c = d;
  }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const icon =
    type === "success"
      ? "fa-check-circle"
      : type === "danger"
      ? "fa-times-circle"
      : type === "warn"
      ? "fa-exclamation-circle"
      : "fa-info-circle";
  el.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
  c.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    el.addEventListener("transitionend", () => el.remove());
  }, timeout);
};

// -------------------- Event Bindings --------------------
function bindEvents(): void {
  function handleNumericInput(id: string) {
    return (e: Event) => {
      const target = e.target as HTMLInputElement;
      const v = onlyDigits(target.value);
      if (target.value !== v) target.value = v;

      if (id.startsWith("m-")) return;

      if (draft) {
        const name = target.name as keyof WargaRow;
        (draft as any)[name] = target.value;
      }
      dirty = true;
      renderHeader();
    };
  }

  function handleFormInput(e: Event): void {
    const t = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (!t?.name) return;
    if (draft) {
      const key = t.name as keyof WargaRow;
      (draft as any)[key] = t.value;
    }
    dirty = true;
    renderHeader();
  }

  function handleFormChange(e: Event): void {
    const t = e.target as HTMLInputElement;
    if (t.name === "tanggal_masuk" || t.name === "tanggal_keluar") {
      validateForm(true);
      dirty = true;
      renderHeader();
    }
  }

  function handleDragOver(e: DragEvent): void {
    e.preventDefault();
    dz.classList.add("dragover");
  }
  function handleDragLeave(): void {
    dz.classList.remove("dragover");
  }
  function handleDrop(e: DragEvent): void {
    e.preventDefault();
    dz.classList.remove("dragover");
    if (e.dataTransfer) handleFiles(e.dataTransfer.files);
  }
  function handleFileInput(e: Event): void {
    const files = (e.target as HTMLInputElement).files;
    handleFiles(files);
  }
  function handleDocDeleteClick(e: Event): void {
    const btn = e.target as HTMLElement;
    const b = btn.closest("button[data-doc-del]") as HTMLButtonElement | null;
    if (!b) return;
    const idx = parseInt(b.getAttribute("data-doc-del") ?? "-1", 10);
    const d = (row?.documents ?? [])[idx];
    const title = document.getElementById("confirm-title") as HTMLElement;
    const msg = document.getElementById("confirm-message") as HTMLElement;
    const yes = document.getElementById("btn-confirm-yes") as HTMLButtonElement;
    title.innerHTML = `<i class="fas fa-file-times"></i> Hapus Dokumen`;
    msg.textContent = `Hapus dokumen "${d?.name ?? "-"}"?`;
    yes.dataset.action = `delete-doc:${idx}`;
    showModal("#modal-confirm", true);
  }
  function handleKeydown(e: KeyboardEvent): void {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      const btn = document.getElementById("btn-save") as HTMLButtonElement | null;
      btn?.click();
    }
  }
  function handleBeforeUnload(e: BeforeUnloadEvent) {
    if (dirty) {
      e.preventDefault();
      (e as any).returnValue = "";
    }
  }

  // Numeric-only filters
  const numFields = ["nik", "kk", "rt", "rw", "telepon", "m-nik"];
  numFields.forEach((id) => {
    onDelegated(document, "input", `#${id}`, handleNumericInput(id));
  });

  // Main form inputs
  on($("#form-main") as HTMLElement, "input", handleFormInput);
  on($("#form-main") as HTMLElement, "change", handleFormChange);

  // Save
  on($("#btn-save") as HTMLElement, "click", () => {
    if (!validateForm(true)) {
      toast("Periksa kembali input yang belum valid", "warn");
      return;
    }
    if (!row) return;
    const next: WargaRow = {
      ...row,
      ...(draft ?? {}),
      updated_at: Date.now(),
      anggota_keluarga: row.anggota_keluarga ?? [],
      documents: row.documents ?? [],
      history: row.history ?? [],
    } as WargaRow;
    row = next;
    row.history = (row.history ?? []).concat({
      time: Date.now(),
      action: "update-main",
      by: "admin",
    });
    persistRow();
    dirty = false;
    renderAll();
    toast("Data berhasil disimpan", "success");
  });

  // Verify toggle
  on($("#btn-verify") as HTMLElement, "click", () => {
    if (!row) return;
    row.verified = !row.verified;
    row.updated_at = Date.now();
    row.history = (row.history ?? []).concat({
      time: Date.now(),
      action: row.verified ? "verify" : "unverify",
      by: "admin",
    });
    persistRow();
    renderAll();
    toast(row.verified ? "Terverifikasi" : "Verifikasi dibatalkan", row.verified ? "success" : "info");
    // Send admin notification
    if (row.verified) {
      addAdminNotif('success', 'Warga Terverifikasi', `Data ${row.nama || '-'} telah ditandai terverifikasi.`);
    } else {
      addAdminNotif('warning', 'Verifikasi Dibatalkan', `Status verifikasi untuk ${row.nama || '-'} dibatalkan.`);
    }
  });

  // Delete row (open confirm modal)
  on($("#btn-delete") as HTMLElement, "click", () => {
    const title = document.getElementById("confirm-title") as HTMLElement;
    const msg = document.getElementById("confirm-message") as HTMLElement;
    const yes = document.getElementById("btn-confirm-yes") as HTMLButtonElement;
    title.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Konfirmasi`;
    msg.textContent = "Hapus data warga ini? Tindakan ini tidak dapat dibatalkan.";
    yes.dataset.action = "delete-row";
    showModal("#modal-confirm", true);
  });

  // Confirm modal actions
  on($("#btn-confirm-yes") as HTMLElement, "click", () => {
    const yesBtn = document.getElementById("btn-confirm-yes") as HTMLButtonElement;
    const act = yesBtn.dataset.action;
    if (!row) return;

    if (act === "delete-row") {
      row.history = (row.history ?? []).concat({
        time: Date.now(),
        action: "delete-row",
        by: "admin",
      });
      warga = warga.filter((x) => x.id !== row!.id);
      saveAll();
      toast("Data dihapus", "danger");
      showModal("#modal-confirm", false);
      setTimeout(() => {
        location.href = "/admin/warga";
      }, 500);
    } else if (act?.startsWith("delete-member:")) {
      const idx = parseInt(act.split(":")[1] ?? "-1", 10);
      const m = (row.anggota_keluarga ?? [])[idx];
      row.anggota_keluarga.splice(idx, 1);
      row.updated_at = Date.now();
      row.history = (row.history ?? []).concat({
        time: Date.now(),
        action: "delete-member",
        by: "admin",
        detail: m?.nama ?? "",
      });
      persistRow();
      showModal("#modal-confirm", false);
      renderMembers();
      renderHistory();
      renderHeader();
      toast("Anggota dihapus", "danger");
    } else if (act?.startsWith("delete-doc:")) {
      const idx = parseInt(act.split(":")[1] ?? "-1", 10);
      const d = (row.documents ?? [])[idx];
      row.documents.splice(idx, 1);
      row.updated_at = Date.now();
      row.history = (row.history ?? []).concat({
        time: Date.now(),
        action: "delete-doc",
        by: "admin",
        detail: d?.name ?? "",
      });
      persistRow();
      showModal("#modal-confirm", false);
      renderDocs();
      renderHistory();
      renderHeader();
      toast("Dokumen dihapus", "danger");
    }
  });

  // Close modals
  onDelegated(document, "click", "[data-close-modal]", () => {
    ["#modal-member", "#modal-confirm"].forEach((sel) => {
      const m = document.querySelector<HTMLElement>(sel);
      m?.setAttribute("aria-hidden", "true");
    });
  });
  on(document, "keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      ["#modal-member", "#modal-confirm"].forEach((sel) => {
        const m = document.querySelector<HTMLElement>(sel);
        m?.setAttribute("aria-hidden", "true");
      });
    }
  });

  // Add member (disabled & hidden)
  const addBtnEl = document.getElementById("btn-add-member") as HTMLButtonElement | null;
  const addBtnSel = $("#btn-add-member") as HTMLButtonElement | null;
  if (addBtnSel) {
    addBtnSel.disabled = true;
    addBtnSel.title = "Fitur tambah anggota dinonaktifkan";
    addBtnSel.style.display = "none"; // hide button entirely
    on(addBtnSel, "click", (e: Event) => {
      e.preventDefault();
      toast("Fitur tambah anggota dinonaktifkan", "warn");
    });
  }

  // Members table actions
  onDelegated(document, "click", "button[data-edit]", (e: Event) => {
    const target = e.target as HTMLElement;
    const btn = target.closest("button") as HTMLButtonElement | null;
    const idx = parseInt(btn?.getAttribute("data-edit") ?? "0", 10);
    const m = (row?.anggota_keluarga ?? [])[idx];
    if (!m) return;
    openMemberModal(m, idx);
  });

  onDelegated(document, "click", "button[data-del]", (e: Event) => {
    const target = e.target as HTMLElement;
    const btn = target.closest("button") as HTMLButtonElement | null;
    const idx = parseInt(btn?.getAttribute("data-del") ?? "0", 10);
    const m = (row?.anggota_keluarga ?? [])[idx];
    const title = document.getElementById("confirm-title") as HTMLElement;
    const msg = document.getElementById("confirm-message") as HTMLElement;
    const yes = document.getElementById("btn-confirm-yes") as HTMLButtonElement;
    title.innerHTML = `<i class="fas fa-user-times"></i> Hapus Anggota`;
    msg.textContent = `Hapus anggota "${m?.nama ?? "-"}"?`;
    yes.dataset.action = `delete-member:${idx}`;
    showModal("#modal-confirm", true);
  });

  const saveMemberBtn = document.getElementById("btn-save-member") as HTMLElement | null;
  if (saveMemberBtn) on(saveMemberBtn, "click", () => {
    if (!validateMemberForm(true)) return;
    const nm = document.getElementById("m-nama") as HTMLInputElement;
    const nk = document.getElementById("m-nik") as HTMLInputElement;
    const rl = document.getElementById("m-relasi") as HTMLSelectElement;

    const m: WargaMember = {
      nama: nm.value.trim(),
      nik: nk.value.trim(),
      relasi: rl.value,
    };

    if (!row) return;
    row.anggota_keluarga = row.anggota_keluarga ?? [];
    const isEdit = memberEditIndex !== null && memberEditIndex >= 0;

    if (isEdit) {
      row.anggota_keluarga[memberEditIndex!] = m;
      row.history = (row.history ?? []).concat({
        time: Date.now(),
        action: "edit-member",
        by: "admin",
        detail: m.nama,
      });
    } else {
      // Block creating new members
      toast("Fitur tambah anggota dinonaktifkan", "warn");
      return;
    }
    row.updated_at = Date.now();
    memberEditIndex = null;
    persistRow();
    showModal("#modal-member", false);
    renderMembers();
    renderHistory();
    renderHeader();
    toast("Anggota diperbarui", "success");
  });

  // Dropzone & file input
  const dz = $("#dropzone") as HTMLElement;
  const fi = document.getElementById("file-input") as HTMLInputElement | null;

  on($("#btn-browse") as HTMLElement, "click", () => {
    fi?.click();
  });
  on(dz, "dragover", handleDragOver);
  on(dz, "dragleave", handleDragLeave);
  on(dz, "drop", handleDrop);
  if (fi) on(fi, "change", handleFileInput);

  // Delete doc button
  onDelegated(document, "click", "button[data-doc-del]", handleDocDeleteClick);

  // Keyboard shortcut Save
  on(document, "keydown", handleKeydown);

  // Warn before unload if dirty
  window.addEventListener("beforeunload", handleBeforeUnload);
}

function handleFiles(fileList: FileList | null): void {
  if (!fileList || !fileList.length) return;
  if (!row) return;
  row.documents = row.documents ?? [];

  for (const f of Array.from(fileList)) {
    const file = f as File;
    row.documents.push({
      name: file.name,
      type: file.type,
      size: file.size,
      time: Date.now(),
    });
    row.history = (row.history ?? []).concat({
      time: Date.now(),
      action: "add-doc",
      by: "admin",
      detail: file.name,
    });
  }
  row.updated_at = Date.now();
  persistRow();
  renderDocs();
  renderHistory();
  renderHeader();
  toast("Dokumen ditambahkan", "success");
}

// -------------------- Init --------------------
function init(): void {
  load();
  row = warga.find((x) => x.id === id) ?? null;

  if (!row) {
    renderAll();
    return;
  }

  draft = deepClone(row) as Partial<WargaRow>;
  row.anggota_keluarga = row.anggota_keluarga ?? [];
  row.documents = row.documents ?? [];
  row.history = row.history ?? [];

  dirty = false;
  bindEvents();
  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
